import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { gsap } from 'gsap'
import { chapterAt, chaptersOf, type BookPage, type Chapter } from '../lib/book'
import { readStored, writeStored } from '../lib/theme'
import { PageView } from './PageView'
import { Sheet } from './Sheet'
import { ThemeToggle } from './ThemeToggle'

type Props = {
  title: string
  author?: string
  pages: BookPage[]
  /** one level up (the contents page): the back button, Esc, and the end of the book lead here */
  backTo: string
  backLabel?: string
  /** localStorage key that remembers the reader's page */
  storageKey: string
}

const FONT_KEY = 'co:font'
const FONT_MIN = 16
const FONT_MAX = 26
const TURN_SECONDS = 0.75
const OPEN_ANGLE = -118 // how far a turned page swings before it is gone

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A page turn in progress. `manual` turns follow the reader's finger instead of playing on their own. */
type Turn = { from: number; to: number; manual?: boolean }

/** A touch in progress: undecided, scrolling the page, dragging a page, or past the last page. */
type Drag = {
  x: number
  y: number
  t: number
  width: number
  mode: 'pending' | 'scroll' | 'turn' | 'instant' | 'end'
  dir: 1 | -1
  progress: number
}

/** Full-screen paged reader with GSAP page turns. The page lives in the URL (?p=12). */
export function BookReader({ title, author, pages, backTo, backLabel = 'Contents', storageKey }: Props) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const total = pages.length
  const requested = Number(params.get('p'))
  const index = clamp(Number.isInteger(requested) && requested >= 1 ? requested - 1 : 0, 0, Math.max(0, total - 1))

  const chapters = useMemo(() => chaptersOf(pages), [pages])
  const hasChapters = chapters.some((c) => c.title)

  const [fontSize, setFontSize] = useState(() => clamp(Number(readStored(FONT_KEY)) || 20, FONT_MIN, FONT_MAX))
  const [tocOpen, setTocOpen] = useState(false)
  const [turn, setTurn] = useState<Turn | null>(null)

  const settle = useCallback(
    (to: number) => {
      setParams({ p: String(to + 1) }, { replace: true })
      setTurn(null)
    },
    [setParams],
  )

  /** Turn to a page. Neighbours flip like paper; jumps (chapter menu, Home/End) cut straight there. */
  const go = useCallback(
    (i: number) => {
      setTocOpen(false)
      if (turn) return
      if (i > total - 1) return navigate(backTo) // past the last page: back to the contents
      const to = clamp(i, 0, total - 1)
      if (to === index) return
      window.scrollTo({ top: 0 })
      if (Math.abs(to - index) === 1 && !prefersReducedMotion()) setTurn({ from: index, to })
      else settle(to)
    },
    [backTo, index, navigate, settle, total, turn],
  )

  // The paper that moves: going forward the current page swings away to reveal the next;
  // going back, the previous page swings in over the current one.
  const flipRef = useRef<HTMLDivElement>(null)
  const shadeRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!turn || !flipRef.current || !shadeRef.current) return
    const forward = turn.to > turn.from
    if (turn.manual) {
      // Start where the finger is (nothing moved yet); touchmove drives it from here.
      gsap.set(flipRef.current, { rotateY: forward ? 0 : OPEN_ANGLE })
      gsap.set(shadeRef.current, { opacity: forward ? 0 : 0.55 })
      return
    }
    const tl = gsap.timeline({ onComplete: () => settle(turn.to) })
    tl.fromTo(
      flipRef.current,
      { rotateY: forward ? 0 : OPEN_ANGLE },
      { rotateY: forward ? OPEN_ANGLE : 0, duration: TURN_SECONDS, ease: 'power2.inOut' },
      0,
    )
    tl.fromTo(
      shadeRef.current,
      { opacity: forward ? 0 : 0.55 },
      { opacity: forward ? 0.55 : 0, duration: TURN_SECONDS, ease: 'power1.inOut' },
      0,
    )
    // Background tabs pause animation frames; finish the turn anyway so the reader never gets stuck.
    const fallback = window.setTimeout(() => tl.progress(1), (TURN_SECONDS + 0.5) * 1000)
    return () => {
      window.clearTimeout(fallback)
      tl.kill()
    }
  }, [turn, settle])

  useEffect(() => writeStored(storageKey, String(index)), [index, storageKey])
  useEffect(() => writeStored(FONT_KEY, String(fontSize)), [fontSize])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(index + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(index - 1)
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(total - 1)
      else if (e.key === 'Escape') {
        if (tocOpen) setTocOpen(false)
        else navigate(backTo) // drill up to the contents
      } else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [backTo, go, index, navigate, tocOpen, total])

  // Swipe left = next page, swipe right = previous page. The page follows the finger.
  const drag = useRef<Drag | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    if (turn || e.touches.length > 1) return
    const t = e.touches[0]
    drag.current = {
      x: t.clientX,
      y: t.clientY,
      t: performance.now(),
      width: window.innerWidth,
      mode: 'pending',
      dir: 1,
      progress: 0,
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const d = drag.current
    if (!d) return
    const t = e.touches[0]
    const dx = t.clientX - d.x
    const dy = t.clientY - d.y
    if (d.mode === 'pending') {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      if (Math.abs(dx) <= Math.abs(dy)) {
        d.mode = 'scroll' // a vertical scroll, leave it alone
        return
      }
      d.dir = dx < 0 ? 1 : -1
      const target = index + d.dir
      if (target < 0) d.mode = 'scroll'
      else if (target > total - 1) d.mode = 'end'
      else if (prefersReducedMotion()) d.mode = 'instant'
      else {
        d.mode = 'turn'
        setTurn({ from: index, to: target, manual: true })
      }
      return
    }
    if (d.mode !== 'turn' || !flipRef.current || !shadeRef.current) return
    const p = clamp((d.dir === 1 ? -dx : dx) / (d.width * 0.7), 0, 1)
    d.progress = p
    const forward = d.dir === 1
    gsap.set(flipRef.current, { rotateY: OPEN_ANGLE * (forward ? p : 1 - p) })
    gsap.set(shadeRef.current, { opacity: 0.55 * (forward ? p : 1 - p) })
  }

  function onTouchEnd(e: React.TouchEvent) {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dx = e.changedTouches[0].clientX - d.x
    const flick = Math.abs(dx) > 40 && performance.now() - d.t < 280
    const far = Math.abs(dx) > 60
    if (d.mode === 'end') {
      if (dx < 0 && (far || flick)) navigate(backTo)
      return
    }
    if (d.mode === 'instant') {
      if (far || flick) settle(index + d.dir)
      return
    }
    if (d.mode !== 'turn' || !flipRef.current || !shadeRef.current) return
    // Let go past a third of the way (or with a flick) and the page finishes turning; otherwise it falls back.
    const commit = d.progress > 0.33 || flick
    const forward = d.dir === 1
    const done = commit ? 1 : 0
    const remaining = Math.abs(done - d.progress)
    const target = index + d.dir
    let finished = false
    const release = gsap
      .timeline({
        onComplete: () => {
          finished = true
          if (commit) settle(target)
          else setTurn(null)
        },
      })
      .to(flipRef.current, {
        rotateY: OPEN_ANGLE * (forward ? done : 1 - done),
        duration: 0.15 + 0.45 * remaining,
        ease: 'power2.out',
      })
      .to(shadeRef.current, { opacity: 0.55 * (forward ? done : 1 - done), duration: 0.15 + 0.45 * remaining }, 0)
    window.setTimeout(() => !finished && release.progress(1), 1100)
    if (commit) window.scrollTo({ top: 0 })
  }

  if (total === 0)
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl">{title}</p>
          <p className="mt-2 text-muted">This book has no pages yet.</p>
          <Link to={backTo} className="btn btn-ghost mt-6">
            ← {backLabel}
          </Link>
        </div>
      </div>
    )

  // During a turn the still page underneath is the one we end on (forward) or start from (back).
  const forward = turn ? turn.to > turn.from : true
  const basePage = turn ? (forward ? turn.to : turn.from) : index
  const flipPage = turn ? (forward ? turn.from : turn.to) : null
  const shownIndex = turn && !turn.manual ? turn.to : index
  const current = chapterAt(chapters, shownIndex)
  const last = shownIndex === total - 1

  return (
    <div
      className="min-h-screen flex flex-col bg-desk [touch-action:pan-y]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-3xl px-3 py-2 flex items-center gap-2">
          <Link to={backTo} className="btn btn-ghost py-1 text-sm shrink-0" title="Up to the contents (Esc)">
            ← {backLabel}
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate font-display text-lg leading-tight">{title}</div>
            {current?.title && <div className="truncate text-xs text-muted">{current.title}</div>}
          </div>
          {hasChapters && (
            <button className="btn-icon" onClick={() => setTocOpen((o) => !o)} title="Jump to a chapter" aria-expanded={tocOpen}>
              ☰
            </button>
          )}
          <button
            className="btn-icon font-display hidden sm:inline-flex"
            onClick={() => setFontSize((s) => clamp(s - 1, FONT_MIN, FONT_MAX))}
            disabled={fontSize <= FONT_MIN}
            title="Smaller text"
          >
            A−
          </button>
          <button
            className="btn-icon font-display text-lg"
            onClick={() => setFontSize((s) => (s >= FONT_MAX ? FONT_MIN : s + 1))}
            title="Text size"
          >
            A+
          </button>
          <ThemeToggle />
        </div>
        <div className="h-0.5 bg-line">
          <div
            className="h-full bg-accent transition-[width] duration-500"
            style={{ width: `${((shownIndex + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      {tocOpen && <TableOfContents chapters={chapters} current={current} onPick={(c) => go(c.start)} />}

      <main className="flex-1 w-full px-3 py-6 sm:py-10">
        <div className="relative mx-auto w-full max-w-[40rem] [perspective:2200px]" style={{ fontSize: `${fontSize}px` }}>
          <Sheet>
            <PageContent pages={pages} i={basePage} chapters={chapters} title={title} author={author} backTo={backTo} />
          </Sheet>
          {flipPage !== null && (
            <div
              ref={flipRef}
              className="absolute inset-x-0 top-0 h-full origin-left [transform-style:preserve-3d] [backface-visibility:hidden] will-change-transform z-10"
            >
              <Sheet className="h-full overflow-hidden">
                <PageContent pages={pages} i={flipPage} chapters={chapters} title={title} author={author} backTo={backTo} />
              </Sheet>
              <div
                ref={shadeRef}
                className="pointer-events-none absolute inset-0 rounded-r-lg bg-gradient-to-l from-black/70 via-black/20 to-transparent"
              />
            </div>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 z-20 bg-paper/90 backdrop-blur border-t border-line">
        <div className="mx-auto max-w-3xl px-3 py-2 flex items-center justify-between gap-3">
          <button className="btn btn-ghost w-28" onClick={() => go(index - 1)} disabled={shownIndex === 0}>
            ← Previous
          </button>
          <span className="text-sm text-muted tabular-nums">
            {shownIndex + 1} / {total}
          </span>
          {last ? (
            <Link to={backTo} className="btn btn-primary w-28">
              {backLabel} ↑
            </Link>
          ) : (
            <button className="btn btn-primary w-28" onClick={() => go(index + 1)}>
              Next →
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

function PageContent(props: {
  pages: BookPage[]
  i: number
  chapters: Chapter[]
  title: string
  author?: string
  backTo: string
}) {
  const { pages, i, chapters, title, author, backTo } = props
  const page = pages[i]
  const chapter = chapterAt(chapters, i)
  const isLast = i === pages.length - 1
  return (
    <>
      {i === 0 && !page.data.title && !(chapter?.title && chapter.start === 0) && (
        <header className="text-center mb-10">
          <h1 className="font-display text-[2.2em] leading-tight">{title}</h1>
          {author && <p className="mt-2 text-muted uppercase tracking-[0.2em] text-[0.6em]">{author}</p>}
        </header>
      )}
      <PageView page={page.data} chapterTitle={chapter?.title} chapterStart={chapter?.start === i} />
      <div className="mt-10 text-center text-xs text-muted tabular-nums">{i + 1}</div>
      {isLast && (
        <div className="mt-8 text-center">
          <div className="font-display text-2xl text-accent">The End</div>
          <Link to={backTo} className="btn btn-ghost mt-4 text-sm">
            Back to the contents
          </Link>
        </div>
      )}
    </>
  )
}

function TableOfContents({
  chapters,
  current,
  onPick,
}: {
  chapters: Chapter[]
  current?: Chapter
  onPick: (c: Chapter) => void
}) {
  return (
    <nav className="fixed inset-x-0 top-[3.6rem] z-30 mx-auto max-w-md px-3">
      <ol className="rounded-md border border-line bg-card shadow-xl max-h-[70vh] overflow-auto py-2">
        {chapters.map((c) => (
          <li key={c.start}>
            <button
              className={`w-full text-left px-4 py-2 flex justify-between gap-4 hover:bg-paper cursor-pointer ${current === c ? 'text-accent' : ''}`}
              onClick={() => onPick(c)}
            >
              <span className="font-display text-lg leading-tight">{c.title ?? 'Untitled'}</span>
              <span className="text-xs text-muted tabular-nums pt-1">p. {c.start + 1}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

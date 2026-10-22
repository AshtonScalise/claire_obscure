import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { gsap } from 'gsap'
import { chapterAt, chaptersOf, type BookPage, type Chapter } from '../lib/book'
import { readStored, writeStored } from '../lib/theme'
import { PageView } from './PageView'
import { ThemeToggle } from './ThemeToggle'

type Props = {
  title: string
  author?: string
  pages: BookPage[]
  /** where the back link and "The End" lead */
  backTo: string
  /** localStorage key that remembers the reader's page */
  storageKey: string
}

const FONT_KEY = 'co:font'
const FONT_MIN = 16
const FONT_MAX = 26
const TURN_SECONDS = 0.75

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A page turn in progress: `from` is the page being left, `to` the page being opened. */
type Turn = { from: number; to: number }

/** Full-screen paged reader with GSAP page turns. The page lives in the URL (?p=12). */
export function BookReader({ title, author, pages, backTo, storageKey }: Props) {
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
      const to = clamp(i, 0, total - 1)
      setTocOpen(false)
      if (to === index || turn) return
      window.scrollTo({ top: 0 })
      if (Math.abs(to - index) === 1 && !prefersReducedMotion()) setTurn({ from: index, to })
      else settle(to)
    },
    [index, settle, total, turn],
  )

  // The paper that moves: when going forward the current page swings away to reveal the next;
  // going back, the previous page swings in over the current one.
  const flipRef = useRef<HTMLDivElement>(null)
  const shadeRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!turn || !flipRef.current || !shadeRef.current) return
    const forward = turn.to > turn.from
    const tl = gsap.timeline({ onComplete: () => settle(turn.to) })
    tl.fromTo(
      flipRef.current,
      { rotateY: forward ? 0 : -118 },
      { rotateY: forward ? -118 : 0, duration: TURN_SECONDS, ease: 'power2.inOut' },
      0,
    )
    tl.fromTo(
      shadeRef.current,
      { opacity: forward ? 0 : 0.55 },
      { opacity: forward ? 0.55 : 0, duration: TURN_SECONDS, ease: 'power1.inOut' },
      0,
    )
    return () => {
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
      else if (e.key === 'Escape') setTocOpen(false)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index, total])

  const touch = useRef<{ x: number; y: number } | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current
    touch.current = null
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? index + 1 : index - 1)
  }

  if (total === 0)
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl">{title}</p>
          <p className="mt-2 text-muted">This book has no pages yet.</p>
          <Link to={backTo} className="btn btn-ghost mt-6">
            Back
          </Link>
        </div>
      </div>
    )

  // During a turn the still page underneath is the one we end on (forward) or start from (back).
  const forward = turn ? turn.to > turn.from : true
  const basePage = turn ? (forward ? turn.to : turn.from) : index
  const flipPage = turn ? (forward ? turn.from : turn.to) : null
  const shownIndex = turn ? turn.to : index
  const current = chapterAt(chapters, shownIndex)
  const last = shownIndex === total - 1

  return (
    <div className="min-h-screen flex flex-col bg-desk" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-3xl px-3 py-2 flex items-center gap-2">
          <Link to={backTo} className="btn-icon shrink-0" title="Back to the book">
            ←
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate font-display text-lg leading-tight">{title}</div>
            {current?.title && <div className="truncate text-xs text-muted">{current.title}</div>}
          </div>
          {hasChapters && (
            <button className="btn-icon" onClick={() => setTocOpen((o) => !o)} title="Chapters" aria-expanded={tocOpen}>
              ☰
            </button>
          )}
          <button
            className="btn-icon font-display"
            onClick={() => setFontSize((s) => clamp(s - 1, FONT_MIN, FONT_MAX))}
            disabled={fontSize <= FONT_MIN}
            title="Smaller text"
          >
            A−
          </button>
          <button
            className="btn-icon font-display text-lg"
            onClick={() => setFontSize((s) => clamp(s + 1, FONT_MIN, FONT_MAX))}
            disabled={fontSize >= FONT_MAX}
            title="Larger text"
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

      {tocOpen && (
        <TableOfContents chapters={chapters} current={current} onPick={(c) => go(c.start)} />
      )}

      <main className="flex-1 w-full px-3 py-6 sm:py-10">
        <div className="relative mx-auto w-full max-w-[40rem] [perspective:2200px]" style={{ fontSize: `${fontSize}px` }}>
          <Sheet>
            <PageContent
              pages={pages}
              i={basePage}
              chapters={chapters}
              title={title}
              author={author}
              backTo={backTo}
            />
          </Sheet>
          {flipPage !== null && (
            <div
              ref={flipRef}
              className="absolute inset-x-0 top-0 h-full origin-left [transform-style:preserve-3d] [backface-visibility:hidden] will-change-transform z-10"
            >
              <Sheet className="h-full overflow-hidden">
                <PageContent
                  pages={pages}
                  i={flipPage}
                  chapters={chapters}
                  title={title}
                  author={author}
                  backTo={backTo}
                />
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
          <button className="btn btn-primary w-28" onClick={() => go(index + 1)} disabled={last}>
            Next →
          </button>
        </div>
      </footer>
    </div>
  )
}

/** A sheet of paper: soft shadow, rounded fore-edge, and a darker gutter along the spine. */
function Sheet({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-r-lg rounded-l-sm bg-paper shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] border border-line ${className}`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-sm bg-gradient-to-r from-black/10 to-transparent dark:from-black/40" />
      <div className="px-7 sm:px-12 py-10 sm:py-14 min-h-[70vh]">{children}</div>
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
            Back to the book
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

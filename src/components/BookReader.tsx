import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { chapterAt, chaptersOf, type BookPage } from '../lib/book'
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

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

/** Full-screen paged reader. The page lives in the URL (?p=12) so any page can be linked. */
export function BookReader({ title, author, pages, backTo, storageKey }: Props) {
  const [params, setParams] = useSearchParams()
  const total = pages.length
  const requested = Number(params.get('p'))
  const index = clamp(Number.isInteger(requested) && requested >= 1 ? requested - 1 : 0, 0, Math.max(0, total - 1))

  const chapters = useMemo(() => chaptersOf(pages), [pages])
  const current = chapterAt(chapters, index)
  const hasChapters = chapters.some((c) => c.title)

  const [fontSize, setFontSize] = useState(() => clamp(Number(readStored(FONT_KEY)) || 20, FONT_MIN, FONT_MAX))
  const [tocOpen, setTocOpen] = useState(false)

  const go = useCallback(
    (i: number) => {
      const next = clamp(i, 0, total - 1)
      setParams({ p: String(next + 1) }, { replace: true })
      setTocOpen(false)
      window.scrollTo({ top: 0 })
    },
    [setParams, total],
  )

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

  const page = pages[index]
  const last = index === total - 1

  return (
    <div className="min-h-screen flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-line">
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
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </header>

      {tocOpen && (
        <nav className="fixed inset-x-0 top-[3.6rem] z-20 mx-auto max-w-md px-3">
          <ol className="rounded-md border border-line bg-card shadow-xl max-h-[70vh] overflow-auto py-2">
            {chapters.map((c) => (
              <li key={c.start}>
                <button
                  className={`w-full text-left px-4 py-2 flex justify-between gap-4 hover:bg-paper cursor-pointer ${current === c ? 'text-accent' : ''}`}
                  onClick={() => go(c.start)}
                >
                  <span className="font-display text-lg leading-tight">{c.title ?? 'Untitled'}</span>
                  <span className="text-xs text-muted tabular-nums pt-1">p. {c.start + 1}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <main
        key={index}
        className="page-in flex-1 mx-auto w-full max-w-[38rem] px-6 py-10 sm:py-14"
        style={{ fontSize: `${fontSize}px` }}
      >
        {index === 0 && !page.data.title && !(current?.title && current.start === 0) && (
          <header className="text-center mb-10">
            <h1 className="font-display text-[2.2em] leading-tight">{title}</h1>
            {author && <p className="mt-2 text-muted uppercase tracking-[0.2em] text-[0.6em]">{author}</p>}
          </header>
        )}
        <PageView page={page.data} chapterTitle={current?.title} chapterStart={current?.start === index} />
        {last && (
          <div className="mt-14 text-center">
            <div className="font-display text-2xl text-accent">The End</div>
            <Link to={backTo} className="btn btn-ghost mt-4 text-sm">
              Back to the book
            </Link>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-paper/90 backdrop-blur border-t border-line">
        <div className="mx-auto max-w-3xl px-3 py-2 flex items-center justify-between gap-3">
          <button className="btn btn-ghost w-28" onClick={() => go(index - 1)} disabled={index === 0}>
            ← Previous
          </button>
          <span className="text-sm text-muted tabular-nums">
            {index + 1} / {total}
          </span>
          <button className="btn btn-primary w-28" onClick={() => go(index + 1)} disabled={last}>
            Next →
          </button>
        </div>
      </footer>
    </div>
  )
}

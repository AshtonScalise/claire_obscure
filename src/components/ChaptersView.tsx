import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { chaptersOf, type BookPage } from '../lib/book'
import { readStored } from '../lib/theme'
import { Sheet } from './Sheet'
import { ThemeToggle } from './ThemeToggle'

type Props = {
  title: string
  author?: string
  pages: BookPage[]
  /** the reader's path; chapters link to `${readPath}?p=N` */
  readPath: string
  /** one level up (the book) and its label */
  upTo: string
  upLabel: string
  /** localStorage key holding the reader's saved page */
  storageKey: string
}

/** The book's contents page: pick a chapter, or continue where you left off. Esc goes up a level. */
export function ChaptersView({ title, author, pages, readPath, upTo, upLabel, storageKey }: Props) {
  const navigate = useNavigate()
  const chapters = chaptersOf(pages)
  const saved = Number(readStored(storageKey))
  const resumeAt = Number.isInteger(saved) && saved > 0 && saved < pages.length ? saved : 0
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') navigate(upTo)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, upTo])

  // Chapters slide in one after another, like a contents page being set.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        list.children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.06 },
      )
    })
    return () => ctx.revert()
  }, [pages])

  return (
    <div className="min-h-screen flex flex-col bg-desk">
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-3xl px-3 py-2 flex items-center gap-2">
          <Link to={upTo} className="btn btn-ghost py-1 text-sm shrink-0" title="Up one level (Esc)">
            ← {upLabel}
          </Link>
          <div className="min-w-0 flex-1 text-center truncate font-display text-lg">{title}</div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 w-full px-3 py-6 sm:py-10">
        <div className="mx-auto w-full max-w-[40rem]">
          <Sheet>
            <div className="text-center">
              <div className="text-accent text-2xl" aria-hidden>
                ❦
              </div>
              <h1 className="font-display text-4xl leading-tight mt-2">{title}</h1>
              {author && <p className="mt-2 text-muted uppercase tracking-[0.2em] text-xs">{author}</p>}
            </div>

            <h2 className="text-center uppercase tracking-[0.35em] text-xs text-muted mt-10 mb-6">Contents</h2>

            {pages.length === 0 ? (
              <p className="text-center text-muted italic font-book">No pages yet.</p>
            ) : (
              <>
                {resumeAt > 0 && (
                  <Link to={`${readPath}?p=${resumeAt + 1}`} className="btn btn-primary w-full mb-6">
                    Continue reading · page {resumeAt + 1}
                  </Link>
                )}
                <ol ref={listRef} className="font-book">
                  {chapters.map((c, i) => (
                    <li key={c.start}>
                      <Link
                        to={`${readPath}?p=${c.start + 1}`}
                        className="group flex items-baseline gap-3 py-3 border-b border-line/60 last:border-b-0"
                      >
                        <span className="w-6 shrink-0 text-sm text-muted tabular-nums">{i + 1}</span>
                        <span className="font-display text-xl leading-snug group-hover:text-accent">
                          {c.title ?? (chapters.length === 1 ? 'Begin reading' : 'Untitled')}
                        </span>
                        <span className="flex-1 border-b border-dotted border-muted/50 -translate-y-1" aria-hidden />
                        <span className="shrink-0 whitespace-nowrap text-sm text-muted tabular-nums">p. {c.start + 1}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </Sheet>
        </div>
      </main>
    </div>
  )
}

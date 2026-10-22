import { useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useNovel } from '../lib/useNovel'
import { chaptersOf, wordCount } from '../lib/book'
import { readStored } from '../lib/theme'
import { Book3D, type Book3DHandle } from '../components/Book3D'

export function NovelView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const bookRef = useRef<Book3DHandle>(null)
  const { novel, pages, error, loading, isOwner } = useNovel(id)

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (loading || !novel || !pages) return <p className="text-muted text-sm">Loading…</p>

  const chapters = chaptersOf(pages).filter((c) => c.title)
  const words = wordCount(pages)
  const saved = Number(readStored(`co:pos:${id}`))
  const resumeAt = Number.isInteger(saved) && saved > 0 && saved < pages.length ? saved : 0

  /** The cover swings open before the reader appears. */
  async function openAt(page: number) {
    await bookRef.current?.open()
    navigate(`/n/${id}/read?p=${page}`)
  }

  return (
    <div className="grid gap-12 md:grid-cols-[17rem_1fr] items-start">
      <div className="max-w-[15rem] md:max-w-none mx-auto md:mx-0 w-full md:pt-4">
        <button
          className="block w-full cursor-pointer disabled:cursor-default"
          onClick={() => pages.length > 0 && openAt(resumeAt + 1)}
          disabled={pages.length === 0}
          aria-label={pages.length ? 'Open the book' : undefined}
        >
          <Book3D ref={bookRef} title={novel.title} author={novel.data.author} image={novel.data.cover_image} />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <Link to="/" className="text-xs text-muted hover:text-ink">
            ← library
          </Link>
          <h1 className="font-display text-5xl leading-tight mt-1">{novel.title}</h1>
          {novel.data.author && <p className="text-muted uppercase tracking-[0.2em] text-sm mt-2">{novel.data.author}</p>}
          <p className="text-sm text-muted mt-3">
            {!novel.is_public && (
              <span className="mr-2 rounded border border-line px-1.5 py-0.5 text-xs">draft, only you can see it</span>
            )}
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            {words > 0 && <> · about {Math.max(1, Math.round(words / 230))} min read</>}
          </p>
        </div>

        {novel.data.description && (
          <p className="font-book text-xl leading-relaxed whitespace-pre-line">{novel.data.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {pages.length > 0 &&
            (resumeAt > 0 ? (
              <>
                <button className="btn btn-primary" onClick={() => openAt(resumeAt + 1)}>
                  Continue reading · page {resumeAt + 1}
                </button>
                <button className="btn btn-ghost" onClick={() => openAt(1)}>
                  Start from the beginning
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => openAt(1)}>
                Start reading
              </button>
            ))}
          {isOwner && (
            <>
              <Link to={`/n/${id}/manage`} className="btn btn-ghost">
                ✎ Edit book
              </Link>
              <Link
                to={`/n/${id}/pages/new?chapter=${encodeURIComponent(pages[pages.length - 1]?.chapter ?? 'Chapter 1')}`}
                className="btn btn-ghost"
              >
                + Write a page
              </Link>
            </>
          )}
        </div>
        {isOwner && pages.length === 0 && (
          <p className="text-muted">Your book is empty. Click “Write a page” to start Chapter 1.</p>
        )}

        {chapters.length > 0 && (
          <div>
            <h2 className="font-display text-2xl mb-2">Chapters</h2>
            <ol className="divide-y divide-line border-y border-line">
              {chapters.map((c) => (
                <li key={c.start}>
                  <button
                    onClick={() => openAt(c.start + 1)}
                    className="w-full flex justify-between gap-4 py-2 hover:text-accent cursor-pointer text-left"
                  >
                    <span className="font-display text-lg">{c.title}</span>
                    <span className="text-sm text-muted tabular-nums">p. {c.start + 1}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

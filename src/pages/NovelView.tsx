import { Link, useParams } from 'react-router-dom'
import { useNovel } from '../lib/useNovel'
import { chaptersOf, wordCount } from '../lib/book'
import { readStored } from '../lib/theme'
import { Cover } from '../components/Cover'

export function NovelView() {
  const { id = '' } = useParams()
  const { novel, pages, error, loading, isOwner } = useNovel(id)

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (loading || !novel || !pages) return <p className="text-muted text-sm">Loading…</p>

  const chapters = chaptersOf(pages).filter((c) => c.title)
  const words = wordCount(pages)
  const saved = Number(readStored(`co:pos:${id}`))
  const resumeAt = Number.isInteger(saved) && saved > 0 && saved < pages.length ? saved : 0

  return (
    <div className="grid gap-10 md:grid-cols-[16rem_1fr]">
      <div className="max-w-[16rem] mx-auto md:mx-0 w-full">
        <Cover title={novel.title} author={novel.data.author} image={novel.data.cover_image} className="text-lg" />
      </div>

      <div className="space-y-6">
        <div>
          <Link to="/" className="text-xs text-muted hover:text-ink">
            ← library
          </Link>
          <h1 className="font-display text-5xl leading-tight mt-1">{novel.title}</h1>
          {novel.data.author && <p className="text-muted uppercase tracking-[0.2em] text-sm mt-2">{novel.data.author}</p>}
          <p className="text-sm text-muted mt-3">
            {!novel.is_public && <span className="mr-2 rounded border border-line px-1.5 py-0.5 text-xs">draft</span>}
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            {words > 0 && <> · about {Math.max(1, Math.round(words / 230))} min read</>}
          </p>
        </div>

        {novel.data.description && (
          <p className="font-book text-xl leading-relaxed whitespace-pre-line">{novel.data.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {pages.length > 0 && resumeAt > 0 ? (
            <>
              <Link to={`/n/${id}/read?p=${resumeAt + 1}`} className="btn btn-primary">
                Continue · page {resumeAt + 1}
              </Link>
              <Link to={`/n/${id}/read?p=1`} className="btn btn-ghost">
                Start over
              </Link>
            </>
          ) : (
            pages.length > 0 && (
              <Link to={`/n/${id}/read?p=1`} className="btn btn-primary">
                Start reading
              </Link>
            )
          )}
          {isOwner && (
            <Link to={`/n/${id}/manage`} className="btn btn-ghost">
              Manage pages
            </Link>
          )}
        </div>

        {chapters.length > 0 && (
          <div>
            <h2 className="font-display text-2xl mb-2">Chapters</h2>
            <ol className="divide-y divide-line border-y border-line">
              {chapters.map((c) => (
                <li key={c.start}>
                  <Link
                    to={`/n/${id}/read?p=${c.start + 1}`}
                    className="flex justify-between gap-4 py-2 hover:text-accent"
                  >
                    <span className="font-display text-lg">{c.title}</span>
                    <span className="text-sm text-muted tabular-nums">p. {c.start + 1}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

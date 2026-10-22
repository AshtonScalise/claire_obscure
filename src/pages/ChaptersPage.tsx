import { Link, useParams } from 'react-router-dom'
import { useNovel } from '../lib/useNovel'
import { ChaptersView } from '../components/ChaptersView'

export function ChaptersPage() {
  const { id = '' } = useParams()
  const { novel, pages, error, loading } = useNovel(id)

  if (error)
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="text-danger">{error}</p>
          <Link to="/" className="btn btn-ghost mt-4">
            Library
          </Link>
        </div>
      </div>
    )
  if (loading || !novel || !pages) return <p className="p-6 text-muted text-sm">Loading…</p>

  return (
    <ChaptersView
      title={novel.title}
      author={novel.data.author}
      pages={pages}
      readPath={`/n/${id}/read`}
      upTo={`/n/${id}`}
      upLabel="Book"
      storageKey={`co:pos:${id}`}
    />
  )
}

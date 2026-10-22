import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listNovels, type NovelRow } from '../lib/novels'
import { useAuth } from '../lib/auth-context'
import { Cover } from '../components/Cover'

export function Library() {
  const { loading, isAdmin } = useAuth()
  // Tagged with the admin state it was loaded for, so signing in shows drafts without a stale list.
  const [result, setResult] = useState<{ admin: boolean; rows?: NovelRow[]; error?: string } | null>(null)

  useEffect(() => {
    if (loading) return
    let cancelled = false
    listNovels()
      .then((rows) => !cancelled && setResult({ admin: isAdmin, rows }))
      .catch((e) => !cancelled && setResult({ admin: isAdmin, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [loading, isAdmin])

  const current = result?.admin === isAdmin ? result : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Library</h1>
        <p className="text-muted mt-1">{isAdmin ? 'All novels, including drafts.' : 'Pick a book and start reading.'}</p>
      </div>

      {current?.error && <p className="text-danger text-sm">{current.error}</p>}
      {!current && <p className="text-muted text-sm">Loading…</p>}
      {current?.rows?.length === 0 && (
        <p className="text-muted">
          {isAdmin ? 'No novels yet. Start one with New novel.' : 'Nothing published yet. Check back soon.'}
        </p>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {current?.rows?.map((n) => (
          <li key={n.id}>
            <Link to={`/n/${n.id}`} className="group block">
              <div className="relative transition-transform group-hover:-translate-y-1">
                <Cover title={n.title} author={n.data.author} image={n.data.cover_image} className="text-sm" />
                {!n.is_public && (
                  <span className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white">
                    draft
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-lg leading-tight group-hover:text-accent">{n.title}</div>
              {n.data.author && <div className="text-sm text-muted">{n.data.author}</div>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

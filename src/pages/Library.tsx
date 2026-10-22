import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listMyNovels, listPublicNovels, type NovelRow } from '../lib/novels'
import { useAuth } from '../lib/auth-context'
import { Cover } from '../components/Cover'

type View = 'mine' | 'everyone'

export function Library() {
  const { session, loading } = useAuth()
  const uid = session?.user.id
  const [params, setParams] = useSearchParams()
  const view: View = uid && params.get('view') !== 'everyone' ? 'mine' : 'everyone'

  // Results are tagged with what they were loaded for, so switching views never shows a stale list.
  const loadKey = `${view}:${uid ?? ''}`
  const [result, setResult] = useState<{ key: string; rows?: NovelRow[]; error?: string } | null>(null)
  const current = result?.key === loadKey ? result : null

  useEffect(() => {
    if (loading) return
    let cancelled = false
    const load = view === 'mine' && uid ? listMyNovels(uid) : listPublicNovels()
    load
      .then((rows) => !cancelled && setResult({ key: loadKey, rows }))
      .catch((e) => !cancelled && setResult({ key: loadKey, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [loading, view, uid, loadKey])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Library</h1>
          <p className="text-muted mt-1">
            {view === 'mine' ? 'Your books, published and drafts.' : 'Pick a book and start reading.'}
          </p>
        </div>
        {uid && (
          <div className="flex rounded-md border border-line p-0.5 text-sm">
            {(['mine', 'everyone'] as View[]).map((v) => (
              <button
                key={v}
                className={`px-3 py-1 rounded cursor-pointer ${view === v ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}
                onClick={() => setParams(v === 'everyone' ? { view: 'everyone' } : {})}
              >
                {v === 'mine' ? 'My books' : 'Everyone'}
              </button>
            ))}
          </div>
        )}
      </div>

      {current?.error && <p className="text-danger text-sm">{current.error}</p>}
      {!current && <p className="text-muted text-sm">Loading…</p>}
      {current?.rows?.length === 0 && (
        <p className="text-muted">
          {view === 'mine' ? (
            <>
              No books yet.{' '}
              <Link to="/new" className="text-accent hover:underline">
                Start your first novel
              </Link>
              .
            </>
          ) : (
            'Nothing published yet. Check back soon.'
          )}
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
                {view === 'everyone' && n.user_id === uid && (
                  <span className="absolute top-2 left-2 rounded bg-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent-ink">
                    yours
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

import { useCallback, useEffect, useState } from 'react'
import { getNovel, listPages, type NovelRow, type PageRow } from './novels'
import { useAuth } from './auth-context'

type State = { key: string; novel?: NovelRow; pages?: PageRow[]; error?: string }

/** Loads a novel and its pages once auth is known (owners can see their own drafts). */
export function useNovel(id: string) {
  const { session, loading: authLoading } = useAuth()
  const uid = session?.user.id
  const key = `${id}:${uid ?? ''}`
  const [state, setState] = useState<State | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    Promise.all([getNovel(id), listPages(id)])
      .then(([novel, pages]) => !cancelled && setState({ key, novel, pages }))
      .catch((e) => !cancelled && setState({ key, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [id, key, authLoading, reloadToken])

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])
  const current = state?.key === key ? state : null
  return {
    novel: current?.novel,
    pages: current?.pages,
    error: current?.error,
    loading: !current,
    isOwner: Boolean(uid) && current?.novel?.user_id === uid,
    reload,
  }
}

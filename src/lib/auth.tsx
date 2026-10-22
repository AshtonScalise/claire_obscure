import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  // Admin status is tagged with the user it was checked for, so a stale answer is never used.
  const [check, setCheck] = useState<{ uid: string; admin: boolean } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setSessionLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    supabase.rpc('is_admin').then(({ data }) => {
      if (!cancelled) setCheck({ uid, admin: data === true })
    })
    return () => {
      cancelled = true
    }
  }, [uid])

  const adminPending = Boolean(uid) && check?.uid !== uid
  const value = {
    session,
    loading: sessionLoading || adminPending,
    isAdmin: Boolean(uid) && check?.uid === uid && check?.admin === true,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

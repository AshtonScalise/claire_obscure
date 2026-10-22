import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthState = {
  session: Session | null
  /** true while the session or the admin check is still loading */
  loading: boolean
  /** signed in and listed in the admins table */
  isAdmin: boolean
}

export const AuthContext = createContext<AuthState>({ session: null, loading: true, isAdmin: false })

export function useAuth() {
  return useContext(AuthContext)
}

import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from './ThemeToggle'

export function Brand() {
  return (
    <span className="font-display text-2xl tracking-tight">
      Claire <span className="text-accent italic">Obscure</span>
    </span>
  )
}

/** OAuth sign-in failures come back as ?error_description=… (or in the #hash) on whatever page they return to. */
function authErrorFrom(search: string, hash: string): string | null {
  const raw =
    new URLSearchParams(search).get('error_description') ?? new URLSearchParams(hash.slice(1)).get('error_description')
  if (!raw) return null
  const text = raw.replace(/\+/g, ' ')
  try {
    return decodeURIComponent(text) // the #hash copy arrives encoded twice
  } catch {
    return text
  }
}

export function Layout() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const authError = authErrorFrom(location.search, location.hash)
  const [dismissed, setDismissed] = useState<string | null>(null)
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/">
            <Brand />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {session && (
              <Link to="/new" className="btn btn-primary">
                New novel
              </Link>
            )}
            <ThemeToggle />
            {session ? (
              <>
                <span className="hidden md:inline text-muted truncate max-w-[180px]">{session.user.email}</span>
                <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
                  Sign out
                </button>
              </>
            ) : (
              !loading && (
                <Link to="/login" className="btn btn-ghost">
                  Sign in
                </Link>
              )
            )}
          </div>
        </div>
      </header>
      {authError && dismissed !== authError && (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <div className="flex items-start justify-between gap-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            <span>
              <strong>Sign-in didn't finish.</strong> {authError}
            </span>
            <button className="btn-icon" onClick={() => setDismissed(authError)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted">
        Clair-obscur: light and shadow.
      </footer>
    </div>
  )
}

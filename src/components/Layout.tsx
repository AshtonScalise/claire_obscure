import { Link, Outlet } from 'react-router-dom'
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

export function Layout() {
  const { session, loading } = useAuth()
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
      <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted">
        Clair-obscur: light and shadow.
      </footer>
    </div>
  )
}

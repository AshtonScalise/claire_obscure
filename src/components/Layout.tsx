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
  const { session, isAdmin } = useAuth()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/">
            <Brand />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {isAdmin && (
              <Link to="/new" className="btn btn-primary">
                New novel
              </Link>
            )}
            <ThemeToggle />
            {session && (
              <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted flex justify-between">
        <span>Clair-obscur: light and shadow.</span>
        {!session && (
          <Link to="/login" className="hover:text-ink">
            Admin
          </Link>
        )}
      </footer>
    </div>
  )
}

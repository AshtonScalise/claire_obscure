import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { Brand } from '../components/Layout'

/** Supabase logins are emails, so a plain username is stored as `<username>@claire-obscure.app` (never mailed). */
export const USERNAME_EMAIL_DOMAIN = 'claire-obscure.app'

function toLoginEmail(login: string) {
  const value = login.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${USERNAME_EMAIL_DOMAIN}`
}

/** Admin sign-in only. Readers never need an account, and there is no sign-up. */
export function Login() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && session) return <Navigate to={from} replace />

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(login), password })
    setBusy(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong username or password.' : error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={signIn} className="w-full max-w-sm space-y-4">
        <Brand />
        <p className="text-sm text-muted">
          Admin sign-in. Readers don't need an account.{' '}
          <Link to="/" className="text-accent hover:underline">
            Back to the library
          </Link>
        </p>
        <input
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="username"
          className="w-full"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="password"
          className="w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </div>
  )
}

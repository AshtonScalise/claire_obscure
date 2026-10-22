import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { Brand } from '../components/Layout'

/**
 * Username-only admin login, by request: the username is the only key.
 * Supabase needs an email and a password, so the account is `<username>@claire-obscure.app`
 * (never mailed) and its password is the username itself.
 */
const USERNAME_EMAIL_DOMAIN = 'claire-obscure.app'

function credentials(username: string) {
  const name = username.trim().toLowerCase()
  return { email: `${name}@${USERNAME_EMAIL_DOMAIN}`, password: name }
}

/** Admin sign-in only. Readers never need an account, and there is no sign-up. */
export function Login() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [login, setLogin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && session) return <Navigate to={from} replace />

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword(credentials(login))
    setBusy(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'Unknown username.' : error.message)
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
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </div>
  )
}

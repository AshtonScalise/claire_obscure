import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { Brand } from '../components/Layout'

/** Admin sign-in only. Readers never need an account, and there is no sign-up. */
export function Login() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && session) return <Navigate to={from} replace />

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
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
          type="email"
          required
          autoComplete="email"
          placeholder="email"
          className="w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

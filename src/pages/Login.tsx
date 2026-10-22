import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { Brand } from '../components/Layout'

/** Same sign-in as mAI Cookbook: anyone can create an account and write their own books. */
export function Login() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  if (!loading && session) return <Navigate to={from} replace />

  async function run(action: () => Promise<{ error: { message: string } | null }>, okText: string) {
    setBusy(true)
    setMessage(null)
    const { error } = await action()
    setBusy(false)
    setMessage(error ? { kind: 'err', text: error.message } : { kind: 'ok', text: okText })
  }

  function signIn(e: FormEvent) {
    e.preventDefault()
    run(() => supabase.auth.signInWithPassword({ email, password }), 'Signed in.')
  }

  function signUp() {
    run(
      () => supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + from } }),
      'Account created. If email confirmation is on, check your inbox.',
    )
  }

  function magicLink() {
    run(
      () => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + from } }),
      'Magic link sent. Check your inbox.',
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={signIn} className="w-full max-w-sm space-y-4">
        <Brand />
        <p className="text-sm text-muted">
          Sign in to write your own books. Reading never needs an account.{' '}
          <Link to="/" className="text-accent hover:underline">
            Browse the library
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
          autoComplete="current-password"
          placeholder="password"
          className="w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy || !email || !password}>
            Sign in
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy || !email || !password} onClick={signUp}>
            Create account
          </button>
          <button type="button" className="btn btn-ghost ml-auto" disabled={busy || !email} onClick={magicLink}>
            Magic link
          </button>
        </div>
        {message && (
          <p className={`text-sm ${message.kind === 'err' ? 'text-danger' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  )
}

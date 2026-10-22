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

  // OAuth providers report failures back in the URL (e.g. the user cancelled on Discord).
  const oauthError =
    new URLSearchParams(location.search).get('error_description') ??
    new URLSearchParams(location.hash.slice(1)).get('error_description')

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

  async function discord() {
    setBusy(true)
    setMessage(null)
    // Sign-in and sign-up are the same step: a first-time Discord login creates the account.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin + from },
    })
    if (error) {
      setBusy(false)
      setMessage({ kind: 'err', text: error.message })
    }
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
        <button type="button" className="btn w-full bg-[#5865F2] text-white hover:bg-[#4752C4]" disabled={busy} onClick={discord}>
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.89 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z" />
          </svg>
          Continue with Discord
        </button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-line" />
          or use email
          <div className="h-px flex-1 bg-line" />
        </div>
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
        {oauthError && !message && <p className="text-sm text-danger">{oauthError}</p>}
        {message && (
          <p className={`text-sm ${message.kind === 'err' ? 'text-danger' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  )
}

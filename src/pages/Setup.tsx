import { Link } from 'react-router-dom'
import { Brand } from '../components/Layout'
import { ThemeToggle } from '../components/ThemeToggle'

export function Setup() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <Brand />
          <ThemeToggle />
        </div>
        <p>Supabase isn't configured yet.</p>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted">
          <li>Create a Supabase project and apply <code className="text-accent">supabase/migrations</code>.</li>
          <li>
            Copy <code className="text-accent">.env.example</code> to <code className="text-accent">.env</code> with the
            project URL and publishable key.
          </li>
          <li>Restart the dev server.</li>
        </ol>
        <Link to="/preview?p=1" className="btn btn-primary">
          Preview the reader with a sample
        </Link>
      </div>
    </div>
  )
}

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/Layout'
import { ThemeToggle } from '../components/ThemeToggle'
import { Book3D, type Book3DHandle } from '../components/Book3D'

export function Setup() {
  const navigate = useNavigate()
  const book = useRef<Book3DHandle>(null)

  async function openSample() {
    await book.current?.open()
    navigate('/preview?p=1')
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="max-w-2xl w-full grid gap-10 sm:grid-cols-[12rem_1fr] items-center">
        <button className="cursor-pointer max-w-[12rem] mx-auto w-full" onClick={openSample} aria-label="Open the sample book">
          <Book3D ref={book} title="The Lantern Keeper" author="A sample" />
        </button>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Brand />
            <ThemeToggle />
          </div>
          <p>Supabase isn't configured yet.</p>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted">
            <li>Point a Supabase project at <code className="text-accent">supabase/migrations</code>.</li>
            <li>
              Copy <code className="text-accent">.env.example</code> to <code className="text-accent">.env</code> with the
              project URL and publishable key.
            </li>
            <li>Restart the dev server.</li>
          </ol>
          <button className="btn btn-primary" onClick={openSample}>
            Open the sample book
          </button>
        </div>
      </div>
    </div>
  )
}

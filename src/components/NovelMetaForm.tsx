import { useState, type FormEvent } from 'react'
import { NovelMetaSchema, type NovelMeta } from '../lib/schema'

type Props = {
  initial?: Partial<NovelMeta>
  initialPublic?: boolean
  submitLabel: string
  onSave: (meta: NovelMeta, isPublic: boolean) => Promise<void>
}

export function NovelMetaForm({ initial = {}, initialPublic = false, submitLabel, onSave }: Props) {
  const [title, setTitle] = useState(initial.title ?? '')
  const [author, setAuthor] = useState(initial.author ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [cover, setCover] = useState(initial.cover_image ?? '')
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = NovelMetaSchema.safeParse({
      title,
      author: author.trim() || undefined,
      description: description.trim() || undefined,
      cover_image: cover.trim() || undefined,
    })
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))
      return
    }
    setErrors([])
    setStatus('saving')
    try {
      await onSave(parsed.data, isPublic)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch (err) {
      setErrors([(err as Error).message])
      setStatus('idle')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        className="w-full font-display text-2xl"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <input placeholder="Author (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <input
          placeholder="Cover image URL (optional)"
          value={cover}
          onChange={(e) => setCover(e.target.value)}
        />
      </div>
      <textarea
        className="w-full min-h-[6rem]"
        placeholder="Description shown on the book's page (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
        <input
          type="checkbox"
          className="size-4 accent-[var(--accent)]"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        Published
        <span className="text-muted">{isPublic ? 'anyone can read it' : 'draft, only you can see it'}</span>
      </label>
      {errors.length > 0 && (
        <ul className="text-sm text-danger space-y-1">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : submitLabel}
      </button>
    </form>
  )
}

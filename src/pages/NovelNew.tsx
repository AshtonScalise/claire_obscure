import { Link, useNavigate } from 'react-router-dom'
import { saveNovel } from '../lib/novels'
import { NovelMetaForm } from '../components/NovelMetaForm'

export function NovelNew() {
  const navigate = useNavigate()
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/" className="text-xs text-muted hover:text-ink">
          ← library
        </Link>
        <h1 className="font-display text-4xl mt-1">New novel</h1>
        <p className="text-muted mt-1">Start with the title. You'll add pages next, one JSON dump at a time.</p>
      </div>
      <NovelMetaForm
        submitLabel="Create novel"
        onSave={async (meta, isPublic) => {
          const row = await saveNovel(meta, isPublic)
          navigate(`/n/${row.id}/manage`)
        }}
      />
    </div>
  )
}

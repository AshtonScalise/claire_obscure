import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useNovel } from '../lib/useNovel'
import { addPages, updatePage, type PageRow } from '../lib/novels'
import { chaptersOf, positionsBetween } from '../lib/book'
import { parsePagesJson, splitChapter } from '../lib/schema'
import { PageView } from '../components/PageView'
import { EXAMPLE_PAGES } from '../data/example'

/** Loads the novel, then hands fully-known starting values to the editor. */
export function PageEdit() {
  const { id = '', pageId } = useParams()
  const [params] = useSearchParams()
  const { novel, pages, error, loading } = useNovel(id)

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (loading || !novel || !pages) return <p className="text-muted text-sm">Loading…</p>

  const editing = pageId ? pages.find((p) => p.id === pageId) : undefined
  if (pageId && !editing) return <p className="text-danger text-sm">That page no longer exists.</p>

  const lastChapter = pages.length ? pages[pages.length - 1].chapter : null
  const initialChapter = editing
    ? (editing.chapter ?? '')
    : params.has('chapter')
      ? (params.get('chapter') ?? '')
      : (lastChapter ?? '')

  return (
    <PageEditor
      key={pageId ?? 'new'}
      novelId={id}
      novelTitle={novel.title}
      pages={pages}
      editing={editing}
      initialChapter={initialChapter}
      afterId={params.get('after') ?? undefined}
      newChapter={params.get('newChapter') === '1'}
    />
  )
}

type EditorProps = {
  novelId: string
  novelTitle: string
  pages: PageRow[]
  editing?: PageRow
  initialChapter: string
  afterId?: string
  newChapter: boolean
}

function PageEditor({ novelId, novelTitle, pages, editing, initialChapter, afterId, newChapter }: EditorProps) {
  const navigate = useNavigate()
  const [chapter, setChapter] = useState(initialChapter)
  const [json, setJson] = useState(editing ? JSON.stringify(editing.data, null, 2) : '')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const existingChapters = useMemo(
    () => [...new Set(pages.map((p) => p.chapter).filter((c): c is string => Boolean(c)))],
    [pages],
  )
  const parsed = useMemo(() => (json.trim() ? parsePagesJson(json) : null), [json])
  const ready = parsed?.ok ? parsed.pages.map(splitChapter) : []
  // A "chapter" inside the JSON wins over the field, so pasted dumps keep their own chapter.
  const resolved = ready.map((p) => ({ ...p, chapter: p.chapter ?? (chapter.trim() || null) }))
  const preview = resolved[0]

  async function save() {
    if (!parsed) return setErrors(['Paste the page JSON first.'])
    if (!parsed.ok) return setErrors(parsed.errors)
    if (editing && resolved.length !== 1) return setErrors(['Editing takes exactly one page, not an array.'])
    setErrors([])
    setSaving(true)
    try {
      if (editing) {
        const target = resolved[0]
        const patch: Parameters<typeof updatePage>[1] = { chapter: target.chapter, data: target.data }
        // Moving a page into a different existing chapter puts it at the end of that chapter.
        if (target.chapter !== editing.chapter) {
          const others = pages.filter((p) => p.id !== editing.id)
          const block = [...chaptersOf(others)].reverse().find((c) => c.title === target.chapter)
          if (block) {
            const tail = others[block.start + block.count - 1]
            const next = others[block.start + block.count]
            patch.position = positionsBetween(tail.position, next?.position, 1)[0]
          }
        }
        await updatePage(editing.id, patch)
      } else {
        const positions = insertionPositions(pages, resolved[0].chapter, afterId, resolved.length)
        await addPages(
          novelId,
          resolved.map((p, i) => ({ chapter: p.chapter, data: p.data, position: positions[i] })),
        )
      }
      navigate(`/n/${novelId}/manage`)
    } catch (e) {
      setErrors([(e as Error).message])
      setSaving(false)
    }
  }

  const pageNumber = editing ? pages.indexOf(editing) + 1 : undefined

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Link to={`/n/${novelId}/manage`} className="text-xs text-muted hover:text-ink">
            ← {novelTitle}
          </Link>
          <h1 className="font-display text-4xl mt-1">{editing ? `Edit page ${pageNumber}` : 'Add page'}</h1>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-muted">Chapter</span>
          <input
            className="w-full"
            list="chapter-names"
            placeholder={newChapter ? 'Name the new chapter, e.g. Chapter 2: The Tide' : 'Chapter name (optional)'}
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            autoFocus={newChapter}
          />
          <datalist id="chapter-names">
            {existingChapters.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-muted">Page JSON {editing ? '' : '(one page, or an array of pages)'}</span>
          <textarea
            className="w-full min-h-[22rem] font-mono text-xs leading-relaxed"
            spellCheck={false}
            placeholder={JSON.stringify(EXAMPLE_PAGES[1], null, 2)}
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2 items-center">
          <button className="btn btn-primary" onClick={save} disabled={saving || !parsed?.ok}>
            {saving ? 'Saving…' : editing ? 'Save page' : resolved.length > 1 ? `Add ${resolved.length} pages` : 'Add page'}
          </button>
          {!json.trim() && !editing && (
            <button className="btn btn-ghost" onClick={() => setJson(JSON.stringify(EXAMPLE_PAGES[1], null, 2))}>
              Paste example
            </button>
          )}
          {parsed?.ok && (
            <button className="btn btn-ghost" onClick={() => setJson(JSON.stringify(JSON.parse(json), null, 2))}>
              Format
            </button>
          )}
          <Link to={`/n/${novelId}/manage`} className="btn btn-ghost">
            Cancel
          </Link>
        </div>

        {(errors.length > 0 || (parsed && !parsed.ok)) && (
          <ul className="text-sm text-danger space-y-1">
            {(errors.length ? errors : parsed && !parsed.ok ? parsed.errors : []).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
        {ready.some((p) => p.chapter) && (
          <p className="text-xs text-muted">The chapter inside the JSON is used for those pages instead of the field.</p>
        )}
      </div>

      <div>
        <div className="text-sm text-muted mb-2">
          Preview{resolved.length > 1 ? ` of page 1 of ${resolved.length}` : ''}
          {preview?.chapter ? ` · ${preview.chapter}` : ''}
        </div>
        <div className="rounded-lg border border-line bg-paper px-6 py-8 min-h-[22rem] text-[19px]">
          {preview ? (
            <PageView page={preview.data} chapterTitle={preview.chapter} chapterStart={startsChapter(pages, editing, preview.chapter)} />
          ) : (
            <p className="text-muted italic font-book">The page will appear here as you paste it.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Where new pages go: after a chosen page, else at the end of their chapter, else at the end of the book. */
function insertionPositions(pages: PageRow[], chapter: string | null, afterId: string | undefined, n: number) {
  let afterIndex = afterId ? pages.findIndex((p) => p.id === afterId) : -1
  if (afterIndex < 0) {
    const block = [...chaptersOf(pages)].reverse().find((c) => c.title === chapter)
    afterIndex = block ? block.start + block.count - 1 : pages.length - 1
  }
  return positionsBetween(pages[afterIndex]?.position, pages[afterIndex + 1]?.position, n)
}

/** True when this page would open its chapter, so the preview shows the chapter heading. */
function startsChapter(pages: PageRow[], editing: PageRow | undefined, chapter: string | null) {
  if (!chapter) return false
  if (!editing) return !pages.some((p) => p.chapter === chapter)
  const i = pages.indexOf(editing)
  return i === 0 || pages[i - 1].chapter !== chapter
}

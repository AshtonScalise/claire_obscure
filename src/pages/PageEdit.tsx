import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useNovel } from '../lib/useNovel'
import { addPages, updatePage, type PageRow } from '../lib/novels'
import { chaptersOf, positionsBetween } from '../lib/book'
import { PageInputSchema, parsePagesJson, splitChapter, type PageData } from '../lib/schema'
import { PageView } from '../components/PageView'
import { EXAMPLE_PAGES } from '../data/example'

/** Loads the book, then hands fully-known starting values to the editor. */
export function PageEdit() {
  const { id = '', pageId } = useParams()
  const [params] = useSearchParams()
  const { novel, pages, error, loading, isOwner } = useNovel(id)

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (loading || !novel || !pages) return <p className="text-muted text-sm">Loading…</p>
  if (!isOwner) return <p className="text-muted">Only the author of this book can edit it.</p>

  const editing = pageId ? pages.find((p) => p.id === pageId) : undefined
  if (pageId && !editing) return <p className="text-danger text-sm">That page no longer exists.</p>

  const lastChapter = pages.length ? pages[pages.length - 1].chapter : null
  const initialChapter = editing
    ? (editing.chapter ?? '')
    : params.has('chapter')
      ? (params.get('chapter') ?? '')
      : (lastChapter ?? 'Chapter 1')

  return (
    <PageEditor
      key={`${pageId ?? 'new'}:${params.get('after') ?? ''}:${initialChapter}`}
      novelId={id}
      novelTitle={novel.title}
      pages={pages}
      editing={editing}
      initialChapter={initialChapter}
      afterId={params.get('after') ?? undefined}
      startNewChapter={params.get('newChapter') === '1'}
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
  startNewChapter: boolean
}

type Mode = 'write' | 'json'
const NONE = '__none__'
const NEW = '__new__'

function PageEditor({ novelId, novelTitle, pages, editing, initialChapter, afterId, startNewChapter }: EditorProps) {
  const navigate = useNavigate()
  const existingChapters = useMemo(
    () => [...new Set(pages.map((p) => p.chapter).filter((c): c is string => Boolean(c)))],
    [pages],
  )

  // Chapter picker: an existing chapter, no chapter, or a new one typed in.
  const startsNew = startNewChapter || (initialChapter !== '' && !existingChapters.includes(initialChapter))
  const [chapterChoice, setChapterChoice] = useState(startsNew ? NEW : initialChapter || NONE)
  const [newChapterName, setNewChapterName] = useState(
    startNewChapter ? `Chapter ${existingChapters.length + 1}` : startsNew ? initialChapter : '',
  )
  const chapter = chapterChoice === NEW ? newChapterName.trim() : chapterChoice === NONE ? '' : chapterChoice

  const [mode, setMode] = useState<Mode>('write')
  const [title, setTitle] = useState(editing?.data.title ?? '')
  const [text, setText] = useState(editing?.data.text ?? '')
  const [image, setImage] = useState(editing?.data.image ?? '')
  const [caption, setCaption] = useState(editing?.data.caption ?? '')
  const [json, setJson] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Everything to be saved, from whichever tab is active. A "chapter" inside pasted JSON wins.
  const fromForm = useMemo(() => {
    const result = PageInputSchema.safeParse({
      title: title.trim() || undefined,
      text: text.trim() ? text : undefined,
      image: image.trim() || undefined,
      caption: caption.trim() || undefined,
    })
    return result.success
      ? { ok: true as const, pages: [{ chapter: chapter || null, data: splitChapter(result.data).data }] }
      : { ok: false as const, errors: result.error.issues.map((i) => (i.path.length ? `${String(i.path[0])}: ` : '') + i.message) }
  }, [title, text, image, caption, chapter])

  const fromJson = useMemo(() => {
    if (!json.trim()) return null
    const parsed = parsePagesJson(json)
    if (!parsed.ok) return parsed
    return {
      ok: true as const,
      pages: parsed.pages.map(splitChapter).map((p) => ({ ...p, chapter: p.chapter ?? (chapter || null) })),
    }
  }, [json, chapter])

  const draft = mode === 'write' ? fromForm : fromJson
  const ready = draft?.ok ? draft.pages : []
  const preview = ready[0]
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  function switchMode(next: Mode) {
    if (next === mode) return
    setErrors([])
    if (next === 'json' && fromForm.ok) {
      setJson(JSON.stringify({ chapter: chapter || undefined, ...fromForm.pages[0].data }, null, 2))
    }
    if (next === 'write' && fromJson?.ok && fromJson.pages.length === 1) {
      const p = fromJson.pages[0]
      setTitle(p.data.title ?? '')
      setText(p.data.text ?? '')
      setImage(p.data.image ?? '')
      setCaption(p.data.caption ?? '')
      if (p.chapter) {
        if (existingChapters.includes(p.chapter)) setChapterChoice(p.chapter)
        else {
          setChapterChoice(NEW)
          setNewChapterName(p.chapter)
        }
      }
    }
    setMode(next)
  }

  /** Wraps the selected words in a marker, or inserts a scene break. */
  function format(kind: 'italic' | 'bold' | 'scene') {
    const el = textRef.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    let next: string
    let cursor: [number, number]
    if (kind === 'scene') {
      const insert = '\n\n***\n\n'
      next = text.slice(0, a) + insert + text.slice(b)
      cursor = [a + insert.length, a + insert.length]
    } else {
      const mark = kind === 'bold' ? '**' : '*'
      const selected = text.slice(a, b) || (kind === 'bold' ? 'bold words' : 'italic words')
      next = text.slice(0, a) + mark + selected + mark + text.slice(b)
      cursor = [a + mark.length, a + mark.length + selected.length]
    }
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(...cursor)
    })
  }

  async function save(andNext: boolean) {
    if (!draft) return setErrors(['Paste the page JSON first.'])
    if (!draft.ok) return setErrors(draft.errors)
    if (editing && ready.length !== 1) return setErrors(['Editing changes one page, so paste a single page, not a list.'])
    if (chapterChoice === NEW && !newChapterName.trim()) return setErrors(['Give the new chapter a name.'])
    setErrors([])
    setSaving(true)
    try {
      if (editing) {
        const target = ready[0]
        const patch: Parameters<typeof updatePage>[1] = { chapter: target.chapter, data: target.data }
        // Moving a page into a different existing chapter puts it at the end of that chapter.
        if (target.chapter !== editing.chapter) {
          const others = pages.filter((p) => p.id !== editing.id)
          const block = [...chaptersOf(others)].reverse().find((c) => c.title === target.chapter)
          if (block) {
            const tail = others[block.start + block.count - 1]
            const following = others[block.start + block.count]
            patch.position = positionsBetween(tail.position, following?.position, 1)[0]
          }
        }
        await updatePage(editing.id, patch)
        navigate(`/n/${novelId}/manage`)
      } else {
        const positions = insertionPositions(pages, ready[0].chapter, afterId, ready.length)
        const saved = await addPages(
          novelId,
          ready.map((p, i) => ({ chapter: p.chapter, data: p.data as PageData, position: positions[i] })),
        )
        const lastSaved = saved[saved.length - 1]
        if (andNext && lastSaved)
          navigate(
            `/n/${novelId}/pages/new?chapter=${encodeURIComponent(lastSaved.chapter ?? '')}&after=${lastSaved.id}`,
          )
        else navigate(`/n/${novelId}/manage`)
      }
    } catch (e) {
      setErrors([(e as Error).message])
      setSaving(false)
    }
  }

  const pageNumber = editing ? pages.indexOf(editing) + 1 : undefined
  const shownErrors = errors.length ? errors : draft && !draft.ok && (mode === 'json' || text || image) ? draft.errors : []

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/n/${novelId}/manage`} className="text-xs text-muted hover:text-ink">
          ← back to {novelTitle}
        </Link>
        <h1 className="font-display text-4xl mt-1">{editing ? `Edit page ${pageNumber}` : 'Write a page'}</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <div className="space-y-5">
          <Field label="Chapter" hint="Pages in the same chapter are grouped together.">
            <div className="flex flex-col sm:flex-row gap-2">
              <select className="sm:w-1/2" value={chapterChoice} onChange={(e) => setChapterChoice(e.target.value)}>
                {existingChapters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={NEW}>➕ Start a new chapter…</option>
                <option value={NONE}>No chapter</option>
              </select>
              {chapterChoice === NEW && (
                <input
                  className="flex-1"
                  placeholder="e.g. Chapter 2: The Tide"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  autoFocus={startNewChapter}
                />
              )}
            </div>
          </Field>

          <div className="flex rounded-md border border-line p-0.5 text-sm w-fit">
            {(['write', 'json'] as Mode[]).map((m) => (
              <button
                key={m}
                className={`px-3 py-1 rounded cursor-pointer ${mode === m ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}
                onClick={() => switchMode(m)}
              >
                {m === 'write' ? '✍ Write' : '{ } Paste JSON'}
              </button>
            ))}
          </div>

          {mode === 'write' ? (
            <>
              <Field label="Page heading" optional>
                <input
                  className="w-full"
                  placeholder="Shown at the top of this page only"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>

              <Field label="Text" hint="Leave an empty line between paragraphs.">
                <div className="rounded-md border border-line focus-within:border-accent bg-card">
                  <div className="flex flex-wrap gap-1 border-b border-line px-2 py-1">
                    <ToolButton onClick={() => format('italic')} title="Select words, then click to make them italic">
                      <em>Italic</em>
                    </ToolButton>
                    <ToolButton onClick={() => format('bold')} title="Select words, then click to make them bold">
                      <strong>Bold</strong>
                    </ToolButton>
                    <ToolButton onClick={() => format('scene')} title="Insert a break between scenes">
                      * * * Scene break
                    </ToolButton>
                    <span className="ml-auto self-center text-xs text-muted tabular-nums">{words} words</span>
                  </div>
                  <textarea
                    ref={textRef}
                    className="w-full min-h-[18rem] border-0 bg-transparent font-book text-lg leading-relaxed focus:outline-none"
                    placeholder={'Once upon a time…\n\nA new paragraph starts after an empty line.'}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              </Field>

              <details className="rounded-md border border-line px-3 py-2" open={Boolean(image)}>
                <summary className="cursor-pointer text-sm">Add a picture (optional)</summary>
                <div className="mt-3 space-y-3">
                  <Field label="Picture link" hint="Paste a full web address of an image, starting with https://">
                    <input
                      className="w-full"
                      placeholder="https://…"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                    />
                  </Field>
                  <Field label="Caption" optional>
                    <input className="w-full" value={caption} onChange={(e) => setCaption(e.target.value)} />
                  </Field>
                </div>
              </details>
            </>
          ) : (
            <Field
              label="Page JSON"
              hint={
                editing
                  ? 'One page object.'
                  : 'One page, or a list [ … ] of pages to add them all at once. Use “Copy AI prompt” on the Edit book screen to turn a manuscript into this.'
              }
            >
              <textarea
                className="w-full min-h-[22rem] font-mono text-xs leading-relaxed"
                spellCheck={false}
                placeholder={JSON.stringify(EXAMPLE_PAGES[1], null, 2)}
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
              {!json.trim() && !editing && (
                <button className="btn btn-ghost mt-2" onClick={() => setJson(JSON.stringify(EXAMPLE_PAGES[1], null, 2))}>
                  Show an example
                </button>
              )}
            </Field>
          )}

          {shownErrors.length > 0 && (
            <ul className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger space-y-1">
              {shownErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {editing ? (
              <button className="btn btn-primary" onClick={() => save(false)} disabled={saving || !draft?.ok}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => save(true)} disabled={saving || !draft?.ok}>
                  {saving ? 'Saving…' : ready.length > 1 ? `Save ${ready.length} pages & write next` : 'Save & write next page'}
                </button>
                <button className="btn btn-ghost" onClick={() => save(false)} disabled={saving || !draft?.ok}>
                  Save & finish
                </button>
              </>
            )}
            <Link to={`/n/${novelId}/manage`} className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <div className="text-sm text-muted mb-2">
            Preview{ready.length > 1 ? ` of the first of ${ready.length} pages` : ''}
          </div>
          <div className="rounded-r-lg rounded-l-sm border border-line bg-paper px-8 py-10 min-h-[24rem] text-[18px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]">
            {preview ? (
              <PageView
                page={preview.data}
                chapterTitle={preview.chapter}
                chapterStart={startsChapter(pages, editing, preview.chapter)}
              />
            ) : (
              <p className="text-muted italic font-book">Start writing and the page appears here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </div>
      {children}
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  )
}

function ToolButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the text selection while clicking
      onClick={onClick}
      title={title}
      className="rounded px-2 py-1 text-sm text-muted hover:text-ink hover:bg-paper cursor-pointer"
    >
      {children}
    </button>
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

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useNovel } from '../lib/useNovel'
import { applyOrder, deleteNovel, deletePage, renameChapter, saveNovel, type PageRow } from '../lib/novels'
import { chaptersOf, pageSnippet, wordCount, type Chapter } from '../lib/book'
import { copyText } from '../lib/clipboard'
import { NovelMetaForm } from '../components/NovelMetaForm'
import { AI_PROMPT } from '../data/example'

export function NovelManage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { novel, pages, error, loading, reload, isOwner } = useNovel(id)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (loading || !novel || !pages) return <p className="text-muted text-sm">Loading…</p>
  if (!isOwner) return <p className="text-muted">Only the author of this book can edit it.</p>

  const chapters = chaptersOf(pages)
  const ids = pages.map((p) => p.id)
  const lastChapter = chapters[chapters.length - 1]
  const meta = { title: novel.title, ...novel.data }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      reload()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function swap(order: string[], a: number, b: number) {
    const next = [...order]
    ;[next[a], next[b]] = [next[b], next[a]]
    return next
  }
  function moveChapter(ci: number, dir: -1 | 1) {
    const blocks = chapters.map((c) => ids.slice(c.start, c.start + c.count))
    const order = swap(
      blocks.map((_, i) => String(i)),
      ci,
      ci + dir,
    ).flatMap((i) => blocks[Number(i)])
    run(() => applyOrder(pages!, order))
  }

  async function copyPrompt() {
    setCopied((await copyText(AI_PROMPT)) ? 'ok' : 'fail')
    setTimeout(() => setCopied(null), 2000)
  }

  const writeNext = `/n/${id}/pages/new?chapter=${encodeURIComponent(lastChapter?.title ?? 'Chapter 1')}`

  return (
    <div className="space-y-10 max-w-3xl">
      {/* Header: what this is, its state, and the main actions */}
      <div className="space-y-4">
        <Link to={`/n/${id}`} className="text-xs text-muted hover:text-ink">
          ← back to the book
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted">Editing</div>
            <h1 className="font-display text-4xl leading-tight">{novel.title}</h1>
            <p className="text-muted text-sm mt-1">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} · {chapters.filter((c) => c.title).length}{' '}
              {chapters.filter((c) => c.title).length === 1 ? 'chapter' : 'chapters'} ·{' '}
              {wordCount(pages).toLocaleString()} words
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={writeNext} className="btn btn-primary">
              + Write a page
            </Link>
            {pages.length > 0 && (
              <Link to={`/n/${id}/read?p=1`} className="btn btn-ghost">
                Read it
              </Link>
            )}
          </div>
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${novel.is_public ? 'border-emerald-600/40 bg-emerald-600/10' : 'border-line bg-card'}`}
        >
          <div className="text-sm">
            {novel.is_public ? (
              <>
                <strong>Published.</strong> Anyone can find and read this book.
              </>
            ) : (
              <>
                <strong>Draft.</strong> Only you can see this book until you publish it.
              </>
            )}
          </div>
          <button
            className={novel.is_public ? 'btn btn-ghost' : 'btn btn-primary'}
            disabled={busy || (!novel.is_public && pages.length === 0)}
            title={!novel.is_public && pages.length === 0 ? 'Write a page first' : undefined}
            onClick={() => run(async () => void (await saveNovel(meta, !novel.is_public, id)))}
          >
            {novel.is_public ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {actionError && <p className="text-danger text-sm">{actionError}</p>}

      {pages.length === 0 ? (
        <section className="rounded-lg border border-dashed border-line p-6 space-y-4">
          <h2 className="font-display text-2xl">Getting started</h2>
          <ol className="space-y-3">
            <Step done>Name your book</Step>
            <Step>
              <Link to={`/n/${id}/pages/new?chapter=Chapter%201`} className="text-accent hover:underline">
                Write your first page
              </Link>{' '}
              (it starts Chapter 1)
            </Step>
            <Step>Keep writing with “Save & write next page”</Step>
            <Step>Press Publish when you're ready to share</Step>
          </ol>
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Pages</h2>
          {chapters.map((c, ci) => (
            <ChapterBlock
              key={`${c.start}-${c.title}`}
              novelId={id}
              chapter={c}
              pages={pages.slice(c.start, c.start + c.count)}
              first={ci === 0}
              last={ci === chapters.length - 1}
              busy={busy}
              onRename={(to) => run(() => renameChapter(id, c.title, to))}
              onMoveChapter={(dir) => moveChapter(ci, dir)}
              onMovePage={(i, dir) => run(() => applyOrder(pages, swap(ids, c.start + i, c.start + i + dir)))}
              onDeletePage={(p) => {
                if (confirm(`Delete page ${pages.indexOf(p) + 1}? This can't be undone.`)) run(() => deletePage(p.id))
              }}
            />
          ))}
          <Link
            to={`/n/${id}/pages/new?newChapter=1&after=${pages[pages.length - 1].id}`}
            className="block rounded-lg border-2 border-dashed border-line px-4 py-4 text-center text-muted hover:border-accent hover:text-accent"
          >
            + Start a new chapter
          </Link>
        </section>
      )}

      <details className="rounded-lg border border-line bg-card px-4 py-3">
        <summary className="cursor-pointer font-display text-xl">Book details</summary>
        <p className="text-sm text-muted mt-2 mb-4">Title, author, description and cover shown in the library.</p>
        <NovelMetaForm
          initial={meta}
          initialPublic={novel.is_public}
          submitLabel="Save details"
          onSave={async (m, isPublic) => {
            await saveNovel(m, isPublic, id)
            reload()
          }}
        />
      </details>

      <details className="rounded-lg border border-line bg-card px-4 py-3">
        <summary className="cursor-pointer font-display text-xl">Advanced: import with JSON or AI</summary>
        <div className="mt-3 space-y-3 text-sm">
          <p>
            Already have the story in a document? Copy the prompt below, paste it into ChatGPT (or another AI) along
            with your text, and it gives back JSON. Then click <strong>Write a page</strong>, switch to the{' '}
            <strong>Paste JSON</strong> tab, and paste it. A list of pages is added all at once.
          </p>
          <button className="btn btn-ghost" onClick={copyPrompt}>
            {copied === 'ok' ? 'Copied!' : copied === 'fail' ? 'Copy failed' : 'Copy AI prompt'}
          </button>
        </div>
      </details>

      <section className="border-t border-line pt-6">
        <button
          className="btn btn-danger"
          disabled={busy}
          onClick={() => {
            if (confirm(`Delete "${novel.title}" and all of its pages? This can't be undone.`))
              run(async () => {
                await deleteNovel(id)
                navigate('/')
              })
          }}
        >
          Delete this book
        </button>
      </section>
    </div>
  )
}

function Step({ done = false, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-xs ${done ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}
      >
        {done ? '✓' : ''}
      </span>
      <span className={done ? 'text-muted line-through' : ''}>{children}</span>
    </li>
  )
}

type BlockProps = {
  novelId: string
  chapter: Chapter
  pages: PageRow[]
  first: boolean
  last: boolean
  busy: boolean
  onRename: (to: string | null) => void
  onMoveChapter: (dir: -1 | 1) => void
  onMovePage: (indexInChapter: number, dir: -1 | 1) => void
  onDeletePage: (page: PageRow) => void
}

function ChapterBlock({ novelId, chapter, pages, first, last, busy, ...on }: BlockProps) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(chapter.title ?? '')
  const lastPage = pages[pages.length - 1]

  return (
    <div className="rounded-lg border border-line bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-paper/60 border-b border-line">
        {renaming ? (
          <form
            className="flex flex-1 flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              on.onRename(name.trim() || null)
              setRenaming(false)
            }}
          >
            <input className="flex-1 min-w-[12rem]" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chapter name" autoFocus />
            <button className="btn btn-primary" type="submit">
              Save name
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h3 className="font-display text-xl flex-1 min-w-0 truncate">
              {chapter.title ?? <span className="text-muted italic">Pages without a chapter</span>}
            </h3>
            <span className="text-xs text-muted">
              {chapter.count === 1 ? `page ${chapter.start + 1}` : `pages ${chapter.start + 1}–${chapter.start + chapter.count}`}
            </span>
            <button className="btn btn-ghost py-1 text-xs" onClick={() => setRenaming(true)} disabled={busy}>
              Rename
            </button>
            <button className="btn-icon" onClick={() => on.onMoveChapter(-1)} disabled={busy || first} title="Move this chapter earlier">
              ↑
            </button>
            <button className="btn-icon" onClick={() => on.onMoveChapter(1)} disabled={busy || last} title="Move this chapter later">
              ↓
            </button>
          </>
        )}
      </div>

      <ol>
        {pages.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 px-4 py-2 border-b border-line last:border-b-0">
            <span className="w-14 shrink-0 text-xs text-muted tabular-nums">Page {chapter.start + i + 1}</span>
            <Link to={`/n/${novelId}/pages/${p.id}`} className="flex-1 min-w-0 truncate hover:text-accent">
              {p.data.title && <span className="font-medium">{p.data.title} · </span>}
              <span className="text-muted">{pageSnippet({ ...p.data, title: undefined }) || '(picture)'}</span>
            </Link>
            <Link to={`/n/${novelId}/pages/${p.id}`} className="btn btn-ghost py-1 text-xs">
              Edit
            </Link>
            <button className="btn-icon" onClick={() => on.onMovePage(i, -1)} disabled={busy || i === 0} title="Move page earlier">
              ↑
            </button>
            <button
              className="btn-icon"
              onClick={() => on.onMovePage(i, 1)}
              disabled={busy || i === pages.length - 1}
              title="Move page later"
            >
              ↓
            </button>
            <button className="btn-icon hover:text-danger" onClick={() => on.onDeletePage(p)} disabled={busy} title="Delete page">
              🗑
            </button>
          </li>
        ))}
      </ol>

      <div className="px-4 py-2">
        <Link
          to={`/n/${novelId}/pages/new?chapter=${encodeURIComponent(chapter.title ?? '')}&after=${lastPage.id}`}
          className="text-sm text-accent hover:underline"
        >
          + Add a page to {chapter.title ? 'this chapter' : 'this section'}
        </Link>
      </div>
    </div>
  )
}

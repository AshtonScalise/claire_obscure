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
  const { novel, pages, error, loading, reload } = useNovel(id)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (loading || !novel || !pages) return <p className="text-muted text-sm">Loading…</p>

  const chapters = chaptersOf(pages)

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

  const ids = pages.map((p) => p.id)
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

  const lastChapter = chapters[chapters.length - 1]
  const lastPage = pages[pages.length - 1]

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to={`/n/${id}`} className="text-xs text-muted hover:text-ink">
            ← {novel.title}
          </Link>
          <h1 className="font-display text-4xl mt-1">Manage</h1>
          <p className="text-muted text-sm mt-1">
            {pages.length} pages · {chapters.filter((c) => c.title).length} chapters · {wordCount(pages).toLocaleString()} words
          </p>
        </div>
        <div className="flex gap-2">
          {pages.length > 0 && (
            <Link to={`/n/${id}/read?p=1`} className="btn btn-ghost">
              Read
            </Link>
          )}
          <button className="btn btn-ghost" onClick={copyPrompt} title="Prompt that turns manuscript text into page JSON">
            {copied === 'ok' ? 'Copied!' : copied === 'fail' ? 'Copy failed' : 'Copy AI prompt'}
          </button>
        </div>
      </div>

      <section className="max-w-2xl">
        <h2 className="font-display text-2xl mb-3">Details</h2>
        <NovelMetaForm
          initial={{ title: novel.title, ...novel.data }}
          initialPublic={novel.is_public}
          submitLabel="Save details"
          onSave={async (meta, isPublic) => {
            await saveNovel(meta, isPublic, id)
            reload()
          }}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl">Chapters and pages</h2>
          <div className="flex gap-2">
            <Link
              to={`/n/${id}/pages/new?chapter=${encodeURIComponent(lastChapter?.title ?? '')}`}
              className="btn btn-primary"
            >
              + Page
            </Link>
            <Link to={`/n/${id}/pages/new?chapter=&newChapter=1`} className="btn btn-ghost">
              + New chapter
            </Link>
          </div>
        </div>
        {actionError && <p className="text-danger text-sm">{actionError}</p>}
        {pages.length === 0 && (
          <p className="text-muted">
            No pages yet. Add the first one, paste its JSON, and give it a chapter name to start Chapter 1.
          </p>
        )}

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
              if (confirm(`Delete page ${pages.indexOf(p) + 1}?`)) run(() => deletePage(p.id))
            }}
          />
        ))}
        {lastPage && <p className="text-xs text-muted">Tip: paste an array of pages to add several at once.</p>}
      </section>

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
          Delete novel
        </button>
      </section>
    </div>
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
    <div className="rounded-lg border border-line bg-card">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-line">
        {renaming ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              on.onRename(name.trim() || null)
              setRenaming(false)
            }}
          >
            <input className="flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chapter name" autoFocus />
            <button className="btn btn-primary" type="submit">
              Save
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h3 className="font-display text-xl flex-1">
              {chapter.title ?? <span className="text-muted italic">No chapter</span>}
            </h3>
            <span className="text-xs text-muted">
              pages {chapter.start + 1}–{chapter.start + chapter.count}
            </span>
            <button className="btn-icon" onClick={() => setRenaming(true)} disabled={busy} title="Rename chapter">
              ✎
            </button>
            <button className="btn-icon" onClick={() => on.onMoveChapter(-1)} disabled={busy || first} title="Move chapter up">
              ↑
            </button>
            <button className="btn-icon" onClick={() => on.onMoveChapter(1)} disabled={busy || last} title="Move chapter down">
              ↓
            </button>
          </>
        )}
      </div>

      <ol>
        {pages.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 px-4 py-2 border-b border-line last:border-b-0">
            <span className="w-10 text-xs text-muted tabular-nums">{chapter.start + i + 1}</span>
            <Link to={`/n/${novelId}/pages/${p.id}`} className="flex-1 min-w-0 truncate hover:text-accent">
              {p.data.title && <span className="font-medium">{p.data.title} · </span>}
              <span className="text-muted">{pageSnippet({ ...p.data, title: undefined })}</span>
            </Link>
            <button className="btn-icon" onClick={() => on.onMovePage(i, -1)} disabled={busy || i === 0} title="Move page up">
              ↑
            </button>
            <button
              className="btn-icon"
              onClick={() => on.onMovePage(i, 1)}
              disabled={busy || i === pages.length - 1}
              title="Move page down"
            >
              ↓
            </button>
            <button className="btn-icon hover:text-danger" onClick={() => on.onDeletePage(p)} disabled={busy} title="Delete page">
              ✕
            </button>
          </li>
        ))}
      </ol>

      <div className="px-4 py-2">
        <Link
          to={`/n/${novelId}/pages/new?chapter=${encodeURIComponent(chapter.title ?? '')}&after=${lastPage.id}`}
          className="text-sm text-accent hover:underline"
        >
          + Add page to this chapter
        </Link>
      </div>
    </div>
  )
}

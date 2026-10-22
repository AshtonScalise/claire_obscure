import type { PageData } from '../lib/schema'
import { RichText } from './RichText'

type Props = {
  page: PageData
  /** shown as a chapter opening when this is the chapter's first page */
  chapterTitle?: string | null
  chapterStart?: boolean
}

export function PageView({ page, chapterTitle, chapterStart = false }: Props) {
  const opening = chapterStart && Boolean(chapterTitle)
  return (
    <article className="reading">
      {opening && (
        <header className="mb-10 mt-4 text-center">
          <div className="text-accent text-2xl" aria-hidden>
            ❦
          </div>
          <h2 className="font-display text-[1.9em] leading-tight mt-2">{chapterTitle}</h2>
        </header>
      )}
      {page.title && <h3 className="font-display text-[1.35em] leading-snug mb-5">{page.title}</h3>}
      {page.image && (
        <figure className="mb-6">
          <img
            src={page.image}
            alt={page.caption ?? ''}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full max-h-[60vh] object-contain rounded-md border border-line bg-card"
          />
          {page.caption && (
            <figcaption className="mt-2 text-center text-[0.85em] italic text-muted">{page.caption}</figcaption>
          )}
        </figure>
      )}
      {page.text && <RichText text={page.text} dropCap={opening} />}
    </article>
  )
}

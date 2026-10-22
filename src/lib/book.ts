import type { PageData } from './schema'

export type BookPage = { id?: string; chapter: string | null; data: PageData }

export type Chapter = { title: string | null; start: number; count: number }

/** Consecutive pages with the same chapter name form one chapter. */
export function chaptersOf(pages: { chapter: string | null }[]): Chapter[] {
  const chapters: Chapter[] = []
  pages.forEach((p, i) => {
    const last = chapters[chapters.length - 1]
    if (last && last.title === p.chapter) last.count++
    else chapters.push({ title: p.chapter, start: i, count: 1 })
  })
  return chapters
}

export function chapterAt(chapters: Chapter[], index: number): Chapter | undefined {
  return chapters.find((c) => index >= c.start && index < c.start + c.count)
}

/** `n` sort positions strictly between `prev` and `next` (either may be missing). */
export function positionsBetween(prev: number | undefined, next: number | undefined, n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    if (prev === undefined && next === undefined) out.push(i + 1)
    else if (next === undefined) out.push(prev! + i + 1)
    else if (prev === undefined) out.push(next - (n - i))
    else out.push(prev + ((next - prev) * (i + 1)) / (n + 1))
  }
  return out
}

export function wordCount(pages: { data: PageData }[]): number {
  return pages.reduce((sum, p) => sum + (p.data.text?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0)
}

/** First readable line of a page, for lists. */
export function pageSnippet(page: PageData, max = 90): string {
  const source = page.title || page.text || page.caption || page.image || ''
  const line = source.replace(/[*_]/g, '').replace(/\s+/g, ' ').trim()
  return line.length > max ? line.slice(0, max - 1) + '…' : line
}

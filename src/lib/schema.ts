import { z } from 'zod'

const httpUrl = z.url({ message: 'must be a full https:// link', protocol: /^https?$/ })

/** One page as pasted: a JSON object, or just a string of text. */
export const PageInputSchema = z
  .object({
    /** pages with the same chapter name are grouped into that chapter */
    chapter: z.string().optional(),
    /** heading shown at the top of this page */
    title: z.string().optional(),
    /** paragraphs separated by a blank line; *italic*, **bold**, *** for a scene break */
    text: z.string().optional(),
    image: httpUrl.optional(),
    caption: z.string().optional(),
  })
  .refine((p) => Boolean(p.text?.trim() || p.image), { message: 'a page needs "text" or an "image"' })

export type PageInput = z.infer<typeof PageInputSchema>
export type PageData = Omit<PageInput, 'chapter'>

export type ParsedPages = { ok: true; pages: PageInput[] } | { ok: false; errors: string[] }

/** Accepts one page object, a plain string, or an array of either. */
export function parsePagesJson(text: string): ParsedPages {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, errors: ['Paste a page as JSON.'] }
  let value: unknown
  try {
    value = JSON.parse(trimmed)
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${(e as Error).message}`] }
  }
  const items = Array.isArray(value) ? value : [value]
  if (items.length === 0) return { ok: false, errors: ['The array has no pages.'] }

  const pages: PageInput[] = []
  const errors: string[] = []
  items.forEach((item, i) => {
    const result = PageInputSchema.safeParse(typeof item === 'string' ? { text: item } : item)
    const where = items.length > 1 ? `page ${i + 1}` : 'page'
    if (result.success) pages.push(result.data)
    else
      errors.push(
        ...result.error.issues.map((iss) => `${where}${iss.path.length ? '.' + iss.path.join('.') : ''}: ${iss.message}`),
      )
  })
  return errors.length ? { ok: false, errors } : { ok: true, pages }
}

/** Separates the chapter (stored in its own column) from the page content. */
export function splitChapter(page: PageInput): { chapter: string | null; data: PageData } {
  const { chapter, ...rest } = page
  const data = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined && v !== ''),
  ) as PageData
  return { chapter: chapter?.trim() || null, data }
}

export const NovelMetaSchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
  author: z.string().optional(),
  description: z.string().optional(),
  cover_image: httpUrl.optional(),
})

export type NovelMeta = z.infer<typeof NovelMetaSchema>

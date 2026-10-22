import { supabase } from './supabase'
import type { NovelMeta, PageData } from './schema'

export type NovelData = Omit<NovelMeta, 'title'>

export type NovelRow = {
  id: string
  title: string
  data: NovelData
  is_public: boolean
  created_at: string
  updated_at: string
}

export type PageRow = {
  id: string
  novel_id: string
  position: number
  chapter: string | null
  data: PageData
  created_at: string
  updated_at: string
}

/** Published novels for readers; admins also get drafts (row-level security decides). */
export async function listNovels(): Promise<NovelRow[]> {
  const { data, error } = await supabase.from('novels').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data as NovelRow[]
}

export async function getNovel(id: string): Promise<NovelRow> {
  const { data, error } = await supabase.from('novels').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Novel not found, or it is not published yet.')
  return data as NovelRow
}

export async function saveNovel(meta: NovelMeta, isPublic: boolean, id?: string): Promise<NovelRow> {
  const { title, ...rest } = meta
  const payload = { title, data: rest, is_public: isPublic }
  const query = id ? supabase.from('novels').update(payload).eq('id', id) : supabase.from('novels').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data as NovelRow
}

export async function deleteNovel(id: string): Promise<void> {
  const { error } = await supabase.from('novels').delete().eq('id', id)
  if (error) throw error
}

export async function listPages(novelId: string): Promise<PageRow[]> {
  const { data, error } = await supabase
    .from('novel_pages')
    .select('*')
    .eq('novel_id', novelId)
    .order('position', { ascending: true })
  if (error) throw error
  return data as PageRow[]
}

export async function addPages(
  novelId: string,
  pages: { chapter: string | null; data: PageData; position: number }[],
): Promise<void> {
  const { error } = await supabase.from('novel_pages').insert(pages.map((p) => ({ ...p, novel_id: novelId })))
  if (error) throw error
}

export async function updatePage(
  id: string,
  patch: { chapter?: string | null; data?: PageData; position?: number },
): Promise<void> {
  const { error } = await supabase.from('novel_pages').update(patch).eq('id', id)
  if (error) throw error
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase.from('novel_pages').delete().eq('id', id)
  if (error) throw error
}

/** Saves a new reading order: page ids in order. Only pages whose position changes are written. */
export async function applyOrder(pages: PageRow[], orderedIds: string[]): Promise<void> {
  const byId = new Map(pages.map((p) => [p.id, p]))
  for (const [i, id] of orderedIds.entries()) {
    const position = i + 1
    if (byId.get(id)?.position !== position) await updatePage(id, { position })
  }
}

export async function renameChapter(novelId: string, from: string | null, to: string | null): Promise<void> {
  let query = supabase.from('novel_pages').update({ chapter: to }).eq('novel_id', novelId)
  query = from === null ? query.is('chapter', null) : query.eq('chapter', from)
  const { error } = await query
  if (error) throw error
}

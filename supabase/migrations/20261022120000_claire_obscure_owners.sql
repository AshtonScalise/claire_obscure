-- Claire Obscure: per-account books, like mAI Cookbook. Anyone can sign up; each account owns its
-- novels and their pages; published novels are readable by everyone, drafts only by their owner.
-- Replaces the earlier admin-only model (the tables were still empty when this ran).

drop policy if exists "read published novels, admins read all" on public.novels;
drop policy if exists "admins insert novels" on public.novels;
drop policy if exists "admins update novels" on public.novels;
drop policy if exists "admins delete novels" on public.novels;
drop policy if exists "read pages of published novels, admins read all" on public.novel_pages;
drop policy if exists "admins insert pages" on public.novel_pages;
drop policy if exists "admins update pages" on public.novel_pages;
drop policy if exists "admins delete pages" on public.novel_pages;

drop function if exists public.is_novel_admin();
drop table if exists public.novel_admins;

alter table public.novels drop column if exists created_by;
alter table public.novels
  add column if not exists user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
create index if not exists novels_user_id_idx on public.novels (user_id);

create policy "read published novels and your own" on public.novels
  for select to anon, authenticated using (is_public or user_id = (select auth.uid()));
create policy "insert your own novels" on public.novels
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update your own novels" on public.novels
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete your own novels" on public.novels
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "read pages of published novels and your own" on public.novel_pages
  for select to anon, authenticated using (
    exists (
      select 1 from public.novels n
      where n.id = novel_id and (n.is_public or n.user_id = (select auth.uid()))
    )
  );
create policy "insert pages into your own novels" on public.novel_pages
  for insert to authenticated with check (
    exists (select 1 from public.novels n where n.id = novel_id and n.user_id = (select auth.uid()))
  );
create policy "update pages of your own novels" on public.novel_pages
  for update to authenticated
  using (exists (select 1 from public.novels n where n.id = novel_id and n.user_id = (select auth.uid())))
  with check (exists (select 1 from public.novels n where n.id = novel_id and n.user_id = (select auth.uid())));
create policy "delete pages of your own novels" on public.novel_pages
  for delete to authenticated using (
    exists (select 1 from public.novels n where n.id = novel_id and n.user_id = (select auth.uid()))
  );

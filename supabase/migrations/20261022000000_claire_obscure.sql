-- Claire Obscure: novel admins write, anyone reads published novels.
-- Tables are prefixed so they can share a Supabase project with other apps (it lives in the
-- mai-cookbook project). Writes are allowed only for users listed in public.novel_admins, so
-- accounts created elsewhere in the project (e.g. cookbook sign-ups) cannot write novels.

create table if not exists public.novel_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.novel_admins enable row level security;
-- Admins are added with SQL only (see README). Users can see whether they themselves are one.
create policy "users see their own novel admin row" on public.novel_admins
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.novel_admins to authenticated;

create or replace function public.is_novel_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.novel_admins where user_id = (select auth.uid()))
$$;
grant execute on function public.is_novel_admin() to anon, authenticated;

create table if not exists public.novels (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  data jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.novel_pages (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  position double precision not null,
  chapter text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists novel_pages_position_idx on public.novel_pages (novel_id, position);
create index if not exists novels_public_updated_idx on public.novels (updated_at desc) where is_public;

alter table public.novels enable row level security;
alter table public.novel_pages enable row level security;

create policy "read published novels, admins read all" on public.novels
  for select to anon, authenticated using (is_public or (select public.is_novel_admin()));
create policy "admins insert novels" on public.novels
  for insert to authenticated with check ((select public.is_novel_admin()));
create policy "admins update novels" on public.novels
  for update to authenticated using ((select public.is_novel_admin())) with check ((select public.is_novel_admin()));
create policy "admins delete novels" on public.novels
  for delete to authenticated using ((select public.is_novel_admin()));

create policy "read pages of published novels, admins read all" on public.novel_pages
  for select to anon, authenticated using (
    (select public.is_novel_admin())
    or exists (select 1 from public.novels n where n.id = novel_id and n.is_public)
  );
create policy "admins insert pages" on public.novel_pages
  for insert to authenticated with check ((select public.is_novel_admin()));
create policy "admins update pages" on public.novel_pages
  for update to authenticated using ((select public.is_novel_admin())) with check ((select public.is_novel_admin()));
create policy "admins delete pages" on public.novel_pages
  for delete to authenticated using ((select public.is_novel_admin()));

grant select on public.novels, public.novel_pages to anon, authenticated;
grant insert, update, delete on public.novels, public.novel_pages to authenticated;

create or replace function public.novel_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists novels_set_updated_at on public.novels;
create trigger novels_set_updated_at before update on public.novels
  for each row execute function public.novel_set_updated_at();

drop trigger if exists novel_pages_set_updated_at on public.novel_pages;
create trigger novel_pages_set_updated_at before update on public.novel_pages
  for each row execute function public.novel_set_updated_at();

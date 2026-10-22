# Claire Obscure

A digital novel reader. Admins build a book page by page: each page is a JSON dump, and pages are grouped into chapters by name. Readers open the site and read, no account needed: page turning with buttons, arrow keys or swipes, a chapter menu, adjustable text size, light and dark pages, and the reader's place remembered.

## Page JSON

```json
{
  "chapter": "Chapter 1: The Lantern Keeper",
  "title": "The ship without lights",
  "text": "First paragraph.\n\nSecond paragraph with *italics* and **bold**.\n\n***\n\nAfter a scene break.",
  "image": "https://example.com/illustration.jpg",
  "caption": "Under the image"
}
```

Only `text` or `image` is required. Pages with the same `chapter` form a chapter, in the order they appear. A plain string works as a page of text, and an array adds several pages at once. The **Copy AI prompt** button on a novel's Manage screen gives a prompt that turns manuscript text into this format.

Formatting inside `text`: blank line between paragraphs, `*italic*` or `_italic_`, `**bold**`, and a line of `***` for a scene break. Nothing is rendered as HTML.

## Admin only

Readers never sign in. Writing is limited to novel admins, enforced by row-level security.

The database lives in the **mai-cookbook** Supabase project (free tier allows two projects), in tables prefixed for this app: `novel_admins`, `novels`, `novel_pages`. That project's GitHub integration applies the schema from the mai-cookbook repo; `supabase/migrations/` here is a copy for reference or for moving to a dedicated project later.

There is no sign-up form here. Admins sign in with a **username**: the login page turns `name` into the address `name@claire-obscure.app` (never emailed; full emails also work). Create the admin in that project under *Authentication → Users → Add user* with that address and **Auto Confirm User** ticked, then mark them as a novel admin in the SQL editor:

```sql
insert into public.novel_admins (user_id)
select id from auth.users where email = 'name@claire-obscure.app';
```

Accounts that only exist for the cookbook are not novel admins, so they can read but never write.

Novels start as drafts that only admins can see. Tick **Published** to make one public.

## Stack

Vite + React + TypeScript + Tailwind v4, Supabase (auth + Postgres), hosted on Vercel. Same setup as mAI Cookbook.

## Setup

1. Use a Supabase project with `supabase/migrations/` applied (currently the shared mai-cookbook project).
2. Copy `.env.example` to `.env` with the project URL and publishable key.
3. `npm install`, then `npm run dev`. Without `.env`, `/preview` shows the reader with a sample book.

## Deploy

Import the repo in Vercel (Vite preset). `.env.production` holds the public Supabase URL and publishable key, so no environment variables are needed. Sign-in is email and password only, so no auth redirect URLs are needed.

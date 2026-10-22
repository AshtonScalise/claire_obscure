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

Readers never sign in. Writing is limited to admins, enforced by row-level security:

- Public sign-ups are off (*Authentication → Sign In / Providers → Allow new users to sign up*).
- Create an admin in *Authentication → Users → Add user*, then mark them as an admin in the SQL editor:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'admin@example.com';
```

Novels start as drafts that only admins can see. Tick **Published** to make one public.

## Stack

Vite + React + TypeScript + Tailwind v4, Supabase (auth + Postgres), hosted on Vercel. Same setup as mAI Cookbook.

## Setup

1. Create a Supabase project and apply `supabase/migrations/` (GitHub integration with *Deploy to production* on `main`, or paste into the SQL editor).
2. Copy `.env.example` to `.env` with the project URL and publishable key.
3. `npm install`, then `npm run dev`. Without `.env`, `/preview` shows the reader with a sample book.

## Deploy

Import the repo in Vercel (Vite preset). `.env.production` holds the public Supabase URL and publishable key, so no environment variables are needed. Set the Supabase *Site URL* to the Vercel URL.

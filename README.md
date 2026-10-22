# Clair-Obscur

(Repository name: `claire_obscure`.)

A digital novel site. Anyone can sign up and write their own books, page by page: each page is a JSON dump, and pages are grouped into chapters by name. Readers open the site and read, no account needed: page turning with buttons, arrow keys or swipes, a chapter menu, adjustable text size, light and dark pages, and the reader's place remembered.

## Writing

Click **New novel**, name it, and you land on page 1. The page editor is a normal form: pick or start a chapter, add an optional heading, write the text (Italic, Bold and Scene break buttons do the formatting), and optionally add a picture link. A live preview shows the page as readers will see it. **Save & write next page** keeps you writing; **Edit book** lists every chapter and page to rename, reorder, edit or delete, and has the **Publish** button.

Prefer JSON? Every page editor has a **Paste JSON** tab, described below.

## Reading

Each book shows as a 3D hardback that swings open when you start reading. Pages turn with a GSAP page flip (skipped when the system asks for reduced motion), with arrow keys, swipes, or the Previous / Next buttons.

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

## Accounts

Works like mAI Cookbook: anyone can create an account (Discord, email and password, or a magic link), and every account owns its books. The first Discord sign-in creates the account. Only a book's author can edit it, enforced by row-level security. Readers never need an account for published books.

New books start as drafts that only their author can see. Tick **Published** to make one public. Signed-in users get **My books** and **Everyone** tabs in the library.

The database lives in the **mai-cookbook** Supabase project (the free tier allows two projects), in the tables `novels` and `novel_pages`. That project's GitHub integration applies the schema from the mai-cookbook repo; `supabase/migrations/` here is a copy for reference or for moving to a dedicated project later. Sign-up emails and Discord sign-in need this site's URL in that project's *Authentication → URL Configuration → Redirect URLs*. Discord also needs the provider enabled under *Authentication → Sign In / Providers → Discord*, with a Discord app whose OAuth2 redirect is `https://<project-ref>.supabase.co/auth/v1/callback`.

## Stack

Vite + React + TypeScript + Tailwind v4, Supabase (auth + Postgres), hosted on Vercel. Same setup as mAI Cookbook.

## Setup

1. Use a Supabase project with `supabase/migrations/` applied (currently the shared mai-cookbook project).
2. Copy `.env.example` to `.env` with the project URL and publishable key.
3. `npm install`, then `npm run dev`. Without `.env`, `/preview` shows the reader with a sample book.

## Deploy

Import the repo in Vercel (Vite preset). `.env.production` holds the public Supabase URL and publishable key, so no environment variables are needed. Add the Vercel URL to the Supabase redirect URLs so sign-up and magic-link emails land back here.

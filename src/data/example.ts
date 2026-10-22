import type { PageInput } from '../lib/schema'

/** A short original sample, used for the setup preview and the "Paste example" button. */
export const EXAMPLE_PAGES: PageInput[] = [
  {
    chapter: 'Chapter 1: The Lantern Keeper',
    text: `The lighthouse at Vell had not been lit in eleven years, and still Odile climbed its stairs every evening at dusk.

She counted them as she went. Two hundred and twelve. Her grandmother had counted them too, and her mother, and the habit had passed down the way some families pass down a nose or a temper.

At the top she wiped the great lens with a cloth gone soft from washing, and she looked out at the water, and she waited for nothing in particular.`,
  },
  {
    chapter: 'Chapter 1: The Lantern Keeper',
    title: 'The ship without lights',
    text: `On the night of the first frost, something answered.

It was a ship, low and dark, sliding across the bay without a single lamp aboard. Odile watched it the way you watch a cat that has decided you exist. *It shouldn't be able to see the rocks,* she thought. *Nobody can, without the light.*

The ship turned anyway, neat as a needle, and threaded the reef.

* * *

In the morning there was a letter on the bottom stair, sealed with grey wax and addressed, in a hand she did not know, **To the Keeper.**`,
  },
  {
    chapter: 'Chapter 2: Grey Wax',
    text: `The letter said only: *Light it tomorrow. We are coming home.*

Odile read it four times, then folded it into her apron pocket, where it sat against her ribs all day like a second heartbeat.`,
  },
]

/** Paste into ChatGPT (or any model) to turn manuscript text into page JSON this site accepts. */
export const AI_PROMPT = `Turn the text below into pages for my digital novel. Return JSON only: an array of page objects in reading order.

Each page object:
{
  "chapter": string,
  "title": string (optional),
  "text": string,
  "image": string (optional),
  "caption": string (optional)
}

Rules:
- "chapter" is the chapter the page belongs to, e.g. "Chapter 1: The Lantern Keeper". Use exactly the same string for every page in that chapter.
- "title" is an optional heading shown at the top of that one page. Leave it out unless the text has one.
- Keep the author's words exactly. Do not rewrite, summarize, or add anything.
- About 250 to 350 words per page. Only break pages between paragraphs.
- Separate paragraphs with a blank line (\\n\\n). Use *single asterisks* for italics and **double asterisks** for bold. Put *** alone on a line for a scene break.
- "image" is a full https:// link to an illustration, only if I give you one. "caption" goes under the image.
- No markdown fences, no commentary.

Example of a correct answer:
${JSON.stringify(EXAMPLE_PAGES.slice(0, 2), null, 2)}

Text:
`

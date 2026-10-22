/**
 * Converts between the stored page text (paragraphs separated by blank lines, *italic*, **bold**,
 * and *** as a scene break) and the HTML the visual editor works with.
 */

const SCENE_BREAK = /^\s*(\*\s*\*\s*\*|-{3,}|⁂|#)\s*$/

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Inline markers to HTML: **bold** (which may contain *italic*), then *italic* / _italic_. */
export function inlineToHtml(line: string): string {
  return escapeHtml(line)
    .replace(/\*\*([^*\n]+?)\*\*/g, (_, inner: string) => `<strong>${italics(inner)}</strong>`)
    .replace(/(^|[^*])\*([^*\s][^*\n]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_([^_\s][^_\n]*?)_(?![\w_])/g, '$1<em>$2</em>')
}

function italics(s: string) {
  return s.replace(/\*([^*\s][^*\n]*?)\*/g, '<em>$1</em>').replace(/_([^_\s][^_\n]*?)_/g, '<em>$1</em>')
}

export function textToHtml(text: string): string {
  const blocks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  if (blocks.length === 0) return '<p><br></p>'
  return blocks
    .map((b) => (SCENE_BREAK.test(b) ? '<hr>' : `<p>${b.split('\n').map(inlineToHtml).join('<br>')}</p>`))
    .join('')
}

type Run = { text: string; bold: boolean; italic: boolean }

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'UL', 'OL'])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE'])

function styleFlags(el: HTMLElement, bold: boolean, italic: boolean) {
  const tag = el.tagName
  const weight = el.style?.fontWeight
  const fontStyle = el.style?.fontStyle
  // Google Docs wraps whole documents in <b style="font-weight:normal">, so inline styles win over tags.
  if (weight) bold = weight === 'bold' || weight === 'bolder' || Number(weight) >= 600
  else if (tag === 'B' || tag === 'STRONG') bold = true
  if (fontStyle) italic = fontStyle === 'italic' || fontStyle === 'oblique'
  else if (tag === 'I' || tag === 'EM') italic = true
  return { bold, italic }
}

/** Wraps a run in markers, keeping spaces outside them so the markers stay valid. */
function emitRun(run: Run): string {
  if (!run.bold && !run.italic) return run.text
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text)!
  if (!m[2]) return run.text
  let core = m[2]
  // Bold + italic is stored as **_words_** so neither marker swallows the other.
  if (run.italic) core = run.bold ? `_${core}_` : `*${core}*`
  if (run.bold) core = `**${core}**`
  return m[1] + core + m[3]
}

/** Serializes editor (or pasted) HTML back into stored page text. */
export function htmlToText(root: Node): string {
  const blocks: string[] = []
  let runs: Run[] = []

  const flush = () => {
    // Merge neighbouring runs with the same style so markers don't collide (*a**b* would read as bold).
    const merged: Run[] = []
    for (const r of runs) {
      const last = merged[merged.length - 1]
      if (last && last.bold === r.bold && last.italic === r.italic) last.text += r.text
      else merged.push({ ...r })
    }
    const text = merged
      .map((r) => r.text.split('\n').map((part) => emitRun({ ...r, text: part })).join('\n'))
      .join('')
      .replace(/[ \t ]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim()
    if (text) blocks.push(text)
    runs = []
  }

  const walk = (node: Node, bold: boolean, italic: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').replace(/[\r\n]+/g, ' ')
      if (text) runs.push({ text, bold, italic })
      return
    }
    if (!(node instanceof HTMLElement)) {
      node.childNodes.forEach((c) => walk(c, bold, italic))
      return
    }
    const tag = node.tagName
    if (SKIP_TAGS.has(tag)) return
    if (tag === 'BR') return void runs.push({ text: '\n', bold: false, italic: false })
    if (tag === 'HR') {
      flush()
      blocks.push('***')
      return
    }
    const flags = styleFlags(node, bold, italic)
    const isBlock = BLOCK_TAGS.has(tag)
    if (isBlock) flush()
    node.childNodes.forEach((c) => walk(c, flags.bold, flags.italic))
    if (isBlock) flush()
  }

  walk(root, false, false)
  flush()
  return blocks.join('\n\n')
}

/** Pasted HTML (Google Docs, Word, web pages) to stored text, keeping only bold, italics and paragraphs. */
export function pastedHtmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return htmlToText(doc.body)
}

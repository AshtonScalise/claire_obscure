import type { ReactNode } from 'react'

const SCENE_BREAK = /^\s*(\*\s*\*\s*\*|-{3,}|⁂|#)\s*$/
const EMPHASIS = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g

function inline(line: string, keyBase: string): ReactNode[] {
  return line.split(EMPHASIS).map((part, i) => {
    const key = `${keyBase}-${i}`
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>
    if (/^\*[^*]+\*$/.test(part) || /^_[^_]+_$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>
    return part
  })
}

/**
 * Book text: paragraphs split on blank lines, single newlines kept as line breaks,
 * *italic* / _italic_, **bold**, and a line of *** (or ---) as a scene break.
 * Everything renders as text nodes; no HTML from the page is ever injected.
 */
export function RichText({ text, dropCap = false }: { text: string; dropCap?: boolean }) {
  const blocks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  const firstProse = blocks.findIndex((b) => !SCENE_BREAK.test(b))

  return (
    <>
      {blocks.map((block, i) => {
        if (SCENE_BREAK.test(block))
          return (
            <p key={i} className="scene-break" aria-label="scene break">
              * * *
            </p>
          )
        const lines = block.split('\n')
        return (
          <p key={i} className={dropCap && i === firstProse ? 'drop-cap' : undefined}>
            {lines.flatMap((line, li) => [...(li ? [<br key={`br${li}`} />] : []), ...inline(line, `${i}-${li}`)])}
          </p>
        )
      })}
    </>
  )
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { htmlToText, inlineToHtml, pastedHtmlToText, textToHtml } from '../lib/richtext'

type Props = {
  value: string
  onChange: (text: string) => void
  placeholder?: string
}

type Command = 'bold' | 'italic' | 'scene'

/**
 * A what-you-see-is-what-you-get text box: Bold and Italic look bold and italic while writing,
 * Enter starts a new paragraph, Ctrl/Cmd+B and +I work, and pasting from Docs or Word keeps
 * bold and italics. The value is the stored page text, so nothing else needs to know about HTML.
 */
export function RichEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef<string | null>(null)
  const savedRange = useRef<Range | null>(null)
  const [active, setActive] = useState({ bold: false, italic: false })

  // Load the text into the editor on mount, and whenever it changes from outside (e.g. the JSON tab).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || value === lastEmitted.current) return
    el.innerHTML = textToHtml(value)
    lastEmitted.current = value
  }, [value])

  // Remember the selection inside the editor, so toolbar taps (which can steal focus on phones) still apply.
  useEffect(() => {
    function onSelectionChange() {
      const el = ref.current
      const sel = document.getSelection()
      if (!el || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return
      savedRange.current = sel.getRangeAt(0).cloneRange()
      setActive({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic') })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  function emit() {
    const el = ref.current
    if (!el) return
    const text = htmlToText(el)
    lastEmitted.current = text
    onChange(text)
  }

  function restoreSelection() {
    const el = ref.current
    if (!el) return
    el.focus()
    const range = savedRange.current
    const sel = document.getSelection()
    if (range && sel && el.contains(range.startContainer)) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  function run(cmd: Command) {
    restoreSelection()
    document.execCommand('defaultParagraphSeparator', false, 'p')
    if (cmd === 'scene') document.execCommand('insertHorizontalRule')
    else document.execCommand(cmd)
    emit()
    setActive({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic') })
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = html ? pastedHtmlToText(html) : e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n')
    if (!text) return
    const multiParagraph = /\n\s*\n/.test(text)
    document.execCommand(
      'insertHTML',
      false,
      multiParagraph ? textToHtml(text) : text.split('\n').map(inlineToHtml).join('<br>'),
    )
    emit()
  }

  const words = value.trim() ? value.replace(/\*/g, '').trim().split(/\s+/).length : 0

  return (
    <div className="rounded-md border border-line focus-within:border-accent bg-card">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-md border-b border-line bg-card px-2 py-1">
        <ToolButton label="Bold" shortcut="Ctrl+B" pressed={active.bold} onPress={() => run('bold')}>
          <strong>B</strong> <span className="text-xs">Bold</span>
        </ToolButton>
        <ToolButton label="Italic" shortcut="Ctrl+I" pressed={active.italic} onPress={() => run('italic')}>
          <em className="font-book text-base">I</em> <span className="text-xs">Italic</span>
        </ToolButton>
        <ToolButton label="Scene break" onPress={() => run('scene')}>
          <span className="text-xs">* * * Scene break</span>
        </ToolButton>
        <span className="ml-auto text-xs text-muted tabular-nums">{words} words</span>
      </div>
      <div className="relative">
        {!value.trim() && placeholder && (
          <div className="pointer-events-none absolute inset-x-0 top-0 px-4 py-3 font-book text-lg text-muted whitespace-pre-line">
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          className="rich-editor min-h-[18rem] px-4 py-3 font-book text-lg leading-relaxed focus:outline-none"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Page text"
          spellCheck
          onInput={emit}
          onPaste={onPaste}
          onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        />
      </div>
    </div>
  )
}

function ToolButton({
  label,
  shortcut,
  pressed,
  onPress,
  children,
}: {
  label: string
  shortcut?: string
  pressed?: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={shortcut ? `${label} (${shortcut})` : label}
      // Don't let the button take focus from the text, so the highlighted words stay selected.
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-sm cursor-pointer ${pressed ? 'bg-accent text-accent-ink' : 'text-ink hover:bg-paper'}`}
    >
      {children}
    </button>
  )
}

type Props = { title: string; author?: string; image?: string; className?: string }

function hue(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

/** The book's cover image, or a typeset chiaroscuro cover generated from the title. */
export function Cover({ title, author, image, className = '' }: Props) {
  if (image)
    return (
      <img
        src={image}
        alt={`Cover of ${title}`}
        referrerPolicy="no-referrer"
        className={`aspect-[2/3] w-full object-cover rounded-md shadow-lg ${className}`}
      />
    )
  const h = hue(title)
  return (
    <div
      className={`aspect-[2/3] w-full rounded-md shadow-lg p-3 ${className}`}
      style={{ background: `radial-gradient(circle at 30% 18%, hsl(${h} 42% 34%), hsl(${h} 38% 9%) 72%)` }}
    >
      <div className="h-full rounded-sm border border-[#f1e6d0]/30 flex flex-col items-center justify-center text-center px-3 text-[#f1e6d0]">
        <div className="font-display text-[1.35em] leading-tight">{title}</div>
        {author && <div className="mt-3 text-[0.7em] uppercase tracking-[0.2em] opacity-75">{author}</div>}
      </div>
    </div>
  )
}

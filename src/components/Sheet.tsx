import type { ReactNode } from 'react'

/** A sheet of paper: soft shadow, rounded fore-edge, and a darker gutter along the spine. */
export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-r-lg rounded-l-sm bg-paper shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] border border-line ${className}`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-sm bg-gradient-to-r from-black/10 to-transparent dark:from-black/40" />
      <div className="px-7 sm:px-12 py-10 sm:py-14 min-h-[70vh]">{children}</div>
    </div>
  )
}

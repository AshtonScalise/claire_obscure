import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react'
import { gsap } from 'gsap'
import { Cover } from './Cover'

export type Book3DHandle = {
  /** Swings the cover open, then resolves (immediately when reduced motion is on). */
  open: () => Promise<void>
}

type Props = { title: string; author?: string; image?: string; ref?: Ref<Book3DHandle> }

const REST_TILT = -22

/** A standing hardback: cover, spine, and page block, tilted toward the reader on hover. */
export function Book3D({ title, author, image, ref }: Props) {
  const bookRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    const book = bookRef.current
    if (!book) return
    // A gsap context reverts everything on cleanup, so React's dev double-run starts clean.
    const ctx = gsap.context(() => {
      if (reduced) gsap.set(book, { rotateY: REST_TILT, rotateX: 4 })
      // A gentle arrival: the book swings in and settles at its resting tilt.
      else
        gsap.fromTo(
          book,
          { rotateY: -60, rotateX: 4, y: 20, opacity: 0 },
          { rotateY: REST_TILT, rotateX: 4, y: 0, opacity: 1, duration: 1, ease: 'power3.out' },
        )
    })
    return () => ctx.revert()
  }, [reduced])

  useImperativeHandle(ref, () => ({
    open: () =>
      new Promise<void>((resolve) => {
        if (reduced || !bookRef.current || !coverRef.current) return resolve()
        // Browsers pause animation frames in background tabs; never leave the reader waiting on one.
        const fallback = window.setTimeout(resolve, 1600)
        gsap
          .timeline({
            onComplete: () => {
              window.clearTimeout(fallback)
              resolve()
            },
          })
          .to(bookRef.current, { rotateY: 0, rotateX: 0, scale: 1.04, duration: 0.45, ease: 'power2.out' })
          .to(coverRef.current, { rotateY: -165, duration: 0.8, ease: 'power2.inOut' }, '-=0.1')
      }),
  }))

  function tilt(to: number) {
    if (reduced || !bookRef.current) return
    gsap.to(bookRef.current, { rotateY: to, duration: 0.6, ease: 'power2.out' })
  }

  return (
    <div
      className="[perspective:1400px] select-none"
      onMouseEnter={() => tilt(-6)}
      onMouseLeave={() => tilt(REST_TILT)}
    >
      <div ref={bookRef} className="relative [transform-style:preserve-3d]">
        {/* page block, seen past the fore-edge */}
        <div
          className="absolute inset-y-[1.5%] right-0 left-[2%] rounded-r-md [transform:translateZ(-14px)] shadow-2xl"
          style={{
            background:
              'repeating-linear-gradient(90deg, #efe6d4 0 2px, #e2d6bf 2px 3px), linear-gradient(#f3ebdc, #e6dac4)',
          }}
        />
        {/* first page, revealed when the cover opens */}
        <div className="absolute inset-0 rounded-r-md bg-[#f6efe2] [transform:translateZ(-1px)] grid place-items-center">
          <span className="font-display text-[#7a6a52] text-lg italic px-4 text-center">{title}</span>
        </div>
        {/* spine */}
        <div
          className="absolute left-0 top-0 h-full w-[28px] origin-left [transform:rotateY(90deg)] rounded-l-sm"
          style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25))' }}
        />
        <div ref={coverRef} className="relative origin-left [transform-style:preserve-3d] [backface-visibility:hidden]">
          <Cover title={title} author={author} image={image} className="text-lg rounded-l-sm rounded-r-md" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 to-transparent" />
        </div>
      </div>
    </div>
  )
}

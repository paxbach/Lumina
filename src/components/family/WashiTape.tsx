import type { CSSProperties } from 'react'
import { cn } from '@/utils/cn'

/**
 * WashiTape
 * ────────────────────────────────────────────────────────────────────
 * Decorative paper tape strip — slanted, semi-transparent, with a
 * diagonal stripe pattern for that "real masking-tape" feel.
 * Mount inside a relative parent and position via Tailwind classes or `style`.
 */

export type WashiColor = 'peach' | 'butter' | 'sage' | 'lavender' | 'sky'

const TAPE_BG: Record<WashiColor, string> = {
  peach:    'bg-peach-300/80',
  butter:   'bg-butter-300/80',
  sage:     'bg-sage-300/80',
  lavender: 'bg-lavender-300/80',
  sky:      'bg-sky-300/80',
}

interface WashiTapeProps {
  color: WashiColor
  /** Rotation in degrees. Recommend ±5–20° for natural feel. */
  rotation: number
  /** Tape width in rem (height is fixed at ~1.75rem). */
  width?: number
  className?: string
  style?: CSSProperties
}

export function WashiTape({
  color,
  rotation,
  width = 5.5,
  className,
  style,
}: WashiTapeProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute select-none rounded-[2px] shadow-soft',
        'h-7',
        TAPE_BG[color],
        className,
      )}
      style={{
        width: `${width}rem`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        // Diagonal stripe pattern + soft inner highlight + frayed edge
        backgroundImage: `
          repeating-linear-gradient(
            110deg,
            transparent 0px,
            transparent 6px,
            rgba(255, 255, 255, 0.28) 6px,
            rgba(255, 255, 255, 0.28) 8px
          ),
          linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.22) 0%,
            transparent 30%,
            transparent 70%,
            rgba(0, 0, 0, 0.05) 100%
          )
        `,
        ...style,
      }}
    />
  )
}

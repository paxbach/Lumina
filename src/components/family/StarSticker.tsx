import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export type StickerColor = 'butter' | 'peach' | 'sage' | 'lavender' | 'sky'

/**
 * StarSticker
 * ────────────────────────────────────────────────────────────────────
 * Hand-drawn-feel 5-point star sticker. Uses an irregular SVG path so
 * the edges look slightly wobbly (not laser-perfect like a Lucide icon).
 * Pops into view with a spring overshoot, then keeps a subtle wobble.
 */

const FILL: Record<StickerColor, string> = {
  butter:   'var(--color-butter-300)',
  peach:    'var(--color-peach-300)',
  sage:     'var(--color-sage-300)',
  lavender: 'var(--color-lavender-300)',
  sky:      'var(--color-sky-300)',
}

const STROKE: Record<StickerColor, string> = {
  butter:   'var(--color-butter-500)',
  peach:    'var(--color-peach-500)',
  sage:     'var(--color-sage-500)',
  lavender: 'var(--color-lavender-500)',
  sky:      'var(--color-sky-500)',
}

interface StarStickerProps {
  size?: number
  color?: StickerColor
  /** Base rotation in degrees. Wobble animation oscillates ±4° around this. */
  rotation?: number
  className?: string
  style?: CSSProperties
}

/**
 * Slightly imperfect 5-point star path. Hand-tuned so each tip is a
 * little different — gives it that "kid drew this" look.
 */
const STAR_PATH =
  'M 20 4 ' +
  'L 23.7 14.9 ' +
  'L 35.2 15.4 ' +
  'L 26.1 22.3 ' +
  'L 29 33.5 ' +
  'L 20 26.8 ' +
  'L 11.4 33.8 ' +
  'L 13.9 22.0 ' +
  'L 4.6 15.6 ' +
  'L 16.2 14.9 Z'

export function StarSticker({
  size = 36,
  color = 'butter',
  rotation = 0,
  className,
  style,
}: StarStickerProps) {
  return (
    <motion.svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={cn('pointer-events-none select-none', className)}
      style={{
        ...style,
        filter: 'drop-shadow(0 2px 3px rgba(60, 40, 20, 0.22))',
      }}
      initial={{ scale: 0, rotate: rotation - 40, opacity: 0 }}
      whileInView={{ scale: 1, rotate: rotation, opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
    >
      <motion.g
        animate={{ rotate: [-3, 3, -3] }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ transformOrigin: '20px 20px' }}
      >
        <path
          d={STAR_PATH}
          fill={FILL[color]}
          stroke={STROKE[color]}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        {/* Inner highlight — "shine" on top-left lobe */}
        <ellipse
          cx={15}
          cy={11}
          rx={2.2}
          ry={1.4}
          fill="white"
          opacity={0.55}
          transform="rotate(-20 15 11)"
        />
      </motion.g>
    </motion.svg>
  )
}

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ConfettiProps {
  /** When this key changes, re-trigger the burst. */
  trigger?: number | string
  count?: number
  className?: string
}

const COLORS = [
  'bg-peach-400',
  'bg-mint-400',
  'bg-butter-400',
  'bg-lavender-400',
  'bg-sky-cozy-300',
]

interface Piece {
  id: number
  left: number
  delay: number
  duration: number
  rotate: number
  color: string
  size: number
  drift: number
}

function makePieces(count: number, seedKey: string | number): Piece[] {
  void seedKey // re-run on trigger change
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.6 + Math.random() * 1.4,
    rotate: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540),
    color: COLORS[i % COLORS.length],
    size: 8 + Math.random() * 8,
    drift: (Math.random() - 0.5) * 200,
  }))
}

/**
 * Quick confetti burst — falls from top, drifts sideways, fades at bottom.
 * Mount inside a relative container; pointer-events disabled.
 */
export function Confetti({ trigger = 0, count = 36, className }: ConfettiProps) {
  const pieces = useMemo(() => makePieces(count, trigger), [count, trigger])

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {pieces.map((p) => (
        <motion.span
          key={`${trigger}-${p.id}`}
          className={cn('absolute rounded-sm', p.color)}
          style={{
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size * 0.6,
          }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: ['0vh', '110%'],
            x: [0, p.drift],
            rotate: [0, p.rotate],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
            times: [0, 0.85, 1],
          }}
        />
      ))}
    </div>
  )
}

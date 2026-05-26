import { useMemo } from 'react'
import { motion } from 'framer-motion'

const LEAVES = ['🍃', '🍂', '🌿', '🍃']

interface Leaf {
  id: number
  glyph: string
  left: number     // 0..100 (vw of container)
  size: number     // px
  delay: number    // seconds
  duration: number // seconds — full fall cycle
  drift: number    // px — horizontal sway amplitude
  rotate: number   // total rotation in degrees
  startY: number   // negative offset so it falls in
}

function generateLeaves(count: number): Leaf[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    glyph: LEAVES[i % LEAVES.length],
    left: Math.random() * 100,
    size: 18 + Math.random() * 16,
    delay: Math.random() * 8,
    duration: 10 + Math.random() * 8,
    drift: 30 + Math.random() * 60,
    rotate: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 240),
    startY: -10 - Math.random() * 40,
  }))
}

interface FloatingLeavesProps {
  count?: number
  className?: string
}

/**
 * Decorative background — soft leaves drifting top → bottom.
 * Pure CSR; safe to mount inside any relative parent.
 */
export function FloatingLeaves({ count = 14, className }: FloatingLeavesProps) {
  const leaves = useMemo(() => generateLeaves(count), [count])

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      {leaves.map((l) => (
        <motion.span
          key={l.id}
          className="absolute select-none"
          style={{
            left: `${l.left}%`,
            top: `${l.startY}%`,
            fontSize: l.size,
            filter: 'drop-shadow(0 2px 2px rgba(60,40,20,0.12))',
          }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, l.drift, -l.drift * 0.6, l.drift * 0.4, 0],
            rotate: [0, l.rotate],
            opacity: [0, 0.9, 0.9, 0.9, 0],
          }}
          transition={{
            duration: l.duration,
            delay: l.delay,
            repeat: Infinity,
            ease: 'linear',
            times: [0, 0.1, 0.5, 0.9, 1],
          }}
        >
          {l.glyph}
        </motion.span>
      ))}
    </div>
  )
}

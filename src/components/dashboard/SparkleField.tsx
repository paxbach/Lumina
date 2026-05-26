import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface SparkleFieldProps {
  count?: number
  className?: string
}

interface Sparkle {
  id: number
  left: number
  top: number
  size: number
  delay: number
  duration: number
  hue: 'butter' | 'lavender' | 'peach' | 'mint'
}

const hueClass: Record<Sparkle['hue'], string> = {
  butter:   'text-butter-400',
  lavender: 'text-lavender-300',
  peach:    'text-peach-300',
  mint:     'text-mint-300',
}

function generate(count: number): Sparkle[] {
  const hues: Sparkle['hue'][] = ['butter', 'lavender', 'peach', 'mint']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 10 + Math.random() * 14,
    delay: Math.random() * 3,
    duration: 1.6 + Math.random() * 2.4,
    hue: hues[i % hues.length],
  }))
}

/**
 * Background sparkles — twinkle in/out at random positions.
 * Mount inside any relative parent; pointer-events disabled.
 */
export function SparkleField({ count = 20, className }: SparkleFieldProps) {
  const sparkles = useMemo(() => generate(count), [count])

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {sparkles.map((s) => (
        <motion.span
          key={s.id}
          className={cn('absolute select-none', hueClass[s.hue])}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            fontSize: s.size,
            filter: 'drop-shadow(0 0 6px currentColor)',
          }}
          animate={{
            scale: [0.6, 1.15, 0.6],
            opacity: [0, 0.95, 0],
            rotate: [0, 25, 0],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  )
}

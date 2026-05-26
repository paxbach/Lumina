import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'peach' | 'mint' | 'butter' | 'lavender' | 'sky'

interface StatChipProps {
  icon: ReactNode
  label: string
  value: string | number
  tone?: Tone
  className?: string
}

const toneMap: Record<Tone, string> = {
  peach:    'bg-peach-100 border-peach-300 text-peach-500',
  mint:     'bg-sage-100 border-sage-300 text-sage-500',
  butter:   'bg-butter-100 border-butter-300 text-butter-500',
  lavender: 'bg-lavender-100 border-lavender-300 text-lavender-500',
  sky:      'bg-sky-100 border-sky-300 text-sky-500',
}

const TONE_GLOW: Record<Tone, string> = {
  peach:    'var(--color-peach-glow)',
  mint:     'var(--color-sage-glow)',
  butter:   'var(--color-butter-glow)',
  lavender: 'var(--color-lavender-glow)',
  sky:      'var(--color-sky-glow)',
}

const TONE_RADIANT: Record<Tone, string> = {
  peach:    'var(--shadow-radiant-peach)',
  mint:     'var(--shadow-radiant-sage)',
  butter:   'var(--shadow-radiant-butter)',
  lavender: 'var(--shadow-radiant-lavender)',
  sky:      'var(--shadow-radiant-sky)',
}

/**
 * Stats are emitted, not painted — each chip carries a tone-coloured halo
 * even at rest. On hover, the halo intensifies. Icon receives a coloured
 * drop-shadow so it reads as a tiny lamp.
 */
export function StatChip({ icon, label, value, tone = 'peach', className }: StatChipProps) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: `${TONE_RADIANT[tone]}, var(--shadow-soft)` }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 shadow-soft',
        toneMap[tone],
        className,
      )}
      style={{
        // Subtle resting glow — a chip that's always slightly emitting.
        boxShadow: `0 0 10px 1px ${TONE_GLOW[tone]}, var(--shadow-soft)`,
      }}
    >
      <span
        className="grid size-7 place-items-center rounded-full bg-cream-50 [&_svg]:size-4"
        style={{
          filter: `drop-shadow(0 0 3px ${TONE_GLOW[tone]})`,
        }}
      >
        {icon}
      </span>
      <span className="flex items-baseline gap-1.5 pr-1">
        <span className="font-display text-base font-bold tabular-nums text-cocoa-900">
          {value}
        </span>
        <span className="text-xs font-semibold text-cocoa-700">{label}</span>
      </span>
    </motion.div>
  )
}

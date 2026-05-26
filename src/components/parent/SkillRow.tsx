import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { PastelTone } from '@/types'

interface SkillRowProps {
  icon: ReactNode
  label: string
  /** 0..100 */
  value: number
  /** Percentage change vs prior week (e.g. 12, -3, 0). */
  delta: number
  tone: PastelTone
}

const toneBar: Record<PastelTone, string> = {
  peach:    'bg-peach-400',
  mint:     'bg-mint-400',
  butter:   'bg-butter-400',
  lavender: 'bg-lavender-400',
  sky:      'bg-sky-cozy-300',
}

const toneTrack: Record<PastelTone, string> = {
  peach:    'bg-peach-100',
  mint:     'bg-mint-100',
  butter:   'bg-butter-100',
  lavender: 'bg-lavender-100',
  sky:      'bg-sky-cozy-100',
}

const toneIconBg: Record<PastelTone, string> = {
  peach:    'bg-peach-100 text-peach-500 border-peach-200',
  mint:     'bg-mint-100 text-mint-500 border-mint-200',
  butter:   'bg-butter-100 text-butter-500 border-butter-200',
  lavender: 'bg-lavender-100 text-lavender-500 border-lavender-200',
  sky:      'bg-sky-cozy-100 text-sky-cozy-300 border-sky-cozy-200',
}

export function SkillRow({ icon, label, value, delta, tone }: SkillRowProps) {
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trendColor =
    delta > 0
      ? 'text-mint-500'
      : delta < 0
        ? 'text-peach-500'
        : 'text-cocoa-700/60'

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-2xl border-2 [&_svg]:size-5',
          toneIconBg[tone],
        )}
        aria-hidden
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-display text-sm font-semibold text-cocoa-900">
            {label}
          </p>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-bold tabular-nums',
              trendColor,
            )}
          >
            <TrendIcon className="size-3" />
            {delta > 0 ? '+' : ''}
            {delta}%
          </span>
        </div>
        <div
          className={cn('mt-1.5 h-2 w-full overflow-hidden rounded-full', toneTrack[tone])}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <motion.div
            className={cn('h-full rounded-full', toneBar[tone])}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          />
        </div>
      </div>
    </div>
  )
}

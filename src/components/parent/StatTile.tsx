import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tone = 'peach' | 'mint' | 'butter' | 'lavender' | 'sky'

interface StatTileProps {
  icon: ReactNode
  label: string
  value: ReactNode
  /** Smaller subtitle line under the value. */
  hint?: string
  /** "+12%" or "-3%" or "0%". Color + arrow inferred from sign. */
  delta?: string
  /** Sentiment override — for cases where lower is better (e.g. screen time). */
  sentiment?: 'good' | 'neutral' | 'warning'
  tone?: Tone
  className?: string
}

const toneFrame: Record<Tone, string> = {
  peach:    'border-peach-200 bg-peach-50/70',
  mint:     'border-mint-200 bg-mint-50/70',
  butter:   'border-butter-200 bg-butter-50/70',
  lavender: 'border-lavender-200 bg-lavender-50/70',
  sky:      'border-sky-cozy-200 bg-sky-cozy-50/70',
}

const toneIcon: Record<Tone, string> = {
  peach:    'bg-peach-100 text-peach-500 border-peach-200',
  mint:     'bg-mint-100 text-mint-500 border-mint-200',
  butter:   'bg-butter-100 text-butter-500 border-butter-200',
  lavender: 'bg-lavender-100 text-lavender-500 border-lavender-200',
  sky:      'bg-sky-cozy-100 text-sky-cozy-300 border-sky-cozy-200',
}

const sentimentColor = {
  good:    'text-mint-500',
  neutral: 'text-cocoa-700/70',
  warning: 'text-peach-500',
}

export function StatTile({
  icon,
  label,
  value,
  hint,
  delta,
  sentiment,
  tone = 'lavender',
  className,
}: StatTileProps) {
  // Derive delta sentiment from sign if not explicitly given.
  const sign = delta?.trim().startsWith('-')
    ? 'down'
    : delta && /[1-9]/.test(delta)
      ? 'up'
      : 'flat'
  const computedSentiment: keyof typeof sentimentColor =
    sentiment ?? (sign === 'down' ? 'warning' : sign === 'up' ? 'good' : 'neutral')

  const TrendIcon = sign === 'down' ? TrendingDown : sign === 'up' ? TrendingUp : Minus

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'flex flex-col gap-3 rounded-3xl border-2 p-5 shadow-soft',
        toneFrame[tone],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'grid size-10 place-items-center rounded-2xl border-2 [&_svg]:size-5',
            toneIcon[tone],
          )}
          aria-hidden
        >
          {icon}
        </span>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full bg-cream-50/80 px-2 py-0.5 text-xs font-bold tabular-nums',
              sentimentColor[computedSentiment],
            )}
          >
            <TrendIcon className="size-3" />
            {delta}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-cocoa-700/70">
          {label}
        </p>
        <p className="mt-1 font-display text-3xl font-bold leading-tight tabular-nums text-cocoa-900">
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-xs text-cocoa-700/80">{hint}</p>
        )}
      </div>
    </motion.div>
  )
}

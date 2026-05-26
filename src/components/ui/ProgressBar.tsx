import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number // 0..1
  tone?: 'peach' | 'mint' | 'butter' | 'lavender' | 'sky'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const fills = {
  peach:    'bg-peach-400',
  mint:     'bg-mint-400',
  butter:   'bg-butter-400',
  lavender: 'bg-lavender-400',
  sky:      'bg-sky-cozy-300',
}

const tracks = {
  peach:    'bg-peach-100',
  mint:     'bg-mint-100',
  butter:   'bg-butter-100',
  lavender: 'bg-lavender-100',
  sky:      'bg-sky-cozy-100',
}

const heights = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
}

export function ProgressBar({
  value,
  tone = 'mint',
  size = 'md',
  showLabel,
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn('relative w-full overflow-hidden rounded-full', heights[size], tracks[tone])}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={cn('h-full rounded-full', fills[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-cocoa-700 tabular-nums">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}

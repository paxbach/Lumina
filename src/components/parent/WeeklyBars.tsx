import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export interface DayUsage {
  /** Short label (e.g. "T2", "T3", "CN") */
  day: string
  /** Minutes used. */
  minutes: number
  /** Mark as today. */
  isToday?: boolean
}

interface WeeklyBarsProps {
  days: DayUsage[]
  /** Cap (in minutes) considered "healthy" — bars over this get a warm tint. */
  healthyCap?: number
  className?: string
}

export function WeeklyBars({ days, healthyCap = 30, className }: WeeklyBarsProps) {
  const max = Math.max(healthyCap, ...days.map((d) => d.minutes), 1)

  return (
    <div className={cn('relative', className)}>
      {/* Healthy-cap dotted reference line */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-mint-400/40"
        style={{ top: `${(1 - healthyCap / max) * 100}%` }}
      >
        <span className="absolute -top-3 right-0 rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-mint-500">
          Lành mạnh ≤ {healthyCap}p
        </span>
      </div>

      <ol className="flex h-40 items-end justify-between gap-2 px-1">
        {days.map((d, i) => {
          const ratio = max === 0 ? 0 : d.minutes / max
          const overCap = d.minutes > healthyCap
          return (
            <li key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span
                className={cn(
                  'font-display text-[11px] font-bold tabular-nums',
                  d.isToday ? 'text-lavender-500' : 'text-cocoa-700/70',
                )}
              >
                {d.minutes > 0 ? `${d.minutes}p` : '—'}
              </span>

              <motion.span
                className={cn(
                  'w-full rounded-t-2xl border-2',
                  d.isToday
                    ? 'border-lavender-300 bg-gradient-to-t from-lavender-200 to-lavender-400'
                    : overCap
                      ? 'border-peach-300 bg-gradient-to-t from-peach-200 to-peach-400'
                      : 'border-mint-300 bg-gradient-to-t from-mint-200 to-mint-400',
                )}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${Math.max(ratio * 100, d.minutes > 0 ? 6 : 0)}%`, opacity: 1 }}
                transition={{
                  delay: i * 0.05,
                  type: 'spring',
                  stiffness: 130,
                  damping: 22,
                }}
              />
            </li>
          )
        })}
      </ol>

      <ol className="mt-2 flex items-center justify-between gap-2 px-1">
        {days.map((d) => (
          <li
            key={`${d.day}-label`}
            className={cn(
              'flex-1 text-center font-display text-xs',
              d.isToday ? 'font-bold text-lavender-500' : 'text-cocoa-700/70',
            )}
          >
            {d.day}
          </li>
        ))}
      </ol>
    </div>
  )
}

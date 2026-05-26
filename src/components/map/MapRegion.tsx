import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { springSoft } from '@/utils/motion'

type Tone = 'peach' | 'mint' | 'butter' | 'lavender' | 'sky'

interface MapRegionProps {
  title: string
  description: string
  emoji: string
  tone?: Tone
  /** Position inside the parent (use a relative container). */
  x: number // 0..100 (%)
  y: number // 0..100 (%)
  size?: 'sm' | 'md' | 'lg'
  /** Visual emphasis — use for the central hub (e.g. Làng Ánh Sáng). */
  hub?: boolean
  onClick?: () => void
  children?: ReactNode
}

const sizeMap = {
  sm: { ring: 'size-20', emoji: 'text-4xl' },
  md: { ring: 'size-24', emoji: 'text-5xl' },
  lg: { ring: 'size-32', emoji: 'text-6xl' },
}

const toneBg: Record<Tone, string> = {
  peach:    'bg-peach-100 border-peach-300',
  mint:     'bg-mint-100 border-mint-300',
  butter:   'bg-butter-100 border-butter-300',
  lavender: 'bg-lavender-100 border-lavender-300',
  sky:      'bg-sky-cozy-100 border-sky-cozy-300',
}

const toneGlow: Record<Tone, string> = {
  peach:    'shadow-[0_0_40px_10px_var(--color-peach-200)]',
  mint:     'shadow-[0_0_40px_10px_var(--color-mint-200)]',
  butter:   'shadow-[0_0_40px_10px_var(--color-butter-200)]',
  lavender: 'shadow-[0_0_40px_10px_var(--color-lavender-200)]',
  sky:      'shadow-[0_0_40px_10px_var(--color-sky-cozy-200)]',
}

const toneText: Record<Tone, string> = {
  peach:    'text-peach-500',
  mint:     'text-mint-500',
  butter:   'text-butter-500',
  lavender: 'text-lavender-500',
  sky:      'text-sky-cozy-300',
}

export function MapRegion({
  title,
  description,
  emoji,
  tone = 'mint',
  x,
  y,
  size = 'md',
  hub,
  onClick,
  children,
}: MapRegionProps) {
  const [hovered, setHovered] = useState(false)
  const tipId = useId()
  const sz = sizeMap[hub ? 'lg' : size]

  return (
    <div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <motion.button
        type="button"
        aria-label={title}
        aria-describedby={tipId}
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.08, y: -4 }}
        transition={springSoft}
        animate={{ y: hub ? 0 : [0, -6, 0] }}
        {...(hub
          ? undefined
          : {
              transition: {
                y: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
              },
            })}
        className={cn(
          'group relative grid place-items-center rounded-full border-4',
          'cursor-pointer outline-none transition-shadow duration-300',
          'focus-visible:ring-4 focus-visible:ring-lavender-200',
          sz.ring,
          toneBg[tone],
          hovered ? toneGlow[tone] : 'shadow-soft',
        )}
      >
        {/* Soft pulsing halo behind the hub */}
        {hub && (
          <motion.span
            aria-hidden
            className={cn(
              'absolute inset-0 -z-10 rounded-full',
              toneBg[tone],
              'opacity-50 blur-md',
            )}
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <span className={cn(sz.emoji, 'leading-none')} aria-hidden>
          {emoji}
        </span>

        {/* Sparkles on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.span
              key="sparkle"
              aria-hidden
              className={cn(
                'pointer-events-none absolute -right-2 -top-2 text-xl',
                toneText[tone],
              )}
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={springSoft}
            >
              ✨
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Label — always visible under the badge */}
      <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap">
        <span
          className={cn(
            'rounded-full border-2 bg-cream-50/95 px-3 py-1',
            'font-display text-sm font-semibold text-cocoa-800 shadow-soft',
            'border-cream-200',
          )}
        >
          {title}
        </span>
      </div>

      {/* Tooltip — appears on hover/focus, anchored above */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ ...springSoft, mass: 0.4 }}
            className={cn(
              'pointer-events-none absolute left-1/2 z-20 w-56 -translate-x-1/2',
              'bottom-full mb-4 rounded-2xl border-2 bg-cream-50/98 p-3 shadow-pop backdrop-blur',
              'border-cream-200',
            )}
          >
            <p className={cn('text-[11px] font-bold uppercase tracking-widest', toneText[tone])}>
              Khu vực
            </p>
            <p className="mt-0.5 font-display text-base font-semibold text-cocoa-900">
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-cocoa-700">{description}</p>
            {/* Pointer */}
            <span
              aria-hidden
              className="absolute left-1/2 top-full size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-cream-200 bg-cream-50"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  )
}

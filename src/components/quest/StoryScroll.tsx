import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface StoryBeat {
  /** Optional emoji on the side of the bubble. */
  emoji?: string
  /** Story text — supports basic <strong> for emphasis (rendered via Vietnamese punctuation). */
  text: string
}

interface StoryScrollProps {
  beats: StoryBeat[]
  /** Called once the user reaches the end and taps "continue". */
  onFinish?: () => void
  /** Auto-advance interval (ms). If absent, kid taps to advance. */
  autoAdvanceMs?: number
  className?: string
}

/**
 * Parchment-scroll story panel — reveals story beats one at a time.
 * Tap anywhere to advance, or auto-advance.
 */
export function StoryScroll({
  beats,
  onFinish,
  autoAdvanceMs,
  className,
}: StoryScrollProps) {
  const [idx, setIdx] = useState(0)
  const lastBeat = idx >= beats.length - 1

  // Auto-advance
  useEffect(() => {
    if (!autoAdvanceMs || lastBeat) return
    const id = window.setTimeout(() => setIdx((i) => i + 1), autoAdvanceMs)
    return () => window.clearTimeout(id)
  }, [idx, autoAdvanceMs, lastBeat])

  const advance = () => {
    if (lastBeat) onFinish?.()
    else setIdx((i) => i + 1)
  }

  return (
    <button
      type="button"
      onClick={advance}
      className={cn(
        'group relative block w-full overflow-hidden rounded-[2rem] border-4 px-6 py-7 text-left shadow-pop',
        'cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-lavender-300',
        className,
      )}
      style={{
        backgroundImage: `
          radial-gradient(60% 80% at 50% 110%, var(--color-peach-100) 0%, transparent 70%),
          radial-gradient(40% 60% at 10% 10%, var(--color-butter-100) 0%, transparent 70%),
          linear-gradient(160deg, #fff5e6 0%, #ffeed3 100%)
        `,
        borderColor: 'var(--color-butter-300)',
        boxShadow:
          'inset 0 0 0 2px rgba(245, 179, 45, 0.18), 0 14px 32px -10px rgba(140,100,60,0.25)',
      }}
      aria-live="polite"
    >
      {/* Decorative scroll-edge curls */}
      <span
        aria-hidden
        className="absolute -left-2 top-1/2 h-12 w-4 -translate-y-1/2 rounded-r-full bg-butter-200"
      />
      <span
        aria-hidden
        className="absolute -right-2 top-1/2 h-12 w-4 -translate-y-1/2 rounded-l-full bg-butter-200"
      />

      {/* Glowing ember in the corner — adds adventure mood */}
      <motion.span
        aria-hidden
        className="absolute right-5 top-5 text-3xl"
        style={{ filter: 'drop-shadow(0 0 12px rgba(245, 179, 45, 0.6))' }}
        animate={{ scale: [1, 1.15, 1], rotate: [-3, 3, -3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🔥
      </motion.span>

      <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-butter-500">
        Trang nhật ký · Lumi kể
      </p>

      <div className="relative mt-3 min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="flex items-start gap-3"
          >
            {beats[idx].emoji && (
              <motion.span
                key={`emoji-${idx}`}
                aria-hidden
                className="text-3xl leading-none"
                initial={{ scale: 0.6, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              >
                {beats[idx].emoji}
              </motion.span>
            )}
            <p className="font-display text-xl font-medium leading-snug text-cocoa-900 sm:text-2xl">
              {beats[idx].text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <ol className="flex items-center gap-1.5" aria-label="Tiến trình câu chuyện">
          {beats.map((_, i) => (
            <li
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === idx ? 'w-6 bg-butter-500' : i < idx ? 'w-1.5 bg-butter-400' : 'w-1.5 bg-butter-200',
              )}
            />
          ))}
        </ol>
        <motion.span
          className="inline-flex items-center gap-1 rounded-full border-2 border-butter-400 bg-butter-100 px-3 py-1 font-display text-sm font-bold text-butter-500 shadow-soft"
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {lastBeat ? 'Sẵn sàng!' : 'Tiếp'}
          <ChevronRight className="size-4" />
        </motion.span>
      </div>
    </button>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { LumiCharacter } from '@/components/dashboard/LumiCharacter'
import { cn } from '@/utils/cn'

interface LumiCoachProps {
  message: string
  size?: number // Lumi size px
  /** Whether the bubble should sit to the right (default) or below. */
  side?: 'right' | 'below'
  className?: string
}

/**
 * Lumi character + speech bubble for in-game instructions.
 * Message animates in/out when it changes.
 */
export function LumiCoach({
  message,
  size = 120,
  side = 'right',
  className,
}: LumiCoachProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4',
        side === 'below' && 'flex-col text-center',
        className,
      )}
    >
      <div className="shrink-0">
        <LumiCharacter size={size} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, scale: 0.92, x: side === 'right' ? -8 : 0, y: side === 'below' ? -4 : 0 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className={cn(
            'relative rounded-2xl border-2 border-cream-200 bg-cream-50/95 px-4 py-3 shadow-soft',
            'max-w-sm font-display text-base font-medium text-cocoa-800',
          )}
        >
          {/* Pointer to Lumi */}
          {side === 'right' ? (
            <span
              aria-hidden
              className="absolute -left-2 top-1/2 size-3 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-cream-200 bg-cream-50"
            />
          ) : (
            <span
              aria-hidden
              className="absolute -top-2 left-1/2 size-3 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-cream-200 bg-cream-50"
            />
          )}
          {message}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StarBadgeProps {
  count: number
  className?: string
}

/**
 * Stars are treated as actual light elements — the badge has a butter
 * radiant halo, and the icon itself emits via drop-shadow. On hover the
 * glow boosts.
 */
export function StarBadge({ count, className }: StarBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{
        scale: 1.05,
        boxShadow: 'var(--shadow-radiant-butter)',
      }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-butter-400',
        'bg-butter-100 px-3 py-1.5 shadow-soft',
        className,
      )}
      style={{
        boxShadow:
          '0 0 14px 2px var(--color-butter-glow), var(--shadow-soft)',
      }}
    >
      <motion.span
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="grid place-items-center"
        style={{
          filter:
            'drop-shadow(0 0 4px var(--color-butter-glow)) drop-shadow(0 0 1px var(--color-butter-500))',
        }}
      >
        <Star className="size-4 fill-butter-400 stroke-butter-500" />
      </motion.span>
      <span className="font-display font-semibold text-cocoa-800 tabular-nums">
        {count}
      </span>
    </motion.div>
  )
}

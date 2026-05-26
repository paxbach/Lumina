import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/utils/cn'
import { springBouncy } from '@/utils/motion'

/**
 * Card
 * ────────────────────────────────────────────────────────────────────
 * Built on the Lumina Pastel design tokens (see src/index.css `@theme`).
 *   • Tones:    peach / sage / sky / butter / lavender / cream (+ legacy `mint`)
 *   • Radius:   --radius-cozy (24px)
 *   • Shadow:   --shadow-soft (hazy multi-layer halo)
 *   • Motion:   --spring-bouncy (playful interactive hover/tap)
 */
type Tone =
  | 'peach'
  | 'sage'
  | 'sky'
  | 'butter'
  | 'lavender'
  | 'cream'
  /** Back-compat alias for `sage`. */
  | 'mint'

interface CardProps extends HTMLMotionProps<'div'> {
  tone?: Tone
  interactive?: boolean
  padding?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

const toneBg: Record<Tone, string> = {
  peach:    'bg-peach-50    border-peach-200',
  sage:     'bg-sage-50     border-sage-200',
  sky:      'bg-sky-50      border-sky-200',
  butter:   'bg-butter-50   border-butter-200',
  lavender: 'bg-lavender-50 border-lavender-200',
  cream:    'bg-cream-50    border-cream-200',
  // Back-compat: `mint` → `sage` at the token layer.
  mint:     'bg-sage-50     border-sage-200',
}

const padMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { tone = 'cream', interactive, padding = 'md', className, children, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      whileHover={interactive ? { y: -3, scale: 1.01 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={interactive ? springBouncy : undefined}
      className={cn(
        // Token-driven chrome: cozy radius + hazy multi-layer shadow
        'rounded-cozy border-2 shadow-soft',
        toneBg[tone],
        padMap[padding],
        interactive && 'cursor-pointer select-none',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  )
})

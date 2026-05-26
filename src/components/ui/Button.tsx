import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/utils/cn'
import { springBouncy } from '@/utils/motion'

/**
 * Button
 * ────────────────────────────────────────────────────────────────────
 * Built on the Lumina Pastel design tokens (see src/index.css `@theme`).
 *   • Colors:  OKLCH peach / sage / butter / lavender / sky
 *   • Radius:  --radius-cozy (size lg) — chunky, child-friendly
 *   • Shadow:  --shadow-soft (multi-layer hazy)
 *   • Motion:  --spring-bouncy (playful popup feel on tap / hover)
 *   • Font:    --font-display (Quicksand)
 */
type Tone = 'peach' | 'sage' | 'sky' | 'butter' | 'lavender' | 'mint'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled'> {
  tone?: Tone
  size?: Size
  variant?: 'solid' | 'soft' | 'ghost'
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
}

const toneSolid: Record<Tone, string> = {
  peach:    'bg-peach-400    hover:bg-peach-500    text-white      border-peach-500',
  sage:     'bg-sage-400     hover:bg-sage-500     text-white      border-sage-500',
  sky:      'bg-sky-300      hover:bg-sky-400      text-cocoa-900  border-sky-400',
  butter:   'bg-butter-400   hover:bg-butter-500   text-cocoa-900  border-butter-500',
  lavender: 'bg-lavender-400 hover:bg-lavender-500 text-white      border-lavender-500',
  // Back-compat: `mint` is an alias of `sage` at the token layer.
  mint:     'bg-sage-400     hover:bg-sage-500     text-white      border-sage-500',
}

const toneSoft: Record<Tone, string> = {
  peach:    'bg-peach-100    hover:bg-peach-200    text-cocoa-800 border-peach-200',
  sage:     'bg-sage-100     hover:bg-sage-200     text-cocoa-800 border-sage-200',
  sky:      'bg-sky-100      hover:bg-sky-200      text-cocoa-800 border-sky-200',
  butter:   'bg-butter-100   hover:bg-butter-200   text-cocoa-800 border-butter-200',
  lavender: 'bg-lavender-100 hover:bg-lavender-200 text-cocoa-800 border-lavender-200',
  mint:     'bg-sage-100     hover:bg-sage-200     text-cocoa-800 border-sage-200',
}

/**
 * Hover-state shadow per tone — pulled from the `--shadow-radiant-{tone}`
 * tokens so the button glows in its own colour when the kid hovers/focuses.
 */
const TONE_HOVER_GLOW: Record<Tone, string> = {
  peach:    'var(--shadow-radiant-peach)',
  sage:     'var(--shadow-radiant-sage)',
  mint:     'var(--shadow-radiant-sage)',
  sky:      'var(--shadow-radiant-sky)',
  butter:   'var(--shadow-radiant-butter)',
  lavender: 'var(--shadow-radiant-lavender)',
}

/**
 * Sizes — all radii sit on the cozy scale.
 *   sm: rounded-md   (16px)
 *   md: rounded-cozy (24px) — the default chunky pill
 *   lg: rounded-2xl  (40px)
 */
const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm   gap-1.5 rounded-md',
  md: 'h-12 px-6 text-base gap-2   rounded-cozy',
  lg: 'h-16 px-8 text-lg   gap-2.5 rounded-2xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    tone = 'peach',
    size = 'md',
    variant = 'solid',
    fullWidth,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const toneClass =
    variant === 'solid'
      ? toneSolid[tone]
      : variant === 'soft'
        ? toneSoft[tone]
        : 'bg-transparent hover:bg-cream-100 text-cocoa-800 border-transparent'

  return (
    <motion.button
      ref={ref}
      whileTap={disabled ? undefined : { scale: 0.94, y: 1 }}
      whileHover={
        disabled
          ? undefined
          : {
              y: -1,
              scale: 1.02,
              // Hover glow uses the tone-matched radiant shadow on top of
              // the soft base shadow → button reads as "lit from within".
              boxShadow: `${TONE_HOVER_GLOW[tone]}, var(--shadow-soft)`,
            }
      }
      transition={springBouncy}
      disabled={disabled}
      className={cn(
        // Typography & layout
        'inline-flex items-center justify-center font-display font-semibold',
        // Visual chrome — token-driven
        'border-2 shadow-soft transition-colors',
        // A11y — focus ring uses lavender accent for visibility
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizes[size],
        toneClass,
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </motion.button>
  )
})

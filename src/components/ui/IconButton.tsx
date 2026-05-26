import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/utils/cn'
import { springSoft } from '@/utils/motion'

interface IconButtonProps extends HTMLMotionProps<'button'> {
  label: string // a11y — never optional
  size?: 'sm' | 'md' | 'lg'
  tone?: 'cream' | 'peach' | 'mint' | 'butter' | 'lavender' | 'sky'
  children: ReactNode
}

const sizes = {
  sm: 'size-10 [&_svg]:size-5',
  md: 'size-12 [&_svg]:size-6',
  lg: 'size-14 [&_svg]:size-7',
}

const tones = {
  cream:    'bg-cream-100 hover:bg-cream-200 text-cocoa-800 border-cream-200',
  peach:    'bg-peach-100 hover:bg-peach-200 text-cocoa-800 border-peach-200',
  mint:     'bg-mint-100 hover:bg-mint-200 text-cocoa-800 border-mint-200',
  butter:   'bg-butter-100 hover:bg-butter-200 text-cocoa-800 border-butter-200',
  lavender: 'bg-lavender-100 hover:bg-lavender-200 text-cocoa-800 border-lavender-200',
  sky:      'bg-sky-cozy-100 hover:bg-sky-cozy-200 text-cocoa-800 border-sky-cozy-200',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, size = 'md', tone = 'cream', className, children, ...rest }, ref) {
    return (
      <motion.button
        ref={ref}
        aria-label={label}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.06 }}
        transition={springSoft}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl border-2 shadow-soft',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200',
          'transition-colors',
          sizes[size],
          tones[tone],
          className,
        )}
        {...rest}
      >
        {children}
      </motion.button>
    )
  },
)

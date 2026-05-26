import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { springSoft } from '@/utils/motion'

type Tone = 'peach' | 'mint' | 'butter' | 'lavender' | 'sky'

interface BigActionButtonProps {
  title: string
  subtitle?: string
  emoji: string
  tone?: Tone
  onClick?: () => void
  className?: string
  children?: ReactNode
}

const toneSolid: Record<Tone, string> = {
  peach:    'bg-peach-400 hover:bg-peach-500 text-white border-peach-500',
  mint:     'bg-mint-400 hover:bg-mint-500 text-white border-mint-500',
  butter:   'bg-butter-400 hover:bg-butter-500 text-cocoa-900 border-butter-500',
  lavender: 'bg-lavender-400 hover:bg-lavender-500 text-white border-lavender-500',
  sky:      'bg-sky-cozy-300 hover:bg-sky-cozy-200 text-cocoa-900 border-sky-cozy-300',
}

export function BigActionButton({
  title,
  subtitle,
  emoji,
  tone = 'lavender',
  onClick,
  className,
  children,
}: BigActionButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96, y: 1 }}
      whileHover={{ y: -2 }}
      transition={springSoft}
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-3xl border-[3px]',
        'px-5 py-4 text-left shadow-pop transition-colors',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200',
        toneSolid[tone],
        className,
      )}
    >
      <motion.span
        aria-hidden
        className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/40 text-3xl shadow-inset-soft"
        animate={{ rotate: [-4, 4, -4] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {emoji}
      </motion.span>
      <span className="flex flex-1 flex-col">
        <span className="font-display text-lg font-bold leading-tight">{title}</span>
        {subtitle && (
          <span className="text-xs font-medium opacity-90">{subtitle}</span>
        )}
        {children}
      </span>
      <ChevronRight className="size-5 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />
    </motion.button>
  )
}

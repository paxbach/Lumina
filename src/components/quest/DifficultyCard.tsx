import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DifficultyOption {
  id: Difficulty
  title: string
  emoji: string
  description: string
  location: string
  rewardLabel: string // e.g. "2 💎"
}

export const DIFFICULTIES: DifficultyOption[] = [
  {
    id: 'easy',
    title: 'Dễ',
    emoji: '🌱',
    description: 'Chuyến đi nhẹ nhàng — phù hợp cho bạn nhỏ vừa bắt đầu.',
    location: 'Trước sân nhà',
    rewardLabel: '2 💎',
  },
  {
    id: 'medium',
    title: 'Trung bình',
    emoji: '🌿',
    description: 'Cần đi xa hơn một chút — công viên gần đây.',
    location: 'Công viên gần nhà',
    rewardLabel: '3 💎 + 2 ⭐',
  },
  {
    id: 'hard',
    title: 'Phiêu lưu',
    emoji: '🌟',
    description: 'Hành trình thật sự — vào sâu trong rừng cùng người lớn!',
    location: 'Bìa rừng phong',
    rewardLabel: '5 💎 + 3 ⭐ + 🏅',
  },
]

interface DifficultyCardProps {
  option: DifficultyOption
  selected: boolean
  onSelect: () => void
}

export function DifficultyCard({ option, selected, onSelect }: DifficultyCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -3 }}
      animate={selected ? { y: -2 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className={cn(
        'relative flex flex-col items-start gap-2 rounded-3xl border-4 p-4 text-left shadow-soft',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-300',
        selected
          ? 'border-lavender-500 bg-lavender-50 shadow-pop'
          : 'border-cream-200 bg-cream-50 hover:bg-cream-100',
      )}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full border-2 border-lavender-500 bg-lavender-400 text-white shadow-soft"
        >
          <Check className="size-4" />
        </motion.span>
      )}

      <motion.span
        className="text-4xl leading-none"
        aria-hidden
        animate={selected ? { rotate: [-6, 6, -6] } : { rotate: 0 }}
        transition={
          selected
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
      >
        {option.emoji}
      </motion.span>

      <p className="font-display text-lg font-bold text-cocoa-900">{option.title}</p>
      <p className="text-xs leading-relaxed text-cocoa-700/85">{option.description}</p>

      <div className="mt-2 flex w-full items-center justify-between gap-2 border-t-2 border-cream-200 pt-2.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cocoa-700/80">
          📍 {option.location}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-bold',
            selected ? 'bg-lavender-200 text-lavender-500' : 'bg-cream-200 text-cocoa-700',
          )}
        >
          {option.rewardLabel}
        </span>
      </div>
    </motion.button>
  )
}

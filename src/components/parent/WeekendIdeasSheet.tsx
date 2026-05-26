import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Sparkles, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { PastelTone } from '@/types'

interface Idea {
  id: string
  emoji: string
  title: string
  description: string
  duration: string
  category: string
  tone: PastelTone
}

const IDEAS: Idea[] = [
  {
    id: 'leaf-walk',
    emoji: '🌿',
    title: 'Đi dạo công viên — Săn lá',
    description:
      'Cùng bé tìm 5 loại lá khác nhau ở công viên, mang về dán vào sổ tay tự nhiên.',
    duration: '30 phút',
    category: 'Ngoài trời',
    tone: 'mint',
  },
  {
    id: 'kitchen-helper',
    emoji: '🥕',
    title: 'Đầu bếp nhí',
    description:
      'Cùng bé chuẩn bị một món ăn đơn giản: rửa rau, trộn salad, hoặc nướng bánh quy.',
    duration: '45 phút',
    category: 'Gia đình',
    tone: 'peach',
  },
  {
    id: 'star-gazing',
    emoji: '🌟',
    title: 'Đếm sao trời',
    description:
      'Tối thứ Bảy, tắt đèn ngoài hiên, cùng bé tìm sao Bắc Đẩu và Mặt Trăng.',
    duration: '20 phút',
    category: 'Quan sát',
    tone: 'lavender',
  },
  {
    id: 'art-story',
    emoji: '🎨',
    title: 'Vẽ tiếp câu chuyện của Lumi',
    description:
      'Cùng bé vẽ một bức tranh: "Nếu Lumi đi học cùng bé thì sao?"',
    duration: '25 phút',
    category: 'Sáng tạo',
    tone: 'butter',
  },
  {
    id: 'bedtime-book',
    emoji: '📚',
    title: 'Đọc sách trước khi ngủ',
    description:
      'Một quyển sách tranh, một cốc sữa ấm. Bé kể lại câu chuyện sau khi đọc xong.',
    duration: '15 phút',
    category: 'Ngôn ngữ',
    tone: 'sky',
  },
]

const TONE_BORDER: Record<PastelTone, string> = {
  peach:    'border-peach-200 bg-peach-50',
  mint:     'border-mint-200 bg-mint-50',
  butter:   'border-butter-200 bg-butter-50',
  lavender: 'border-lavender-200 bg-lavender-50',
  sky:      'border-sky-cozy-200 bg-sky-cozy-50',
}

const TONE_PILL: Record<PastelTone, string> = {
  peach:    'bg-peach-100 text-peach-500 border-peach-300',
  mint:     'bg-mint-100 text-mint-500 border-mint-300',
  butter:   'bg-butter-100 text-butter-500 border-butter-300',
  lavender: 'bg-lavender-100 text-lavender-500 border-lavender-300',
  sky:      'bg-sky-cozy-100 text-sky-cozy-300 border-sky-cozy-300',
}

interface WeekendIdeasSheetProps {
  open: boolean
  onClose: () => void
}

export function WeekendIdeasSheet({ open, onClose }: WeekendIdeasSheetProps) {
  // Esc key closes
  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Gợi ý hoạt động cuối tuần"
          className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-900/40 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className={cn(
              'relative w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-cream-50',
              'sm:rounded-3xl sm:border-4 sm:border-lavender-200 sm:shadow-pop',
              'max-h-[90dvh] flex flex-col',
            )}
          >
            {/* Sticky header */}
            <header className="flex items-center justify-between border-b-2 border-cream-200 bg-cream-50/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl border-2 border-lavender-200 bg-lavender-100 text-lavender-500">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-lavender-500">
                    Gợi ý cuối tuần
                  </p>
                  <h2 className="font-display text-lg font-bold text-cocoa-900">
                    5 hoạt động ấm áp cho cả nhà
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="grid size-10 place-items-center rounded-full border-2 border-cream-200 bg-cream-50 text-cocoa-700 hover:bg-cream-100"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <ul className="space-y-3">
                {IDEAS.map((idea, i) => (
                  <motion.li
                    key={idea.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    className={cn(
                      'flex items-start gap-4 rounded-3xl border-2 p-4',
                      TONE_BORDER[idea.tone],
                    )}
                  >
                    <span
                      className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/70 text-3xl shadow-inset-soft"
                      aria-hidden
                    >
                      {idea.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-display text-base font-semibold text-cocoa-900">
                          {idea.title}
                        </h3>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                            TONE_PILL[idea.tone],
                          )}
                        >
                          {idea.category}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-cocoa-700">
                        {idea.description}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cocoa-700/80">
                        <Clock className="size-3.5" />
                        {idea.duration}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>

            <footer className="border-t-2 border-cream-200 bg-cream-50/95 px-6 py-3 text-center text-xs text-cocoa-700/70 backdrop-blur">
              💌 Bé sẽ được +1 sao khi cùng cả nhà hoàn thành một gợi ý.
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

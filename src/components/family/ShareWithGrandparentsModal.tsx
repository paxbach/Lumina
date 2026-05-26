import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Heart, Link2, Mail, MessageCircle, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { springBouncy, springSoft } from '@/utils/motion'
import type { PastelTone } from '@/types'

interface ShareWithGrandparentsModalProps {
  open: boolean
  onClose: () => void
  photoCount: number
}

interface Channel {
  id: string
  label: string
  description: string
  emoji: string
  icon: typeof Mail
  tone: Extract<PastelTone, 'peach' | 'mint' | 'lavender'>
}

const CHANNELS: Channel[] = [
  {
    id: 'email',
    label: 'Gửi qua email',
    description: 'Một bức thư kèm ảnh và lời nhắn yêu thương từ bé.',
    emoji: '📧',
    icon: Mail,
    tone: 'peach',
  },
  {
    id: 'zalo',
    label: 'Tin nhắn Zalo',
    description: 'Chia sẻ nhanh tới nhóm gia đình.',
    emoji: '💬',
    icon: MessageCircle,
    tone: 'mint',
  },
  {
    id: 'link',
    label: 'Sao chép liên kết',
    description: 'Gửi đường dẫn vào bất cứ đâu ông bà thích.',
    emoji: '🔗',
    icon: Link2,
    tone: 'lavender',
  },
]

const TONE_FRAME: Record<Channel['tone'], string> = {
  peach:    'border-peach-200 bg-peach-50 hover:bg-peach-100',
  mint:     'border-sage-200 bg-sage-50 hover:bg-sage-100',
  lavender: 'border-lavender-200 bg-lavender-50 hover:bg-lavender-100',
}

const TONE_ICON: Record<Channel['tone'], string> = {
  peach:    'bg-peach-100 text-peach-500 border-peach-200',
  mint:     'bg-sage-100 text-sage-500 border-sage-200',
  lavender: 'bg-lavender-100 text-lavender-500 border-lavender-200',
}

export function ShareWithGrandparentsModal({
  open,
  onClose,
  photoCount,
}: ShareWithGrandparentsModalProps) {
  const { play } = useSound()
  const [sentChannel, setSentChannel] = useState<string | null>(null)

  // Esc to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Reset sent state on re-open
  useEffect(() => {
    if (!open) setSentChannel(null)
  }, [open])

  const handleChannel = (id: string) => {
    play('correct')
    setSentChannel(id)
    // Auto-close after the success badge has been on screen ~1.4s
    window.setTimeout(onClose, 1400)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Chia sẻ với ông bà"
          className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-900/45 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '50%', opacity: 0 }}
            transition={{ ...springBouncy, mass: 0.85 }}
            className={cn(
              'w-full max-w-md overflow-hidden bg-cream-50 shadow-pop',
              'rounded-t-[2rem] sm:rounded-cozy sm:border-4 sm:border-peach-300',
            )}
          >
            {/* Header */}
            <header className="relative flex items-start justify-between gap-3 border-b-2 border-cream-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl border-2 border-peach-200 bg-peach-100 text-2xl shadow-soft">
                  💌
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-peach-500">
                    Chia sẻ
                  </p>
                  <h2 className="font-display text-lg font-bold text-cocoa-900">
                    Với ông bà yêu thương
                  </h2>
                  <p className="mt-0.5 text-xs text-cocoa-700/80">
                    <strong className="tabular-nums text-cocoa-900">
                      {photoCount}
                    </strong>{' '}
                    kỷ niệm sẽ được gửi đi
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={onClose}
                className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-cream-200 bg-cream-50 text-cocoa-700 transition-colors hover:bg-cream-100"
              >
                <X className="size-5" />
              </button>
            </header>

            {/* Channels */}
            <ul className="space-y-3 px-5 py-5">
              {CHANNELS.map((channel, i) => {
                const Icon = channel.icon
                const isSent = sentChannel === channel.id
                return (
                  <motion.li
                    key={channel.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springSoft, delay: 0.06 + i * 0.05 }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => handleChannel(channel.id)}
                      disabled={sentChannel != null}
                      whileTap={{ scale: 0.98 }}
                      whileHover={
                        sentChannel == null ? { y: -2 } : undefined
                      }
                      className={cn(
                        'flex w-full items-center gap-3 rounded-cozy border-2 p-3 text-left shadow-soft transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        TONE_FRAME[channel.tone],
                        isSent && '!opacity-100 ring-4 ring-mint-300',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-12 shrink-0 place-items-center rounded-2xl border-2 text-2xl shadow-inset-soft',
                          TONE_ICON[channel.tone],
                        )}
                      >
                        {isSent ? (
                          <Check className="size-5" />
                        ) : (
                          <span aria-hidden>{channel.emoji}</span>
                        )}
                      </span>
                      <div className="flex-1">
                        <p className="font-display text-base font-bold text-cocoa-900">
                          {isSent ? 'Đã gửi đi rồi!' : channel.label}
                        </p>
                        <p className="mt-0.5 text-xs text-cocoa-700/80">
                          {isSent
                            ? 'Ông bà sẽ thấy ngay đây ❤️'
                            : channel.description}
                        </p>
                      </div>
                      <Icon
                        className={cn(
                          'size-5 shrink-0 transition-colors',
                          isSent ? 'text-mint-500' : 'text-cocoa-700/60',
                        )}
                      />
                    </motion.button>
                  </motion.li>
                )
              })}
            </ul>

            {/* Footer */}
            <footer className="flex items-center justify-center gap-1.5 border-t-2 border-cream-200 bg-cream-50/80 px-5 py-3 text-center text-xs text-cocoa-700/75">
              <Heart className="size-3.5 fill-peach-300 stroke-peach-500" />
              Ông bà sẽ rất vui khi nhận được hành trình của cháu.
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

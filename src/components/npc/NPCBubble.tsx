import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { NPCAvatar } from '@/components/npc/NPCAvatar'
import { useTypewriter } from '@/hooks/useTypewriter'
import { springBouncy } from '@/utils/motion'
import type { NPC } from '@/data/npcs'
import type { PastelTone } from '@/types'

interface NPCBubbleProps {
  npc: NPC
  /** The message the NPC speaks — typewriter-revealed. */
  message: string
  /** Which side the NPC portrait sits on. Defaults to 'left'. */
  side?: 'left' | 'right'
  /** Portrait size in px. */
  avatarSize?: number
  /** Optional callback when the player taps the bubble after typing is done. */
  onContinue?: () => void
  /** Optional CTA block rendered below the message text. */
  cta?: React.ReactNode
  /** Typewriter speed override (ms per char). */
  speed?: number
  /** Slight tilt on the whole panel — picture-book "hand-placed" feel. */
  tilt?: number
  className?: string
}

const TONE_EYEBROW: Record<PastelTone, string> = {
  peach:    'text-peach-500',
  mint:     'text-sage-500',
  butter:   'text-butter-500',
  lavender: 'text-lavender-500',
  sky:      'text-sky-500',
}

const TONE_BORDER_BUBBLE: Record<PastelTone, string> = {
  peach:    'border-peach-200',
  mint:     'border-sage-200',
  butter:   'border-butter-200',
  lavender: 'border-lavender-200',
  sky:      'border-sky-200',
}

const TONE_TAIL_STROKE: Record<PastelTone, string> = {
  peach:    'var(--color-peach-200)',
  mint:     'var(--color-sage-200)',
  butter:   'var(--color-butter-200)',
  lavender: 'var(--color-lavender-200)',
  sky:      'var(--color-sky-200)',
}

/**
 * NPCBubble — character portrait + speech bubble with typewriter text.
 *
 * Layout:
 *   ┌──────┐  ╭──────────────────────────╮
 *   │ NPC  │ ◁│ Eyebrow: "<NPC> đang nói" │
 *   │ 🐻   │  │ Hôm nay chúng ta cùng…   │
 *   └──────┘  │ [optional CTA]            │
 *             ╰──────────────────────────╯
 *
 * Tap the bubble to skip the typewriter; tap again when done to continue.
 */
export function NPCBubble({
  npc,
  message,
  side = 'left',
  avatarSize = 110,
  onContinue,
  cta,
  speed,
  tilt = 0,
  className,
}: NPCBubbleProps) {
  const { displayed, isDone, skip } = useTypewriter(message, { speed })

  const handleClick = useCallback(() => {
    if (!isDone) skip()
    else if (onContinue) onContinue()
  }, [isDone, skip, onContinue])

  return (
    <motion.div
      style={{ rotate: tilt }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springBouncy}
      className={cn(
        'flex items-start gap-3 sm:gap-5',
        side === 'right' && 'flex-row-reverse',
        className,
      )}
    >
      {/* Portrait — slight y-offset for asymmetric "hand-placed" feel */}
      <div className="-mt-2 shrink-0">
        <NPCAvatar npc={npc} size={avatarSize} />
      </div>

      {/* Bubble — flex-1 takes more space than avatar */}
      <div className="relative min-w-0 flex-1 pt-3">
        <Tail side={side} stroke={TONE_TAIL_STROKE[npc.tone]} />

        <button
          type="button"
          onClick={handleClick}
          aria-label={isDone ? 'Tiếp tục' : 'Hiện hết lời thoại'}
          className={cn(
            'group relative block w-full rounded-cozy border-[3px] bg-cream-50/95 px-4 py-3.5 text-left shadow-soft backdrop-blur',
            'transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200',
            'sm:px-5 sm:py-4',
            TONE_BORDER_BUBBLE[npc.tone],
          )}
        >
          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-[0.3em]',
              TONE_EYEBROW[npc.tone],
            )}
          >
            {npc.name} đang nói
          </p>

          <p className="mt-1.5 font-display text-base leading-snug text-cocoa-900 sm:text-lg">
            {displayed}
            {!isDone && <Caret />}
          </p>

          {cta}

          <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-cocoa-700/55">
            {isDone ? (
              <>
                Chạm để tiếp tục
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="inline-flex"
                >
                  <ChevronRight className="size-3.5" />
                </motion.span>
              </>
            ) : (
              'Chạm để xem nhanh hơn'
            )}
          </p>
        </button>
      </div>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────────────── */
/* Tail — small triangle pointing from the bubble to the avatar.       */
/* ────────────────────────────────────────────────────────────────── */

function Tail({
  side,
  stroke,
}: {
  side: 'left' | 'right'
  stroke: string
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 14 20"
      className={cn(
        'absolute top-7 h-5 w-3.5',
        side === 'left' ? 'left-[-12px]' : 'right-[-12px] -scale-x-100',
      )}
    >
      {/* Fill the full triangle */}
      <polygon
        points="14,0 0,10 14,20"
        fill="var(--color-cream-50)"
      />
      {/* Stroke only the 2 outward edges so the bubble border merges seamlessly */}
      <path
        d="M 14 0 L 0 10 L 14 20"
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ────────────────────────────────────────────────────────────────── */
/* Caret — blinks while typing.                                        */
/* ────────────────────────────────────────────────────────────────── */

function Caret() {
  return (
    <motion.span
      aria-hidden
      className="ml-0.5 inline-block h-[1.1em] w-[3px] -mb-0.5 rounded-sm bg-cocoa-800 align-middle"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
    />
  )
}

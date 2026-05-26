import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { NPCBubble } from '@/components/npc/NPCBubble'
import {
  DAILY_GREETINGS,
  getNPC,
  pickDailyGreeting,
  type NPCGreeting,
} from '@/data/npcs'
import { springBouncy, springSoft } from '@/utils/motion'

interface DailyNPCGreetingProps {
  /** Override the auto-picked daily greeting (useful for storybook variants). */
  initial?: NPCGreeting
  className?: string
}

/**
 * Picture-book "story page" wrapping a daily NPC greeting.
 *
 * Visual treatment:
 *   - Asymmetric panel (slight tilt) with hand-drawn corner stars
 *   - Parchment-paper gradient background
 *   - NPC sits on alternating sides (defaults to left) — speech bubble
 *     extends past it on the other side
 *   - Optional CTA from the greeting routes the kid to the matching quest
 */
export function DailyNPCGreeting({ initial, className }: DailyNPCGreetingProps) {
  const [greeting, setGreeting] = useState<NPCGreeting>(
    () => initial ?? pickDailyGreeting(),
  )
  const npc = useMemo(() => getNPC(greeting.npc), [greeting.npc])
  const navigate = useNavigate()

  if (!npc) return null

  const handleNewGreeting = () => {
    // Rotate to the next greeting in the pool — useful while testing.
    const idx = DAILY_GREETINGS.findIndex((g) => g === greeting)
    const next = DAILY_GREETINGS[(idx + 1) % DAILY_GREETINGS.length]
    setGreeting(next)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className={cn('relative', className)}
    >
      {/* The "page" — tilted parchment with hand-drawn corner decorations */}
      <div
        className="relative overflow-hidden rounded-cozy border-4 border-butter-300 px-5 py-6 shadow-pop sm:px-7 sm:py-7"
        style={{
          backgroundImage: `
            radial-gradient(40% 60% at 12% 8%, var(--color-butter-100) 0%, transparent 70%),
            radial-gradient(40% 60% at 88% 92%, var(--color-peach-100) 0%, transparent 70%),
            linear-gradient(168deg, #fff8e8 0%, #fff1d6 100%)
          `,
          boxShadow:
            'inset 0 0 0 2px rgba(245, 179, 45, 0.18), 0 14px 32px -10px rgba(140, 100, 60, 0.25)',
        }}
      >
        {/* Page header — eyebrow + small refresh action */}
        <header className="relative mb-4 flex items-end justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-2xl border-2 border-butter-400 bg-butter-100 text-butter-500 shadow-soft">
              <BookOpen className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-butter-500">
                Trang truyện hôm nay
              </p>
              <p className="font-display text-sm font-bold text-cocoa-900">
                {todayLabel()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewGreeting}
            aria-label="Bạn khác đến chơi"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50/90 px-3 py-1 text-xs font-bold text-cocoa-700 shadow-soft transition-colors hover:bg-cream-100"
          >
            <RefreshCw className="size-3.5" />
            Bạn khác
          </button>
        </header>

        {/* Hand-drawn corner decorations — tiny stars + dots */}
        <PageDecorations />

        {/* NPCBubble does most of the work — we just hand it the message + CTA */}
        <NPCBubble
          npc={npc}
          message={greeting.message}
          side="left"
          avatarSize={108}
          tilt={-0.6}
          cta={
            greeting.cta && (
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springBouncy, delay: 0.3 }}
                className="mt-3 inline-block"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(greeting.cta!.route)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-peach-500 bg-gradient-to-br from-peach-400 to-peach-500 px-4 py-1.5 font-display text-sm font-bold text-white shadow-pop transition-transform hover:-translate-y-0.5"
                >
                  {greeting.cta.label}
                  <ArrowRight className="size-4" />
                </button>
              </motion.span>
            )
          }
        />
      </div>
    </motion.section>
  )
}

/* ────────────────────────────────────────────────────────────────── */

function todayLabel(date: Date = new Date()): string {
  const weekday = WEEKDAYS_VI[date.getDay()]
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${weekday} · ${day}/${month}`
}

const WEEKDAYS_VI = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
]

/**
 * Hand-drawn-style page decorations — small stars + dotted accents in the
 * page margins. Adds the picture-book feel without competing with the bubble.
 */
function PageDecorations() {
  return (
    <>
      {/* Top-right corner cluster */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-3 text-xl text-butter-500 opacity-70"
        style={{ transform: 'rotate(15deg)' }}
      >
        ✦
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-10 top-7 text-sm text-peach-500 opacity-60"
        style={{ transform: 'rotate(-10deg)' }}
      >
        ✦
      </span>

      {/* Bottom-left dot trail */}
      <svg
        aria-hidden
        viewBox="0 0 120 18"
        className="pointer-events-none absolute bottom-3 left-5 h-3 w-24 text-peach-400 opacity-60"
      >
        <path
          d="M 4 9 Q 18 2, 32 9 T 60 9 T 88 9 T 116 9"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </svg>

      {/* Bottom-right tiny scribble flowers */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 right-4 text-base opacity-70"
      >
        🌼
      </span>
    </>
  )
}

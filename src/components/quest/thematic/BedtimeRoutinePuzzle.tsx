import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Check, Moon, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { springBouncy, springSoft } from '@/utils/motion'

interface BedtimeRoutinePuzzleProps {
  onComplete: () => void
}

/**
 * "Câu Chuyện Trước Khi Ngủ" — order the 4 bedtime routine steps.
 *
 * Cards appear shuffled in the palette. Kid taps them in the correct
 * order (bath → milk → story → goodnight hug). Right tap → card flies
 * into the sequence track; wrong tap → shake. Win when all 4 are in
 * order. After 1.3 s the parent's onComplete fires.
 */

interface Step {
  id: string
  glyph: string
  title: string
  order: number
  tone: 'peach' | 'butter' | 'lavender' | 'mint'
}

const STEPS: Step[] = [
  { id: 'bath',    glyph: '🛁', title: 'Tắm gội',           order: 1, tone: 'mint'     },
  { id: 'milk',    glyph: '🥛', title: 'Sữa nóng',          order: 2, tone: 'butter'   },
  { id: 'story',   glyph: '📖', title: 'Đọc truyện',        order: 3, tone: 'lavender' },
  { id: 'hug',     glyph: '🫂', title: 'Ôm chúc ngủ ngon',  order: 4, tone: 'peach'    },
]

const TONE_BG: Record<Step['tone'], string> = {
  peach:    'bg-peach-100 border-peach-300',
  butter:   'bg-butter-100 border-butter-300',
  lavender: 'bg-lavender-100 border-lavender-300',
  mint:     'bg-mint-100 border-mint-300',
}

export function BedtimeRoutinePuzzle({
  onComplete,
}: BedtimeRoutinePuzzleProps) {
  const { play } = useSound()
  // Shuffle once; lock for the session
  const shuffled = useMemo(() => shuffle(STEPS), [])
  const [placed, setPlaced] = useState<string[]>([])
  const [wrongs, setWrongs] = useState(0)
  const trackShake = useAnimationControls()

  const remaining = shuffled.filter((s) => !placed.includes(s.id))
  const nextExpectedOrder = placed.length + 1
  const isDone = placed.length === STEPS.length

  const handlePick = (step: Step) => {
    if (isDone) return
    if (step.order === nextExpectedOrder) {
      play('correct')
      setPlaced((p) => [...p, step.id])
    } else {
      play('wrong')
      setWrongs((w) => w + 1)
      trackShake.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.35 },
      })
    }
  }

  useEffect(() => {
    if (!isDone) return
    const t = window.setTimeout(onComplete, 1400)
    return () => window.clearTimeout(t)
  }, [isDone, onComplete])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-peach-500">
            Trước khi ngủ
          </p>
          <h3 className="font-display text-xl font-bold text-cocoa-900">
            Sắp Xếp Giờ Đi Ngủ
          </h3>
        </div>
        <span className="rounded-full border-2 border-peach-300 bg-peach-100 px-3 py-1.5 text-xs font-bold text-peach-500 shadow-soft">
          {placed.length}/{STEPS.length} bước
        </span>
      </div>

      {/* Sequence track */}
      <motion.div
        animate={trackShake}
        className="relative space-y-4 rounded-[2rem] border-4 border-peach-300 p-5 shadow-pop"
        style={{
          backgroundImage: `
            radial-gradient(70% 80% at 50% 0%, var(--color-peach-100) 0%, transparent 60%),
            linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-peach-50) 100%)
          `,
        }}
      >
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((_, i) => {
            const stepId = placed[i]
            const step = STEPS.find((s) => s.id === stepId)
            return (
              <div
                key={i}
                className={cn(
                  'relative grid aspect-square place-items-center rounded-2xl border-2 border-dashed text-3xl shadow-soft',
                  step
                    ? cn('border-solid', TONE_BG[step.tone])
                    : 'border-peach-300/70 bg-cream-50/60',
                )}
              >
                <span className="absolute left-1.5 top-1 text-[10px] font-bold tabular-nums text-cocoa-700/60">
                  #{i + 1}
                </span>
                <AnimatePresence mode="wait">
                  {step && (
                    <motion.span
                      key={step.id}
                      initial={{ scale: 0, rotate: -20, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={springBouncy}
                      aria-label={step.title}
                    >
                      {step.glyph}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={springBouncy}
              className="absolute inset-0 grid place-items-center rounded-[2rem] bg-cream-50/92 backdrop-blur-sm"
            >
              <div className="text-center">
                <Moon
                  className="mx-auto size-12 fill-lavender-300 stroke-lavender-500"
                  aria-hidden
                />
                <h4 className="mt-2 font-display text-xl font-bold text-cocoa-900">
                  Chúc bé ngủ ngon!
                </h4>
                <p className="mt-1 text-sm text-cocoa-700">
                  Một cái ôm trước khi ngủ là phép màu lớn nhất. 💖
                </p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-mint-200 px-3 py-1 text-xs font-bold text-mint-500">
                  <Check className="size-3.5" /> Hoàn thành{' '}
                  <Sparkles className="size-3.5" />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Palette of remaining cards */}
      {!isDone && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-peach-500">
            Việc cần làm
          </p>
          <p className="font-display text-sm font-semibold text-cocoa-900">
            Chạm theo đúng thứ tự bé thường làm trước khi ngủ
          </p>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08 } },
            }}
            className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {remaining.map((step) => (
              <motion.button
                key={step.id}
                type="button"
                onClick={() => handlePick(step)}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={springSoft}
                whileTap={{ scale: 0.92 }}
                whileHover={{ y: -3, scale: 1.04 }}
                className={cn(
                  'rounded-2xl border-2 p-3 text-center shadow-soft hover:shadow-pop',
                  TONE_BG[step.tone],
                )}
              >
                <span className="block text-3xl" aria-hidden>
                  {step.glyph}
                </span>
                <span className="mt-1 block font-display text-xs font-bold text-cocoa-900">
                  {step.title}
                </span>
              </motion.button>
            ))}
          </motion.div>
        </section>
      )}

      <p className="text-xs text-cocoa-700/70">
        {wrongs > 0
          ? `Sai ${wrongs} lần — bé thử nhớ lại từ đầu ngày nhé.`
          : 'Mẹo: Lumi thường tắm trước, sau đó uống sữa, nghe truyện và ôm ba mẹ. 🌙'}
      </p>
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

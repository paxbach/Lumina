import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Check, Eye, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { springBouncy, springSoft } from '@/utils/motion'

interface TrafficKeypadChallengeProps {
  onComplete: () => void
}

/**
 * "Tìm Đường Về Nhà" — Smart City themed safety drill.
 *
 *   Stage 1 (peek) : Lumi reveals a 4-digit "code" — framed as part of
 *                    ba mẹ's phone number — for ~3 seconds.
 *   Stage 2 (entry): The code hides; kid taps the keypad in the same
 *                    order. Wrong taps shake; 3 wrongs reset the round.
 *   Stage 3 (won)  : Mini-quiz on emergency numbers (113/114/115)
 *                    before the final onComplete.
 *
 * Kept deliberately short — 3 → 5 taps end-to-end — because this is the
 * minigame phase, not the whole quest.
 */

const CODE_LENGTH = 4
const PEEK_DURATION_MS = 3200
const MAX_WRONG = 3

const EMERGENCY_QUIZ: { question: string; answer: '113' | '114' | '115' }[] = [
  { question: 'Có cháy thì gọi số nào?', answer: '114' },
  { question: 'Có người bị thương thì gọi số nào?', answer: '115' },
  { question: 'Thấy người lạ đáng ngờ thì gọi số nào?', answer: '113' },
]

type Phase = 'peek' | 'entry' | 'quiz' | 'won'

function makeCode(): string {
  // Avoid leading zero so the visual stays satisfying.
  const first = 1 + Math.floor(Math.random() * 9)
  let rest = ''
  for (let i = 1; i < CODE_LENGTH; i++) {
    rest += Math.floor(Math.random() * 10)
  }
  return `${first}${rest}`
}

export function TrafficKeypadChallenge({
  onComplete,
}: TrafficKeypadChallengeProps) {
  const { play } = useSound()
  const [code, setCode] = useState(() => makeCode())
  const [phase, setPhase] = useState<Phase>('peek')
  const [entered, setEntered] = useState<string>('')
  const [wrongs, setWrongs] = useState(0)
  const [quizIdx] = useState(() =>
    Math.floor(Math.random() * EMERGENCY_QUIZ.length),
  )
  const padShake = useAnimationControls()

  // Auto-advance peek → entry
  useEffect(() => {
    if (phase !== 'peek') return
    const t = window.setTimeout(() => {
      setPhase('entry')
    }, PEEK_DURATION_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  const handleDigit = (d: string) => {
    if (phase !== 'entry') return
    const next = entered + d
    const expected = code[entered.length]
    if (d === expected) {
      play('correct')
      setEntered(next)
      if (next.length === code.length) {
        // Brief pause then quiz
        window.setTimeout(() => setPhase('quiz'), 350)
      }
    } else {
      play('wrong')
      setWrongs((w) => w + 1)
      padShake.start({
        x: [0, -10, 10, -8, 8, 0],
        transition: { duration: 0.4 },
      })
      // Soft reset entered digits on each miss
      window.setTimeout(() => setEntered(''), 200)
    }
  }

  const handleReset = () => {
    play('tap')
    setCode(makeCode())
    setEntered('')
    setWrongs(0)
    setPhase('peek')
  }

  const handleQuizAnswer = (choice: '113' | '114' | '115') => {
    if (phase !== 'quiz') return
    const correct = choice === EMERGENCY_QUIZ[quizIdx].answer
    if (correct) {
      play('win')
      setPhase('won')
    } else {
      play('wrong')
      padShake.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.35 },
      })
    }
  }

  // Once we've reached 'won' for at least 800ms, fire the parent's onComplete
  useEffect(() => {
    if (phase !== 'won') return
    const t = window.setTimeout(onComplete, 1100)
    return () => window.clearTimeout(t)
  }, [phase, onComplete])

  const overLimit = wrongs >= MAX_WRONG

  return (
    <div className="space-y-4">
      {/* Header + status pill */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-500">
            Thử thách thành phố
          </p>
          <h3 className="font-display text-xl font-bold text-cocoa-900">
            Nhớ số của ba mẹ
          </h3>
        </div>
        <span className="rounded-full border-2 border-sky-300 bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-500 shadow-soft">
          Sai {wrongs}/{MAX_WRONG}
        </span>
      </div>

      <motion.div
        animate={padShake}
        className="relative space-y-4 rounded-3xl border-4 border-sky-200 p-5 shadow-soft"
        style={{
          backgroundImage: `
            radial-gradient(60% 50% at 50% 0%, var(--color-sky-100) 0%, transparent 70%),
            linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-sky-50) 100%)
          `,
        }}
      >
        <CodeDisplay code={code} entered={entered} phase={phase} />

        <AnimatePresence mode="wait">
          {phase === 'peek' && (
            <motion.p
              key="peek-hint"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={springSoft}
              className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-sky-500"
            >
              <Eye className="size-4" />
              Lumi mở số trong {Math.ceil(PEEK_DURATION_MS / 1000)} giây — nhớ
              kỹ nhé!
            </motion.p>
          )}

          {phase === 'entry' && (
            <motion.div
              key="keypad"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={springSoft}
            >
              <Keypad onTap={handleDigit} disabled={overLimit} />
              {overLimit && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-peach-300 bg-peach-50 px-4 py-2">
                  <p className="text-sm text-cocoa-700">
                    Sai nhiều rồi — bấm "Xem lại" để Lumi mở số nhé!
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full border-2 border-peach-400 bg-peach-200 px-4 py-1.5 text-sm font-bold text-peach-500 shadow-soft hover:bg-peach-300"
                  >
                    Xem lại
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {phase === 'quiz' && (
            <QuizCard
              key="quiz"
              question={EMERGENCY_QUIZ[quizIdx].question}
              onAnswer={handleQuizAnswer}
            />
          )}

          {phase === 'won' && <WinOverlay key="won" />}
        </AnimatePresence>
      </motion.div>

      <p className="text-xs text-cocoa-700/70">
        Nhớ số ba mẹ + 3 số khẩn cấp giúp bé bình tĩnh nếu lạc đường. 🚸
      </p>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════ */

function CodeDisplay({
  code,
  entered,
  phase,
}: {
  code: string
  entered: string
  phase: Phase
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {code.split('').map((digit, i) => {
        const isVisible = phase === 'peek'
        const isEntered = i < entered.length
        return (
          <span
            key={i}
            className={cn(
              'grid size-12 place-items-center rounded-2xl border-2 font-display text-2xl font-bold tabular-nums shadow-soft transition-colors',
              isEntered
                ? 'border-mint-400 bg-mint-100 text-mint-500'
                : isVisible
                  ? 'border-sky-300 bg-cream-50 text-cocoa-900'
                  : 'border-sky-200 bg-cream-50 text-cocoa-700/30',
            )}
          >
            {isVisible ? digit : isEntered ? entered[i] : '•'}
          </span>
        )
      })}
    </div>
  )
}

function Keypad({
  onTap,
  disabled,
}: {
  onTap: (d: string) => void
  disabled?: boolean
}) {
  // Standard phone-keypad layout, no '*'/'#' — just digits 0-9.
  const rows = useMemo(
    () => [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      [' ', '0', ' '],
    ],
    [],
  )
  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2">
      {rows.flatMap((row, ri) =>
        row.map((d, ci) =>
          d === ' ' ? (
            <span key={`${ri}-${ci}`} aria-hidden />
          ) : (
            <motion.button
              key={d}
              type="button"
              onClick={() => onTap(d)}
              disabled={disabled}
              whileTap={disabled ? undefined : { scale: 0.9 }}
              whileHover={disabled ? undefined : { y: -2, scale: 1.04 }}
              transition={springBouncy}
              className={cn(
                'grid h-14 place-items-center rounded-2xl border-2 border-sky-300 bg-cream-50 font-display text-2xl font-bold text-cocoa-900 shadow-soft',
                'hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              {d}
            </motion.button>
          ),
        ),
      )}
    </div>
  )
}

function QuizCard({
  question,
  onAnswer,
}: {
  question: string
  onAnswer: (n: '113' | '114' | '115') => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={springSoft}
      className="space-y-3 text-center"
    >
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-500">
        Bài kiểm tra cuối cùng
      </p>
      <p className="font-display text-lg font-bold text-cocoa-900">
        {question}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(['113', '114', '115'] as const).map((n) => (
          <motion.button
            key={n}
            type="button"
            onClick={() => onAnswer(n)}
            whileTap={{ scale: 0.94 }}
            whileHover={{ y: -2, scale: 1.04 }}
            transition={springBouncy}
            className="rounded-2xl border-2 border-sky-400 bg-sky-100 px-3 py-3 font-display text-xl font-bold text-cocoa-900 shadow-pop hover:bg-sky-200"
          >
            {n}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

function WinOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={springBouncy}
      className="grid place-items-center rounded-3xl border-4 border-mint-300 bg-cream-50 px-6 py-5 text-center shadow-pop"
    >
      <span className="text-5xl" aria-hidden>
        🚸
      </span>
      <h3 className="mt-2 font-display text-xl font-bold text-cocoa-900">
        Đèn đường sáng lại rồi!
      </h3>
      <p className="mt-1 text-sm text-cocoa-700">
        Bé đã thắp lại một con đường an toàn cho Thành Phố Thông Minh.
      </p>
      <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-mint-200 px-3 py-1 text-xs font-bold text-mint-500">
        <Check className="size-3.5" /> Hoàn thành{' '}
        <Sparkles className="size-3.5" />
      </span>
    </motion.div>
  )
}

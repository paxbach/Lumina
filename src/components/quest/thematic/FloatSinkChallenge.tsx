import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { springBouncy, springSoft } from '@/utils/motion'

interface FloatSinkChallengeProps {
  onComplete: () => void
}

/**
 * "Hành Trình Sao Băng" — science experiment: pick float or sink.
 *
 * One card visible at a time. Kid taps "Nổi 🟢" or "Chìm 🔵". Right answer
 * → swooshes off + next card; wrong → shake + hint. After 5 correct in a
 * row → win. The basin water-surface animates with a subtle bobbing wave
 * for atmosphere.
 */

interface Item {
  id: string
  glyph: string
  label: string
  floats: boolean
}

const ITEMS: Item[] = [
  { id: 'coin',    glyph: '🪙', label: 'Đồng xu',  floats: false },
  { id: 'leaf',    glyph: '🍃', label: 'Lá cây',   floats: true  },
  { id: 'spoon',   glyph: '🥄', label: 'Cái thìa', floats: false },
  { id: 'cork',    glyph: '🧊', label: 'Cục đá',   floats: true  },
  { id: 'coconut', glyph: '🥥', label: 'Quả dừa',  floats: true  },
  { id: 'rock',    glyph: '🪨', label: 'Cục đá to',floats: false },
]

const WIN_TARGET = 5

export function FloatSinkChallenge({ onComplete }: FloatSinkChallengeProps) {
  const { play } = useSound()
  const [order] = useState(() => shuffle(ITEMS).slice(0, WIN_TARGET + 1))
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrongs, setWrongs] = useState(0)
  const [phase, setPhase] = useState<'answering' | 'won'>('answering')
  const basinShake = useAnimationControls()

  const current = order[idx]

  const handleAnswer = (choice: 'float' | 'sink') => {
    if (phase !== 'answering' || !current) return
    const isCorrect =
      (choice === 'float' && current.floats) ||
      (choice === 'sink' && !current.floats)
    if (isCorrect) {
      play('correct')
      const nextCorrect = correct + 1
      setCorrect(nextCorrect)
      if (nextCorrect >= WIN_TARGET) {
        setPhase('won')
      } else {
        setIdx((i) => i + 1)
      }
    } else {
      play('wrong')
      setWrongs((w) => w + 1)
      basinShake.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.35 },
      })
    }
  }

  useEffect(() => {
    if (phase !== 'won') return
    const t = window.setTimeout(onComplete, 1300)
    return () => window.clearTimeout(t)
  }, [phase, onComplete])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-lavender-500">
            Thí nghiệm vũ trụ
          </p>
          <h3 className="font-display text-xl font-bold text-cocoa-900">
            Vật Nổi hay Chìm?
          </h3>
        </div>
        <span className="rounded-full border-2 border-lavender-300 bg-lavender-100 px-3 py-1.5 text-xs font-bold text-lavender-500 shadow-soft">
          {correct}/{WIN_TARGET} đúng
        </span>
      </div>

      {/* Basin */}
      <motion.div
        animate={basinShake}
        className="relative aspect-[5/3] w-full overflow-hidden rounded-[2rem] border-4 border-lavender-300 shadow-pop"
        style={{
          backgroundImage: `
            radial-gradient(60% 80% at 50% 0%, rgba(255,255,255,0.7) 0%, transparent 60%),
            linear-gradient(180deg, var(--color-sky-100) 0%, var(--color-sky-200) 50%, var(--color-lavender-200) 100%)
          `,
        }}
      >
        {/* Animated water surface */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 top-[40%] h-1 rounded-full bg-sky-100/70"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 18px var(--color-sky-glow)' }}
        />
        <div className="absolute inset-x-0 top-[42%] bottom-0 bg-gradient-to-b from-sky-200/60 via-lavender-200/30 to-lavender-300/20" />

        <AnimatePresence mode="wait">
          {phase === 'answering' && current && (
            <motion.div
              key={current.id}
              initial={{ y: -40, opacity: 0, scale: 0.7 }}
              animate={{
                y: [-40, 0],
                opacity: 1,
                scale: 1,
                rotate: [-6, 6, -6],
              }}
              exit={{
                y: current.floats ? -20 : 200,
                opacity: 0,
                scale: 0.8,
              }}
              transition={{
                ...springSoft,
                rotate: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="absolute left-1/2 top-[28%] -translate-x-1/2 text-center"
            >
              <span
                className="block text-7xl drop-shadow-lg"
                style={{ filter: 'drop-shadow(0 6px 6px rgba(50,30,80,0.25))' }}
                aria-hidden
              >
                {current.glyph}
              </span>
              <span className="mt-2 inline-block rounded-full border-2 border-lavender-300 bg-cream-50/90 px-3 py-0.5 font-display text-xs font-bold text-cocoa-800 shadow-soft">
                {current.label}
              </span>
            </motion.div>
          )}

          {phase === 'won' && (
            <motion.div
              key="won"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={springBouncy}
              className="absolute inset-0 grid place-items-center bg-cream-50/90 backdrop-blur-sm"
            >
              <div className="text-center">
                <span className="text-5xl" aria-hidden>
                  🌠
                </span>
                <h4 className="mt-2 font-display text-xl font-bold text-cocoa-900">
                  Trọng lực ổn định!
                </h4>
                <p className="mt-1 text-sm text-cocoa-700">
                  Mảnh Sao Băng ghép lại được rồi.
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

      {/* Choice buttons */}
      {phase === 'answering' && (
        <div className="grid grid-cols-2 gap-3">
          <ChoiceButton
            tone="mint"
            label="Nổi"
            sublabel="Trên mặt nước"
            icon={<ArrowUp className="size-5" />}
            onClick={() => handleAnswer('float')}
          />
          <ChoiceButton
            tone="lavender"
            label="Chìm"
            sublabel="Xuống đáy"
            icon={<ArrowDown className="size-5" />}
            onClick={() => handleAnswer('sink')}
          />
        </div>
      )}

      <p className="text-xs text-cocoa-700/70">
        {wrongs > 0
          ? `Sai ${wrongs} lần — vật nhẹ hơn nước thì nổi, nặng hơn thì chìm.`
          : 'Mẹo: nghĩ xem vật đó nặng hay nhẹ hơn cùng thể tích nước. ⚖️'}
      </p>
    </div>
  )
}

function ChoiceButton({
  tone,
  label,
  sublabel,
  icon,
  onClick,
}: {
  tone: 'mint' | 'lavender'
  label: string
  sublabel: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -3, scale: 1.03 }}
      transition={springBouncy}
      className={cn(
        'rounded-3xl border-4 px-5 py-4 text-left shadow-pop',
        tone === 'mint'
          ? 'border-mint-400 bg-mint-100 hover:bg-mint-200'
          : 'border-lavender-400 bg-lavender-100 hover:bg-lavender-200',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid size-9 place-items-center rounded-full',
            tone === 'mint'
              ? 'bg-mint-300 text-white'
              : 'bg-lavender-400 text-white',
          )}
        >
          {icon}
        </span>
        <div>
          <p className="font-display text-lg font-bold leading-none text-cocoa-900">
            {label}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-cocoa-700/80">
            {sublabel}
          </p>
        </div>
      </div>
    </motion.button>
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

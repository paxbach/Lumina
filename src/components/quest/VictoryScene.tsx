import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Gem, Lock, Star, Trees, Trophy } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { Confetti } from '@/components/quest/Confetti'
import { LumiCharacter } from '@/components/dashboard/LumiCharacter'

export interface VictoryRewards {
  crystals: number
  stars: number
  /** New value of forest revival (0..1), used to animate the meter. */
  forestRevivalBefore: number
  forestRevivalAfter: number
  /** Optional unlock card. */
  unlock?: {
    title: string
    description: string
    emoji: string
  }
  /** Story tease for the next chapter. */
  nextChapter?: string
}

interface VictorySceneProps {
  questTitle: string
  rewards: VictoryRewards
  onContinue: () => void
  onReturnHome: () => void
}

type Stage =
  | 'curtain'      // 0.0 → black background fades in, title appears
  | 'lumi'         // 0.8 → Lumi appears, level-up banner
  | 'forest'       // 2.0 → forest revival animation
  | 'rewards'      // 3.2 → crystals tick up
  | 'unlock'       // 4.4 → unlock card slides in
  | 'epilogue'     // 5.4 → story tease + buttons

const STAGE_ORDER: Stage[] = ['curtain', 'lumi', 'forest', 'rewards', 'unlock', 'epilogue']

const STAGE_DELAYS: Record<Stage, number> = {
  curtain:  0,
  lumi:     900,
  forest:   2100,
  rewards:  3400,
  unlock:   4600,
  epilogue: 5600,
}

export function VictoryScene({
  questTitle,
  rewards,
  onContinue,
  onReturnHome,
}: VictorySceneProps) {
  const { play } = useSound()
  const [stage, setStage] = useState<Stage>('curtain')

  // Drive the stage progression with timed transitions.
  useEffect(() => {
    const timers: number[] = []
    STAGE_ORDER.forEach((s) => {
      timers.push(
        window.setTimeout(() => {
          setStage(s)
          if (s === 'lumi') play('win')
          if (s === 'rewards') play('correct')
          if (s === 'unlock') play('pop')
        }, STAGE_DELAYS[s]),
      )
    })
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [play])

  const reached = (s: Stage) =>
    STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(s)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(80% 100% at 50% 30%, #2a1f4a 0%, #1a1230 60%, #0d0820 100%)',
      }}
    >
      {/* Distant twinkle stars */}
      <BackgroundStars />

      {/* Confetti from above — stage gated */}
      {reached('lumi') && <Confetti trigger="victory-1" count={48} />}
      {reached('rewards') && <Confetti trigger="victory-2" count={28} />}

      {/* Scrollable content (in case the screen is short) */}
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* ── CURTAIN: cinematic title ─────────────────────── */}
        <AnimatePresence>
          {reached('curtain') && (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              className="text-center"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-butter-300">
                Hành trình hoàn thành
              </p>
              <h1
                className="mt-2 font-display text-4xl font-bold uppercase tracking-wider text-butter-200 sm:text-5xl"
                style={{
                  textShadow:
                    '0 0 24px rgba(255, 215, 120, 0.45), 0 4px 0 rgba(0, 0, 0, 0.4)',
                }}
              >
                Chiến Thắng!
              </h1>
              <p className="mt-1 font-display text-sm text-cream-100/80">
                {questTitle}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── LUMI: spotlight + level-up ───────────────────── */}
        <AnimatePresence>
          {reached('lumi') && (
            <motion.div
              key="lumi"
              initial={{ opacity: 0, y: 20, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16 }}
              className="relative mt-4"
            >
              {/* Soft golden spotlight */}
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,215,120,0.45) 0%, transparent 65%)',
                  filter: 'blur(12px)',
                }}
              />
              <LumiCharacter size={200} />

              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: -8 }}
                transition={{
                  type: 'spring',
                  stiffness: 220,
                  damping: 14,
                  delay: 0.5,
                }}
                className="absolute -right-3 top-0 rounded-2xl border-4 border-butter-500 bg-butter-300 px-3 py-1.5 shadow-pop"
              >
                <p className="font-display text-xs font-bold uppercase tracking-widest text-cocoa-900">
                  LV ↑
                </p>
                <p className="font-display text-sm font-bold text-cocoa-900">Lumi LV 2</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FOREST: revival animation ────────────────────── */}
        <AnimatePresence>
          {reached('forest') && (
            <motion.div
              key="forest"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6 w-full"
            >
              <ForestRevival
                from={rewards.forestRevivalBefore}
                to={rewards.forestRevivalAfter}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── REWARDS: crystal & stars ─────────────────────── */}
        <AnimatePresence>
          {reached('rewards') && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="mt-5 w-full"
            >
              <div className="grid grid-cols-2 gap-3">
                <RewardCard
                  icon={<Gem className="size-5 text-lavender-500" />}
                  label="Tinh Thể Tri Thức"
                  value={`+${rewards.crystals}`}
                  glow="rgba(140,100,240,0.55)"
                />
                <RewardCard
                  icon={<Star className="size-5 fill-butter-400 stroke-butter-500" />}
                  label="Ngôi sao"
                  value={`+${rewards.stars}`}
                  glow="rgba(255,215,120,0.55)"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── UNLOCK: new content card ─────────────────────── */}
        <AnimatePresence>
          {reached('unlock') && rewards.unlock && (
            <motion.div
              key="unlock"
              initial={{ opacity: 0, y: 22, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="mt-5 w-full"
            >
              <UnlockCard {...rewards.unlock} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── EPILOGUE: next-chapter tease + actions ───────── */}
        <AnimatePresence>
          {reached('epilogue') && (
            <motion.div
              key="epilogue"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6 w-full space-y-4"
            >
              {rewards.nextChapter && (
                <div className="rounded-3xl border-2 border-lavender-300/60 bg-lavender-900/30 p-4 text-center backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-butter-200">
                    Câu chuyện tiếp theo
                  </p>
                  <p className="mt-1 font-display text-sm italic leading-relaxed text-cream-100">
                    "{rewards.nextChapter}"
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onReturnHome}
                  className="flex-1 rounded-full border-2 border-white/30 bg-cocoa-900/30 px-5 py-3 font-display text-sm font-bold text-cream-50 backdrop-blur transition-colors hover:bg-cocoa-900/50"
                >
                  Về Làng Ánh Sáng
                </button>
                <motion.button
                  type="button"
                  onClick={onContinue}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -1 }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-butter-500 bg-butter-400 px-5 py-3 font-display text-sm font-bold text-cocoa-900 shadow-pop"
                >
                  Khám phá tiếp
                  <ArrowRight className="size-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────── */

function RewardCard({
  icon,
  label,
  value,
  glow,
}: {
  icon: React.ReactNode
  label: string
  value: string
  glow: string
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="relative flex flex-col items-center gap-1 rounded-3xl border-2 border-cream-100/30 bg-cocoa-900/40 p-4 text-center backdrop-blur"
      style={{ boxShadow: `0 0 24px 4px ${glow}` }}
    >
      <span className="grid size-10 place-items-center rounded-2xl border-2 border-cream-100/40 bg-cream-50/95">
        {icon}
      </span>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-cream-100/70">
        {label}
      </p>
      <p className="font-display text-2xl font-bold tabular-nums text-cream-50">
        {value}
      </p>
    </motion.div>
  )
}

function UnlockCard({
  title,
  description,
  emoji,
}: {
  title: string
  description: string
  emoji: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border-4 border-butter-400 p-5"
      style={{
        backgroundImage:
          'linear-gradient(135deg, rgba(255, 215, 120, 0.25) 0%, rgba(140, 100, 240, 0.25) 100%)',
        boxShadow: '0 0 30px 4px rgba(255, 215, 120, 0.45)',
      }}
    >
      <div className="flex items-start gap-4">
        <motion.span
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-cream-50 text-3xl shadow-pop"
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {emoji}
        </motion.span>
        <div className="flex-1">
          <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-butter-200">
            <Lock className="size-3" />
            Mở khoá mới
          </p>
          <p className="mt-0.5 font-display text-lg font-bold text-cream-50">
            {title}
          </p>
          <p className="mt-1 text-xs text-cream-100/80">{description}</p>
        </div>
      </div>
    </div>
  )
}

function ForestRevival({ from, to }: { from: number; to: number }) {
  const trees = [
    { glyph: '🌲', size: 38 },
    { glyph: '🌳', size: 44 },
    { glyph: '🌴', size: 40 },
    { glyph: '🌳', size: 42 },
    { glyph: '🌲', size: 38 },
    { glyph: '🌳', size: 40 },
    { glyph: '🌲', size: 36 },
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-mint-300/60 bg-mint-900/20 p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <Trees className="size-5 text-mint-300" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-mint-200">
          Rừng đang hồi sinh
        </p>
        <span className="ml-auto inline-flex items-baseline gap-1 font-display text-sm font-bold tabular-nums text-mint-200">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {Math.round(from * 100)}%
          </motion.span>
          <span>→</span>
          <AnimatedPercent from={from} to={to} />
        </span>
      </div>

      {/* Tree row — each tree wakes up sequentially */}
      <ol className="mt-3 flex items-end justify-around gap-1">
        {trees.map((t, i) => (
          <li key={i}>
            <motion.span
              className="inline-block select-none leading-none"
              style={{ fontSize: t.size }}
              initial={{
                filter: 'grayscale(1) brightness(0.7)',
                opacity: 0.45,
                y: 0,
              }}
              animate={{
                filter: 'grayscale(0) brightness(1)',
                opacity: 1,
                y: [0, -6, 0],
              }}
              transition={{
                filter: { duration: 0.5, delay: 0.5 + i * 0.15 },
                opacity: { duration: 0.5, delay: 0.5 + i * 0.15 },
                y: { duration: 0.6, delay: 0.5 + i * 0.15, ease: 'easeOut' },
              }}
            >
              {t.glyph}
            </motion.span>
          </li>
        ))}
      </ol>

      {/* Bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-mint-900/40">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-mint-400 to-butter-400"
          initial={{ width: `${from * 100}%` }}
          animate={{ width: `${to * 100}%` }}
          transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function AnimatedPercent({ from, to }: { from: number; to: number }) {
  const [val, setVal] = useState(from)
  useEffect(() => {
    const start = performance.now()
    const dur = 1200
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(from + (to - from) * ease)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [from, to])
  return <span>{Math.round(val * 100)}%</span>
}

function BackgroundStars() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 2,
  }))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className={cn('absolute rounded-full bg-butter-200')}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            boxShadow: '0 0 6px rgba(255, 215, 120, 0.9)',
          }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 1.6 + (s.id % 3) * 0.6,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export const VictorySceneIcons = { Trophy }

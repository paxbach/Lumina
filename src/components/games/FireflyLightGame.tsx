import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, RotateCcw, Sparkles, Sun, Zap } from 'lucide-react'
import { cn } from '@/utils/cn'

/* ════════════════════════════════════════════════════════════════════
   FireflyLightGame
   ────────────────────────────────────────────────────────────────────
   Mini-game for Node 5 of Rừng Kỳ Diệu (Hang Đom Đóm). Simulates the
   device's ambient light sensor: the presenter (or, in a real build,
   the phone's lux reading) toggles between "Sáng" and "Tối". Dark mode
   wakes 10 firefly particles the toddler can tap to count — each catch
   reveals a glowing constellation-style number.

   Flow:
     environment = 'light' (default)
       Sleeping owl + prompt asking the kid to dim the room.
     environment = 'dark'  → 10 fireflies fade in, tap to catch.
       Counter updates with a stroked, glowing constellation digit.
     phase = 'success' when all 10 caught → CTA fires onComplete.

   Isolated scope: no router / store coupling. Parent ForestGamePage
   wires `onComplete` for crystal + completeSubNode + nav.
   ════════════════════════════════════════════════════════════════════ */

type Environment = 'light' | 'dark'
type Phase = 'playing' | 'success'

const FIREFLY_COUNT = 10
const STAR_COUNT = 28

interface FireflyLightGameProps {
  onComplete?: () => void
}

interface FireflySeed {
  id: number
  /** Spawn anchor % of viewport. */
  x: number
  y: number
  /** Float-cycle duration in seconds. */
  duration: number
  /** Per-firefly delay so the swarm doesn't pulse in unison. */
  delay: number
  /** Px size of the glowing dot. */
  size: number
}

interface StarSeed {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

function buildFireflies(count: number): FireflySeed[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 8 + Math.random() * 84,
    y: 12 + Math.random() * 72,
    duration: 5 + Math.random() * 3.5,
    delay: Math.random() * 1.8,
    size: 12 + Math.random() * 8,
  }))
}

function buildStars(count: number): StarSeed[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2.2,
    delay: Math.random() * 3,
    duration: 2.2 + Math.random() * 2,
  }))
}

export function FireflyLightGame({ onComplete }: FireflyLightGameProps) {
  const [environment, setEnvironment] = useState<Environment>('light')
  const [caught, setCaught] = useState<Set<number>>(() => new Set())
  const [phase, setPhase] = useState<Phase>('playing')

  // Stable seeds — taps must NOT reshuffle firefly positions or stars.
  const fireflies = useMemo(() => buildFireflies(FIREFLY_COUNT), [])
  const stars = useMemo(() => buildStars(STAR_COUNT), [])

  const isDark = environment === 'dark'
  const caughtCount = caught.size

  const handleCatch = (id: number) => {
    if (!isDark || caught.has(id)) return
    setCaught((prev) => {
      const next = new Set(prev)
      next.add(id)
      // Delay phase flip so the final number reveal finishes first.
      if (next.size >= FIREFLY_COUNT && phase === 'playing') {
        window.setTimeout(() => setPhase('success'), 700)
      }
      return next
    })
  }

  const handleReset = () => {
    setCaught(new Set())
    setPhase('playing')
    setEnvironment('light')
  }

  return (
    <div className="space-y-4">
      <EnvironmentToggle value={environment} onChange={setEnvironment} />

      <CaveScene
        environment={environment}
        fireflies={fireflies}
        stars={stars}
        caught={caught}
        onCatch={handleCatch}
      />

      <Counter count={caughtCount} total={FIREFLY_COUNT} isDark={isDark} />

      <AnimatePresence>
        {phase === 'success' && (
          <SuccessPanel
            key="success"
            onComplete={onComplete}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Environment toggle — Sáng ⇆ Tối slider knob with sun/moon icons
   ════════════════════════════════════════════════════════════════════ */

function EnvironmentToggle({
  value,
  onChange,
}: {
  value: Environment
  onChange: (next: Environment) => void
}) {
  const isDark = value === 'dark'
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border-2 border-cocoa-200 bg-cream-50 px-3 py-2 shadow-soft">
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa-700/70">
        Môi trường
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Chuyển môi trường sáng / tối"
        onClick={() => onChange(isDark ? 'light' : 'dark')}
        className={cn(
          'relative h-9 w-24 shrink-0 rounded-full border-2 transition-colors',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200',
          isDark
            ? 'border-indigo-700 bg-gradient-to-r from-amber-200 via-indigo-700 to-indigo-950'
            : 'border-amber-300 bg-gradient-to-r from-amber-200 via-amber-100 to-indigo-200',
        )}
      >
        {/* Track icons — both visible at all times, dimmed when inactive. */}
        <Sun
          className={cn(
            'absolute left-1.5 top-1/2 size-3.5 -translate-y-1/2 transition-opacity',
            isDark ? 'text-amber-200/60' : 'text-amber-500',
          )}
        />
        <Moon
          className={cn(
            'absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 transition-opacity',
            isDark ? 'text-indigo-100' : 'text-indigo-400/60',
          )}
        />

        {/* Knob — slides between the two extremes with a spring. */}
        <motion.span
          aria-hidden
          className="absolute top-1/2 grid size-7 place-items-center rounded-full bg-white shadow-md"
          animate={{
            left: isDark ? 'calc(100% - 30px)' : '2px',
            y: '-50%',
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          style={{
            boxShadow: isDark
              ? '0 0 12px rgba(165, 180, 252, 0.85)'
              : '0 0 12px rgba(253, 224, 71, 0.85)',
          }}
        >
          {isDark ? (
            <Moon className="size-4 text-indigo-600" />
          ) : (
            <Sun className="size-4 text-amber-500" />
          )}
        </motion.span>
      </button>

      <span
        className={cn(
          'min-w-[2.5rem] text-center font-display text-sm font-bold transition-colors',
          isDark ? 'text-indigo-500' : 'text-amber-600',
        )}
      >
        {isDark ? 'Tối' : 'Sáng'}
      </span>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Cave scene — single viewport that swaps light/dark content
   ════════════════════════════════════════════════════════════════════ */

function CaveScene({
  environment,
  fireflies,
  stars,
  caught,
  onCatch,
}: {
  environment: Environment
  fireflies: FireflySeed[]
  stars: StarSeed[]
  caught: Set<number>
  onCatch: (id: number) => void
}) {
  const isDark = environment === 'dark'
  return (
    <motion.div
      aria-label="Hang Đom Đóm"
      animate={{
        // Drive the bg via inline style so we can transition between two
        // arbitrary palettes without re-rendering Tailwind utilities.
        backgroundColor: isDark ? '#0a0f1d' : '#fef3c7',
      }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-3xl border-2 shadow-pop transition-colors duration-700',
        isDark ? 'border-indigo-800' : 'border-amber-200',
      )}
    >
      {/* Cave silhouette — gentle stalactite gradient at the top, always
          present so the viewport reads as a cave regardless of mode. */}
      <CaveSilhouette isDark={isDark} />

      <AnimatePresence mode="wait">
        {isDark ? (
          <DarkContent
            key="dark"
            fireflies={fireflies}
            stars={stars}
            caught={caught}
            onCatch={onCatch}
          />
        ) : (
          <LightContent key="light" />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CaveSilhouette({ isDark }: { isDark: boolean }) {
  return (
    <>
      {/* Stalactite hint at top */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-1/3 transition-colors duration-700',
          isDark
            ? 'bg-gradient-to-b from-black/70 to-transparent'
            : 'bg-gradient-to-b from-stone-400/35 to-transparent',
        )}
      />
      {/* Ground hint at bottom */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-x-0 bottom-0 h-1/4 transition-colors duration-700',
          isDark
            ? 'bg-gradient-to-t from-black/80 to-transparent'
            : 'bg-gradient-to-t from-stone-500/30 to-transparent',
        )}
      />
    </>
  )
}

/* ── Light state: sleeping owl + prompt ──────────────────────────── */

function LightContent() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="absolute inset-0 grid place-items-center px-6 text-center"
    >
      <div>
        <span className="relative inline-block">
          {/* Owl, breathing gently */}
          <motion.span
            aria-hidden
            className="block select-none text-7xl sm:text-8xl"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 6px 10px rgba(120, 70, 30, 0.25))' }}
          >
            🦉
          </motion.span>

          {/* Float-up "💤" so the owl reads as asleep. */}
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute -right-6 top-0 select-none text-2xl text-indigo-400/80"
              initial={{ opacity: 0, y: 4, scale: 0.7 }}
              animate={{
                opacity: [0, 1, 0],
                y: [4, -18, -32],
                scale: [0.7, 1, 0.6],
              }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                delay: i * 0.8,
                ease: 'easeOut',
              }}
            >
              💤
            </motion.span>
          ))}
        </span>

        <p className="mx-auto mt-5 max-w-xs font-display text-sm font-bold leading-snug text-cocoa-800 sm:text-base">
          Hãy che nhẹ camera hoặc làm tối phòng để gọi đom đóm dậy nhé!
        </p>
        <p className="mx-auto mt-2 max-w-xs text-xs italic text-cocoa-700/70">
          Mẹo cho ba mẹ: gạt công tắc{' '}
          <span className="font-bold text-indigo-500">Tối</span> ở phía trên để
          mô phỏng cảm biến ánh sáng.
        </p>
      </div>
    </motion.div>
  )
}

/* ── Dark state: stars + 10 fireflies ────────────────────────────── */

function DarkContent({
  fireflies,
  stars,
  caught,
  onCatch,
}: {
  fireflies: FireflySeed[]
  stars: StarSeed[]
  caught: Set<number>
  onCatch: (id: number) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0"
    >
      {/* Distant ambient stars */}
      <BackgroundStars stars={stars} />

      {/* Subtle deep-cave glow from the sides */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 60%, rgba(99, 102, 241, 0.18) 0%, transparent 75%)',
        }}
      />

      {fireflies.map((f) => (
        <Firefly
          key={f.id}
          seed={f}
          caught={caught.has(f.id)}
          onCatch={() => onCatch(f.id)}
        />
      ))}
    </motion.div>
  )
}

function BackgroundStars({ stars }: { stars: StarSeed[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-amber-100"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            boxShadow: '0 0 4px rgba(254, 240, 138, 0.85)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function Firefly({
  seed,
  caught,
  onCatch,
}: {
  seed: FireflySeed
  caught: boolean
  onCatch: () => void
}) {
  if (caught) {
    // Caught — brief burst then quietly fades, pointer events off so
    // taps fall through to other fireflies clustered nearby.
    return (
      <motion.span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-amber-200"
        style={{
          left: `${seed.x}%`,
          top: `${seed.y}%`,
          width: seed.size,
          height: seed.size,
          marginLeft: -seed.size / 2,
          marginTop: -seed.size / 2,
          boxShadow:
            '0 0 32px rgba(252, 211, 77, 1), 0 0 50px rgba(254, 240, 138, 0.7)',
        }}
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: [1, 1.8, 0], opacity: [1, 1, 0] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    )
  }
  return (
    <motion.button
      type="button"
      onClick={onCatch}
      aria-label="Bắt một con đom đóm"
      // Negative margin centres the dot on the seed coordinates without
      // colliding with framer's `x` / `y` transform (which we use for
      // the float animation).
      className="absolute rounded-full bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
      style={{
        left: `${seed.x}%`,
        top: `${seed.y}%`,
        width: seed.size,
        height: seed.size,
        marginLeft: -seed.size / 2,
        marginTop: -seed.size / 2,
        boxShadow:
          '0 0 12px rgba(252, 211, 77, 0.95), 0 0 24px rgba(254, 240, 138, 0.55)',
      }}
      // Spawn fade-in + perpetual lazy drift around the seed point.
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1, 1, 1.12, 1],
        opacity: [0, 0.6, 1, 0.75, 1],
        x: [0, 16, -10, 8, 0],
        y: [0, -14, 8, -6, 0],
      }}
      transition={{
        scale:   { duration: seed.duration, repeat: Infinity, ease: 'easeInOut', delay: seed.delay },
        opacity: { duration: seed.duration, repeat: Infinity, ease: 'easeInOut', delay: seed.delay },
        x:       { duration: seed.duration, repeat: Infinity, ease: 'easeInOut', delay: seed.delay },
        y:       { duration: seed.duration, repeat: Infinity, ease: 'easeInOut', delay: seed.delay },
      }}
      whileTap={{ scale: 1.6 }}
    />
  )
}

/* ════════════════════════════════════════════════════════════════════
   Counter — glowing constellation digit for the toddler counting loop
   ════════════════════════════════════════════════════════════════════ */

function Counter({
  count,
  total,
  isDark,
}: {
  count: number
  total: number
  isDark: boolean
}) {
  return (
    <motion.div
      animate={{
        backgroundColor: isDark ? '#0f1428' : '#fffbeb',
        borderColor: isDark ? 'rgba(252, 211, 77, 0.35)' : 'rgba(252, 211, 77, 0.55)',
      }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-2xl border-2 px-4 py-3 text-center"
    >
      <p
        className={cn(
          'text-[10px] font-bold uppercase tracking-[0.3em] transition-colors',
          isDark ? 'text-amber-300/90' : 'text-amber-700/80',
        )}
      >
        Đom đóm đã đếm
      </p>

      {/* Big constellation digit. We draw it twice:
            1) A blurred filled copy underneath for the soft halo
            2) A stroked outline on top — that IS the constellation
          Each time `count` changes, AnimatePresence cross-fades the
          old digit out + the new one in with a small overshoot, which
          gives the "constellation reveals" feel the spec asks for. */}
      <div className="relative mx-auto mt-1 grid h-24 w-full place-items-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.25, y: -6 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18 }}
            className="relative inline-block font-display text-7xl font-black leading-none tabular-nums sm:text-8xl"
          >
            {/* Blurred filled layer — the halo glow. */}
            <span
              aria-hidden
              className={cn(
                'absolute inset-0 blur-md',
                isDark ? 'text-amber-300/70' : 'text-amber-400/30',
              )}
            >
              {count}
            </span>
            {/* Stroked outline layer — the visible "constellation". */}
            <span
              className="relative"
              style={{
                color: 'transparent',
                WebkitTextStroke: isDark
                  ? '1.5px #fde68a'
                  : '1.5px #f59e0b',
                filter: isDark
                  ? 'drop-shadow(0 0 10px rgba(253, 224, 71, 0.85)) drop-shadow(0 0 18px rgba(254, 240, 138, 0.5))'
                  : 'drop-shadow(0 1px 2px rgba(245, 158, 11, 0.4))',
              }}
            >
              {count}
            </span>
          </motion.span>
        </AnimatePresence>

        {/* Twinkling decorative stars around the digit — only in dark
            mode so they don't fight with the daytime palette. */}
        {isDark && count > 0 && <ConstellationStars seed={count} />}
      </div>

      <p
        className={cn(
          'mt-1 text-xs font-bold transition-colors',
          isDark ? 'text-amber-200/75' : 'text-cocoa-700/60',
        )}
      >
        / {total} đốm sáng kỳ diệu
      </p>

      {/* 10-dot progress strip — quick at-a-glance "how many to go". */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const lit = i < count
          return (
            <motion.span
              key={i}
              aria-hidden
              className={cn(
                'size-2 rounded-full',
                lit
                  ? 'bg-amber-300'
                  : isDark
                    ? 'bg-amber-300/15'
                    : 'bg-cocoa-200',
              )}
              initial={false}
              animate={{ scale: i === count - 1 ? [1, 1.6, 1] : 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              style={
                lit
                  ? { boxShadow: '0 0 6px rgba(252, 211, 77, 0.95)' }
                  : undefined
              }
            />
          )
        })}
      </div>
    </motion.div>
  )
}

function ConstellationStars({ seed }: { seed: number }) {
  // 6 little stars positioned in a roughly-Big-Dipper layout. The `seed`
  // is in the key so each count tick re-runs the stagger reveal — the
  // constellation "blinks into existence" each time the kid scores.
  const positions = [
    { x: '15%', y: '18%', size: 4 },
    { x: '78%', y: '22%', size: 5 },
    { x: '8%',  y: '70%', size: 3 },
    { x: '88%', y: '74%', size: 4 },
    { x: '48%', y: '5%',  size: 5 },
    { x: '52%', y: '92%', size: 3 },
  ]
  return (
    <>
      {positions.map((p, i) => (
        <motion.span
          key={`${seed}-${i}`}
          aria-hidden
          className="absolute rounded-full bg-amber-100"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            boxShadow: '0 0 6px rgba(254, 240, 138, 1), 0 0 12px rgba(252, 211, 77, 0.7)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.1, 0.85], opacity: [0, 1, 0.85] }}
          transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
        />
      ))}
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Success panel — reward badge + CTAs
   ════════════════════════════════════════════════════════════════════ */

function SuccessPanel({
  onComplete,
  onReset,
}: {
  onComplete?: () => void
  onReset: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded-2xl border-4 border-amber-300 p-4 text-center shadow-pop sm:p-5"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(253, 224, 71, 0.18) 0%, var(--color-cream-50) 100%)',
      }}
    >
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-amber-400 bg-cream-50 px-3 py-1 text-sm font-bold text-amber-600 shadow-soft">
        <Sparkles className="size-4 fill-amber-300 stroke-amber-500" />
        +1 Tinh thể Tri thức
      </div>
      <p className="mt-3 px-1 text-sm leading-relaxed text-cocoa-800">
        Bé đã đếm đủ <strong className="text-amber-600">10</strong> đốm sáng
        kỳ diệu trong hang đom đóm! Hang động giờ đã rực rỡ trở lại.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <motion.button
          type="button"
          onClick={onComplete}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-amber-500 bg-gradient-to-br from-amber-400 to-amber-500 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
        >
          <Zap className="size-4" />
          Hoàn thành nhiệm vụ
        </motion.button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
        >
          <RotateCcw className="size-4" />
          Chơi lại
        </button>
      </div>
    </motion.section>
  )
}

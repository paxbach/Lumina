import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { cn } from '@/utils/cn'
import type { LumiState } from '@/types'

/**
 * Lumi — a luminous forest-spirit pet that evolves through 5 stages.
 *
 * Each stage adds emission: aura intensity, sparkle count, halo, sun-rays,
 * and at Lv 50 a "star core" that casts colored rim-lighting onto its
 * surroundings via mix-blend-mode glow. The character is treated as a
 * light source — its border, body, and orbit all radiate.
 *
 * Lv 1  — Baby:     soft constant bioluminescence, twinkling eye-spots
 * Lv 10 — Curious:  brighter aura, more orbit sparkles
 * Lv 20 — Explorer: pulsating internal light (heartbeat), star-dust drifts
 * Lv 30 — Skilled:  outer halo ring, heavier dust trail
 * Lv 50 — Guardian: miniature star — sun-rays, star-core glow, rim lighting
 */

export type LumiLevel = 1 | 10 | 20 | 30 | 50

const EMOTIONS = ['😊', '🥰', '😄', '🤩', '☺️', '😌'] as const
const HAPPY_REACTIONS = ['🥳', '🎉', '💖', '✨'] as const

interface LevelPreset {
  /** Tailwind class for the body fill — gets warmer/brighter with level. */
  body: string
  /** Aura blur tint colors (CSS vars or class names safe in inline style). */
  auraGradient: string
  /** Inner body shadow intensity for "heartbeat" effect. */
  heartbeat: boolean
  /** Number of orbiting sparkle markers. */
  sparkleCount: number
  /** Number of drifting star-dust particles around Lumi. */
  dustCount: number
  /** Tailwind class for the cream-edge ring. */
  ring: string
  /** Optional outer halo ring (Lv 30+). */
  outerHalo: boolean
  /** Optional conic sun-rays backdrop (Lv 50). */
  sunRays: boolean
  /** Optional star-core glow on the body (Lv 50). */
  starCore: boolean
  /** Optional wide rim-lighting cast onto background (Lv 50). */
  rimLighting: boolean
}

const PRESETS: Record<LumiLevel, LevelPreset> = {
  1: {
    body: 'bg-cream-50',
    auraGradient:
      'radial-gradient(circle, var(--color-lavender-200) 0%, var(--color-peach-200) 45%, transparent 70%)',
    heartbeat: false,
    sparkleCount: 3,
    dustCount: 0,
    ring: 'border-cream-200',
    outerHalo: false,
    sunRays: false,
    starCore: false,
    rimLighting: false,
  },
  10: {
    body: 'bg-cream-50',
    auraGradient:
      'radial-gradient(circle, var(--color-lavender-glow) 0%, var(--color-peach-glow) 45%, transparent 72%)',
    heartbeat: false,
    sparkleCount: 5,
    dustCount: 4,
    ring: 'border-butter-100',
    outerHalo: false,
    sunRays: false,
    starCore: false,
    rimLighting: false,
  },
  20: {
    body: 'bg-butter-50',
    auraGradient:
      'radial-gradient(circle, var(--color-butter-glow) 0%, var(--color-peach-glow) 50%, transparent 75%)',
    heartbeat: true,
    sparkleCount: 7,
    dustCount: 8,
    ring: 'border-butter-200',
    outerHalo: false,
    sunRays: false,
    starCore: false,
    rimLighting: false,
  },
  30: {
    body: 'bg-butter-100',
    auraGradient:
      'radial-gradient(circle, var(--color-butter-glow) 0%, var(--color-peach-glow) 45%, transparent 78%)',
    heartbeat: true,
    sparkleCount: 9,
    dustCount: 12,
    ring: 'border-butter-300',
    outerHalo: true,
    sunRays: false,
    starCore: false,
    rimLighting: false,
  },
  50: {
    body: 'bg-butter-200',
    auraGradient:
      'radial-gradient(circle, oklch(96% 0.06 88) 0%, var(--color-butter-glow) 35%, var(--color-peach-glow) 65%, transparent 85%)',
    heartbeat: true,
    sparkleCount: 12,
    dustCount: 18,
    ring: 'border-butter-400',
    outerHalo: true,
    sunRays: true,
    starCore: true,
    rimLighting: true,
  },
}

/* ════════════════════════════════════════════════════════════════════
   State-driven decoration system
   ────────────────────────────────────────────────────────────────────
   Beyond the level system above, Lumi reacts to 5 high-level moods set
   by the page. Glow filter, body micro-motion and decoration overlay
   (heart particles, bubbles, constellation dots) all key off `state`.
   'idle' = the existing level-based bioluminescence, unchanged.
   ════════════════════════════════════════════════════════════════════ */

/**
 * Drop-shadow filter applied to the body container — overrides the
 * level-based glow when the kid is actively interacting. We keep RGBA
 * values literal here (rather than CSS vars) because `filter` doesn't
 * resolve CSS variables consistently across Safari versions.
 */
const STATE_BODY_FILTER: Record<LumiState, string> = {
  idle:
    'drop-shadow(0 0 15px rgba(253, 224, 71, 0.5))',
  feeding:
    'drop-shadow(0 0 14px rgba(255, 215, 70, 0.95)) drop-shadow(0 0 32px rgba(255, 180, 40, 0.55))',
  petting:
    'drop-shadow(0 0 16px rgba(255, 165, 190, 0.85)) drop-shadow(0 0 28px rgba(255, 120, 160, 0.45))',
  bathing:
    'drop-shadow(0 0 16px rgba(110, 231, 255, 0.85)) drop-shadow(0 0 28px rgba(60, 180, 230, 0.55))',
  sleeping:
    'drop-shadow(0 0 22px rgba(70, 90, 200, 0.6)) drop-shadow(0 0 40px rgba(30, 40, 100, 0.5))',
}

/** Body-only motion variants — Lumi's micro-reaction to the action. */
const STATE_BODY_VARIANTS: Record<LumiState, Variants> = {
  idle:     { animate: { scale: 1,    rotate: 0 } },
  feeding:  { animate: { scale: 1.15, rotate: 0 } },
  petting:  { animate: { scale: 1.04, rotate: [-5, 5, 0] } },
  bathing:  { animate: { scale: 1.02, rotate: 0 } },
  sleeping: { animate: { scale: 0.92, rotate: 10 } },
}

interface LumiCharacterProps {
  size?: number // px, square
  level?: LumiLevel
  /**
   * Current activity state. Drives glow color, body micro-animation and
   * decoration overlays. Defaults to 'idle' so existing call-sites that
   * don't care about moods keep their current visuals.
   */
  state?: LumiState
  className?: string
}

export function LumiCharacter({
  size = 240,
  level = 30,
  state = 'idle',
  className,
}: LumiCharacterProps) {
  const preset = PRESETS[level]
  const [emotionIdx, setEmotionIdx] = useState(0)
  const [reaction, setReaction] = useState<string | null>(null)

  // Rotate emotion every ~3.5s — higher levels cycle faster (more alive).
  // Pause when sleeping so the face doesn't keep cycling smiles.
  useEffect(() => {
    if (state === 'sleeping') return
    const cycleMs = level >= 30 ? 2600 : 3500
    const id = window.setInterval(() => {
      setEmotionIdx((i) => (i + 1) % EMOTIONS.length)
    }, cycleMs)
    return () => window.clearInterval(id)
  }, [level, state])

  // Pick the face emoji: state overrides the rotating idle cycle so
  // feeding/petting/bathing/sleeping always read at a glance.
  const stateFace: Record<LumiState, string | null> = {
    idle: null,
    feeding: '😋',
    petting: '🥰',
    bathing: '😆',
    sleeping: '😴',
  }
  const displayedEmotion = stateFace[state] ?? EMOTIONS[emotionIdx]

  const handleTap = () => {
    const r = HAPPY_REACTIONS[Math.floor(Math.random() * HAPPY_REACTIONS.length)]
    setReaction(r)
    window.setTimeout(() => setReaction(null), 1100)
  }

  const bodySize = size * 0.62

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Lv50 only — wide rim lighting cast onto the parent via screen blend */}
      {preset.rimLighting && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -z-30 rounded-full"
          style={{
            inset: `-${size * 0.55}px`,
            background:
              'radial-gradient(circle, var(--color-butter-glow) 0%, var(--color-peach-glow) 35%, transparent 65%)',
            mixBlendMode: 'screen',
            opacity: 0.55,
          }}
          animate={{ opacity: [0.45, 0.65, 0.45], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Lv50 only — slowly rotating sun-rays */}
      {preset.sunRays && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -z-20 rounded-full"
          style={{
            inset: `-${size * 0.05}px`,
            background:
              'conic-gradient(from 0deg, transparent 0deg, var(--color-butter-glow) 6deg, transparent 22deg, transparent 88deg, var(--color-peach-glow) 96deg, transparent 112deg, transparent 178deg, var(--color-butter-glow) 186deg, transparent 202deg, transparent 268deg, var(--color-peach-glow) 276deg, transparent 292deg)',
            filter: 'blur(3px)',
            opacity: 0.7,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Main pulsing aura — present at all levels, intensity scales with level */}
      <motion.div
        aria-hidden
        className="absolute rounded-full -z-10"
        style={{
          width: size,
          height: size,
          background: preset.auraGradient,
          filter: 'blur(8px)',
        }}
        animate={{
          scale: [1, 1.08 + level * 0.001, 1],
          opacity: level >= 30 ? [0.7, 0.95, 0.7] : [0.55, 0.85, 0.55],
        }}
        transition={{
          duration: level >= 30 ? 2.6 : 3.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Lv30+ — extra outer halo ring */}
      {preset.outerHalo && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -z-10 rounded-full border-2 border-butter-300"
          style={{
            inset: `-${size * 0.04}px`,
            boxShadow:
              'inset 0 0 18px 4px var(--color-butter-glow), 0 0 18px 4px var(--color-butter-glow)',
            opacity: 0.55,
          }}
          animate={{ opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Orbiting sparkles — count scales with level */}
      <OrbitingSparkles radius={size * 0.48} count={preset.sparkleCount} bright={level >= 20} />

      {/* Lv10+ — drifting star-dust around the body */}
      {preset.dustCount > 0 && (
        <StarDust count={preset.dustCount} radius={size * 0.42} level={level} />
      )}

      {/* Constellation backdrop — only mounts while sleeping. */}
      <AnimatePresence>
        {state === 'sleeping' && <ConstellationDots size={size} />}
      </AnimatePresence>

      {/* Floating particles per active state (hearts / bubbles / sparks). */}
      <StateParticles state={state} size={size} />

      {/* Body — bobs forever, additionally micro-animates per state.
          We nest a second motion.div so the eternal y-bob loop coexists
          with the state-driven scale/rotate without fighting for the
          same `animate` target. Outer = breathing, inner = mood. */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="grid place-items-center"
      >
        <motion.button
          type="button"
          aria-label={`Lumi LV ${level} — pet bạn đồng hành`}
          onClick={handleTap}
          whileTap={{ scale: 0.92 }}
          variants={STATE_BODY_VARIANTS[state]}
          animate="animate"
          transition={
            state === 'petting'
              ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 220, damping: 16 }
          }
          className={cn(
            'relative grid place-items-center rounded-full border-[6px] shadow-pop cursor-pointer outline-none',
            'focus-visible:ring-4 focus-visible:ring-lavender-300',
            preset.body,
            preset.ring,
          )}
          style={{
            width: bodySize,
            height: bodySize,
            // State filter overrides the level-based boxShadow chrome —
            // the kid is actively interacting, mood reads first.
            filter: STATE_BODY_FILTER[state],
            boxShadow: preset.starCore
              ? 'var(--shadow-star-core)'
              : level >= 30
                ? 'var(--shadow-radiant-butter), var(--shadow-pop)'
                : undefined,
          }}
        >
        {/* Heartbeat inner pulse — body brightens like breathing */}
        {preset.heartbeat && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 55%, var(--color-butter-glow) 0%, transparent 65%)',
            }}
            animate={{ opacity: [0.25, 0.65, 0.35, 0.55, 0.25] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        )}

        {/* Ears — two soft drops on top, color rises with level */}
        <span
          aria-hidden
          className={cn(
            'absolute -top-3 left-[22%] size-7 rounded-full border-4',
            preset.ring,
            level >= 30 ? 'bg-butter-300' : 'bg-lavender-200',
          )}
          style={{ transform: 'rotate(-18deg)' }}
        />
        <span
          aria-hidden
          className={cn(
            'absolute -top-3 right-[22%] size-7 rounded-full border-4',
            preset.ring,
            level >= 30 ? 'bg-butter-300' : 'bg-lavender-200',
          )}
          style={{ transform: 'rotate(18deg)' }}
        />

        {/* Cheeks — glow tint at higher levels */}
        <span
          aria-hidden
          className={cn(
            'absolute left-[18%] top-[58%] size-4 rounded-full blur-[1px]',
            level >= 20 ? 'bg-peach-glow/70' : 'bg-peach-300/70',
          )}
        />
        <span
          aria-hidden
          className={cn(
            'absolute right-[18%] top-[58%] size-4 rounded-full blur-[1px]',
            level >= 20 ? 'bg-peach-glow/70' : 'bg-peach-300/70',
          )}
        />

        {/* Face — state-locked emoji while interacting, otherwise cycles. */}
        <AnimatePresence mode="wait">
          <motion.span
            key={state === 'idle' ? `idle-${emotionIdx}` : `state-${state}`}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative select-none leading-none"
            style={{
              fontSize: bodySize * 0.5,
              // Lv20+ — eye/face glow via text drop-shadow
              filter:
                level >= 20
                  ? `drop-shadow(0 0 ${4 + level * 0.08}px var(--color-butter-glow))`
                  : undefined,
            }}
            aria-hidden
          >
            {displayedEmotion}
          </motion.span>
        </AnimatePresence>

        {/* Feeding — star-candy held near Lumi's mouth. */}
        <AnimatePresence>
          {state === 'feeding' && (
            <motion.span
              key="star-candy"
              aria-hidden
              className="pointer-events-none absolute select-none leading-none"
              style={{
                right: -bodySize * 0.04,
                bottom: bodySize * 0.36,
                fontSize: bodySize * 0.26,
                filter:
                  'drop-shadow(0 0 10px rgba(255, 200, 60, 0.95)) drop-shadow(0 0 18px rgba(255, 160, 40, 0.6))',
              }}
              initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
              animate={{
                scale: [1, 0.85, 1.05, 1],
                rotate: [0, -8, 6, 0],
                opacity: 1,
              }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              🌟
            </motion.span>
          )}
        </AnimatePresence>

        {/* Waving hand */}
        <motion.span
          aria-hidden
          className="absolute leading-none select-none"
          style={{
            right: -bodySize * 0.08,
            bottom: bodySize * 0.18,
            fontSize: bodySize * 0.26,
            transformOrigin: '20% 80%',
            filter: level >= 50
              ? 'drop-shadow(0 0 6px var(--color-butter-glow))'
              : undefined,
          }}
          animate={{ rotate: [0, 28, -10, 28, 0, 0, 0, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          👋
        </motion.span>

        {/* Tap reaction */}
        <AnimatePresence>
          {reaction && (
            <motion.span
              key={reaction}
              aria-hidden
              className="pointer-events-none absolute -top-8 select-none leading-none"
              style={{
                fontSize: bodySize * 0.3,
                filter:
                  level >= 30
                    ? 'drop-shadow(0 0 8px var(--color-butter-glow))'
                    : undefined,
              }}
              initial={{ scale: 0.4, y: 10, opacity: 0 }}
              animate={{ scale: 1.1, y: -16, opacity: 1 }}
              exit={{ scale: 0.6, y: -32, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            >
              {reaction}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      </motion.div>

      {/* Lv50 — corner level badge for the showcase */}
      {level >= 30 && (
        <motion.span
          aria-hidden
          className={cn(
            'absolute -top-1 right-0 rounded-full border-2 border-butter-500 bg-butter-300 px-2 py-0.5',
            'font-display text-[10px] font-bold uppercase tracking-widest text-cocoa-900 shadow-soft',
          )}
          style={{
            boxShadow:
              level >= 50
                ? 'var(--shadow-radiant-butter)'
                : '0 0 12px 2px var(--color-butter-glow)',
          }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 6 }}
          transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.4 }}
        >
          {level >= 50 ? '★ Guardian' : `LV ${level}`}
        </motion.span>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* Orbiting sparkles + drifting star-dust                      */
/* ────────────────────────────────────────────────────────── */

interface OrbitingSparklesProps {
  radius: number
  count: number
  bright?: boolean
}

function OrbitingSparkles({ radius, count, bright }: OrbitingSparklesProps) {
  const sparkles = Array.from({ length: count }, (_, i) => i)
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 -z-10"
      animate={{ rotate: 360 }}
      transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
    >
      {sparkles.map((i) => {
        const angle = (i / count) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 select-none text-butter-400"
            style={{
              x,
              y,
              fontSize: 18 + (i % 2) * 4,
              filter: bright
                ? 'drop-shadow(0 0 5px var(--color-butter-glow))'
                : 'drop-shadow(0 0 3px var(--color-butter-200))',
            }}
            animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 1.8 + (i % 3) * 0.4,
              delay: (i * 0.25) % 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            ✦
          </motion.span>
        )
      })}
    </motion.div>
  )
}

interface StarDustProps {
  count: number
  radius: number
  level: LumiLevel
}

/**
 * StarDust — random drifting particles within a band around Lumi. Unlike
 * OrbitingSparkles (rigid circle), these have organic positions and longer
 * lazy drift cycles. Position memoized once at mount; pattern stays stable.
 */
function StarDust({ count, radius, level }: StarDustProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Place in an annulus around the body, organic angles
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 1.2
      const r = radius * (0.85 + Math.random() * 0.65)
      return {
        id: i,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        size: 7 + Math.random() * 7,
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 3,
        driftX: (Math.random() - 0.5) * 14,
        driftY: (Math.random() - 0.5) * 14,
      }
    })
  }, [count, radius])

  const glow = level >= 30 ? 'var(--color-butter-glow)' : 'var(--color-lavender-glow)'

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2 select-none rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: glow,
            filter: `blur(${p.size * 0.18}px) drop-shadow(0 0 ${p.size * 0.6}px ${glow})`,
            x: p.x,
            y: p.y,
          }}
          animate={{
            x: [p.x, p.x + p.driftX, p.x],
            y: [p.y, p.y + p.driftY, p.y],
            opacity: [0.2, 0.9, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   State-driven decoration layers
   ════════════════════════════════════════════════════════════════════ */

/**
 * StateParticles — overlays a flock of mood-specific particles around
 * Lumi while a non-idle action is active.
 *   - petting → 5 floating hearts rising above the head
 *   - bathing → 8 bubbles drifting upward with subtle horizontal sway
 *   - feeding → tiny golden sparks scattering around the mouth
 *   - sleeping → handled by ConstellationDots instead
 */
function StateParticles({ state, size }: { state: LumiState; size: number }) {
  if (state === 'idle' || state === 'sleeping') return null

  const palette: { count: number; glyph: string; tint: string } =
    state === 'petting'
      ? { count: 5, glyph: '💗', tint: 'rgba(255, 150, 180, 0.95)' }
      : state === 'bathing'
        ? { count: 8, glyph: '🫧', tint: 'rgba(150, 220, 255, 0.95)' }
        : { count: 6, glyph: '✨', tint: 'rgba(255, 220, 100, 0.95)' }

  // Position the spawn band: hearts above, bubbles all around, sparks at mouth.
  const spawnY = state === 'petting' ? -size * 0.45 : 0
  const spreadX = size * 0.55
  const driftY = state === 'bathing' ? -size * 0.45 : -size * 0.35

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
    >
      {Array.from({ length: palette.count }).map((_, i) => {
        const x0 = (i / Math.max(palette.count - 1, 1) - 0.5) * spreadX
        const dx = (Math.random() - 0.5) * 18
        const delay = (i * 0.18) % 1.4
        return (
          <motion.span
            key={`${state}-${i}`}
            className="absolute select-none leading-none"
            style={{
              fontSize: state === 'bathing' ? 20 : 22,
              filter: `drop-shadow(0 0 8px ${palette.tint})`,
            }}
            initial={{ x: x0, y: spawnY, opacity: 0, scale: 0.5 }}
            animate={{
              x: [x0, x0 + dx, x0 - dx],
              y: [spawnY, spawnY + driftY * 0.5, spawnY + driftY],
              opacity: [0, 1, 0],
              scale: [0.5, 1.05, 0.6],
            }}
            transition={{
              duration: state === 'bathing' ? 2.6 : 1.8,
              repeat: Infinity,
              delay,
              ease: 'easeOut',
            }}
          >
            {palette.glyph}
          </motion.span>
        )
      })}
    </div>
  )
}

/**
 * ConstellationDots — sleeping-only backdrop. Tiny stars blink in a
 * loose Big-Dipper-ish constellation behind Lumi's curled body. Keeps
 * the night mood quiet (slow opacity pulse, no movement).
 */
function ConstellationDots({ size }: { size: number }) {
  // Hand-tuned positions in % of container — a kid-friendly fake "chòm sao"
  const dots = useMemo(
    () => [
      { x: 18, y: 26, r: 2.2, delay: 0.0 },
      { x: 32, y: 18, r: 2.6, delay: 0.3 },
      { x: 48, y: 12, r: 3.0, delay: 0.6 },
      { x: 64, y: 18, r: 2.4, delay: 0.9 },
      { x: 76, y: 28, r: 2.2, delay: 1.2 },
      { x: 84, y: 46, r: 2.0, delay: 1.5 },
      { x: 22, y: 70, r: 1.8, delay: 0.8 },
      { x: 70, y: 78, r: 2.0, delay: 0.4 },
    ],
    [],
  )

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 rounded-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      style={{
        background:
          'radial-gradient(60% 60% at 50% 55%, rgba(30, 36, 90, 0.55) 0%, rgba(12, 18, 50, 0.35) 60%, transparent 80%)',
      }}
    >
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.r * 2,
            height: d.r * 2,
            boxShadow: '0 0 6px rgba(180, 200, 255, 0.95)',
          }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 2.4,
            delay: d.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Subtle ground glow under sleeping body */}
      <span
        aria-hidden
        className="absolute left-1/2 top-[58%] -translate-x-1/2 rounded-full"
        style={{
          width: size * 0.55,
          height: size * 0.1,
          background:
            'radial-gradient(ellipse, rgba(120, 150, 255, 0.35), transparent 70%)',
          filter: 'blur(4px)',
        }}
      />
    </motion.div>
  )
}

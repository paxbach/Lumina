import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Sparkles, Zap } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LumiCharacter } from '@/components/dashboard/LumiCharacter'
import { SparkleField } from '@/components/dashboard/SparkleField'
import { BurstParticles } from '@/components/games/BurstParticles'
import { useAppStore } from '@/store/useAppStore'
import { useSound } from '@/hooks/useSound'
import { cn } from '@/utils/cn'
import { springBouncy, staggerContainer, staggerItem } from '@/utils/motion'
import type { LumiState, PastelTone } from '@/types'

type CareActionId = 'feed' | 'pet' | 'bath' | 'sleep'

interface Activity {
  id: CareActionId
  emoji: string
  title: string
  tone: PastelTone
}

interface Game {
  id: string
  title: string
  tagline: string
  emoji: string
  to: string
  tone: PastelTone
  duration: string
}

const games: Game[] = [
  {
    id: 'leaf-match',
    title: 'Ghép Lá Rừng',
    tagline: 'Kéo từng chiếc lá tới đúng cây của nó!',
    emoji: '🍃',
    to: '/games/leaf-match',
    tone: 'mint',
    duration: '~3 phút',
  },
  {
    id: 'color-mix',
    title: 'Trộn Màu Ánh Sáng',
    tagline: 'Pha 3 đèn để tạo cầu vồng kỳ diệu!',
    emoji: '🎨',
    to: '/games/color-mix',
    tone: 'lavender',
    duration: '~5 phút',
  },
]

// Titles ship with their trigger emoji baked in (per spec) so the
// banner overlay copy and the button label match the same vocabulary
// — when the kid taps "Cho Lumi ăn 🍓" they see Lumi react to the 🍓.
// The card still renders the big emoji separately for visual weight.
const activities: Activity[] = [
  { id: 'feed',  emoji: '🍓', title: 'Cho Lumi ăn 🍓',  tone: 'peach' },
  { id: 'pet',   emoji: '💛', title: 'Vuốt ve Lumi 💛', tone: 'lavender' },
  { id: 'bath',  emoji: '🛁', title: 'Tắm cho Lumi 🛁', tone: 'sky' },
  { id: 'sleep', emoji: '😴', title: 'Lumi đi ngủ 😴',  tone: 'mint' },
]

const TONE_BG: Record<PastelTone, string> = {
  peach:    'border-peach-200 bg-peach-50',
  mint:     'border-mint-200 bg-mint-50',
  butter:   'border-butter-200 bg-butter-50',
  lavender: 'border-lavender-200 bg-lavender-50',
  sky:      'border-sky-cozy-200 bg-sky-cozy-50',
}

const TONE_BTN: Record<PastelTone, 'peach' | 'mint' | 'butter' | 'lavender' | 'sky'> = {
  peach: 'peach', mint: 'mint', butter: 'butter', lavender: 'lavender', sky: 'sky',
}

/* ════════════════════════════════════════════════════════════════════
   State-driven copy + showcase backdrop
   ────────────────────────────────────────────────────────────────────
   Every entry in LUMI_MOOD covers the mood line below the pet plus the
   per-stat reward badge. STAGE_BG maps the same state to a card
   background — bright pastel for the action moods, deep night galaxy
   when 'sleeping' so the kid sees the room change as Lumi dozes off.
   ════════════════════════════════════════════════════════════════════ */

const LUMI_MOOD: Record<LumiState, { text: string; eyebrow: string }> = {
  idle: {
    eyebrow: 'Bạn đồng hành',
    text: 'Lumi đang lấp lánh chờ bé chơi cùng!',
  },
  feeding: {
    eyebrow: 'Bữa ăn ngon',
    text: 'Lumi đang nhai bánh sao nhăm nhăm! 🌟',
  },
  petting: {
    eyebrow: 'Cái ôm dịu dàng',
    text: 'Lumi đang hạnh phúc nhắm mắt tận hưởng cái vuốt ve ❤️',
  },
  bathing: {
    eyebrow: 'Tắm mát turquoise',
    text: 'Lumi đang nhảy múa giữa bong bóng mát rượi! 🫧',
  },
  sleeping: {
    eyebrow: 'Đêm Stardust',
    text: 'Suỵt… Lumi đang ngủ và tái tạo Tinh hoa Stardust. 🌙',
  },
}

const STAGE_BG: Record<LumiState, string> = {
  idle: `
    radial-gradient(60% 90% at 50% 110%, var(--color-peach-200) 0%, transparent 70%),
    linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-peach-50) 100%)
  `,
  feeding: `
    radial-gradient(60% 90% at 50% 110%, var(--color-butter-300) 0%, transparent 70%),
    linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-butter-100) 100%)
  `,
  petting: `
    radial-gradient(60% 90% at 50% 110%, var(--color-peach-300) 0%, transparent 70%),
    linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-peach-100) 100%)
  `,
  bathing: `
    radial-gradient(60% 90% at 50% 110%, var(--color-sky-300, #88D2EE) 0%, transparent 70%),
    linear-gradient(180deg, var(--color-sky-50, #EAF6FB) 0%, var(--color-lavender-50) 100%)
  `,
  sleeping: `
    radial-gradient(60% 80% at 50% 30%, rgba(60, 90, 200, 0.45) 0%, transparent 70%),
    linear-gradient(180deg, #0F1430 0%, #1B1F4A 60%, #221B45 100%)
  `,
}

const STAGE_BORDER: Record<LumiState, string> = {
  idle:     'border-peach-200',
  feeding:  'border-butter-300',
  petting:  'border-peach-300',
  bathing:  'border-sky-cozy-300',
  sleeping: 'border-lavender-500',
}

/** Reward badge copy shown under the mood line on each interaction. */
const REWARD_LABEL: Record<CareActionId, string> = {
  feed:  '+10 Năng lượng',
  pet:   '+5 Hạnh phúc',
  bath:  '+5 Sạch sẽ',
  sleep: '+2 Tinh hoa Stardust',
}

export default function LumiPage() {
  const navigate = useNavigate()
  const addStars = useAppStore((s) => s.addStars)
  const lumiState = useAppStore((s) => s.lumiState)
  const setLumiState = useAppStore((s) => s.setLumiState)
  const addLumiEnergy = useAppStore((s) => s.addLumiEnergy)
  const addLumiHappiness = useAppStore((s) => s.addLumiHappiness)
  const addLumiCleanliness = useAppStore((s) => s.addLumiCleanliness)
  const addLumiStardust = useAppStore((s) => s.addLumiStardust)
  const { play } = useSound()

  const mood = LUMI_MOOD[lumiState]
  const isNight = lumiState === 'sleeping'

  /**
   * Single dispatcher so the per-card onClick stays declarative. Each
   * action sets the matching state (auto-reverts via the store after
   * 3 s, except 'sleeping') and applies its stat reward. Tapping the
   * same sleeping Lumi while she's already asleep wakes her up — feels
   * natural and avoids "stuck in night mode" if the kid taps twice.
   */
  const triggerCare = (id: CareActionId) => {
    play('pop')
    switch (id) {
      case 'feed':
        setLumiState('feeding')
        addLumiEnergy(10)
        break
      case 'pet':
        setLumiState('petting')
        addLumiHappiness(5)
        break
      case 'bath':
        setLumiState('bathing')
        addLumiCleanliness(5)
        break
      case 'sleep':
        if (lumiState === 'sleeping') {
          setLumiState('idle')
        } else {
          setLumiState('sleeping')
          addLumiStardust(2)
        }
        break
    }
    addStars(1)
  }

  return (
    <PageLayout
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-peach-500">
            Bạn đồng hành
          </p>
          <h1 className="text-2xl font-display font-bold text-cocoa-900">Chơi cùng Lumi</h1>
        </div>
      }
    >
      <LumiInteractiveViewport
        state={lumiState}
        mood={mood}
        isNight={isNight}
        level={30}
      />

      {/* Featured mini-games */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-cocoa-900">Mini-game</h2>
        <p className="mt-1 text-sm text-cocoa-700/80">
          Chơi vui cùng Lumi và nhận tinh thể tri thức!
        </p>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {games.map((g) => (
            <motion.button
              key={g.id}
              variants={staggerItem}
              type="button"
              onClick={() => navigate(g.to)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'group relative flex items-center gap-4 overflow-hidden rounded-3xl border-4 p-5 text-left shadow-pop',
                TONE_BG[g.tone],
              )}
            >
              <motion.span
                className="grid size-20 shrink-0 place-items-center rounded-3xl bg-white/70 text-5xl shadow-inset-soft"
                animate={{ rotate: [-4, 4, -4] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span aria-hidden>{g.emoji}</span>
              </motion.span>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-cocoa-700/70">
                  {g.duration}
                </p>
                <h3 className="mt-0.5 font-display text-xl font-bold text-cocoa-900">
                  {g.title}
                </h3>
                <p className="mt-1 text-sm text-cocoa-700">{g.tagline}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-cocoa-700/60 transition-transform group-hover:translate-x-1" />
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* Activities */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-cocoa-900">Hoạt động chăm Lumi</h2>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {activities.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              active={
                (a.id === 'feed'  && lumiState === 'feeding')  ||
                (a.id === 'pet'   && lumiState === 'petting')  ||
                (a.id === 'bath'  && lumiState === 'bathing')  ||
                (a.id === 'sleep' && lumiState === 'sleeping')
              }
              onPlay={() => triggerCare(a.id)}
            />
          ))}
        </div>
      </section>
    </PageLayout>
  )
}

/* ════════════════════════════════════════════════════════════════════
   LumiInteractiveViewport
   ────────────────────────────────────────────────────────────────────
   The hero "Pet Lumi" stage at the top of the page. Acts as a dynamic
   viewport that always shows the bioluminescent rabbit, and layers a
   per-state micro-animation on top whenever the kid taps a care button.

   Layer stack (back → front, all inside one rounded card):
     1. State-tinted gradient backdrop                         (z-0)
     2. SparkleField — ambient twinkles (hidden when sleeping) (z-0)
     3. Sleeping-only "quiet rest" frosted overlay             (z-10)
     4. Petting-only expanding heart-pulse rings               (z-10)
     5. LumiCharacter — the actual rabbit                       (z-20)
     6. Feeding-only "ENERGY BOOST" floating badge             (z-30)
     7. Level badge — pinned top-right of the viewport          (z-40)
     8. Mood eyebrow + caption strip below the stage

   Auto-revert: setLumiState() in the store schedules a return to 'idle'
   ~3 s after each non-sleeping action (see LUMI_REVERT_MS in
   store/useAppStore.ts). All overlays mount/unmount via AnimatePresence
   so when the timer fires the badge / rings / blur cross-fade out and
   Lumi smoothly settles back into the default BIOLUMINESCENT BODY mood.
   ════════════════════════════════════════════════════════════════════ */

interface LumiInteractiveViewportProps {
  state: LumiState
  mood: { text: string; eyebrow: string }
  isNight: boolean
  /** Lumi's current evolution level — drives the corner badge. */
  level: 1 | 10 | 20 | 30 | 50
}

function LumiInteractiveViewport({
  state,
  mood,
  isNight,
  level,
}: LumiInteractiveViewportProps) {
  return (
    <motion.section
      layout
      className={cn(
        'relative overflow-hidden rounded-[2.5rem] border-4 shadow-pop transition-colors',
        STAGE_BORDER[state],
      )}
    >
      {/* ── Viewport stage ────────────────────────────────────────── */}
      <motion.div
        className="relative grid place-items-center px-6 pb-6 pt-10"
        animate={{ backgroundImage: STAGE_BG[state] }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{ minHeight: 320 }}
      >
        {/* Ambient twinkles — pause during sleep so the night feels still. */}
        {!isNight && <SparkleField count={18} />}

        {/* Sleeping-only frosted veil. Painted BEFORE Lumi so backdrop-blur
            softens the sparkle/gradient layers behind it while Lumi
            herself (rendered after) stays sharp and readable. */}
        <AnimatePresence>
          {state === 'sleeping' && <QuietRestVeil key="quiet-rest" />}
        </AnimatePresence>

        {/* Petting-only — soft pink rings pulse outward from Lumi's heart. */}
        <AnimatePresence>
          {state === 'petting' && <HeartPulseRings key="heart-pulse" />}
        </AnimatePresence>

        {/* Lumi herself — z-20 so she sits ABOVE the heart rings + frosted
            veil but BELOW the feeding boost badge and level chip. */}
        <div className="relative z-20">
          <LumiCharacter size={220} state={state} level={level} />
        </div>

        {/* Feeding-only — "ENERGY BOOST: +10% Luminosity" floating badge. */}
        <AnimatePresence>
          {state === 'feeding' && <EnergyBoostBadge key="energy-boost" />}
        </AnimatePresence>

        {/* Bathing-only — bubbles cascade upward + crystal-clean badge. */}
        <AnimatePresence>
          {state === 'bathing' && <BubbleSpaCascade key="bubble-spa" />}
        </AnimatePresence>

        {/* Level badge — pinned to the viewport corner so it survives every
            state change (per spec: "Maintain the level badge positioning"). */}
        <LevelBadge level={level} isNight={isNight} />
      </motion.div>

      {/* ── Mood caption strip ────────────────────────────────────── */}
      <div
        className={cn(
          'relative border-t-2 px-6 py-4 text-center transition-colors',
          isNight
            ? 'border-lavender-500/40 bg-cocoa-900/40 backdrop-blur-sm'
            : 'border-cream-200/70 bg-cream-50/80 backdrop-blur-sm',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <p
              className={cn(
                'text-[10px] font-bold uppercase tracking-[0.3em]',
                isNight ? 'text-lavender-200' : 'text-peach-500',
              )}
            >
              {mood.eyebrow}
            </p>
            <p
              className={cn(
                'mt-1 font-display text-lg font-semibold',
                isNight ? 'text-cream-50' : 'text-cocoa-800',
              )}
            >
              {mood.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

/* ── Level badge ─────────────────────────────────────────────────────
   Tiny floating chip pinned to the top-right corner of the viewport.
   Kept inline (rather than reusing LumiCharacter's own LV chip) so its
   placement is anchored to the FRAME, not to Lumi's bouncing body — it
   doesn't bob with her, doesn't shift when overlays mount.
   ──────────────────────────────────────────────────────────────────── */

function LevelBadge({
  level,
  isNight,
}: {
  level: number
  isNight: boolean
}) {
  return (
    <motion.span
      aria-label={`Lumi level ${level}`}
      initial={{ scale: 0, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: 6, opacity: 1 }}
      transition={{ ...springBouncy, delay: 0.2 }}
      className={cn(
        'absolute right-4 top-4 z-40 inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest shadow-soft',
        isNight
          ? 'border-lavender-300 bg-lavender-500/30 text-lavender-50 backdrop-blur-sm'
          : 'border-butter-500 bg-butter-300 text-cocoa-900',
      )}
      style={{
        boxShadow: isNight
          ? '0 0 14px rgba(160, 170, 255, 0.55)'
          : '0 0 12px 2px var(--color-butter-glow)',
      }}
    >
      <Sparkles className="size-3" aria-hidden />
      LV {level}
    </motion.span>
  )
}

/* ── EnergyBoostBadge (feeding) ─────────────────────────────────────
   Floats above-right of Lumi's head, pops in with a spring, lingers
   while she's chewing, then fades on auto-revert. Reads as a game
   reward HUD chip: ⚡ ENERGY BOOST: +10% Luminosity.
   ──────────────────────────────────────────────────────────────────── */

function EnergyBoostBadge() {
  return (
    <motion.div
      className="absolute right-6 top-8 z-30 flex flex-col items-end gap-1"
      initial={{ opacity: 0, scale: 0.7, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -8 }}
      transition={{ ...springBouncy, duration: 0.5 }}
    >
      <motion.div
        className="flex items-center gap-1.5 rounded-2xl border-2 border-butter-400 bg-cream-50/95 px-3 py-1.5 shadow-pop backdrop-blur-sm"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(245, 200, 80, 0.55)',
            '0 0 0 12px rgba(245, 200, 80, 0)',
          ],
        }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      >
        <motion.span
          aria-hidden
          animate={{ rotate: [-8, 8, -8], scale: [1, 1.15, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Zap className="size-4 fill-butter-400 stroke-butter-500" />
        </motion.span>
        <div className="leading-tight">
          <p className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-butter-500">
            Energy Boost
          </p>
          <p className="font-display text-sm font-bold text-cocoa-900">
            +10% Luminosity
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── HeartPulseRings (petting) ──────────────────────────────────────
   Three soft pink rings expand from Lumi's body in a heartbeat cadence
   (≈0.9 s cycle), each ring offset so one is always blooming. Mirrors
   the "RESPONSE TO PETTING" frame from the design — Lumi blushing while
   warmth radiates outward.
   ──────────────────────────────────────────────────────────────────── */

function HeartPulseRings() {
  const rings = [0, 0.3, 0.6] // seconds — staggered so the pulse is continuous
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {rings.map((delay, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            border: '3px solid rgba(255, 150, 180, 0.55)',
            boxShadow:
              '0 0 18px rgba(255, 150, 180, 0.45), inset 0 0 18px rgba(255, 200, 220, 0.4)',
          }}
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: [0.55, 1.5], opacity: [0.8, 0] }}
          transition={{
            duration: 1.8,
            delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  )
}

/* ── BubbleSpaCascade (bathing) ─────────────────────────────────────
   Twelve translucent bubbles drift upward from the base of the viewport
   with randomised x-offsets + sizes (memo'd via a deterministic seed
   inside the component so the pattern is stable across re-renders but
   varied between bubbles). A small "CRYSTAL CLEAN" badge anchors the
   top-left corner — same HUD vocabulary as the feeding ENERGY BOOST
   chip so the two reward overlays read as a matched pair.
   ──────────────────────────────────────────────────────────────────── */

function BubbleSpaCascade() {
  // Hand-tuned bubble seeds — keeps the pattern deterministic + varied
  // without a Math.random() that would re-roll on every mount.
  const bubbles = [
    { x: 12, size: 18, delay: 0.0, dur: 3.0, sway: 6 },
    { x: 22, size: 12, delay: 0.6, dur: 2.6, sway: -4 },
    { x: 32, size: 22, delay: 1.2, dur: 3.4, sway: 8 },
    { x: 40, size: 14, delay: 0.2, dur: 2.8, sway: -6 },
    { x: 48, size: 20, delay: 0.9, dur: 3.2, sway: 4 },
    { x: 56, size: 10, delay: 0.4, dur: 2.4, sway: -5 },
    { x: 64, size: 18, delay: 1.5, dur: 3.0, sway: 7 },
    { x: 72, size: 14, delay: 0.7, dur: 2.6, sway: -3 },
    { x: 80, size: 22, delay: 0.1, dur: 3.4, sway: 6 },
    { x: 88, size: 12, delay: 1.0, dur: 2.8, sway: -7 },
    { x: 18, size: 16, delay: 1.8, dur: 3.0, sway: 5 },
    { x: 76, size: 16, delay: 2.0, dur: 2.8, sway: -5 },
  ]
  return (
    <>
      {/* Floating bubble field — sits at z-10 so Lumi (z-20) wades
          through them rather than being obscured by the cascade. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {bubbles.map((b, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${b.x}%`,
              bottom: -b.size,
              width: b.size,
              height: b.size,
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(180,225,255,0.45) 55%, rgba(120,200,235,0.15) 100%)',
              boxShadow:
                'inset 0 0 6px rgba(255,255,255,0.7), 0 0 8px rgba(150,210,240,0.55)',
            }}
            initial={{ y: 0, opacity: 0 }}
            animate={{
              y: [0, -260, -320],
              x: [0, b.sway, -b.sway],
              opacity: [0, 0.95, 0],
              scale: [0.6, 1, 0.85],
            }}
            transition={{
              duration: b.dur,
              delay: b.delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
      </motion.div>

      {/* "CRYSTAL CLEAN" HUD chip — top-left so it doesn't fight the
          level badge top-right or the EnergyBoost chip top-right. */}
      <motion.div
        className="absolute left-6 top-8 z-30 flex flex-col items-start gap-1"
        initial={{ opacity: 0, scale: 0.7, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -8 }}
        transition={{ ...springBouncy, duration: 0.5 }}
      >
        <motion.div
          className="flex items-center gap-1.5 rounded-2xl border-2 border-sky-cozy-300 bg-cream-50/95 px-3 py-1.5 shadow-pop backdrop-blur-sm"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(110, 200, 230, 0.55)',
              '0 0 0 12px rgba(110, 200, 230, 0)',
            ],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        >
          <motion.span
            aria-hidden
            className="text-base leading-none"
            animate={{ rotate: [-10, 10, -10], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            🫧
          </motion.span>
          <div className="leading-tight">
            <p className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">
              Crystal Clean
            </p>
            <p className="font-display text-sm font-bold text-cocoa-900">
              +5% Freshness
            </p>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}

/* ── QuietRestVeil (sleeping) ───────────────────────────────────────
   Frosted overlay that sits BETWEEN the sparkle backdrop and Lumi.
   `backdrop-blur` softens the gradient + sparkles behind it (creating
   the "quiet rest environment" the spec asks for) while Lumi, painted
   afterwards at z-20, remains crisp and centred. A small "Zzz" drifts
   above her head to seal the mood.
   ──────────────────────────────────────────────────────────────────── */

function QuietRestVeil() {
  return (
    <>
      <motion.div
        aria-hidden
        className="absolute inset-0 z-10 backdrop-blur-[3px]"
        style={{
          background:
            'radial-gradient(60% 70% at 50% 50%, rgba(15, 20, 48, 0.15) 0%, rgba(15, 20, 48, 0.45) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 z-30 -translate-x-1/2 select-none font-display text-2xl font-bold text-lavender-100"
        style={{ filter: 'drop-shadow(0 0 8px rgba(180, 190, 255, 0.7))' }}
        initial={{ opacity: 0, y: 6 }}
        animate={{
          opacity: [0, 1, 0],
          y: [0, -18],
          rotate: [0, 8],
        }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      >
        Z z z
      </motion.span>
    </>
  )
}

/* ────────────────────────────────────────────────────────── */

interface ActivityCardProps {
  activity: Activity
  /** When true, the card is the currently-active Lumi state — show ring + reward badge. */
  active: boolean
  onPlay: () => void
}

/**
 * Care action card. Tap triggers a burst + the parent's handler (which
 * sets Lumi's state). When `active` it pulses a tinted ring + shows the
 * reward delta so the kid sees the effect of their last tap.
 */
function ActivityCard({ activity, active, onPlay }: ActivityCardProps) {
  const [burstKey, setBurstKey] = useState<number | null>(null)

  const handleTap = () => {
    setBurstKey(Date.now())
    onPlay()
  }

  return (
    <Card
      tone={activity.tone}
      interactive
      onClick={handleTap}
      className={cn(
        'relative flex flex-col items-center gap-2 overflow-visible text-center transition-shadow',
        active && 'ring-4 ring-offset-2 ring-offset-cream-50 ring-current',
      )}
    >
      {burstKey != null && (
        <BurstParticles
          key={burstKey}
          trigger={burstKey}
          tone={activity.tone}
          count={12}
          radius={70}
          y={32}
        />
      )}
      <motion.span
        className="text-5xl"
        aria-hidden
        animate={burstKey != null ? { scale: [1, 1.35, 1] } : undefined}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        key={burstKey ?? 'idle'}
      >
        {activity.emoji}
      </motion.span>
      <span className="font-display text-sm font-semibold text-cocoa-900">
        {activity.title}
      </span>

      <AnimatePresence>
        {active && (
          <motion.span
            key="reward"
            initial={{ opacity: 0, y: 4, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="rounded-full border-2 border-cream-200 bg-cream-50/95 px-2.5 py-0.5 text-[11px] font-bold text-cocoa-800 shadow-soft"
          >
            {REWARD_LABEL[activity.id]}
          </motion.span>
        )}
      </AnimatePresence>

      <Button
        size="sm"
        tone={TONE_BTN[activity.tone]}
        className="mt-1"
        onClick={(e) => {
          e.stopPropagation()
          handleTap()
        }}
      >
        {active && activity.id === 'sleep' ? 'Đánh thức' : 'Chơi'}
      </Button>
    </Card>
  )
}

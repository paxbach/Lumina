import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, ScanLine, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/utils/cn'

/* ════════════════════════════════════════════════════════════════════
   ColorPickerGame ("Thác Nước Màu")
   ────────────────────────────────────────────────────────────────────
   Immersive AR-style colour-matching mini-game for Node 3 of Rừng Kỳ
   Diệu. The kid points the magical Crystal Orb at a real-world object
   whose colour matches the broken waterfall and "feeds" the colour
   back into the falls.

   Visual stack (back → front, all stacked inside ONE relative card):
     z-0  ImmersiveBackground   — full-bleed waterfall photo + tint
     z-10 Stage                  — challenge banner + Crystal Orb
     z-20 WoodenTray             — bottom-pinned shelf with 3 items
     z-30 MagicParticleTrail     — ✨ trail from clicked item → orb
     z-40 GoldSuccessBanner      — glass + amber celebration card

   Asset paths (PNG / JPG — supplied separately):
     /assets/bg-waterfall.jpg
     /assets/items/apple-3d.png
     /assets/items/book-3d.png
     /assets/items/car-3d.png

   All image elements ship with an `onError` fallback to the existing
   emoji / CSS-painted gradient so the demo plays today; when the
   artist drops the assets into `public/assets/` the visuals snap to
   the photoreal version with zero code changes.

   Flow:
     playing → kid taps an item.
       • wrong  → item wobbles, brief red ring, target stays.
       • right  → particles fly from the item into the orb, the orb
                  flashes (scale × brightness), bg waterfall tints to
                  the target colour, then phase → success.
     success → GoldSuccessBanner with "Hoàn thành" + "Chơi màu mới".
   ════════════════════════════════════════════════════════════════════ */

type ColorId = 'red' | 'yellow' | 'blue'
type Phase = 'playing' | 'success'
/** Strict tint state — null = no tint yet, otherwise the active colour. */
type TintColor = ColorId | null

interface ColorChoice {
  id: ColorId
  name: string
  /** Pure hex (used for HUD text + box-shadow glows). */
  hex: string
  /** rgba string with built-in alpha — for soft tinted halos. */
  glow: string
  itemEmoji: string
  itemName: string
  /** Absolute path under /public to a 3D PNG of the item (transparent bg). */
  itemImageSrc: string
}

const COLORS: ColorChoice[] = [
  {
    id: 'red',
    name: 'Đỏ',
    hex: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.55)',
    itemEmoji: '🍎',
    itemName: 'Quả táo đỏ',
    itemImageSrc: '/assets/items/apple-3d.png',
  },
  {
    id: 'yellow',
    name: 'Vàng',
    hex: '#facc15',
    glow: 'rgba(250, 204, 21, 0.55)',
    itemEmoji: '📒',
    itemName: 'Quyển sách vàng',
    itemImageSrc: '/assets/items/book-3d.png',
  },
  {
    id: 'blue',
    name: 'Xanh dương',
    hex: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.6)',
    itemEmoji: '🚗',
    itemName: 'Ô tô xanh dương',
    itemImageSrc: '/assets/items/car-3d.png',
  },
]

const BG_SRC = '/assets/bg-waterfall.jpg'

interface ColorPickerGameProps {
  /** Called when the kid taps "Hoàn thành" on the success banner. */
  onComplete?: () => void
}

/** Pick a random colour, optionally excluding one (avoids repeat on retry). */
function pickTarget(exclude?: ColorChoice): ColorChoice {
  const pool = exclude ? COLORS.filter((c) => c.id !== exclude.id) : COLORS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function ColorPickerGame({ onComplete }: ColorPickerGameProps) {
  const [target, setTarget] = useState<ColorChoice>(() => pickTarget())
  const [phase, setPhase] = useState<Phase>('playing')
  const [streaming, setStreaming] = useState(false)
  const [wrongId, setWrongId] = useState<ColorId | null>(null)
  /** Index (0/1/2) of clicked item — drives particle trail origin x. */
  const [pickedIndex, setPickedIndex] = useState<number | null>(null)
  /** When non-null, bg waterfall is tinted with this colour via
   *  mix-blend-mode overlay — "the waterfall absorbing the colour". */
  const [tintColor, setTintColor] = useState<TintColor>(null)

  const handlePick = (choice: ColorChoice, index: number) => {
    if (phase !== 'playing' || streaming) return
    if (choice.id !== target.id) {
      // Wrong — flash + wobble the tile, keep the round live.
      setWrongId(choice.id)
      window.setTimeout(() => setWrongId(null), 480)
      return
    }
    // Right — fire the trail, then tint the waterfall mid-flight, then
    // settle into the success phase once the orb has fully absorbed.
    setPickedIndex(index)
    setStreaming(true)
    window.setTimeout(() => setTintColor(choice.id), 750)
    window.setTimeout(() => {
      setStreaming(false)
      setPhase('success')
    }, 1500)
  }

  const handlePlayAgain = () => {
    setTarget(pickTarget(target))
    setPhase('playing')
    setStreaming(false)
    setWrongId(null)
    setPickedIndex(null)
    setTintColor(null)
  }

  const tintHex = tintColor
    ? COLORS.find((c) => c.id === tintColor)?.hex ?? null
    : null

  return (
    <div className="relative min-h-[640px] overflow-hidden rounded-3xl border-2 border-emerald-900/40 shadow-pop sm:min-h-[680px]">
      {/* z-0 ─ Photoreal waterfall background + dynamic colour tint */}
      <ImmersiveBackground tintHex={tintHex} />

      {/* z-10 ─ Stage column: glass banner up top, Crystal Orb centred. */}
      <div className="relative z-10 flex min-h-[640px] flex-col items-center px-4 pb-48 pt-5 sm:min-h-[680px] sm:pt-7">
        <ChallengeBanner target={target} phase={phase} />

        <div className="flex w-full flex-1 items-center justify-center">
          <CrystalOrb
            target={target}
            streaming={streaming}
            phase={phase}
          />
        </div>
      </div>

      {/* z-20 ─ Bottom wooden shelf with the 3 selectable items. */}
      <WoodenTray
        items={COLORS}
        onPick={handlePick}
        wrongId={wrongId}
        disabled={phase !== 'playing' || streaming}
      />

      {/* z-30 ─ Particle trail layer, mounted only during the streaming
          window so it tears down between rounds. */}
      <AnimatePresence>
        {streaming && pickedIndex !== null && (
          <MagicParticleTrail
            key="trail"
            color={target.hex}
            itemIndex={pickedIndex}
          />
        )}
      </AnimatePresence>

      {/* z-40 ─ Gold success banner. AnimatePresence so it cross-fades
          out cleanly when the kid taps "Chơi màu mới". */}
      <AnimatePresence>
        {phase === 'success' && (
          <GoldSuccessBanner
            key="success"
            target={target}
            onComplete={onComplete}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   z-0 — Immersive background
   ────────────────────────────────────────────────────────────────────
   Full-bleed photoreal waterfall with three stacked overlays:
     1. Dim scrim       — keeps the glass orb + white text legible.
     2. Dynamic tint    — mix-blend-mode overlay, drives the
                          "waterfall absorbing the colour" beat.
     3. Vignette        — pulls focus to the centred orb.

   Falls back to a hand-painted CSS gradient if the JPG is missing so
   the game still looks intentional during dev before assets ship.
   ════════════════════════════════════════════════════════════════════ */

function ImmersiveBackground({ tintHex }: { tintHex: string | null }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {!imgFailed && (
        <img
          src={BG_SRC}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      {imgFailed && <FallbackForestGradient />}

      {/* Dim scrim — 35% slate so light glass + white text reads against
          a worst-case bright forest photo. */}
      <div aria-hidden className="absolute inset-0 bg-slate-950/40" />

      {/* Dynamic colour tint — opacity ramps up the moment a correct
          pick fires; mix-blend-mode 'overlay' makes it look like the
          water itself is staining instead of a flat colour wash. */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ mixBlendMode: 'overlay' }}
        initial={false}
        animate={{
          backgroundColor: tintHex ?? 'rgba(0, 0, 0, 0)',
          opacity: tintHex ? 0.6 : 0,
        }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />

      {/* Soft vignette so the orb at centre always reads with contrast. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 70% at 50% 45%, transparent 50%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  )
}

/** Hand-painted forest waterfall — used when /assets/bg-waterfall.jpg
 *  is missing. Vertical light band hints at the waterfall column;
 *  deep emerald radial below it suggests a forest pool. */
function FallbackForestGradient() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 100%, #0f4c3a 0%, #07261a 70%), linear-gradient(180deg, #1a3327 0%, #061309 100%)',
      }}
    >
      <div
        className="absolute left-1/2 top-0 h-full w-40 -translate-x-1/2 opacity-60 sm:w-52"
        style={{
          background:
            'linear-gradient(180deg, rgba(220,240,255,0.7) 0%, rgba(160,210,240,0.45) 60%, rgba(80,150,200,0.2) 100%)',
          filter: 'blur(22px)',
        }}
      />
      {/* Splash pool at the base */}
      <div
        className="absolute bottom-44 left-1/2 h-10 w-72 -translate-x-1/2 rounded-full opacity-70 blur-2xl"
        style={{ background: 'radial-gradient(ellipse, #2dd4bf, transparent 70%)' }}
      />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   z-10 — Glass challenge banner
   ════════════════════════════════════════════════════════════════════ */

function ChallengeBanner({
  target,
  phase,
}: {
  target: ColorChoice
  phase: Phase
}) {
  return (
    <motion.div
      key={`${target.id}-${phase}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative inline-flex max-w-md flex-col items-center gap-1 rounded-3xl border-2 border-white/30 bg-white/15 px-5 py-3 text-center shadow-lg backdrop-blur-md sm:px-6 sm:py-4"
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/85"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
      >
        Nhiệm vụ săn màu
      </p>
      <h2
        className="font-display text-sm font-bold leading-snug text-white sm:text-base"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
      >
        {phase === 'success' ? (
          <>
            Tuyệt vời! Bé đã trả lại sắc{' '}
            <span
              className="font-display font-black"
              style={{
                color: target.hex,
                textShadow: `0 0 12px ${target.hex}`,
              }}
            >
              {target.name.toLowerCase()}
            </span>{' '}
            cho dòng thác!
          </>
        ) : (
          <>
            Bé hãy tìm một đồ vật có{' '}
            <span
              className="font-display font-black"
              style={{
                color: target.hex,
                textShadow: `0 0 12px ${target.hex}`,
              }}
            >
              MÀU {target.name.toUpperCase()}
            </span>{' '}
            trong phòng nhé!
          </>
        )}
      </h2>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   z-10 — Crystal Orb scanner (Glassmorphism)
   ────────────────────────────────────────────────────────────────────
   Outer glass shell uses the exact tokens from the spec
   (`bg-white/10 backdrop-blur-md border-white/30 shadow-[0_0_50px_…]`)
   so dropping in real photoreal lighting later just means swapping the
   inner content. The orb's glow box-shadow re-colours mid-stream so
   the kid sees the orb "charging" with the target colour before the
   waterfall reacts.

   Inner HUD is neon emerald — pulses + slowly rotating dashed ring +
   ScanLine icon — the "magical reticle" the spec calls for.
   ════════════════════════════════════════════════════════════════════ */

function CrystalOrb({
  target,
  streaming,
  phase,
}: {
  target: ColorChoice
  streaming: boolean
  phase: Phase
}) {
  // Orb-level animation: gentle idle, charge during streaming, big
  // flash on the success frame (scale × brightness per spec).
  const orbAnimate =
    phase === 'success'
      ? {
          scale: [1, 1.2, 1],
          filter: [
            'brightness(1)',
            'brightness(2)',
            'brightness(1.1)',
          ] as string[],
        }
      : streaming
        ? {
            scale: [1, 1.08, 1.04, 1],
            filter: 'brightness(1.35)',
          }
        : { scale: 1, filter: 'brightness(1)' }

  const orbTransition =
    phase === 'success'
      ? { duration: 1.2, ease: 'easeOut' as const }
      : streaming
        ? { duration: 0.9, ease: 'easeInOut' as const }
        : { duration: 0.4 }

  return (
    <motion.div
      className="relative grid size-56 place-items-center rounded-full sm:size-64"
      animate={orbAnimate}
      transition={orbTransition}
    >
      {/* Outer glass shell — the spec's glassmorphism orb. Box-shadow
          re-colours when streaming so the orb appears to fill with
          the target colour. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full border border-white/30 bg-white/10 backdrop-blur-md"
        animate={{
          boxShadow: streaming
            ? `0 0 80px ${target.glow}, inset 0 0 25px rgba(255,255,255,0.2), inset 0 0 60px ${target.glow}`
            : '0 0 50px rgba(255,255,255,0.2), inset 0 0 25px rgba(255,255,255,0.15), inset 0 -15px 30px rgba(255,255,255,0.08), inset 0 15px 30px rgba(255,255,255,0.25)',
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Top-left "wet" highlight crescent — sells the glass sphere
          illusion at a tenth of the cost of a real reflection. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[15%] top-[10%] h-20 w-24 rounded-full bg-white/40 blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-[22%] top-[16%] h-2.5 w-9 rounded-full bg-white/85 blur-[2px]"
      />

      {/* Inner neon-green HUD */}
      <div className="relative grid size-2/3 place-items-center text-emerald-400">
        {/* Pulsing inner ring */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-emerald-400/85"
          style={{
            boxShadow:
              '0 0 16px rgba(52,211,153,0.7), inset 0 0 12px rgba(52,211,153,0.55)',
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Slowly rotating dashed ring — "live scan" texture */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-dashed border-emerald-300/70"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative flex flex-col items-center gap-1">
          <motion.span
            animate={{ rotate: streaming ? 360 : 0 }}
            transition={
              streaming
                ? { duration: 2, repeat: Infinity, ease: 'linear' }
                : { duration: 0.3 }
            }
            style={{
              filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.85))',
            }}
          >
            <ScanLine className="size-10 sm:size-12" strokeWidth={1.4} />
          </motion.span>
          <motion.span
            className="text-[9px] font-bold uppercase tracking-[0.35em] text-emerald-300"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ textShadow: '0 0 8px rgba(52,211,153,0.7)' }}
          >
            {streaming
              ? `Locked · ${target.name}`
              : phase === 'success'
                ? 'Linked'
                : 'Scanning…'}
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   z-20 — Wooden interaction tray
   ════════════════════════════════════════════════════════════════════ */

function WoodenTray({
  items,
  onPick,
  wrongId,
  disabled,
}: {
  items: ColorChoice[]
  onPick: (item: ColorChoice, index: number) => void
  wrongId: ColorId | null
  disabled: boolean
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t-4 border-amber-700 bg-amber-900/80 px-3 pb-4 pt-4 shadow-2xl backdrop-blur-sm sm:px-6 sm:pb-5 sm:pt-5"
      // Dual gradient: deep brown wash + faint vertical grain stripes
      // for a hand-planed wood texture without shipping an image.
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(120,53,15,0.92) 0%, rgba(69,26,3,0.95) 100%), repeating-linear-gradient(90deg, rgba(252,211,77,0.05) 0 2px, transparent 2px 7px)',
      }}
    >
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/85">
        Chọn 1 đồ vật cùng màu để nạp năng lượng
      </p>
      <div className="mx-auto grid max-w-2xl grid-cols-3 gap-3 sm:gap-5">
        {items.map((item, idx) => (
          <WoodenItemSlot
            key={item.id}
            item={item}
            wrong={wrongId === item.id}
            disabled={disabled}
            onClick={() => onPick(item, idx)}
          />
        ))}
      </div>
    </div>
  )
}

function WoodenItemSlot({
  item,
  wrong,
  disabled,
  onClick,
}: {
  item: ColorChoice
  wrong: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={
        disabled
          ? undefined
          : {
              scale: 1.15,
              y: -15,
              filter: 'drop-shadow(0px 10px 15px rgba(255,255,255,0.4))',
            }
      }
      whileTap={disabled ? undefined : { scale: 0.95 }}
      animate={wrong ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
      transition={
        wrong
          ? { duration: 0.42, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 240, damping: 18 }
      }
      className={cn(
        'group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300',
        'disabled:cursor-not-allowed disabled:opacity-65',
        wrong ? 'border-rose-400 ring-2 ring-rose-300' : 'border-amber-700/70',
      )}
      // Dark wood slot — slight inner top highlight reads as a polished
      // bevel under the item.
      style={{
        background:
          'linear-gradient(180deg, rgba(60,28,8,0.85) 0%, rgba(40,16,4,0.92) 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(252,211,77,0.18), 0 4px 10px rgba(0,0,0,0.4)',
      }}
      aria-label={`Chọn ${item.itemName}`}
    >
      {/* Tinted glow halo behind the item — telegraphs the slot colour
          even when the PNG hasn't loaded yet. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-2 h-16 rounded-full opacity-65 blur-xl"
        style={{ background: item.glow }}
      />

      <Item3D
        src={item.itemImageSrc}
        emoji={item.itemEmoji}
        alt={item.itemName}
        hex={item.hex}
      />

      <span className="relative font-display text-[11px] font-bold leading-tight text-amber-50 sm:text-xs">
        {item.itemName}
      </span>
    </motion.button>
  )
}

/* ── 3D item slot ────────────────────────────────────────────────────
   Tries the photoreal PNG first (`/assets/items/apple-3d.png`, etc.);
   on a 404 (or any load error) falls back to the existing emoji so
   the demo never shows a broken-image icon. The drop-shadow under
   either form is tinted by the item's hex so colour identity survives
   even at thumbnail size.
   ──────────────────────────────────────────────────────────────────── */

function Item3D({
  src,
  emoji,
  alt,
  hex,
}: {
  src: string
  emoji: string
  alt: string
  hex: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        aria-label={alt}
        className="relative grid size-16 place-items-center text-4xl leading-none sm:size-20 sm:text-5xl"
        style={{ filter: `drop-shadow(0 6px 8px ${hex}aa)` }}
      >
        {emoji}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="relative size-16 select-none object-contain sm:size-20"
      style={{ filter: `drop-shadow(0 6px 10px ${hex}cc)` }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  )
}

/* ════════════════════════════════════════════════════════════════════
   z-30 — Magic particle trail
   ────────────────────────────────────────────────────────────────────
   When the kid taps the correct item we spawn two intertwined streams
   that travel from the item's tray slot up into the orb:
     • 14 sparkle emojis (✨) — visible, characterful
     • 7 tinted dots          — carry the target colour so the orb's
                                glow shift reads as the same energy

   Origins are derived from the clicked item's column index (0/1/2)
   inside the max-w-2xl 3-column grid; destinations are the orb's
   visual centre (~38% from top of the stage). Travel is ~270 px on
   the y-axis with light horizontal jitter to fan the particles out.
   ════════════════════════════════════════════════════════════════════ */

function MagicParticleTrail({
  color,
  itemIndex,
}: {
  color: string
  itemIndex: number
}) {
  // 3-column grid → items live around 22% / 50% / 78% of stage width.
  // Numbers come from the same `max-w-2xl grid-cols-3` layout the
  // WoodenTray uses, so the trail launches from directly under each
  // item without needing a DOM measurement.
  const originPercent = [22, 50, 78][itemIndex] ?? 50

  // Memoise so re-renders during the streaming window don't reshuffle
  // jitter mid-flight (which would look like teleporting particles).
  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        delay: i * 0.045,
        jitterX: (Math.sin(i * 12.9898) * 43758.5453 % 1) * 90 - 45,
        size: 14 + (i % 3) * 6,
      })),
    [],
  )

  const dots = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        delay: i * 0.06,
        jitterX: (Math.sin(i * 7.13) * 12345.678 % 1) * 60 - 30,
      })),
    [],
  )

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      {/* Sparkle emoji stream */}
      {sparkles.map((p) => (
        <motion.span
          key={`spk-${p.id}`}
          className="absolute select-none leading-none"
          style={{
            left: `${originPercent}%`,
            // Anchor just above the wooden tray (which is ~ bottom 22%).
            bottom: '20%',
            fontSize: p.size,
            filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.85))',
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
          animate={{
            x: p.jitterX,
            y: -280,
            opacity: [0, 1, 1, 0],
            scale: [0.3, 1.15, 0.85, 0.5],
            rotate: p.jitterX > 0 ? 180 : -180,
          }}
          transition={{
            duration: 1.1,
            delay: p.delay,
            ease: 'easeOut',
          }}
        >
          ✨
        </motion.span>
      ))}

      {/* Tinted dot stream — slightly faster + tighter so the colour
          arrives at the orb a beat before the sparkles fade. */}
      {dots.map((p) => (
        <motion.span
          key={`dot-${p.id}`}
          className="absolute rounded-full"
          style={{
            left: `${originPercent}%`,
            bottom: '20%',
            width: 9,
            height: 9,
            background: color,
            boxShadow: `0 0 14px ${color}, 0 0 28px ${color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
          animate={{
            x: p.jitterX,
            y: -270,
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.9],
          }}
          transition={{
            duration: 0.95,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   z-40 — Gold Success Banner
   ────────────────────────────────────────────────────────────────────
   Floating glass card pinned to the upper third of the viewport.
   Backdrop-blur over the tinted background gives the gold border a
   real "stained-glass on water" feel. The CTA pair below mirrors the
   game's two paths: finalise the round (parent's onComplete) or roll
   a new colour.
   ════════════════════════════════════════════════════════════════════ */

function GoldSuccessBanner({
  target,
  onComplete,
  onPlayAgain,
}: {
  target: ColorChoice
  onComplete?: () => void
  onPlayAgain: () => void
}) {
  return (
    <motion.div
      role="dialog"
      aria-label="Hoàn thành nhiệm vụ"
      className="absolute inset-x-0 top-20 z-40 mx-auto max-w-md px-4 sm:top-24"
      initial={{ opacity: 0, scale: 0.85, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
    >
      <div
        className="relative rounded-3xl border-2 border-amber-300/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)',
          boxShadow:
            '0 0 40px rgba(252, 211, 77, 0.5), inset 0 0 24px rgba(255, 251, 235, 0.25)',
        }}
      >
        {/* Gold sparkle corner accents — sit slightly outside the card so
            they read as ornament, not content. */}
        <motion.span
          aria-hidden
          className="absolute -left-2 -top-3 select-none text-xl"
          animate={{ rotate: [-6, 8, -6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✨
        </motion.span>
        <motion.span
          aria-hidden
          className="absolute -right-2 -top-3 select-none text-xl"
          animate={{ rotate: [6, -8, 6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✨
        </motion.span>

        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border-2 border-amber-300 bg-amber-100/95 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-900 shadow-soft">
          <Sparkles className="size-3.5 fill-amber-400 stroke-amber-700" />
          Thành công
        </div>

        <p
          className="mt-3 text-center font-display text-base font-bold leading-snug text-white sm:text-lg"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65)' }}
        >
          Tuyệt vời! Thác nước đã nhận lại sắc{' '}
          <span
            style={{
              color: target.hex,
              textShadow: `0 0 12px ${target.hex}`,
            }}
          >
            {target.name.toLowerCase()}
          </span>
          !
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            onClick={onComplete}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-300 bg-gradient-to-br from-amber-300 to-amber-500 px-5 py-2 font-display text-sm font-bold text-amber-950 shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
            style={{ boxShadow: '0 0 18px rgba(252, 211, 77, 0.55)' }}
          >
            <Zap className="size-4" />
            Hoàn thành nhiệm vụ
          </motion.button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/40 bg-white/15 px-4 py-2 font-display text-sm font-bold text-white backdrop-blur hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            <RotateCcw className="size-4" />
            Chơi màu mới
          </button>
        </div>
      </div>
    </motion.div>
  )
}

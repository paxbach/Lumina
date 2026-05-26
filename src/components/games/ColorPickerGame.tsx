import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crosshair, RotateCcw, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/utils/cn'

/* ════════════════════════════════════════════════════════════════════
   ColorPickerGame
   ────────────────────────────────────────────────────────────────────
   Mini-game for Node 3 of Rừng Kỳ Diệu (Thác Nước Màu). The waterfall
   has lost its colours; the kid picks the correctly-coloured real-world
   object to recharge it.

   Flow:
     playing → kid taps an item.
       • wrong  → item wobbles, brief red-ring flash, target stays.
       • right  → camera flashes target colour, particles fly toward
                  the waterfall, waterfall crossfades grey → rainbow,
                  state advances to `success`.
     success → "Hoàn thành" CTA fires `onComplete`. "Chơi lại" picks a
               new target colour (excluding the previous one for variety)
               and resets the waterfall.

   Self-contained: no router / store coupling. Parent ForestGamePage
   wires `onComplete` to write the crystal + completeSubNode + nav.
   ════════════════════════════════════════════════════════════════════ */

type Phase = 'playing' | 'success'

interface ColorChoice {
  id: 'red' | 'yellow' | 'blue'
  name: string
  hex: string
  itemEmoji: string
  itemName: string
}

const COLORS: ColorChoice[] = [
  { id: 'red',    name: 'Đỏ',         hex: '#ef4444', itemEmoji: '🍎', itemName: 'Quả táo đỏ' },
  { id: 'yellow', name: 'Vàng',       hex: '#facc15', itemEmoji: '📒', itemName: 'Quyển sách vàng' },
  { id: 'blue',   name: 'Xanh dương', hex: '#3b82f6', itemEmoji: '🚗', itemName: 'Ô tô xanh dương' },
]

interface ColorPickerGameProps {
  /** Called when the kid taps "Hoàn thành" on the success view. */
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
  const [waterfallColored, setWaterfallColored] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [wrongId, setWrongId] = useState<ColorChoice['id'] | null>(null)

  const handlePick = (choice: ColorChoice) => {
    if (phase !== 'playing' || streaming) return
    if (choice.id !== target.id) {
      // Wrong — flash + wobble the tile, keep the round live.
      setWrongId(choice.id)
      window.setTimeout(() => setWrongId(null), 480)
      return
    }
    // Right — kick off the stream → waterfall transition → success chain.
    setStreaming(true)
    window.setTimeout(() => setWaterfallColored(true), 600)
    window.setTimeout(() => {
      setStreaming(false)
      setPhase('success')
    }, 1300)
  }

  const handlePlayAgain = () => {
    setTarget(pickTarget(target))
    setPhase('playing')
    setWaterfallColored(false)
    setStreaming(false)
    setWrongId(null)
  }

  return (
    <div className="space-y-5">
      <ChallengeBanner target={target} phase={phase} />

      {/* Camera + Waterfall row — horizontal at every breakpoint so the
          particle stream's left→right path stays sensible on mobile too.
          `items-center` keeps both anchored on the same horizon. */}
      <div className="relative flex items-center justify-center gap-4 sm:gap-10">
        <CameraCircle target={target} streaming={streaming} />

        {/* Stream particles overlay — absolute over the whole row so the
            particles can fly across the gap from camera to waterfall. */}
        <AnimatePresence>
          {streaming && <ColorStream key="stream" color={target.hex} />}
        </AnimatePresence>

        <WaterfallSVG colored={waterfallColored} />
      </div>

      <ItemTray
        items={COLORS}
        onPick={handlePick}
        wrongId={wrongId}
        disabled={phase !== 'playing' || streaming}
      />

      <AnimatePresence>
        {phase === 'success' && (
          <SuccessPanel
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
   Top banner — restated each round with the target colour highlighted
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
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border-2 px-4 py-3 text-center shadow-soft sm:px-6 sm:py-4"
      style={{
        borderColor: target.hex,
        background: `linear-gradient(180deg, ${target.hex}1f 0%, var(--color-cream-50) 100%)`,
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.3em]"
        style={{ color: target.hex }}
      >
        Nhiệm vụ săn màu
      </p>
      <h2 className="mt-1 font-display text-base font-bold leading-snug text-cocoa-900 sm:text-lg">
        {phase === 'success' ? (
          <>
            Tuyệt vời! Bé đã trả lại sắc{' '}
            <span style={{ color: target.hex }}>{target.name.toLowerCase()}</span>{' '}
            cho dòng thác!
          </>
        ) : (
          <>
            Bé hãy tìm một đồ vật có{' '}
            <span
              className="font-display font-black"
              style={{ color: target.hex }}
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
   Camera circle — dark viewport, dashed scan ring, crosshair, flash
   ════════════════════════════════════════════════════════════════════ */

function CameraCircle({
  target,
  streaming,
}: {
  target: ColorChoice
  streaming: boolean
}) {
  return (
    <div className="relative grid size-36 shrink-0 place-items-center sm:size-52">
      {/* Outer dashed ring — slowly rotates so the camera reads as live. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/70"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{
          boxShadow: '0 0 12px rgba(52, 211, 153, 0.35)',
        }}
      />

      {/* Viewport disc */}
      <div className="relative aspect-square w-[86%] overflow-hidden rounded-full border-4 border-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 shadow-pop ring-1 ring-emerald-400/30">
        {/* Faint scanline texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(16, 185, 129, 0.18) 0 1px, transparent 1px 4px)',
          }}
        />

        {/* Crosshair target */}
        <div className="absolute inset-0 grid place-items-center">
          <Crosshair
            className="size-16 text-emerald-300/80 sm:size-24"
            strokeWidth={1.2}
          />
        </div>

        {/* Pulsing centre dot */}
        <motion.span
          aria-hidden
          className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300"
          animate={{ scale: [1, 1.45, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 10px rgba(52, 211, 153, 0.95)' }}
        />

        {/* Detection flash — fills the viewport with target colour briefly. */}
        <AnimatePresence>
          {streaming && (
            <motion.span
              key="flash"
              aria-hidden
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0.35, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              style={{
                background: `radial-gradient(circle, ${target.hex} 0%, ${target.hex}55 45%, transparent 75%)`,
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Status chip below the viewport. */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-400/60 bg-slate-900/90 px-3 py-0.5 text-[9px] font-bold uppercase tracking-[0.3em] shadow-soft"
        style={{
          color: streaming ? target.hex : '#6ee7b7',
        }}
      >
        {streaming ? `Detected · ${target.name}` : 'Scanning…'}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Color stream — colored particles flying from camera → waterfall
   ════════════════════════════════════════════════════════════════════ */

function ColorStream({ color }: { color: string }) {
  // 7 particles, staggered so the stream reads as a continuous comet
  // tail rather than a single dot. `x: ['-30%', '30%']` is relative to
  // the absolutely-positioned wrapper, which itself centers in the
  // camera↔waterfall row — net effect: particles cross the gap.
  const particles = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({ id: i, delay: i * 0.07 })),
    [],
  )

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute size-3 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 14px ${color}, 0 0 24px ${color}`,
          }}
          initial={{ x: '-30%', y: '-30%', scale: 0.4, opacity: 0 }}
          animate={{
            x: ['-30%', '30%'],
            // Gentle arc up then down so the stream reads as "flying"
            // rather than sliding flat across.
            y: ['-30%', '-55%', '-25%', '30%'],
            scale: [0.4, 1.2, 0.7],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 0.95,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Waterfall SVG — grey at rest, crossfades to rainbow when colored
   ════════════════════════════════════════════════════════════════════ */

function WaterfallSVG({ colored }: { colored: boolean }) {
  return (
    <div className="shrink-0">
      <svg
        viewBox="0 0 120 220"
        className="h-44 w-auto sm:h-56"
        role="img"
        aria-label={
          colored
            ? 'Thác nước đã rực rỡ cầu vồng'
            : 'Thác nước đang mất màu, chờ được nạp năng lượng'
        }
      >
        <defs>
          {/* Rainbow per spec: red-500 → yellow-400 → blue-500 */}
          <linearGradient id="wf-rainbow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#ef4444" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="wf-grey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
          {/* Splash pool gradient — picks up the bottom of the column. */}
          <radialGradient id="wf-pool-rainbow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
        </defs>

        {/* Cliff sides — brown rocky outlines framing the cascade. */}
        <path
          d="M 0 0 L 24 6 L 28 198 L 0 214 Z"
          fill="#7c4f2c"
          stroke="#5a3a1f"
          strokeWidth={1.5}
        />
        <path
          d="M 120 0 L 96 6 L 92 198 L 120 214 Z"
          fill="#7c4f2c"
          stroke="#5a3a1f"
          strokeWidth={1.5}
        />

        {/* Water column — grey base always present. */}
        <rect x="28" y="0" width="64" height="200" fill="url(#wf-grey)" />

        {/* Rainbow overlay — opacity flips on `colored`. Layered like
            this so the grey-to-rainbow change reads as the colour
            seeping IN rather than a hard cut. */}
        <motion.rect
          x="28"
          y="0"
          width="64"
          height="200"
          fill="url(#wf-rainbow)"
          initial={false}
          animate={{ opacity: colored ? 1 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Flowing wave lines — translate downward in a loop so the
            water reads as falling. Stays visible in both states. */}
        <g opacity={0.55}>
          {[0, 1, 2, 3].map((i) => (
            <motion.line
              key={i}
              x1={32}
              x2={88}
              stroke="white"
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ y1: -10 + i * 55, y2: -10 + i * 55 }}
              animate={{
                y1: [-10 + i * 55, 230 + i * 55],
                y2: [-10 + i * 55, 230 + i * 55],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </g>

        {/* Pool at the bottom — also crossfades grey → blue. */}
        <ellipse cx={60} cy={212} rx={56} ry={9} fill="url(#wf-grey)" />
        <motion.ellipse
          cx={60}
          cy={212}
          rx={56}
          ry={9}
          fill="url(#wf-pool-rainbow)"
          initial={false}
          animate={{ opacity: colored ? 1 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Top splash droplets — pop in when the colour arrives, fade out
            so they don't distract from the steady flow. */}
        <AnimatePresence>
          {colored && (
            <g key="splash">
              {[
                { cx: 36, cy: 6, r: 3 },
                { cx: 84, cy: 4, r: 2.5 },
                { cx: 60, cy: 2, r: 3.5 },
              ].map((d, i) => (
                <motion.circle
                  key={i}
                  cx={d.cx}
                  cy={d.cy}
                  r={d.r}
                  fill="#fef9c3"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 0.8] }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.9,
                    delay: i * 0.12,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </g>
          )}
        </AnimatePresence>
      </svg>

      <p
        className={cn(
          'mt-1 text-center text-[10px] font-bold uppercase tracking-[0.25em] transition-colors',
          colored ? 'text-cocoa-900' : 'text-cocoa-700/60',
        )}
      >
        Thác Nước Màu
      </p>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Item tray — 3 colored options, taps drive `onPick`
   ════════════════════════════════════════════════════════════════════ */

function ItemTray({
  items,
  onPick,
  wrongId,
  disabled,
}: {
  items: ColorChoice[]
  onPick: (item: ColorChoice) => void
  wrongId: ColorChoice['id'] | null
  disabled: boolean
}) {
  return (
    <div>
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa-700/70">
        Chọn 1 đồ vật cùng màu để nạp năng lượng
      </p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {items.map((item) => (
          <ItemTile
            key={item.id}
            item={item}
            wrong={wrongId === item.id}
            disabled={disabled}
            onClick={() => onPick(item)}
          />
        ))}
      </div>
    </div>
  )
}

function ItemTile({
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
      whileHover={disabled ? undefined : { y: -3, scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      animate={
        wrong ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }
      }
      transition={
        wrong
          ? { duration: 0.42, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 240, damping: 18 }
      }
      className={cn(
        'group/tile relative flex flex-col items-center gap-1.5 rounded-2xl border-4 bg-cream-50 p-3 shadow-soft transition-shadow',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200',
        'disabled:cursor-not-allowed disabled:opacity-65',
        wrong ? 'border-rose-400 ring-4 ring-rose-200' : 'border-cream-200',
      )}
      style={{
        // Subtle color-tinted background so each tile telegraphs its
        // dominant colour even before the kid reads the label.
        backgroundImage: `radial-gradient(140% 90% at 50% 0%, ${item.hex}26 0%, transparent 65%)`,
      }}
      aria-label={`Chọn ${item.itemName}`}
    >
      {/* Color dot indicator at top-right corner */}
      <span
        aria-hidden
        className="absolute right-2 top-2 size-3 rounded-full ring-2 ring-cream-50"
        style={{
          background: item.hex,
          boxShadow: `0 0 6px ${item.hex}88`,
        }}
      />

      <span
        className="grid size-14 place-items-center rounded-full border-4 bg-white text-3xl shadow-soft sm:size-16 sm:text-4xl"
        style={{ borderColor: item.hex }}
      >
        {item.itemEmoji}
      </span>
      <span className="text-center font-display text-[11px] font-bold leading-tight text-cocoa-900 sm:text-xs">
        {item.itemName}
      </span>
    </motion.button>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Success panel — CTA to finish + replay
   ════════════════════════════════════════════════════════════════════ */

function SuccessPanel({
  target,
  onComplete,
  onPlayAgain,
}: {
  target: ColorChoice
  onComplete?: () => void
  onPlayAgain: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded-2xl border-4 p-4 text-center shadow-pop sm:p-5"
      style={{
        borderColor: target.hex,
        backgroundImage: `linear-gradient(180deg, ${target.hex}18 0%, var(--color-cream-50) 100%)`,
      }}
    >
      <div
        className="mx-auto inline-flex items-center gap-2 rounded-full border-2 bg-cream-50 px-3 py-1 text-sm font-bold shadow-soft"
        style={{ borderColor: target.hex, color: target.hex }}
      >
        <Sparkles className="size-4" />
        +1 Tinh thể Tri thức
      </div>
      <p className="mt-3 px-1 text-sm leading-relaxed text-cocoa-800">
        Dòng thác đã nhận lại sắc{' '}
        <strong style={{ color: target.hex }}>{target.name.toLowerCase()}</strong>{' '}
        từ đồ vật bé chọn. Cùng tiếp tục đánh thức cả khu rừng nhé!
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <motion.button
          type="button"
          onClick={onComplete}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
        >
          <Zap className="size-4" />
          Hoàn thành nhiệm vụ
        </motion.button>
        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
        >
          <RotateCcw className="size-4" />
          Chơi màu mới
        </button>
      </div>
    </motion.section>
  )
}

import { forwardRef, useMemo, useRef, useState } from 'react'
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  type PanInfo,
} from 'framer-motion'
import { RotateCcw, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'

/* ════════════════════════════════════════════════════════════════════
   LeafShapeMatchGame
   ────────────────────────────────────────────────────────────────────
   Mini-game for Node 4 of Rừng Kỳ Diệu (Ghép Lá Rừng). Drag-and-drop
   shape matching: 3 hollow leaf-shaped targets on the LEFT (each with
   a circle / triangle / star cutout) and 3 textured leaf pieces on the
   RIGHT that fit them.

   Mechanics:
     • Pieces use framer-motion `drag` with `dragConstraints` (whole
       game area) and `dragElastic` so they tug back slightly past the
       edges. `dragMomentum={false}` keeps the drop point honest.
     • On dragEnd, distance between piece centre and its MATCHING
       target centre is measured (getBoundingClientRect). Within
       SNAP_THRESHOLD the piece springs onto the target via
       `animate(motionValue, …)`; otherwise it springs back to origin.
     • Wrong-target drops never snap — only the matching pair counts.
     • All 3 snapped → VictoryOverlay (particle burst + "Nhiệm vụ
       Hoàn thành" card with onComplete CTA).
   ════════════════════════════════════════════════════════════════════ */

type Shape = 'circle' | 'triangle' | 'star'

interface LeafShapeMatchGameProps {
  onComplete?: () => void
}

interface PuzzlePair {
  id: Shape
  label: string
  pieceGradId: string
  /** Stem accent — also the piece's badge stroke colour. */
  accent: string
}

const PAIRS: PuzzlePair[] = [
  { id: 'circle',   label: 'Lá Tròn',   pieceGradId: 'lsm-grad-circle',   accent: '#4d7c0f' },
  { id: 'triangle', label: 'Lá Nhọn',   pieceGradId: 'lsm-grad-triangle', accent: '#15803d' },
  { id: 'star',     label: 'Lá Ngôi Sao', pieceGradId: 'lsm-grad-star',  accent: '#047857' },
]

/** Centre-to-centre px distance under which a piece snaps to its target. */
const SNAP_THRESHOLD = 70

export function LeafShapeMatchGame({ onComplete }: LeafShapeMatchGameProps) {
  const { play } = useSound()

  const [snapped, setSnapped] = useState<Set<Shape>>(() => new Set())
  const [flashId, setFlashId] = useState<Shape | null>(null)

  // Refs:
  //   gameContainerRef → passed as `dragConstraints` so pieces can't be
  //     yanked off the card entirely
  //   targetRefs      → measured on dragEnd to compute the snap delta
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const targetRefs = useRef<Record<Shape, HTMLDivElement | null>>({
    circle: null,
    triangle: null,
    star: null,
  })

  const allDone = snapped.size === PAIRS.length

  const handleSnapped = (id: Shape) => {
    play('correct')
    setSnapped((prev) => {
      const next = new Set(prev)
      next.add(id)
      // Defer the final win-sound until React has flushed the state;
      // otherwise it fires before the snapping spring animation begins
      // and the audio feels disconnected from the visual.
      if (next.size >= PAIRS.length) {
        window.setTimeout(() => play('win'), 420)
      }
      return next
    })
    setFlashId(id)
    window.setTimeout(() => setFlashId(null), 700)
  }

  const handleReset = () => {
    setSnapped(new Set())
    setFlashId(null)
  }

  return (
    <div ref={gameContainerRef} className="relative">
      {/* Shared SVG gradient defs — sprite-style so each piece can `url(#id)`. */}
      <LeafGradientDefs />

      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {/* ─── LEFT: targets ─── */}
        <div>
          <PanelLabel
            eyebrow="Khuôn lá"
            title="Thả vào đúng khuôn"
            tone="cocoa"
          />
          <div className="mt-3 flex flex-col items-center gap-3 sm:gap-4">
            {PAIRS.map((pair) => (
              <Target
                key={pair.id}
                ref={(el) => {
                  targetRefs.current[pair.id] = el
                }}
                pair={pair}
                snapped={snapped.has(pair.id)}
                flashing={flashId === pair.id}
              />
            ))}
          </div>
        </div>

        {/* ─── RIGHT: draggable pieces ─── */}
        <div>
          <PanelLabel
            eyebrow="Bộ lá rừng"
            title="Kéo từng chiếc lá"
            tone="sage"
          />
          <div className="mt-3 flex flex-col items-center gap-3 sm:gap-4">
            {PAIRS.map((pair) => (
              <DraggablePiece
                key={pair.id}
                pair={pair}
                snapped={snapped.has(pair.id)}
                gameContainerRef={gameContainerRef}
                getTargetEl={() => targetRefs.current[pair.id]}
                onSnap={() => handleSnapped(pair.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {allDone && (
          <VictoryOverlay
            key="victory"
            onComplete={onComplete}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Panel header — tiny eyebrow + title, two tone variants
   ════════════════════════════════════════════════════════════════════ */

function PanelLabel({
  eyebrow,
  title,
  tone,
}: {
  eyebrow: string
  title: string
  tone: 'cocoa' | 'sage'
}) {
  return (
    <div className="text-center">
      <p
        className={cn(
          'text-[10px] font-bold uppercase tracking-[0.3em]',
          tone === 'sage' ? 'text-sage-500' : 'text-cocoa-700/70',
        )}
      >
        {eyebrow}
      </p>
      <h3 className="mt-0.5 font-display text-sm font-bold text-cocoa-900">
        {title}
      </h3>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Target — hollow leaf outline with a dashed shape cutout inside
   ════════════════════════════════════════════════════════════════════ */

interface TargetProps {
  pair: PuzzlePair
  snapped: boolean
  flashing: boolean
}

const Target = forwardRef<HTMLDivElement, TargetProps>(function Target(
  { pair, snapped, flashing },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative grid size-24 place-items-center rounded-3xl border-2 border-dashed transition-colors sm:size-28',
        snapped
          ? 'border-sage-400 bg-sage-100/70'
          : 'border-sage-300/70 bg-cream-50/60',
      )}
      aria-label={`Khuôn lá ${pair.label}`}
    >
      <LeafSilhouette shape={pair.id} faded={snapped} />

      {/* Snap flash — bright pulse the moment a piece locks into place. */}
      <AnimatePresence>
        {flashing && (
          <motion.span
            key="flash"
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.15, 1.05] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              background:
                'radial-gradient(circle, rgba(253, 224, 71, 0.85) 0%, rgba(132, 204, 22, 0.4) 50%, transparent 75%)',
              boxShadow:
                '0 0 18px rgba(253, 224, 71, 0.85), 0 0 32px rgba(132, 204, 22, 0.6)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Caption underneath */}
      <span
        className={cn(
          'absolute -bottom-5 whitespace-nowrap rounded-full border bg-cream-50/95 px-2 py-0.5 text-[10px] font-bold shadow-soft transition-colors',
          snapped
            ? 'border-sage-300 text-sage-600'
            : 'border-cream-200 text-cocoa-700/70',
        )}
      >
        {pair.label}
      </span>
    </div>
  )
})

/* ════════════════════════════════════════════════════════════════════
   Draggable piece — leaf with the matching shape baked in, framer drag
   ════════════════════════════════════════════════════════════════════ */

interface DraggablePieceProps {
  pair: PuzzlePair
  snapped: boolean
  gameContainerRef: React.RefObject<HTMLElement | null>
  /** Late-bound target lookup — refs aren't filled at component mount. */
  getTargetEl: () => HTMLElement | null
  onSnap: () => void
}

function DraggablePiece({
  pair,
  snapped,
  gameContainerRef,
  getTargetEl,
  onSnap,
}: DraggablePieceProps) {
  // Motion values control the transform directly. Drag mutates them
  // live; on release we either spring them onto the target (snap) or
  // spring them back to (0, 0).
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const pieceRef = useRef<HTMLDivElement>(null)

  const springBack = () => {
    animate(x, 0, { type: 'spring', stiffness: 320, damping: 26 })
    animate(y, 0, { type: 'spring', stiffness: 320, damping: 26 })
  }

  const snapTo = (dx: number, dy: number) => {
    // Add the centre delta to the CURRENT motion values — that's the
    // offset that places the piece's centre on the target's centre,
    // regardless of where the drag started.
    animate(x, x.get() + dx, { type: 'spring', stiffness: 280, damping: 22 })
    animate(y, y.get() + dy, { type: 'spring', stiffness: 280, damping: 22 })
  }

  const handleDragEnd = (_e: unknown, _info: PanInfo) => {
    if (snapped) return
    const target = getTargetEl()
    const piece = pieceRef.current
    if (!target || !piece) {
      springBack()
      return
    }
    const t = target.getBoundingClientRect()
    const p = piece.getBoundingClientRect()
    const dx = t.left + t.width / 2 - (p.left + p.width / 2)
    const dy = t.top + t.height / 2 - (p.top + p.height / 2)
    const dist = Math.hypot(dx, dy)

    if (dist < SNAP_THRESHOLD) {
      snapTo(dx, dy)
      onSnap()
    } else {
      springBack()
    }
  }

  return (
    <motion.div
      ref={pieceRef}
      drag={!snapped}
      dragConstraints={gameContainerRef}
      dragElastic={0.18}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      whileHover={snapped ? undefined : { scale: 1.05 }}
      whileDrag={{ scale: 1.12, zIndex: 50 }}
      style={{
        x,
        y,
        // Snapped pieces stay above other pieces but below the drag
        // target zone so a still-in-flight piece can pass over them.
        zIndex: snapped ? 20 : 10,
      }}
      className={cn(
        'relative grid size-24 place-items-center rounded-3xl sm:size-28',
        snapped
          ? 'cursor-default'
          : 'cursor-grab touch-none select-none active:cursor-grabbing',
      )}
      aria-label={`Mảnh ${pair.label}`}
      data-snapped={snapped || undefined}
    >
      {/* Subtle plate so the piece reads as a "tile" even before drag. */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-3xl border-2 transition-opacity',
          snapped
            ? 'opacity-0'
            : 'border-cream-200 bg-cream-50 shadow-soft',
        )}
      />
      <LeafPiece shape={pair.id} pair={pair} />
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SVG art — shared defs + outline silhouette + filled piece
   ════════════════════════════════════════════════════════════════════ */

/** A single leaf body path reused by both silhouette and piece. */
const LEAF_PATH =
  'M 50 6 C 80 18 92 46 80 78 C 72 100 60 114 50 114 C 40 114 28 100 20 78 C 8 46 20 18 50 6 Z'

/** A vertical vein hint drawn on the piece. */
const LEAF_VEIN = 'M 50 10 L 50 110'

/** 5-pointed star polygon centred on the leaf. */
const STAR_POINTS =
  '50,40 55.9,55.9 72.8,56.6 59.5,67.1 64.1,83.4 50,74 35.9,83.4 40.5,67.1 27.2,56.6 44.1,55.9'

function LeafGradientDefs() {
  return (
    <svg className="pointer-events-none absolute size-0" aria-hidden>
      <defs>
        <linearGradient id="lsm-grad-circle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bef264" />
          <stop offset="100%" stopColor="#4d7c0f" />
        </linearGradient>
        <linearGradient id="lsm-grad-triangle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="lsm-grad-star" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** Hollow leaf outline + dashed shape cutout. Fades when matched. */
function LeafSilhouette({ shape, faded }: { shape: Shape; faded: boolean }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className={cn(
        'h-20 w-auto transition-opacity sm:h-24',
        faded ? 'opacity-30' : 'opacity-100',
      )}
      aria-hidden
    >
      <path
        d={LEAF_PATH}
        fill="none"
        stroke="#7d8c52"
        strokeWidth={2.2}
        strokeDasharray="5 3"
        strokeLinejoin="round"
      />
      <InnerShape
        shape={shape}
        stroke="#8b9f6a"
        strokeWidth={2}
        strokeDasharray="3 2"
        fill="none"
      />
    </svg>
  )
}

/** Filled, textured leaf — the draggable piece. */
function LeafPiece({ shape, pair }: { shape: Shape; pair: PuzzlePair }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className="h-20 w-auto sm:h-24"
      aria-hidden
      style={{ filter: 'drop-shadow(0 4px 6px rgba(60, 90, 30, 0.35))' }}
    >
      <path
        d={LEAF_PATH}
        fill={`url(#${pair.pieceGradId})`}
        stroke={pair.accent}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Central vein for "textured" feel */}
      <path
        d={LEAF_VEIN}
        stroke={pair.accent}
        strokeWidth={1.2}
        strokeOpacity={0.55}
        strokeLinecap="round"
      />
      {/* Two side veins per a typical leaf — pure decoration. */}
      <path
        d="M 50 36 Q 30 46 22 64"
        fill="none"
        stroke={pair.accent}
        strokeWidth={0.9}
        strokeOpacity={0.4}
        strokeLinecap="round"
      />
      <path
        d="M 50 36 Q 70 46 78 64"
        fill="none"
        stroke={pair.accent}
        strokeWidth={0.9}
        strokeOpacity={0.4}
        strokeLinecap="round"
      />

      {/* The matching geometric shape — cream-filled badge with the
          accent stroke, sized to nest into the silhouette's cutout. */}
      <InnerShape
        shape={shape}
        fill="#fefce8"
        stroke={pair.accent}
        strokeWidth={2.2}
      />
    </svg>
  )
}

/** Renders one of circle / triangle / star with the supplied paint. */
function InnerShape({
  shape,
  fill = 'none',
  stroke,
  strokeWidth,
  strokeDasharray,
}: {
  shape: Shape
  fill?: string
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
}) {
  if (shape === 'circle') {
    return (
      <circle
        cx={50}
        cy={62}
        r={20}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
    )
  }
  if (shape === 'triangle') {
    return (
      <polygon
        points="50,40 28,82 72,82"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
      />
    )
  }
  // star
  return (
    <polygon
      points={STAR_POINTS}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      strokeLinejoin="round"
    />
  )
}

/* ════════════════════════════════════════════════════════════════════
   Victory overlay — particle burst + "Nhiệm vụ Hoàn thành" card
   ════════════════════════════════════════════════════════════════════ */

function VictoryOverlay({
  onComplete,
  onReset,
}: {
  onComplete?: () => void
  onReset: () => void
}) {
  // Particle seeds — leaves + sparkles erupting from centre. Memoised
  // so re-renders don't reshuffle a still-playing burst.
  const particles = useMemo(() => buildVictoryParticles(18), [])
  return (
    <motion.div
      key="victory"
      role="dialog"
      aria-modal="true"
      aria-label="Nhiệm vụ hoàn thành"
      className="absolute inset-0 z-40 grid place-items-center rounded-2xl bg-cream-50/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Particle layer — sits behind the card, free-flying. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute select-none"
            style={{
              left: '50%',
              top: '50%',
              fontSize: p.size,
              color: p.color,
              filter:
                'drop-shadow(0 0 8px rgba(253, 224, 71, 0.75)) drop-shadow(0 2px 3px rgba(0,0,0,0.2))',
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
            animate={{
              x: p.dx,
              y: p.dy,
              scale: [0, 1.2, 1, 0.8],
              opacity: [0, 1, 1, 0],
              rotate: p.rotate,
            }}
            transition={{
              duration: 1.6,
              delay: p.delay,
              ease: 'easeOut',
            }}
          >
            {p.glyph}
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        className="relative w-[88%] max-w-sm overflow-hidden rounded-[2rem] border-4 border-amber-300 bg-cream-50 p-6 text-center shadow-pop"
        style={{
          backgroundImage: `
            radial-gradient(60% 70% at 50% 0%, rgba(253, 224, 71, 0.45) 0%, transparent 70%),
            radial-gradient(60% 70% at 50% 110%, rgba(132, 204, 22, 0.35) 0%, transparent 70%),
            linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-butter-50) 100%)
          `,
        }}
      >
        <motion.span
          aria-hidden
          className="block select-none text-6xl"
          animate={{ scale: [1, 1.18, 1], rotate: [-6, 6, -6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          🌿
        </motion.span>

        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
          Nhiệm vụ Hoàn thành
        </p>
        <h3 className="mt-1 font-display text-xl font-bold leading-snug text-cocoa-900">
          Thảm thực vật đã hồi sinh!
        </h3>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-amber-400 bg-cream-50 px-3 py-1 text-sm font-bold text-amber-600 shadow-soft">
          <Sparkles className="size-4 fill-amber-300 stroke-amber-500" />
          +1 Tinh thể Tri thức
        </div>

        <p className="mt-3 px-1 text-sm leading-relaxed text-cocoa-800">
          Cả 3 chiếc lá đã về đúng khuôn — Cây Cổ Thụ rất tự hào về bé!
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
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
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
          >
            <RotateCcw className="size-4" />
            Chơi lại
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface VictoryParticle {
  id: number
  glyph: string
  size: number
  color: string
  /** Final X offset from origin (px). */
  dx: number
  /** Final Y offset from origin (px). */
  dy: number
  rotate: number
  delay: number
}

function buildVictoryParticles(count: number): VictoryParticle[] {
  const glyphs = ['🍃', '✨', '⭐', '🌿']
  const colors = ['#4d7c0f', '#15803d', '#facc15', '#fbbf24']
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const radius = 110 + Math.random() * 80
    return {
      id: i,
      glyph: glyphs[i % glyphs.length],
      size: 18 + Math.random() * 14,
      color: colors[i % colors.length],
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius,
      rotate: -120 + Math.random() * 240,
      delay: Math.random() * 0.25,
    }
  })
}

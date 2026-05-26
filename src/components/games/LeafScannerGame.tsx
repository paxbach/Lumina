import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  Check,
  RotateCcw,
  ScanLine,
  Sparkles,
  Zap,
} from 'lucide-react'
import { cn } from '@/utils/cn'

/* ════════════════════════════════════════════════════════════════════
   LeafScannerGame
   ────────────────────────────────────────────────────────────────────
   Mini-game for Node 1 of Rừng Kỳ Diệu (Cây Cổ Thụ Tri Thức). Simulates
   an AI camera scanning a real-world leaf in three phases:

     intro     → Lumi briefs the kid, "Bật Camera" CTA pulses.
     scanning  → 3-second progress bar + scan line + emerald particles
                 inside a viewport framed by neon corner brackets.
     success   → bounding box reveal "[Leaf: 98% Confidence]", magical
                 radial burst, illustrated letter "A" growing on a tree
                 branch, "+1 Tinh thể Tri thức" badge.

   Self-contained: no router or store coupling. Parent (ForestGamePage)
   wires `onComplete` to write the reward / complete the sub-node.
   ════════════════════════════════════════════════════════════════════ */

const SCAN_DURATION_MS = 3000
/** Tick interval for the scanning progress — 60 fps-ish for smoothness. */
const SCAN_TICK_MS = 50

type Phase = 'intro' | 'scanning' | 'success'

interface LeafScannerGameProps {
  /**
   * Fired when the kid taps "Hoàn thành nhiệm vụ" on the success view.
   * Parent decides side-effects (completeSubNode, addCrystals, nav…).
   */
  onComplete?: () => void
}

export function LeafScannerGame({ onComplete }: LeafScannerGameProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [scanProgress, setScanProgress] = useState(0)
  // Stable seed for the particle field so the random positions don't
  // re-shuffle every re-render while scanning is in-flight.
  const particles = useMemo(() => buildParticles(18), [])

  // Scanning ticker — advances `scanProgress` from 0 → 1 over
  // SCAN_DURATION_MS, then flips to the success phase. Cleans itself
  // up on unmount or phase change.
  useEffect(() => {
    if (phase !== 'scanning') return
    const startedAt = performance.now()
    const id = window.setInterval(() => {
      const elapsed = performance.now() - startedAt
      const ratio = Math.min(1, elapsed / SCAN_DURATION_MS)
      setScanProgress(ratio)
      if (ratio >= 1) {
        window.clearInterval(id)
        setPhase('success')
      }
    }, SCAN_TICK_MS)
    return () => window.clearInterval(id)
  }, [phase])

  const handleStart = () => {
    setScanProgress(0)
    setPhase('scanning')
  }

  const handleRetry = () => {
    setScanProgress(0)
    setPhase('intro')
  }

  return (
    <div className="space-y-5">
      <CameraViewport phase={phase} progress={scanProgress} particles={particles} />

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPanel key="intro" onStart={handleStart} />
        )}
        {phase === 'scanning' && (
          <ScanningPanel key="scan" progress={scanProgress} />
        )}
        {phase === 'success' && (
          <SuccessPanel
            key="success"
            onComplete={onComplete}
            onRetry={handleRetry}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Camera viewport — aspect-video, neon corner brackets, phase overlays
   ════════════════════════════════════════════════════════════════════ */

interface CameraViewportProps {
  phase: Phase
  progress: number
  particles: ParticleSeed[]
}

function CameraViewport({ phase, progress, particles }: CameraViewportProps) {
  return (
    <div
      // aspect-video keeps a clean 16:9 cinematic feel; rounded-3xl +
      // ring-1 hint at a viewfinder rather than a flat preview box.
      className="relative aspect-video w-full overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 shadow-pop ring-1 ring-emerald-400/20"
    >
      {/* Faint scanline grid texture so the "live" viewport reads as
          an AR/AI camera HUD rather than an empty card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(16, 185, 129, 0.18) 0 1px, transparent 1px 4px)',
        }}
      />

      {/* Centered emoji "subject" — a dim leaf in idle/scanning, brightens
          in success so the bounding box has something visible to frame. */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-7xl sm:text-8xl"
        animate={{
          opacity: phase === 'success' ? 1 : 0.55,
          scale: phase === 'scanning' ? [1, 1.05, 1] : 1,
          filter:
            phase === 'success'
              ? 'drop-shadow(0 0 18px rgba(52, 211, 153, 0.85))'
              : 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.45))',
        }}
        transition={{
          opacity: { duration: 0.4 },
          scale:   { duration: 1.6, repeat: phase === 'scanning' ? Infinity : 0, ease: 'easeInOut' },
        }}
      >
        🍃
      </motion.span>

      <CornerBrackets active={phase !== 'intro'} />

      {/* Phase-specific layers ───────────────────────────────── */}
      <AnimatePresence>
        {phase === 'scanning' && <ScanLineSweep key="line" />}
        {phase === 'scanning' && (
          <ParticleField key="particles" particles={particles} />
        )}
        {phase === 'scanning' && <ProcessingChip key="processing" />}
        {phase === 'scanning' && <ScanProgressBar key="bar" progress={progress} />}

        {phase === 'success' && <SuccessBurst key="burst" />}
        {phase === 'success' && <DetectionBoundingBox key="bbox" />}
      </AnimatePresence>

      {/* Idle chip — visible only at intro so the viewport doesn't look
          frozen / broken before the kid taps start. */}
      {phase === 'intro' && <IdleChip />}
    </div>
  )
}

/* ── Corner brackets ─────────────────────────────────────────────── */

interface CornerBracketsProps {
  /** Pulse the brackets while the camera is active. */
  active: boolean
}

function CornerBrackets({ active }: CornerBracketsProps) {
  // Each corner is an L-shape made of two borders on a 28px × 28px box.
  // Positioned with inset utilities + targeted border classes so SVG
  // isn't needed.
  const cornerBase =
    'absolute size-7 sm:size-9 border-emerald-400 [filter:drop-shadow(0_0_6px_rgba(52,211,153,0.85))]'
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-3"
      animate={{
        opacity: active ? [0.85, 1, 0.85] : 0.85,
      }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span className={cn(cornerBase, 'left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-md')} />
      <span className={cn(cornerBase, 'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-md')} />
      <span className={cn(cornerBase, 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md')} />
      <span className={cn(cornerBase, 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md')} />
    </motion.div>
  )
}

/* ── Scan line + particles + chips during scanning ───────────────── */

function ScanLineSweep() {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-x-3 h-[2px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent"
      style={{
        boxShadow: '0 0 14px rgba(52, 211, 153, 0.85), 0 0 28px rgba(52, 211, 153, 0.45)',
      }}
      initial={{ top: '12%' }}
      animate={{ top: ['12%', '88%', '12%'] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      exit={{ opacity: 0 }}
    />
  )
}

interface ParticleSeed {
  id: number
  /** % of viewport width */
  x: number
  /** initial % of viewport height */
  y: number
  /** seconds until first emission */
  delay: number
  /** seconds for one rise cycle */
  duration: number
  /** px size of the particle dot */
  size: number
}

function buildParticles(count: number): ParticleSeed[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 6 + Math.random() * 88,
    y: 60 + Math.random() * 35,
    delay: Math.random() * 1.4,
    duration: 1.6 + Math.random() * 1.4,
    size: 3 + Math.random() * 4,
  }))
}

function ParticleField({ particles }: { particles: ParticleSeed[] }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-emerald-300"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            boxShadow: '0 0 8px rgba(52, 211, 153, 0.9), 0 0 14px rgba(167, 243, 208, 0.55)',
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -120, opacity: [0, 1, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  )
}

function ProcessingChip() {
  return (
    <motion.div
      aria-hidden
      className="absolute left-1/2 top-4 z-10 -translate-x-1/2"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-slate-900/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.5)] backdrop-blur">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        >
          <ScanLine className="size-3.5" />
        </motion.span>
        Processing…
      </div>
    </motion.div>
  )
}

function ScanProgressBar({ progress }: { progress: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-4 bottom-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-950/70 ring-1 ring-emerald-400/40">
        <div
          className="h-full rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-1 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-300/90">
        AI Scan · {Math.round(progress * 100)}%
      </p>
    </motion.div>
  )
}

function IdleChip() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-900/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300/90 backdrop-blur">
        <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]" />
        Camera ready
      </div>
    </div>
  )
}

/* ── Success layers: bounding box + radial burst ─────────────────── */

function DetectionBoundingBox() {
  return (
    <motion.div
      aria-hidden
      // Boxed around the centered leaf emoji. Sized as % of viewport so
      // it scales with the aspect-video container.
      className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ width: '46%', height: '62%' }}
      initial={{ opacity: 0, scale: 1.25 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
    >
      <div
        className="absolute inset-0 rounded-md border-2 border-emerald-400"
        style={{ boxShadow: '0 0 18px rgba(52, 211, 153, 0.8), inset 0 0 12px rgba(52, 211, 153, 0.25)' }}
      />
      <div className="absolute -top-7 left-0 inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-900 shadow-[0_0_14px_rgba(52,211,153,0.85)]">
        <Check className="size-3.5" strokeWidth={3} />
        Leaf: 98% Confidence
      </div>
    </motion.div>
  )
}

function SuccessBurst() {
  // 12 radial rays + a soft white flash. Pure motion overlays — no SVG
  // needed for this scale.
  const rays = Array.from({ length: 12 }, (_, i) => i)
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.span
        className="absolute size-32 rounded-full bg-emerald-300/35 blur-2xl"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 2.6, opacity: [0, 0.9, 0] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {rays.map((i) => (
        <motion.span
          key={i}
          className="absolute h-px w-32 origin-left bg-gradient-to-r from-emerald-200 to-transparent"
          style={{ rotate: `${(360 / rays.length) * i}deg` }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.04 * i }}
        />
      ))}
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase panels — what sits BELOW the viewport per phase
   ════════════════════════════════════════════════════════════════════ */

function IntroPanel({ onStart }: { onStart: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="space-y-4"
    >
      {/* Lumi speech card — emoji avatar + speech bubble. Bubble has a
          left-pointing tail so it reads as Lumi talking. */}
      <div className="flex items-start gap-3">
        <motion.span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-sage-300 bg-sage-100 text-3xl shadow-soft"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          🐾
        </motion.span>
        <div className="relative flex-1 rounded-2xl border-2 border-sage-200 bg-cream-50 p-4 shadow-soft">
          <span
            aria-hidden
            className="absolute -left-2 top-5 size-3 rotate-45 border-b-2 border-l-2 border-sage-200 bg-cream-50"
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sage-500">
            Lumi nói
          </p>
          <p className="mt-1 font-display text-base font-bold leading-snug text-cocoa-900">
            Bé hãy tìm một chiếc lá cây thật và đưa trước camera nhé!
          </p>
        </div>
      </div>

      {/* Pulse CTA — gentle, infinite breath until the kid commits. */}
      <div className="flex justify-center">
        <motion.button
          type="button"
          onClick={onStart}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          animate={{ boxShadow: [
            '0 0 0 0 rgba(52, 211, 153, 0.55)',
            '0 0 0 14px rgba(52, 211, 153, 0)',
          ] }}
          transition={{
            boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeOut' },
          }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 px-7 py-3 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
        >
          <Camera className="size-5" />
          Bật Camera
        </motion.button>
      </div>
    </motion.section>
  )
}

function ScanningPanel({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100)
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">
            Đang phân tích lá…
          </p>
          <span className="font-display text-sm font-bold tabular-nums text-emerald-700">
            {pct}%
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
          <motion.div
            className="h-full rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ ease: 'linear', duration: SCAN_TICK_MS / 1000 }}
          />
        </div>
        <p className="mt-2 text-xs text-cocoa-700/80">
          Lumi đang quét gân lá, màu sắc và hình dáng để tìm Linh Hồn Lá Cây…
        </p>
      </div>
    </motion.section>
  )
}

function SuccessPanel({
  onComplete,
  onRetry,
}: {
  onComplete?: () => void
  onRetry: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="space-y-5"
    >
      {/* Tree branch with the unlocked letter "A" — illustrated SVG.
          Branch is brown, two pastel leaves frame the letter, the letter
          itself is golden butter inside a glowing emerald circle so it
          reads as the "knowledge crystal" reward visually. */}
      <div className="grid place-items-center rounded-3xl border-4 border-butter-300 bg-gradient-to-b from-cream-50 to-butter-100 p-5 shadow-pop">
        <LetterRevealIllustration letter="A" />

        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 18 }}
          className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-emerald-400 bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700 shadow-soft"
        >
          <Sparkles className="size-4 fill-emerald-300 stroke-emerald-600" />
          +1 Tinh thể Tri thức
        </motion.div>

        <p className="mt-3 max-w-prose text-center text-sm leading-relaxed text-cocoa-800">
          <strong className="font-display text-cocoa-900">Tuyệt vời!</strong>{' '}
          Cây Cổ Thụ đã mở khoá chữ cái{' '}
          <span className="font-display font-bold text-butter-500">A</span> từ
          chiếc lá bé vừa quét. Cùng tiếp tục đánh thức cả khu rừng nhé!
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
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
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
        >
          <RotateCcw className="size-4" />
          Quét lại
        </button>
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Letter-on-branch illustration
   ════════════════════════════════════════════════════════════════════ */

function LetterRevealIllustration({ letter }: { letter: string }) {
  const branchRef = useRef<SVGPathElement | null>(null)
  const [branchLen, setBranchLen] = useState(0)

  // Measure the path length once mounted so we can stroke-draw it.
  useEffect(() => {
    const node = branchRef.current
    if (!node) return
    setBranchLen(node.getTotalLength())
  }, [])

  return (
    <div className="relative">
      <svg viewBox="0 0 220 220" className="size-44 sm:size-48" aria-hidden>
        <defs>
          <radialGradient id="leaf-orb-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="60%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
          <linearGradient id="leaf-branch-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#7c4f2c" />
            <stop offset="100%" stopColor="#a3744c" />
          </linearGradient>
        </defs>

        {/* Branch — sweeps from bottom up to the orb anchor. Stroke-
            dashoffset animates from full → 0 so it appears to "grow". */}
        <motion.path
          ref={branchRef}
          d="M 110 215 C 100 180 130 150 110 110"
          fill="none"
          stroke="url(#leaf-branch-gradient)"
          strokeWidth={9}
          strokeLinecap="round"
          initial={{ strokeDasharray: branchLen, strokeDashoffset: branchLen }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />

        {/* Two leaves sprouting from the branch. Drawn as simple
            asymmetric ellipses for a hand-illustrated feel. */}
        <motion.ellipse
          cx="80" cy="170" rx="18" ry="9" fill="#86efac"
          transform="rotate(-35 80 170)"
          initial={{ scale: 0, opacity: 0, originX: '80px', originY: '170px' }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 240, damping: 18 }}
        />
        <motion.ellipse
          cx="138" cy="148" rx="16" ry="8" fill="#4ade80"
          transform="rotate(28 138 148)"
          initial={{ scale: 0, opacity: 0, originX: '138px', originY: '148px' }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.75, type: 'spring', stiffness: 240, damping: 18 }}
        />

        {/* Glow halo around the orb */}
        <motion.circle
          cx="110" cy="80" r="48"
          fill="#bbf7d0" opacity="0.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ delay: 0.9, duration: 0.5, ease: 'easeOut' }}
        />

        {/* Orb */}
        <motion.circle
          cx="110" cy="80" r="32"
          fill="url(#leaf-orb-gradient)"
          stroke="#047857" strokeWidth={2.5}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.0, type: 'spring', stiffness: 220, damping: 16 }}
          style={{ filter: 'drop-shadow(0 6px 14px rgba(4, 120, 87, 0.4))' }}
        />

        {/* Letter — pops in last with a small overshoot, then settles. */}
        <motion.text
          x="110" y="80"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="ui-rounded, 'Baloo 2', system-ui, sans-serif"
          fontWeight={900}
          fontSize="36"
          fill="#fffbeb"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.25, 1], opacity: 1 }}
          transition={{ delay: 1.25, duration: 0.5, ease: 'easeOut' }}
          style={{ transformOrigin: '110px 80px' }}
        >
          {letter}
        </motion.text>
      </svg>

      {/* Floating sparkles around the orb to amplify the reveal moment. */}
      <FloatingSparkles />
    </div>
  )
}

function FloatingSparkles() {
  const spots = [
    { top: '8%',  left: '12%', delay: 1.3, size: 14 },
    { top: '4%',  left: '70%', delay: 1.45, size: 18 },
    { top: '30%', left: '85%', delay: 1.6, size: 12 },
    { top: '54%', left: '6%',  delay: 1.55, size: 16 },
  ]
  return (
    <>
      {spots.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute text-butter-400"
          style={{ top: s.top, left: s.left, fontSize: s.size }}
          initial={{ opacity: 0, scale: 0, rotate: -30 }}
          animate={{ opacity: [0, 1, 0.7], scale: [0, 1.1, 1], rotate: 0 }}
          transition={{ delay: s.delay, duration: 0.9, ease: 'easeOut' }}
        >
          ✨
        </motion.span>
      ))}
    </>
  )
}

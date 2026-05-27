import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
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
   Mini-game for Node 1 of Rừng Kỳ Diệu (Cây Cổ Thụ Tri Thức). Drives
   a real camera stream through three phases:

     intro     → Lumi briefs the kid, "Bật Camera" CTA pulses. Camera
                 is OFF (no `getUserMedia` call yet — we wait for a
                 user gesture both for the prompt and for browser
                 autoplay policies).
     scanning  → `getUserMedia({ facingMode: 'environment' })` lights
                 up the rear camera; the live feed renders inside the
                 viewport, framed by 4 neon corner brackets and swept
                 by a vertical scanning beam. After exactly 3.5 s the
                 phase flips to 'success' (simulated CV match for the
                 demo — keeps the flow deterministic with no ML deps).
     success   → camera tracks are released immediately (camera light
                 OFF). Magical flash, leaf emoji burst from the centre,
                 then a celebratory modal pops with "+100 EXP". Behind
                 the modal the existing letter / crystal reveal still
                 plays for richness.

   Safety: tracks are stopped on unmount, on "Quay về", and on retry —
   so the hardware indicator NEVER stays lit longer than the actual
   scan. Errors (permission denied, no camera) fall back to a friendly
   prompt instead of crashing.
   ════════════════════════════════════════════════════════════════════ */

const SCAN_DURATION_MS = 3500
/** Tick interval for the scanning progress — 60 fps-ish for smoothness. */
const SCAN_TICK_MS = 50

type Phase = 'intro' | 'scanning' | 'success'

interface LeafScannerGameProps {
  /**
   * Fired when the kid taps "Hoàn thành nhiệm vụ" on the success view.
   * Parent decides side-effects (completeSubNode, addCrystals, nav…).
   * The component already stops the camera before invoking this, so
   * the parent doesn't have to worry about lingering tracks.
   */
  onComplete?: () => void
  /**
   * Optional "Quay về" handler — wired by the parent route. We always
   * tear down the camera before delegating so the hardware indicator
   * dies even if the parent navigates away asynchronously.
   */
  onExit?: () => void
}

export function LeafScannerGame({ onComplete, onExit }: LeafScannerGameProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [scanProgress, setScanProgress] = useState(0)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  // Modal pops the moment we hit success; dismissing reveals the
  // existing rich SuccessPanel (letter illustration + crystal) below.
  const [modalOpen, setModalOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Stable seed for the particle field so the random positions don't
  // re-shuffle every re-render while scanning is in-flight.
  const particles = useMemo(() => buildParticles(18), [])

  /** Tears down the live MediaStream + clears the <video> srcObject.
   *  Idempotent: safe to call from multiple lifecycle hooks. */
  const stopCamera = useCallback(() => {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      // Detach so the <video> stops painting the last frame as a
      // ghost while the browser releases the device handle.
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }, [])

  // Hardware safety net — stop tracks if the component unmounts mid-scan
  // (route change, parent re-key, hot reload). Without this the
  // hardware camera light can stay on until the tab is closed.
  useEffect(() => () => stopCamera(), [stopCamera])

  // Scanning ticker — advances `scanProgress` from 0 → 1 over
  // SCAN_DURATION_MS, then flips to the success phase + releases the
  // camera + opens the celebration modal in a single tick.
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
        setModalOpen(true)
        // Release the camera the instant the demo "match" fires.
        // The success view is fully synthetic, no live feed needed.
        stopCamera()
      }
    }, SCAN_TICK_MS)
    return () => window.clearInterval(id)
  }, [phase, stopCamera])

  const handleStart = async () => {
    setCameraError(null)
    // Guard against environments without a camera (SSR, headless tests,
    // older browsers) so the click handler never throws into the void.
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Trình duyệt không hỗ trợ camera. Bé thử mở app trên Chrome hoặc Safari mới nhé!',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      // Attach + play in the same gesture frame so autoplay-without-
      // user-activation policies don't reject the .play() promise on
      // Safari / iOS.
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        try {
          await video.play()
        } catch {
          // Some Android WebViews resolve play() asynchronously even after
          // a gesture. The frame already appears — silently ignore.
        }
      }
      setIsCameraActive(true)
      setScanProgress(0)
      setPhase('scanning')
    } catch (err) {
      // Map the most common DOMException names to kid-friendly copy.
      const name = (err as DOMException | null)?.name ?? ''
      const msg =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Bé chưa cho phép camera. Hãy bấm "Cho phép" ở thanh trình duyệt rồi thử lại nhé.'
          : name === 'NotFoundError' || name === 'DevicesNotFoundError'
            ? 'Không tìm thấy camera nào trên thiết bị của bé.'
            : 'Có lỗi khi mở camera — bé thử lại sau một chút nhé!'
      setCameraError(msg)
    }
  }

  const handleRetry = () => {
    // Hard reset: stop tracks, wipe modal + progress, fall back to intro.
    stopCamera()
    setScanProgress(0)
    setModalOpen(false)
    setCameraError(null)
    setPhase('intro')
  }

  const handleComplete = () => {
    // Defensive — should already be stopped on success transition, but
    // call again so a rare race can't leak a track.
    stopCamera()
    onComplete?.()
  }

  const handleExit = () => {
    stopCamera()
    onExit?.()
  }

  return (
    <div className="space-y-5">
      <CameraViewport
        phase={phase}
        progress={scanProgress}
        particles={particles}
        videoRef={videoRef}
        isCameraActive={isCameraActive}
      />

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPanel
            key="intro"
            onStart={handleStart}
            onExit={onExit ? handleExit : undefined}
            error={cameraError}
          />
        )}
        {phase === 'scanning' && (
          <ScanningPanel key="scan" progress={scanProgress} />
        )}
        {phase === 'success' && (
          <SuccessPanel
            key="success"
            onComplete={handleComplete}
            onRetry={handleRetry}
          />
        )}
      </AnimatePresence>

      {/* Page-level celebration overlay — popped the instant the
          phase flips to 'success', dismissed by tapping its CTA which
          reveals the SuccessPanel underneath. */}
      <CompletionDialog
        open={modalOpen}
        onContinue={() => setModalOpen(false)}
      />
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
  videoRef: React.RefObject<HTMLVideoElement | null>
  isCameraActive: boolean
}

function CameraViewport({
  phase,
  progress,
  particles,
  videoRef,
  isCameraActive,
}: CameraViewportProps) {
  return (
    <div
      // aspect-video keeps a clean 16:9 cinematic feel; rounded-3xl +
      // ring-1 hint at a viewfinder rather than a flat preview box.
      className="relative aspect-video w-full overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 shadow-pop ring-1 ring-emerald-400/20"
    >
      {/* ── Live camera stream ─────────────────────────────────────
          Always mounted so the videoRef survives across phase changes
          (intro → scanning → success). Visibility toggles via opacity
          to keep the element in the DOM — re-mounting on every retry
          would force a new <video> node and re-trigger autoplay
          policies on Safari. */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn(
          'absolute inset-0 size-full object-cover transition-opacity duration-300',
          isCameraActive ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Faint scanline grid texture so the "live" viewport reads as
          an AR/AI camera HUD rather than an empty card. Sits ABOVE the
          video so even the real camera feed gets the futuristic HUD vibe. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(16, 185, 129, 0.18) 0 1px, transparent 1px 4px)',
        }}
      />

      {/* Centered emoji "subject" — visible at intro (placeholder) and
          on success (frames the bounding box). Hidden during scanning
          because the real camera feed has taken over the viewport. */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-7xl sm:text-8xl"
        animate={{
          opacity:
            phase === 'success' ? 1 : isCameraActive ? 0 : 0.55,
          scale: 1,
          filter:
            phase === 'success'
              ? 'drop-shadow(0 0 18px rgba(52, 211, 153, 0.85))'
              : 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.45))',
        }}
        transition={{ opacity: { duration: 0.4 } }}
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

        {phase === 'success' && <MagicalFlash key="flash" />}
        {phase === 'success' && <SuccessBurst key="burst" />}
        {phase === 'success' && <LeafEmojiBurst key="leaves" />}
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
    <>
      {/* Wide glowing band that sits BEHIND the hairline laser to give
          the impression of a soft volumetric beam grazing the leaf.
          `mix-blend-screen` blends green into the live camera frame so
          the AR effect reads as light, not as a flat overlay. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent"
        style={{
          mixBlendMode: 'screen',
          filter: 'blur(2px)',
        }}
        initial={{ top: '-12%' }}
        animate={{ top: ['-12%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        exit={{ opacity: 0 }}
      />
      {/* Hairline laser — one-way infinite sweep top → bottom, snapping
          back to the top each cycle. Matches the spec's
          `y: ['0%', '100%']` pattern. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 h-[2px] bg-gradient-to-r from-transparent via-emerald-200 to-transparent"
        style={{
          boxShadow:
            '0 0 14px rgba(52, 211, 153, 0.95), 0 0 28px rgba(52, 211, 153, 0.55), 0 0 48px rgba(52, 211, 153, 0.25)',
        }}
        initial={{ top: '0%' }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        exit={{ opacity: 0 }}
      />
    </>
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

function IntroPanel({
  onStart,
  onExit,
  error,
}: {
  onStart: () => void
  onExit?: () => void
  error: string | null
}) {
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

      {/* Error toast — surfaces when getUserMedia rejects (permission,
          no device, unsupported browser). Inline next to the CTA so the
          kid sees both at once and can retry without scrolling. */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="camera-error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="alert"
            className="flex items-start gap-2 rounded-2xl border-2 border-peach-300 bg-peach-50 p-3 text-sm text-peach-700 shadow-soft"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Pulse CTA — gentle, infinite breath until the kid commits. */}
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

        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2.5 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
          >
            <ArrowLeft className="size-4" />
            Quay về
          </button>
        )}
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
      {/* Lumi speech card — dialogue per spec while scanning. Uses the
          same avatar + bubble tail style as IntroPanel so the kid reads
          it as a continuation of the same companion. */}
      <div className="flex items-start gap-3">
        <motion.span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-emerald-300 bg-emerald-100 text-3xl shadow-soft"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          🐾
        </motion.span>
        <div className="relative flex-1 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-soft">
          <span
            aria-hidden
            className="absolute -left-2 top-5 size-3 rotate-45 border-b-2 border-l-2 border-emerald-300 bg-emerald-50"
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">
            Lumi đang quét
          </p>
          <p className="mt-1 font-display text-base font-bold leading-snug text-cocoa-900">
            Lumi đang tìm kiếm linh hồn lá cây... Bé giữ yên lá nhé! 🌿
          </p>
        </div>
      </div>

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

/* ════════════════════════════════════════════════════════════════════
   Success overlays — magical flash, leaf burst, celebration dialog
   ────────────────────────────────────────────────────────────────────
   These three components all mount on the same frame the phase flips
   to 'success' but are sequenced via per-element `transition.delay` so
   the kid sees a clean choreography:

     0.00 s  flash bloom (white → transparent, ~0.7 s)
     0.10 s  leaf cluster bursts outward from the centre
     0.25 s  completion modal slides in over the viewport

   None of them take props beyond an open flag — they are pure
   presentational layers that the parent toggles by phase state.
   ════════════════════════════════════════════════════════════════════ */

/** Full-viewport white flash — covers the viewport then fades to clear
 *  so the success transition reads as a camera capture moment. */
function MagicalFlash() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.95, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, times: [0, 0.2, 1], ease: 'easeOut' }}
    />
  )
}

interface LeafBurstSeed {
  glyph: string
  angle: number    // radians
  distance: number // px from centre at peak
  duration: number // seconds for one full arc
  delay: number    // stagger for each emoji
  size: number     // font-size px
  rotate: number   // final rotation degrees
}

/**
 * Cluster of 🍃 ✨ ⭐ bursting from the centre of the viewport in
 * radial trajectories. Physics-y feel via Framer Motion's keyframe
 * arrays (offset peaks then drifts down with fade) — no real physics
 * engine needed, this is purely a celebration moment, not gameplay.
 */
function LeafEmojiBurst() {
  // 18 emojis spread evenly around 360° with a touch of jitter on
  // distance/duration so the burst doesn't look mathematically regular.
  const seeds = useMemo<LeafBurstSeed[]>(() => {
    const glyphs = ['🍃', '✨', '⭐']
    const count = 18
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2
      // Deterministic per-index "random" so re-renders stay stable
      // without needing a useRef cache — sine of i is pseudo-random
      // enough for jitter at this scale.
      const j = (Math.sin(i * 12.9898) * 43758.5453) % 1
      const jitter = Math.abs(j)
      return {
        glyph: glyphs[i % glyphs.length],
        angle,
        distance: 120 + jitter * 90,
        duration: 1.3 + jitter * 0.7,
        delay: 0.1 + (i % 6) * 0.04,
        size: 22 + (i % 3) * 6,
        rotate: (jitter - 0.5) * 720,
      }
    })
  }, [])

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-visible"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {seeds.map((s, i) => {
        const dx = Math.cos(s.angle) * s.distance
        const dy = Math.sin(s.angle) * s.distance
        return (
          <motion.span
            key={i}
            className="absolute select-none leading-none"
            style={{
              fontSize: s.size,
              // Gentle drop-shadow so the dark camera viewport reads
              // the white sparkle / yellow star edges cleanly.
              filter: 'drop-shadow(0 2px 6px rgba(15, 23, 42, 0.45))',
            }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 0, rotate: 0 }}
            animate={{
              // Peak outward then sag a bit on the way out — gives the
              // emojis a "tossed upward then falling" silhouette
              // without needing real gravity sim.
              x: [0, dx, dx * 1.05],
              y: [0, dy, dy + 18],
              scale: [0.4, 1.05, 0.7],
              opacity: [0, 1, 0],
              rotate: [0, s.rotate * 0.5, s.rotate],
            }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              ease: 'easeOut',
            }}
          >
            {s.glyph}
          </motion.span>
        )
      })}
    </motion.div>
  )
}

/**
 * CompletionDialog — page-level celebration modal. Opens the instant
 * the phase flips to 'success'; dismissing with "Tiếp tục khám phá"
 * reveals the existing rich SuccessPanel underneath.
 */
function CompletionDialog({
  open,
  onContinue,
}: {
  open: boolean
  onContinue: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="completion-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Hoàn thành quét lá"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.7, y: 30, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.25rem] border-4 border-emerald-300 bg-cream-50 p-6 text-center shadow-pop sm:p-7"
            style={{
              backgroundImage: `
                radial-gradient(60% 70% at 50% 0%, rgba(167, 243, 208, 0.55) 0%, transparent 70%),
                radial-gradient(60% 70% at 50% 110%, rgba(190, 242, 100, 0.4) 0%, transparent 70%),
                linear-gradient(180deg, var(--color-cream-50) 0%, #ecfdf5 100%)
              `,
            }}
          >
            {/* Hero leaf with a slow rotate so it feels alive. */}
            <motion.span
              aria-hidden
              className="block select-none text-6xl"
              animate={{ rotate: [-8, 8, -8], y: [0, -4, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: 'drop-shadow(0 0 14px rgba(52, 211, 153, 0.7))' }}
            >
              🌿
            </motion.span>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-300 bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 shadow-soft">
              <Sparkles className="size-3.5 fill-emerald-300 stroke-emerald-600" />
              Thành tựu mới
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold leading-snug text-cocoa-900">
              Thành công!
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-cocoa-700">
              Linh hồn lá cây đã thức tỉnh{' '}
              <span className="font-display font-bold text-emerald-600">
                Cây Cổ Thụ Tri Thức
              </span>
              ! 🎉
            </p>

            {/* +100 EXP reward chip — animated glow so the eye lands here
                first when the modal pops. */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                delay: 0.25,
                type: 'spring',
                stiffness: 240,
                damping: 16,
              }}
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border-[3px] border-butter-400 bg-gradient-to-br from-butter-200 to-butter-300 px-5 py-2 font-display text-lg font-bold text-cocoa-900 shadow-pop"
              style={{ boxShadow: '0 0 18px rgba(245, 200, 80, 0.55)' }}
            >
              <Zap className="size-5 fill-butter-500 stroke-butter-500" />
              +100 EXP
            </motion.div>

            <motion.button
              type="button"
              onClick={onContinue}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              className="mt-6 inline-flex items-center gap-2 rounded-full border-[3px] border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            >
              Tiếp tục khám phá
              <Sparkles className="size-4" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Sparkles helper for the LetterRevealIllustration above ────────── */

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

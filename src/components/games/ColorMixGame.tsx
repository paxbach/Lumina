import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  BookHeart,
  Camera,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useSound } from '@/hooks/useSound'
import { cn } from '@/utils/cn'
import { springBouncy, springSoft } from '@/utils/motion'

/* ════════════════════════════════════════════════════════════════════
   ColorMixGame — "Trộn Màu Ánh Sáng" / Space Light AR Filter
   ────────────────────────────────────────────────────────────────────
   3-phase mini-game where the kid mixes additive RGB light to match a
   target colour, then takes a selfie bathed in that "space light":

     mix     → Neon glassmorphism mixer console. Three sliders (R/G/B
               0..100) drive a glowing orb. When all three channels
               land within TOLERANCE of the target, a bright flash
               overlay fires and we request the front camera.
     camera  → Front-facing live feed with a CSS overlay that uses
               mix-blend-mode multiply to bathe the kid in the mixed
               colour. Shutter button captures the frame onto a hidden
               canvas, bakes the SAME colour in via globalComposite
               so the JPEG keeps the lighting, then releases tracks.
     review  → Indigo sci-fi polaroid with the captured JPEG + the
               "Check-in cùng Ánh Sáng [Tên Màu]! 🚀" caption.
               "Lưu vào Nhật Ký" writes to BOTH the spec-named
               localStorage key (`lumina_family_album`) AND the
               in-app diary store so the photo also surfaces in
               FamilyPage's scrapbook.

   Camera safety: stream tracks stopped on capture, on retake-from-
   review, on cancel-from-camera, AND in the unmount cleanup useEffect
   — the hardware indicator never lingers past the active phase.
   ════════════════════════════════════════════════════════════════════ */

type Phase = 'mix' | 'camera' | 'review'

interface RGB {
  r: number
  g: number
  b: number
}

interface Target {
  id: string
  name: string
  rgb: RGB
  /** Kid-friendly hint shown if they tap "Gợi ý". */
  hint: string
}

const TARGETS: Target[] = [
  {
    id: 'yellow',
    name: 'Vàng',
    rgb: { r: 100, g: 100, b: 0 },
    hint: 'Đèn ĐỎ + đèn XANH LÁ = ánh sáng Vàng.',
  },
  {
    id: 'magenta',
    name: 'Hồng Tím',
    rgb: { r: 100, g: 0, b: 100 },
    hint: 'Đèn ĐỎ + đèn XANH DƯƠNG = ánh sáng Hồng Tím.',
  },
  {
    id: 'cyan',
    name: 'Xanh Ngọc',
    rgb: { r: 0, g: 100, b: 100 },
    hint: 'Đèn XANH LÁ + đèn XANH DƯƠNG = Xanh Ngọc.',
  },
  {
    id: 'white',
    name: 'Trắng',
    rgb: { r: 100, g: 100, b: 100 },
    hint: 'Bật cả ba đèn lên cao nhất để có ánh sáng Trắng.',
  },
]

/** Per-channel tolerance (out of 0..100). 22 keeps the flow forgiving
 *  for small fingers without letting any mix pass. */
const TOLERANCE = 22

/** localStorage key shared with ShapeHunterMission so both AR mini-
 *  games append to the same family album. */
const ALBUM_STORAGE_KEY = 'lumina_family_album'

/** Cap capture width to keep base64 string ~50–80 KB per entry. */
const CAPTURE_MAX_WIDTH = 720

interface AlbumEntry {
  image: string
  timestamp: number
  shapeName: string
}

interface ColorMixGameProps {
  /** Called once per session the kid completes the full mix → save
   *  flow (parent awards crystals + completes the sub-node). */
  onComplete?: () => void
}

function isMatch(v: RGB, t: RGB): boolean {
  return (
    Math.abs(v.r - t.r) <= TOLERANCE &&
    Math.abs(v.g - t.g) <= TOLERANCE &&
    Math.abs(v.b - t.b) <= TOLERANCE
  )
}

/** RGB (0..100) → CSS `rgb(r, g, b)` (0..255) string. */
function toCss({ r, g, b }: RGB): string {
  const k = 2.55
  return `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`
}

function pickTarget(exclude?: Target): Target {
  const pool = exclude ? TARGETS.filter((t) => t.id !== exclude.id) : TARGETS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function ColorMixGame({ onComplete }: ColorMixGameProps) {
  const { play } = useSound()
  const saveMemory = useAppStore((s) => s.saveMemory)

  const [phase, setPhase] = useState<Phase>('mix')
  const [target, setTarget] = useState<Target>(() => pickTarget())
  const [mix, setMix] = useState<RGB>({ r: 30, g: 30, b: 30 })
  /** Latched true once a frame matches; gates auto-advance + sliders. */
  const [locked, setLocked] = useState(false)
  /** Mounts the white flash overlay between match and camera open. */
  const [flashing, setFlashing] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  /** Crystals/sub-node should be credited ONLY on the first save in a
   *  session. Replays after that are pure fun. */
  const creditedRef = useRef(false)

  /* ── Camera teardown — idempotent, called from many code paths. ── */
  const stopCamera = useCallback(() => {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  // When phase → 'camera', the <video> remounts; attach the
  // already-acquired stream once the element is in the DOM.
  useEffect(() => {
    if (phase !== 'camera') return
    const stream = streamRef.current
    const video = videoRef.current
    if (!stream || !video) return
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    video.play().catch(() => {
      /* Safari/iOS sometimes rejects play() even after a gesture;
       * the frame still appears, so silent ignore. */
    })
  }, [phase])

  // Auto-detect a match → flash → request camera → advance phase.
  // The dependency list intentionally excludes `mix` so we only run
  // when the boolean output `locked` flips, not on every drag tick.
  useEffect(() => {
    if (phase !== 'mix' || !isMatch(mix, target.rgb) || locked) return
    play('correct')
    setLocked(true)
    // Hold the matched state visible for ~600 ms so the kid sees the
    // ✓, THEN flash, THEN ask for camera.
    const flashId = window.setTimeout(() => setFlashing(true), 600)
    const openId = window.setTimeout(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error('unsupported'), {
            name: 'NotSupportedError',
          })
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        streamRef.current = stream
        setPhase('camera')
        setFlashing(false)
      } catch (err) {
        // Permission/no device — drop the flash, unlock the sliders,
        // surface a kid-friendly toast so they can try again.
        setFlashing(false)
        setLocked(false)
        const name = (err as DOMException | null)?.name ?? ''
        setCameraError(
          name === 'NotAllowedError' || name === 'PermissionDeniedError'
            ? 'Bé chưa cho phép camera. Mở "Cho phép" rồi trộn lại nhé.'
            : name === 'NotFoundError' || name === 'DevicesNotFoundError'
              ? 'Không tìm thấy camera trên thiết bị của bé.'
              : name === 'NotSupportedError'
                ? 'Trình duyệt chưa hỗ trợ camera.'
                : 'Có lỗi khi mở camera — thử lại sau nhé.',
        )
      }
    }, 1100)
    return () => {
      window.clearTimeout(flashId)
      window.clearTimeout(openId)
    }
  }, [phase, mix, target.rgb, locked, play])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const srcW = video.videoWidth
    const srcH = video.videoHeight
    if (srcW === 0 || srcH === 0) return

    const scale = Math.min(1, CAPTURE_MAX_WIDTH / srcW)
    const w = Math.round(srcW * scale)
    const h = Math.round(srcH * scale)
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1. Paint the live frame.
    ctx.drawImage(video, 0, 0, w, h)

    // 2. Bake the mixed colour in. `multiply` keeps shadows + highlights
    //    intact while pushing the hue across the whole image — matches
    //    the CSS mix-blend-mode the user sees in the live preview.
    //    globalAlpha softens the wash so faces don't blow out.
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.45
    ctx.fillStyle = toCss(mix)
    ctx.fillRect(0, 0, w, h)
    // 3. Reset before extracting so future fills aren't tinted.
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    // Release the camera the second we have the frame — no reason to
    // keep the hardware lit through review.
    stopCamera()
    setPhase('review')
    play('pop')
  }

  const handleRetakePhoto = () => {
    // Retake from review → straight back to camera with a fresh stream.
    setCapturedImage(null)
    setCameraError(null)
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        streamRef.current = stream
        setPhase('camera')
      } catch {
        // Fall back to the mix phase so the kid isn't stuck.
        setPhase('mix')
        setLocked(false)
      }
    })()
  }

  const handleCancelCamera = () => {
    stopCamera()
    setLocked(false)
    setPhase('mix')
  }

  const handleSave = () => {
    if (!capturedImage) return

    // 1. localStorage album per spec.
    let album: AlbumEntry[] = []
    try {
      const raw = window.localStorage.getItem(ALBUM_STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) album = parsed as AlbumEntry[]
      }
    } catch {
      album = []
    }
    album.push({
      image: capturedImage,
      timestamp: Date.now(),
      shapeName: `Ánh Sáng ${target.name}`,
    })
    try {
      window.localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(album))
    } catch {
      /* Quota — silently continue so the in-app diary save below still
       * fires and the kid still sees confirmation. */
    }

    // 2. In-app diary so the photo surfaces in FamilyPage too.
    saveMemory({
      imagePath: capturedImage,
      questTitle: `Check-in Ánh Sáng ${target.name}`,
      regionId: 'thanh-pho-thong-minh',
    })

    // 3. Credit parent (crystals + sub-node) once per session.
    if (!creditedRef.current) {
      creditedRef.current = true
      onComplete?.()
    }

    // 4. Toast then loop back to mix phase with a fresh target so the
    //    kid can hunt the next colour. The parent route handles "Quay
    //    về" via the header back button.
    setSavedToast(true)
    window.setTimeout(() => {
      setSavedToast(false)
      setTarget(pickTarget(target))
      setMix({ r: 30, g: 30, b: 30 })
      setLocked(false)
      setCapturedImage(null)
      setShowHint(false)
      setPhase('mix')
    }, 1700)
    play('win')
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border-2 border-indigo-900/60 bg-slate-950 shadow-pop"
      style={{
        // Subtle starfield wash so the dark slate doesn't read as a
        // flat panel — extra galaxy vibe for "Space Light".
        backgroundImage: `
          radial-gradient(60% 60% at 20% 10%, rgba(99, 102, 241, 0.18) 0%, transparent 65%),
          radial-gradient(40% 40% at 90% 90%, rgba(168, 85, 247, 0.15) 0%, transparent 65%),
          linear-gradient(180deg, #020617 0%, #0f172a 100%)
        `,
      }}
    >
      <AnimatePresence mode="wait">
        {phase === 'mix' && (
          <MixPhase
            key="mix"
            target={target}
            mix={mix}
            onMixChange={setMix}
            locked={locked}
            showHint={showHint}
            onToggleHint={() => setShowHint((h) => !h)}
            cameraError={cameraError}
            onDismissError={() => setCameraError(null)}
          />
        )}
        {phase === 'camera' && (
          <CameraPhase
            key="camera"
            target={target}
            mixCss={toCss(mix)}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onCapture={handleCapture}
            onCancel={handleCancelCamera}
          />
        )}
        {phase === 'review' && capturedImage && (
          <ReviewPhase
            key="review"
            target={target}
            mixCss={toCss(mix)}
            image={capturedImage}
            onRetake={handleRetakePhoto}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* White flash bridging mix → camera. Lives at the game level
          (not inside MixPhase) so it can outlast the phase change. */}
      <AnimatePresence>
        {flashing && (
          <motion.div
            key="flash"
            aria-hidden
            className="pointer-events-none absolute inset-0 z-50 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <SavedToast open={savedToast} />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 1 — Neon mixer console
   ════════════════════════════════════════════════════════════════════ */

interface MixPhaseProps {
  target: Target
  mix: RGB
  onMixChange: (next: RGB) => void
  locked: boolean
  showHint: boolean
  onToggleHint: () => void
  cameraError: string | null
  onDismissError: () => void
}

function MixPhase({
  target,
  mix,
  onMixChange,
  locked,
  showHint,
  onToggleHint,
  cameraError,
  onDismissError,
}: MixPhaseProps) {
  const mixCss = toCss(mix)
  const targetCss = toCss(target.rgb)
  const matched = isMatch(mix, target.rgb)

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={springSoft}
      className="space-y-6 px-5 py-6 sm:px-7 sm:py-8"
    >
      {/* ── Glass dashboard panel ──────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-indigo-300">
              Trộn Ánh Sáng
            </p>
            <h2 className="font-display text-lg font-bold leading-snug text-white sm:text-xl">
              Tạo ra{' '}
              <span style={{ color: targetCss, textShadow: `0 0 14px ${targetCss}` }}>
                Ánh Sáng {target.name}
              </span>
            </h2>
          </div>
          {matched && (
            <motion.span
              key="locked-chip"
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={springBouncy}
              className="inline-flex items-center gap-1 rounded-full border-2 border-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-200"
              style={{ boxShadow: '0 0 14px rgba(52,211,153,0.55)' }}
            >
              <Check className="size-3" strokeWidth={3} />
              Khoá
            </motion.span>
          )}
        </div>

        {/* Orbs */}
        <div className="mt-5 grid grid-cols-2 items-center justify-items-center gap-4 sm:gap-8">
          <GlowOrb label="Mục tiêu" color={targetCss} pulsing />
          <GlowOrb
            label="Đèn Của Bé"
            color={mixCss}
            highlight={matched}
            name={matched ? '✓ Khớp rồi!' : ' '}
          />
        </div>

        {/* Sliders */}
        <div
          className={cn(
            'mt-6 space-y-4 transition-opacity',
            locked && 'pointer-events-none opacity-60',
          )}
        >
          <NeonSlider
            label="Đèn Đỏ"
            color="#ef4444"
            value={mix.r}
            onChange={(r) => onMixChange({ ...mix, r })}
          />
          <NeonSlider
            label="Đèn Xanh Lá"
            color="#22c55e"
            value={mix.g}
            onChange={(g) => onMixChange({ ...mix, g })}
          />
          <NeonSlider
            label="Đèn Xanh Dương"
            color="#3b82f6"
            value={mix.b}
            onChange={(b) => onMixChange({ ...mix, b })}
          />
        </div>

        {/* Hint + tip strip */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggleHint}
            disabled={locked}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/50 bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-100 backdrop-blur hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="size-3.5" />
            {showHint ? 'Ẩn gợi ý' : 'Gợi ý'}
          </button>
          <p className="text-[11px] font-medium text-indigo-200/80">
            Khi 3 đèn khớp, Lumi sẽ tự bật camera ✨
          </p>
        </div>

        <AnimatePresence>
          {showHint && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-3 rounded-2xl border border-indigo-400/40 bg-indigo-500/15 px-3 py-2 text-xs leading-relaxed text-indigo-100"
            >
              {target.hint}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cameraError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-2xl border-2 border-rose-400/70 bg-rose-500/15 p-3 text-xs text-rose-100"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{cameraError}</span>
              <button
                type="button"
                onClick={onDismissError}
                className="font-bold text-rose-200 hover:text-white"
                aria-label="Đóng cảnh báo"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

/** Big glowing orb — `box-shadow` carries 95% of the visual weight so
 *  the orb reads as a light source bleeding into the dark panel. */
function GlowOrb({
  label,
  color,
  pulsing,
  highlight,
  name,
}: {
  label: string
  color: string
  pulsing?: boolean
  highlight?: boolean
  name?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-200/80">
        {label}
      </p>
      <motion.div
        className={cn(
          'relative grid size-24 place-items-center rounded-full border-2 sm:size-28',
          highlight ? 'border-emerald-300' : 'border-white/30',
        )}
        style={{
          backgroundColor: color,
          boxShadow: `0 0 28px 4px ${color}, 0 0 60px 10px ${color}`,
        }}
        animate={
          pulsing
            ? { scale: [1, 1.06, 1] }
            : highlight
              ? { scale: [1, 1.12, 1] }
              : undefined
        }
        transition={
          pulsing
            ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.5 }
        }
      >
        {/* Glossy top highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-3 size-5 rounded-full bg-white/55 blur-sm"
        />
      </motion.div>
      <p className="font-display text-xs font-bold text-white/85 sm:text-sm">
        {name ?? ''}
      </p>
    </div>
  )
}

/* ── Neon slider ─────────────────────────────────────────────────────
   Native <input type="range"> with a Tailwind-arbitrary-selector tile
   for cross-browser thumb styling. The track is painted via inline
   CSS gradient with a hard stop at `value%` so the filled portion
   glows in the channel colour and the unfilled portion stays slate.
   ──────────────────────────────────────────────────────────────────── */

function NeonSlider({
  label,
  color,
  value,
  onChange,
}: {
  label: string
  color: string
  value: number
  onChange: (v: number) => void
}) {
  const handle = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(Number(e.target.value))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.25em]">
        <span style={{ color, textShadow: `0 0 8px ${color}` }}>{label}</span>
        <span className="font-display tabular-nums text-white/85">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={handle}
        aria-label={label}
        className={cn(
          'h-3 w-full cursor-pointer appearance-none rounded-full outline-none',
          // WebKit thumb
          '[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2',
          '[&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-white',
          '[&::-webkit-slider-thumb]:shadow-lg',
          // Firefox thumb
          '[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white',
          '[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer',
          // Focus ring
          'focus-visible:ring-4 focus-visible:ring-white/20',
        )}
        style={{
          // Hard-stop linear gradient: filled portion = neon channel
          // colour, unfilled = slate-700. Box-shadow gives the track a
          // glow proportional to fill (no glow at 0).
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgb(30, 41, 59) ${value}%, rgb(30, 41, 59) 100%)`,
          boxShadow:
            value > 0
              ? `0 0 ${4 + value * 0.16}px ${color}, inset 0 0 4px rgba(0,0,0,0.45)`
              : 'inset 0 0 4px rgba(0,0,0,0.45)',
        }}
      />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 2 — AR lighting camera
   ════════════════════════════════════════════════════════════════════ */

interface CameraPhaseProps {
  target: Target
  mixCss: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onCapture: () => void
  onCancel: () => void
}

function CameraPhase({
  target,
  mixCss,
  videoRef,
  canvasRef,
  onCapture,
  onCancel,
}: CameraPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3 px-4 py-5 sm:px-6"
    >
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border-4 border-indigo-700 bg-slate-950 shadow-pop sm:aspect-video sm:max-w-2xl">
        {/* Live front-facing camera. mirror via `transform: scaleX(-1)`
            so the kid sees themselves the way they'd see a mirror. */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 size-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* AR colour overlay — pure CSS mix-blend so the kid sees
            themselves bathed in the mixed light. multiply darkens
            shadows + saturates colour for a clear visible effect on
            any skin tone. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: mixCss,
            mixBlendMode: 'multiply',
            opacity: 0.5,
          }}
        />

        {/* Soft top + bottom scrims so chrome text reads against any
            colour wash. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/85 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/85 to-transparent"
        />

        {/* Top chrome */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur hover:bg-white/25"
          >
            <ArrowLeft className="size-3.5" />
            Trộn lại
          </button>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white backdrop-blur"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: mixCss, boxShadow: `0 0 8px ${mixCss}` }}
            />
            Ánh sáng {target.name}
          </span>
        </div>

        {/* Shutter */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-center px-4 pb-5 pt-10">
          <motion.button
            type="button"
            onClick={onCapture}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              boxShadow: [
                `0 0 0 0 ${mixCss}`,
                `0 0 0 20px rgba(0,0,0,0)`,
              ],
            }}
            transition={{
              boxShadow: { duration: 1.5, repeat: Infinity, ease: 'easeOut' },
            }}
            aria-label="Chụp ảnh"
            className="grid place-items-center rounded-full border-4 border-white shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            style={{
              width: 78,
              height: 78,
              background: `radial-gradient(circle at 30% 30%, ${mixCss}, #1e1b4b)`,
            }}
          >
            <span className="grid size-14 place-items-center rounded-full border-2 border-white/40 bg-white/95 text-indigo-700 shadow-inner sm:size-16">
              <Camera className="size-6 sm:size-7" strokeWidth={2.4} />
            </span>
          </motion.button>
        </div>

        {/* Hidden canvas — sized at capture time. */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      <p className="text-center text-xs text-indigo-200/85">
        Đưa mặt bé vào khung và chụp một check-in dưới ánh sáng{' '}
        <span style={{ color: mixCss, textShadow: `0 0 6px ${mixCss}` }}>
          {target.name}
        </span>
        !
      </p>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 3 — Sci-fi polaroid review
   ════════════════════════════════════════════════════════════════════ */

interface ReviewPhaseProps {
  target: Target
  mixCss: string
  image: string
  onRetake: () => void
  onSave: () => void
}

function ReviewPhase({
  target,
  mixCss,
  image,
  onRetake,
  onSave,
}: ReviewPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={springBouncy}
      className="space-y-5 px-5 py-6 sm:px-7 sm:py-8"
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        {/* Sci-fi polaroid — indigo border, deep space backdrop, gentle
            scale-in. Caption strip carries the [Tên Màu] copy. */}
        <motion.div
          className="relative w-full max-w-sm overflow-hidden rounded-xl border-4 border-indigo-500 bg-slate-900 p-3 pb-12 shadow-2xl"
          initial={{ rotate: -4, y: 24, opacity: 0 }}
          animate={{ rotate: 2, y: 0, opacity: 1 }}
          transition={{ ...springBouncy, delay: 0.05 }}
          style={{
            boxShadow: `0 0 24px ${mixCss}, 0 0 50px rgba(99, 102, 241, 0.45)`,
          }}
        >
          <div className="overflow-hidden rounded-lg bg-black">
            <img
              src={image}
              alt={`Check-in cùng ánh sáng ${target.name}`}
              className="block aspect-square w-full object-cover"
            />
          </div>

          {/* Caption strip — pinned to the polaroid bottom strip area. */}
          <p
            className="absolute inset-x-3 bottom-3 text-center font-display text-sm font-bold text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
          >
            Check-in cùng Ánh Sáng{' '}
            <span style={{ color: mixCss, textShadow: `0 0 8px ${mixCss}` }}>
              {target.name}
            </span>
            ! 🚀
          </p>

          {/* Tiny corner mounts to sell the "sci-fi frame" feel */}
          {[
            'left-1 top-1',
            'right-1 top-1',
            'left-1 bottom-9',
            'right-1 bottom-9',
          ].map((pos) => (
            <span
              key={pos}
              aria-hidden
              className={cn(
                'pointer-events-none absolute size-1.5 rounded-full bg-indigo-300',
                pos,
              )}
              style={{ boxShadow: '0 0 6px rgba(165,180,252,0.95)' }}
            />
          ))}
        </motion.div>

        <p className="text-center text-sm text-indigo-100">
          Tuyệt vời! Bé đã check-in dưới{' '}
          <span style={{ color: mixCss, textShadow: `0 0 6px ${mixCss}` }}>
            Ánh sáng {target.name}
          </span>
          . Lưu lại vào Nhật Ký nhé!
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            onClick={onSave}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-indigo-400 bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
            style={{
              boxShadow: '0 0 18px rgba(129, 140, 248, 0.55)',
            }}
          >
            <BookHeart className="size-4" />
            Lưu vào Nhật Ký
          </motion.button>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/30 bg-white/15 px-4 py-2 font-display text-sm font-bold text-white backdrop-blur hover:bg-white/25"
          >
            <RotateCcw className="size-4" />
            Chụp lại
          </button>
        </div>
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Saved toast — quick confirmation chip
   ════════════════════════════════════════════════════════════════════ */

function SavedToast({ open }: { open: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-4 z-50 flex justify-center"
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={springBouncy}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-300 bg-slate-900/90 px-4 py-2 font-display text-sm font-bold text-emerald-200 shadow-pop backdrop-blur"
            style={{ boxShadow: '0 0 18px rgba(52, 211, 153, 0.55)' }}
          >
            <span className="grid size-6 place-items-center rounded-full bg-emerald-400 text-slate-900">
              <Check className="size-4" strokeWidth={3} />
            </span>
            Đã lưu vào Nhật Ký Lumina!
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

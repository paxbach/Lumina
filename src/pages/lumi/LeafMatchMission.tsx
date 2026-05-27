import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookHeart,
  Camera,
  Check,
  Heart,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { LumiCharacter } from '@/components/dashboard/LumiCharacter'
import { useAppStore } from '@/store/useAppStore'
import { useSound } from '@/hooks/useSound'
import { cn } from '@/utils/cn'
import { springBouncy, springSoft } from '@/utils/motion'

/* ════════════════════════════════════════════════════════════════════
   LeafMatchMission ("Ghép Lá Rừng" — Chơi cùng Lumi)
   ────────────────────────────────────────────────────────────────────
   AR "pet feeding" mini-game. The kid points the rear camera at a
   real leaf, snaps it, and watches a glowing digital leaf 🌿 fly out
   of the photo and into Lumi's mouth — restoring her energy. The
   captured photo gets framed in a nature polaroid + saved to the
   family album.

   Phases:
     intro             → Forest welcome card with a dimmed Lumi and a
                         "Mở Camera Mật Ngữ" CTA. Camera is OFF.
     camera            → Live rear feed, central leaf-shaped reticle,
                         small Lumi avatar at the bottom waiting.
     feeding_animation → Static captured photo behind a dark scrim;
                         glowing 🌿 animates from centre into Lumi;
                         Lumi gets a halo + chime; energy bar fills.
     review            → Nature-themed polaroid (green border, leaf
                         motifs) + sticker overlay + Save/Retry.

   Save: writes to `localStorage['lumina_family_album']` AND mirrors
   into the in-app diary so the photo also surfaces in FamilyPage.

   Safety: camera tracks stopped on capture, retake, cancel, AND in
   the unmount cleanup useEffect — hardware indicator never lingers.
   ════════════════════════════════════════════════════════════════════ */

type Phase = 'intro' | 'camera' | 'feeding_animation' | 'review'

/** Energy gained per successful feed — also gets credited to the
 *  persistent store via `addLumiEnergy()` so Lumi's stat ticker on
 *  /lumi reflects the boost. Local visual bar fills from
 *  STARTING_ENERGY → 100. */
const ENERGY_GAIN = 75
const STARTING_ENERGY = 25

/** Shared family album localStorage key — matches the other 5 AR
 *  missions (ShapeHunter, ColorMix, CityBuilder, TetColorHunt,
 *  MomMeal). */
const ALBUM_STORAGE_KEY = 'lumina_family_album'

/** Cap output width so each JPEG stays ~50–80 KB. */
const CAPTURE_MAX_WIDTH = 720

interface AlbumEntry {
  image: string
  timestamp: number
  shapeName: string
}

export default function LeafMatchMission() {
  const navigate = useNavigate()
  const saveMemory = useAppStore((s) => s.saveMemory)
  const addLumiEnergy = useAppStore((s) => s.addLumiEnergy)
  const setLumiState = useAppStore((s) => s.setLumiState)
  const { play } = useSound()

  const [phase, setPhase] = useState<Phase>('intro')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  /** Local energy bar — purely visual. Starts low, fills on feed. */
  const [lumiEnergy, setLumiEnergy] = useState<number>(STARTING_ENERGY)
  /** Toggled true the moment the leaf reaches Lumi → drives the
   *  golden box-shadow glow + state-driven LumiCharacter feeding aura. */
  const [lumiGlowing, setLumiGlowing] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraContainerRef = useRef<HTMLDivElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  /* ── Camera teardown (idempotent) ──────────────────────────────── */
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

  // Attach stream when <video> remounts on entering camera phase.
  useEffect(() => {
    if (phase !== 'camera') return
    const stream = streamRef.current
    const video = videoRef.current
    if (!stream || !video) return
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    video.play().catch(() => {
      /* Safari/iOS async play() resolution — frame still appears. */
    })
  }, [phase])

  // Feeding animation choreography — declarative timeline so the
  // glow + chime + advance all live in one place.
  //
  //   t=0    : leaf spawns at centre; Framer Motion animates it to
  //            Lumi over 1.5 s (handled inside FeedingAnimationPhase).
  //   t=1500 : leaf reaches Lumi → glow on, chime plays, energy bar
  //            fills, store stat bumped, persistent Lumi state set
  //            to 'feeding' (its idle revert is handled by the store).
  //   t=3500 : advance to review so the kid sees the photo framed.
  useEffect(() => {
    if (phase !== 'feeding_animation') return
    const glowId = window.setTimeout(() => {
      setLumiGlowing(true)
      setLumiEnergy(100)
      play('win')
      addLumiEnergy(ENERGY_GAIN)
      setLumiState('feeding')
    }, 1500)
    const advanceId = window.setTimeout(() => {
      setPhase('review')
    }, 3500)
    return () => {
      window.clearTimeout(glowId)
      window.clearTimeout(advanceId)
    }
  }, [phase, play, addLumiEnergy, setLumiState])

  const handleOpenCamera = async () => {
    setCameraError(null)
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
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
      setPhase('camera')
    } catch (err) {
      const name = (err as DOMException | null)?.name ?? ''
      setCameraError(
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Bé chưa cho phép camera. Hãy bấm "Cho phép" ở thanh trình duyệt rồi thử lại nhé.'
          : name === 'NotFoundError' || name === 'DevicesNotFoundError'
            ? 'Không tìm thấy camera nào trên thiết bị của bé.'
            : 'Có lỗi khi mở camera — bé thử lại sau một chút nhé!',
      )
    }
  }

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const container = cameraContainerRef.current
    if (!video || !canvas || !container) return
    const rect = container.getBoundingClientRect()
    const viewW = rect.width
    const viewH = rect.height
    if (viewW === 0 || viewH === 0) return

    const scale = Math.min(1, CAPTURE_MAX_WIDTH / viewW)
    const w = Math.round(viewW * scale)
    const h = Math.round(viewH * scale)
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Object-cover crop replication.
    const videoW = video.videoWidth
    const videoH = video.videoHeight
    if (videoW > 0 && videoH > 0) {
      const videoAspect = videoW / videoH
      const canvasAspect = w / h
      let sx = 0
      let sy = 0
      let sw = videoW
      let sh = videoH
      if (videoAspect > canvasAspect) {
        sw = videoH * canvasAspect
        sx = (videoW - sw) / 2
      } else {
        sh = videoW / canvasAspect
        sy = (videoH - sh) / 2
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h)
    } else {
      ctx.fillStyle = '#064e3b'
      ctx.fillRect(0, 0, w, h)
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    // Release the camera the instant we have the frame — feeding +
    // review phases don't need a live feed.
    stopCamera()
    play('correct')
    setPhase('feeding_animation')
  }

  const handleRetake = async () => {
    setCapturedImage(null)
    setLumiGlowing(false)
    setLumiEnergy(STARTING_ENERGY)
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setPhase('camera')
    } catch {
      setPhase('intro')
    }
  }

  const handleCancelCamera = () => {
    stopCamera()
    setPhase('intro')
  }

  const handleSave = () => {
    if (!capturedImage) return

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
      shapeName: 'Lumi ăn lá rừng',
    })
    try {
      window.localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(album))
    } catch {
      /* Quota — silently continue so the diary save still fires. */
    }

    // Mirror into the in-app diary so the photo lands in FamilyPage.
    saveMemory({
      imagePath: capturedImage,
      questTitle: 'Lumi ăn chiếc lá đầu tiên',
      regionId: 'rung-ky-dieu',
    })

    setSavedToast(true)
    // Spec: "return to the main 'Chơi cùng Lumi' dashboard" — so we
    // navigate to /lumi rather than the world map.
    window.setTimeout(() => navigate('/lumi'), 1700)
  }

  const handleExit = () => {
    stopCamera()
    navigate('/lumi')
  }

  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500">
            Chơi cùng Lumi
          </p>
          <h1 className="text-xl font-display font-bold text-cocoa-900 sm:text-2xl">
            Ghép Lá Rừng cho Lumi
          </h1>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPhase
            key="intro"
            energy={lumiEnergy}
            error={cameraError}
            onOpenCamera={handleOpenCamera}
            onExit={handleExit}
          />
        )}
        {phase === 'camera' && (
          <CameraPhase
            key="camera"
            containerRef={cameraContainerRef}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onCapture={handleCapture}
            onCancel={handleCancelCamera}
          />
        )}
        {phase === 'feeding_animation' && capturedImage && (
          <FeedingAnimationPhase
            key="feeding"
            image={capturedImage}
            lumiEnergy={lumiEnergy}
            lumiGlowing={lumiGlowing}
          />
        )}
        {phase === 'review' && capturedImage && (
          <ReviewPhase
            key="review"
            image={capturedImage}
            onRetake={handleRetake}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <SavedToast open={savedToast} />
    </PageLayout>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 1 — Forest intro with dimmed Lumi
   ════════════════════════════════════════════════════════════════════ */

interface IntroPhaseProps {
  energy: number
  error: string | null
  onOpenCamera: () => void
  onExit: () => void
}

function IntroPhase({ energy, error, onOpenCamera, onExit }: IntroPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={springSoft}
      className="space-y-6"
    >
      {/* Dimmed Lumi in a forest glade — the brightness pinches up to
          normal once the kid feeds her in phase 3. */}
      <div className="relative mx-auto grid max-w-md place-items-center overflow-hidden rounded-3xl border-4 border-emerald-300 px-6 py-7 shadow-pop sm:py-9">
        <ForestBackdrop />

        {/* Lumi rendered at her real character size, but wrapped in a
            slight desaturate filter so she reads as "low energy". */}
        <motion.div
          className="relative z-10"
          style={{ filter: 'grayscale(0.35) brightness(0.85)' }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <LumiCharacter size={170} level={20} state="idle" />
        </motion.div>

        {/* Energy bar — sits below Lumi so the kid sees the gap they
            need to close by feeding her. */}
        <div className="relative z-10 mt-3 w-full max-w-xs">
          <EnergyBar value={energy} dim />
        </div>
      </div>

      <div
        className="mx-auto max-w-xl rounded-3xl border-4 border-emerald-300 p-5 text-center shadow-pop sm:p-6"
        style={{
          backgroundImage:
            'radial-gradient(80% 100% at 50% 0%, rgba(187, 247, 208, 0.85) 0%, transparent 70%), linear-gradient(180deg, #f0fdf4 0%, #ecfccb 100%)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">
          Sứ mệnh từ rừng
        </p>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-cocoa-900 sm:text-xl">
          Lumi đang cần{' '}
          <span className="text-emerald-600">năng lượng xanh</span>! Bé hãy
          tìm một chiếc lá cây thật và chụp ảnh để cho Lumi ăn nhé! 🍃
        </h2>
        <p className="mt-2 text-sm text-cocoa-700/85">
          Chiếc lá càng tươi, năng lượng Lumi nhận được càng nhiều ✨
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mx-auto flex max-w-xl items-start gap-2 rounded-2xl border-2 border-peach-300 bg-peach-50 p-3 text-sm text-peach-700 shadow-soft"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <motion.button
          type="button"
          onClick={onOpenCamera}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(52, 211, 153, 0.55)',
              '0 0 0 16px rgba(52, 211, 153, 0)',
            ],
          }}
          transition={{
            boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeOut' },
          }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-emerald-600 bg-gradient-to-br from-emerald-400 to-emerald-600 px-7 py-3 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
        >
          <Camera className="size-5" />
          Mở Camera Mật Ngữ
        </motion.button>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2.5 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
        >
          <ArrowLeft className="size-4" />
          Quay về
        </button>
      </div>
    </motion.section>
  )
}

/** Painted forest backdrop — gradient floor + drifting leaves around
 *  the edges. Lives under the dimmed Lumi in the intro. */
function ForestBackdrop() {
  const drift = [
    { left: '8%', top: '14%', glyph: '🍃', delay: 0, dur: 4.4 },
    { left: '82%', top: '20%', glyph: '🌿', delay: 0.8, dur: 5.2 },
    { left: '12%', top: '72%', glyph: '🌿', delay: 1.6, dur: 4.8 },
    { left: '88%', top: '78%', glyph: '🍃', delay: 2.4, dur: 5.6 },
  ] as const
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 70% at 50% 110%, #166534 0%, #14532d 50%, #052e16 100%)',
        }}
      />
      {drift.map((d, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute select-none text-2xl"
          style={{
            left: d.left,
            top: d.top,
            filter: 'drop-shadow(0 0 8px rgba(187, 247, 208, 0.55))',
          }}
          animate={{
            y: [0, -10, 0],
            rotate: [-12, 12, -12],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: d.dur,
            delay: d.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {d.glyph}
        </motion.span>
      ))}
      {/* Soft butter mist near the bottom — the "magical forest air"
          glow the brief asks for. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            'radial-gradient(50% 100% at 50% 100%, rgba(254, 240, 138, 0.55) 0%, transparent 70%)',
        }}
      />
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 2 — AR Leaf scanner
   ════════════════════════════════════════════════════════════════════ */

interface CameraPhaseProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onCapture: () => void
  onCancel: () => void
}

function CameraPhase({
  containerRef,
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
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <div
        ref={containerRef}
        className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border-4 border-emerald-500 bg-slate-950 shadow-pop sm:aspect-video sm:max-w-2xl"
        style={{
          boxShadow:
            '0 0 0 4px rgba(187, 247, 208, 0.45), 0 0 28px rgba(52, 211, 153, 0.6), inset 0 0 24px rgba(6, 78, 59, 0.45)',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 size-full object-cover"
        />

        {/* AR leaf reticle in the centre — dashed mint outline, pulsing. */}
        <LeafReticle />

        {/* Top chrome */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 bg-gradient-to-b from-slate-950/85 to-transparent px-4 pb-8 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur hover:bg-white/25"
          >
            <ArrowLeft className="size-3.5" />
            Huỷ
          </button>
          <span
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-700/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-50 backdrop-blur"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            <span aria-hidden>🍃</span>
            Tìm chiếc lá
          </span>
        </div>

        {/* Bottom chrome — eager mini-Lumi avatar on the left + big
            capture button centred. */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/85 to-transparent px-5 pb-5 pt-12">
          <WaitingLumiAvatar />

          <motion.button
            type="button"
            onClick={onCapture}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(52, 211, 153, 0.85)',
                '0 0 0 20px rgba(52, 211, 153, 0)',
              ],
            }}
            transition={{
              boxShadow: { duration: 1.4, repeat: Infinity, ease: 'easeOut' },
            }}
            aria-label="Chụp lá"
            className="grid place-items-center rounded-full border-4 border-cream-50 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            style={{
              width: 80,
              height: 80,
              background:
                'radial-gradient(circle at 30% 30%, #86efac, #047857)',
            }}
          >
            <span className="grid size-14 place-items-center rounded-full border-2 border-white/40 bg-white/95 text-emerald-700 shadow-inner sm:size-16">
              <Camera className="size-6 sm:size-7" strokeWidth={2.4} />
            </span>
          </motion.button>

          {/* Right-side filler for symmetry around the shutter. */}
          <span className="block w-12" aria-hidden />
        </div>

        {/* Hidden canvas — sized at capture time. */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      <p className="text-center text-xs text-cocoa-700/70">
        Đưa chiếc lá vào{' '}
        <span className="font-bold text-emerald-600">khung lá xanh</span> ở
        giữa rồi nhấn nút chụp nhé!
      </p>
    </motion.section>
  )
}

/** Dashed leaf-shaped outline reticle. Single SVG path drawn as a
 *  classic leaf silhouette with a centre vein, all on dashed strokes. */
function LeafReticle() {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 200 260"
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-2/3 max-w-[280px] -translate-x-1/2 -translate-y-1/2"
      animate={{
        opacity: [0.65, 1, 0.65],
        scale: [0.97, 1.03, 0.97],
      }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        filter:
          'drop-shadow(0 0 8px rgba(134, 239, 172, 0.85)) drop-shadow(0 0 18px rgba(52, 211, 153, 0.45))',
      }}
    >
      {/* Outer leaf body — almond/teardrop shape via 2 cubic curves. */}
      <path
        d="M 100 10
           C 175 50, 175 200, 100 250
           C 25 200, 25 50, 100 10
           Z"
        fill="none"
        stroke="#bbf7d0"
        strokeWidth={3}
        strokeDasharray="10 7"
        strokeLinecap="round"
      />
      {/* Central vein */}
      <line
        x1={100}
        y1={20}
        x2={100}
        y2={240}
        stroke="#bbf7d0"
        strokeWidth={2}
        strokeDasharray="6 5"
        strokeLinecap="round"
      />
      {/* Side veins — 3 pairs angled outward from the central vein. */}
      {[
        { y: 70, off: 38 },
        { y: 120, off: 56 },
        { y: 175, off: 44 },
      ].map((v, i) => (
        <g key={i}>
          <line
            x1={100}
            y1={v.y}
            x2={100 - v.off}
            y2={v.y + 12}
            stroke="#bbf7d0"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
          <line
            x1={100}
            y1={v.y}
            x2={100 + v.off}
            y2={v.y + 12}
            stroke="#bbf7d0"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
        </g>
      ))}
    </motion.svg>
  )
}

/** Small "eager Lumi" avatar that bobs while waiting for the kid to
 *  shoot. Pure decorative — no logic. Uses LumiCharacter at a tiny
 *  size so the visual identity matches the main character. */
function WaitingLumiAvatar() {
  return (
    <motion.div
      className="relative grid size-14 shrink-0 place-items-center sm:size-16"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <LumiCharacter size={56} level={20} state="idle" />
      <motion.span
        aria-hidden
        className="absolute -right-1 -top-2 select-none text-base"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 0 6px rgba(254, 240, 138, 0.95))' }}
      >
        💛
      </motion.span>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 3 — Feeding animation (the magic moment)
   ════════════════════════════════════════════════════════════════════ */

interface FeedingAnimationPhaseProps {
  image: string
  lumiEnergy: number
  lumiGlowing: boolean
}

function FeedingAnimationPhase({
  image,
  lumiEnergy,
  lumiGlowing,
}: FeedingAnimationPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border-4 border-emerald-400 shadow-pop sm:aspect-video sm:max-w-2xl">
        {/* Background — frozen captured frame */}
        <img
          src={image}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />

        {/* Dark scrim so the foreground Lumi + leaf pop. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 55%, rgba(5, 46, 22, 0.35) 0%, rgba(5, 46, 22, 0.75) 100%)',
          }}
        />

        {/* Coach line at the top */}
        <p
          className="absolute inset-x-4 top-4 z-30 text-center font-display text-sm font-bold text-emerald-100 sm:text-base"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
        >
          ✨ Lumi đang nhận năng lượng xanh từ chiếc lá!
        </p>

        {/* Lumi avatar centred at the bottom — the leaf's destination. */}
        <div className="absolute inset-x-0 bottom-6 z-20 flex flex-col items-center gap-3">
          <motion.div
            className="relative grid place-items-center rounded-full"
            // Glow halo bursts when the leaf "arrives". The spec asks
            // for `box-shadow: 0 0 30px #fef08a` — keyframed so it
            // pulses outward then settles to a steady warm ring.
            animate={
              lumiGlowing
                ? {
                    boxShadow: [
                      '0 0 0 0 rgba(254, 240, 138, 0)',
                      '0 0 60px 20px rgba(254, 240, 138, 0.95)',
                      '0 0 30px 10px rgba(254, 240, 138, 0.6)',
                    ],
                  }
                : {
                    boxShadow: '0 0 0 0 rgba(254, 240, 138, 0)',
                  }
            }
            transition={{ duration: 1.6, times: [0, 0.45, 1], ease: 'easeOut' }}
          >
            <LumiCharacter
              size={140}
              level={20}
              state={lumiGlowing ? 'feeding' : 'idle'}
            />
          </motion.div>

          {/* Energy bar — fills 25→100 over 1s once lumiGlowing flips. */}
          <div className="w-full max-w-xs px-6">
            <EnergyBar value={lumiEnergy} />
          </div>
        </div>

        {/* The magic — a glowing 🌿 leaf that travels from screen
            centre into the Lumi avatar at bottom-centre.
            Animated via `top` / `left` for the trajectory + scale
            for the size shift; opacity pulses so it fades on arrival. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute z-30 select-none text-7xl leading-none"
          initial={{
            left: '50%',
            top: '40%',
            x: '-50%',
            y: '-50%',
            scale: 1.4,
            opacity: 0,
            rotate: -10,
          }}
          animate={{
            left: '50%',
            top: ['40%', '40%', '78%'],
            scale: [1.4, 1.4, 0.5],
            opacity: [0, 1, 1, 0],
            rotate: [-10, -8, 12, 24],
          }}
          transition={{
            duration: 1.5,
            times: [0, 0.2, 0.85, 1],
            ease: 'easeIn',
          }}
          style={{
            filter:
              'drop-shadow(0 0 18px rgba(187, 247, 208, 0.95)) drop-shadow(0 0 32px rgba(74, 222, 128, 0.65))',
          }}
        >
          🌿
        </motion.span>

        {/* Sparkle trail — short-lived burst at the destination once
            the leaf arrives. */}
        {lumiGlowing && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 grid place-items-center"
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2
              const dx = Math.cos(angle) * 90
              const dy = Math.sin(angle) * 90
              return (
                <motion.span
                  key={i}
                  className="absolute select-none text-xl"
                  style={{ top: '78%', left: '50%' }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                  animate={{
                    x: dx,
                    y: dy,
                    opacity: [0, 1, 0],
                    scale: [0.4, 1.1, 0.6],
                  }}
                  transition={{
                    duration: 1.2,
                    delay: 0.05 * i,
                    ease: 'easeOut',
                  }}
                >
                  ✨
                </motion.span>
              )
            })}
          </div>
        )}
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 4 — Nature polaroid review
   ════════════════════════════════════════════════════════════════════ */

interface ReviewPhaseProps {
  image: string
  onRetake: () => void
  onSave: () => void
}

function ReviewPhase({ image, onRetake, onSave }: ReviewPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={springBouncy}
      className="space-y-5"
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        {/* Nature polaroid — green border with leaf motif accents. */}
        <motion.div
          className="relative w-full max-w-sm overflow-hidden rounded-xl border-4 border-emerald-500 bg-gradient-to-b from-emerald-700 to-emerald-900 p-3 pb-14 shadow-pop"
          initial={{ rotate: -4, y: 24, opacity: 0 }}
          animate={{ rotate: 2, y: 0, opacity: 1 }}
          transition={{ ...springBouncy, delay: 0.05 }}
          style={{
            boxShadow:
              '0 0 28px rgba(52, 211, 153, 0.6), 0 0 50px rgba(187, 247, 208, 0.35)',
          }}
        >
          {/* Inner mint accent border */}
          <div className="relative overflow-hidden rounded-lg border-2 border-emerald-300 bg-black">
            <img
              src={image}
              alt="Chiếc lá Lumi vừa ăn"
              className="block w-full object-cover"
              draggable={false}
            />

            {/* Sticker overlay — pinned over the photo at top-right.
                Spec: "Lumi đã ăn no! Cảm ơn bé! ✨". Pre-rotated so
                its tilt reads upright against the polaroid's +2°. */}
            <motion.div
              className="absolute -right-2 top-3 inline-flex items-center gap-1 rounded-full border-2 border-butter-400 bg-gradient-to-br from-butter-200 to-emerald-200 px-3 py-1 font-display text-[11px] font-bold text-emerald-900 shadow-pop sm:text-xs"
              initial={{ scale: 0, rotate: 30 }}
              animate={{ scale: 1, rotate: -5 }}
              transition={{ ...springBouncy, delay: 0.3 }}
              style={{
                boxShadow:
                  '0 0 16px rgba(254, 240, 138, 0.7), inset 0 0 8px rgba(255, 251, 235, 0.5)',
              }}
            >
              <Sparkles className="size-3 fill-butter-500 stroke-butter-700" />
              Lumi đã ăn no! Cảm ơn bé! ✨
            </motion.div>
          </div>

          {/* Caption strip — light mint on the deep green frame */}
          <p
            className="absolute inset-x-3 bottom-3 text-center font-display text-sm font-bold text-emerald-50"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
          >
            🌿 Khám phá rừng xanh cùng Lumi
          </p>

          {/* 4 leaf-shaped corner motifs */}
          {(
            [
              { pos: 'left-1.5 top-1.5', rot: -25 },
              { pos: 'right-1.5 top-1.5', rot: 25 },
              { pos: 'left-1.5 bottom-11', rot: -155 },
              { pos: 'right-1.5 bottom-11', rot: 155 },
            ] as const
          ).map((d) => (
            <span
              key={d.pos}
              aria-hidden
              className={cn(
                'pointer-events-none absolute select-none text-base leading-none',
                d.pos,
              )}
              style={{
                transform: `rotate(${d.rot}deg)`,
                filter: 'drop-shadow(0 0 4px rgba(187, 247, 208, 0.95))',
              }}
            >
              🌿
            </span>
          ))}
        </motion.div>

        <p className="text-center text-sm text-cocoa-700">
          Lumi đã hồi phục năng lượng nhờ chiếc lá của bé! Lưu khoảnh khắc
          này vào Nhật Ký để ba mẹ cùng xem nhé.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            onClick={onSave}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-600 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            style={{ boxShadow: '0 0 18px rgba(52, 211, 153, 0.55)' }}
          >
            <BookHeart className="size-4" />
            Lưu vào Nhật Ký
          </motion.button>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
          >
            <RotateCcw className="size-4" />
            Tìm thêm lá
          </button>
        </div>
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Shared bits — energy bar, saved toast
   ════════════════════════════════════════════════════════════════════ */

/** Slim animated energy bar — used in intro (dim variant) AND in the
 *  feeding animation phase (fills 25 → 100 once the leaf lands). */
function EnergyBar({ value, dim }: { value: number; dim?: boolean }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.25em]">
        <span className={cn('text-emerald-100', dim && 'text-emerald-200/70')}>
          Năng lượng Lumi
        </span>
        <span className="font-display tabular-nums text-emerald-50">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-emerald-300/50 bg-emerald-950/70">
        <motion.div
          className="h-full rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(90deg, #facc15 0%, #22c55e 100%)',
            boxShadow: '0 0 10px rgba(74, 222, 128, 0.85)',
          }}
        />
      </div>
    </div>
  )
}

function SavedToast({ open }: { open: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-6 z-50 -translate-x-1/2"
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={springBouncy}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full border-2 border-butter-300 bg-emerald-700/95 px-4 py-2 font-display text-sm font-bold text-butter-100 shadow-pop backdrop-blur"
            style={{ boxShadow: '0 0 22px rgba(254, 240, 138, 0.65)' }}
          >
            <span className="grid size-6 place-items-center rounded-full bg-butter-300 text-emerald-800">
              <Check className="size-4" strokeWidth={3} />
            </span>
            Đã lưu vào Album Gia đình!
            <Heart
              className="size-3.5 fill-butter-200 stroke-butter-200"
              strokeWidth={0}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

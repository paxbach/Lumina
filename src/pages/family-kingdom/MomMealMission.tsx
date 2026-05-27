import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
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
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { springBouncy, springSoft } from '@/utils/motion'

/* ════════════════════════════════════════════════════════════════════
   MomMealMission ("Bữa Cơm Của Mẹ" — Vương Quốc Gia Đình)
   ────────────────────────────────────────────────────────────────────
   Cozy 4-phase camera mini-game. The kid snaps a real photo of the
   family meal, decorates it with tap-spawned compliment stickers
   (❤️ ✨ 🌟 😍 + "10 Điểm!"), then saves the merged image to the
   family album.

   Phases:
     intro    → Warm orange/butter gradient card + "Mở Camera".
     camera   → Live rear camera + cozy tablecloth border overlay +
                vignette + heart-shaped shutter.
     decorate → Captured photo displayed full-width; tap anywhere to
                spawn a compliment sticker that pops in via spring.
                "Hoàn thành trang trí" bakes stickers into the photo.
     review   → Kitchen-themed polaroid + caption + Save/Retake.

   Coordinate system: sticker x/y stored in CONTAINER CSS pixels
   (decorate phase). At bake time we scale to the rawImage pixel
   dimensions via a uniform `rawImage.width / containerW` ratio. The
   container's aspect-ratio is locked to the captured frame's so no
   letterbox / no axis mismatch — stickers land exactly where the kid
   tapped.

   Camera safety: tracks stopped on capture, retake, cancel, AND in
   the unmount cleanup useEffect — the hardware indicator never
   lingers past the active phase.
   ════════════════════════════════════════════════════════════════════ */

type Phase = 'intro' | 'camera' | 'decorate' | 'review'

interface CapturedFrame {
  /** data:image/jpeg;base64,… */
  src: string
  width: number
  height: number
}

interface Sticker {
  id: number
  /** x in container CSS pixels (decorate phase). */
  x: number
  /** y in container CSS pixels. */
  y: number
  /** Either a single emoji glyph OR a short text chip like "10 Điểm!" */
  emoji: string
}

/** Random pool — emoji glyphs + the spec's "10 Điểm!" text chip. */
const STICKER_POOL: readonly string[] = [
  '❤️',
  '✨',
  '🌟',
  '😍',
  '🥰',
  '10 Điểm!',
] as const

/** Cap concurrent stickers so the kid can't bury the photo entirely. */
const MAX_STICKERS = 12

/** Shared family album localStorage key (matches the other 4 AR
 *  missions: ShapeHunter, ColorMix, CityBuilder, TetColorHunt). */
const ALBUM_STORAGE_KEY = 'lumina_family_album'

/** Capture width cap — keeps each JPEG ~50–80 KB so localStorage
 *  doesn't blow past quota even after many sessions. */
const CAPTURE_MAX_WIDTH = 720

interface AlbumEntry {
  image: string
  timestamp: number
  shapeName: string
}

function pickRandomSticker(): string {
  return STICKER_POOL[Math.floor(Math.random() * STICKER_POOL.length)]
}

export default function MomMealMission() {
  const navigate = useNavigate()
  const saveMemory = useAppStore((s) => s.saveMemory)
  const completeSubNode = useAppStore((s) => s.completeSubNode)
  const setLessonProgress = useAppStore((s) => s.setLessonProgress)

  const [phase, setPhase] = useState<Phase>('intro')
  const [rawImage, setRawImage] = useState<CapturedFrame | null>(null)
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [finalImage, setFinalImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraContainerRef = useRef<HTMLDivElement | null>(null)
  const decorateContainerRef = useRef<HTMLDivElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  /** Credit lesson + sub-node only on the first save in a session. */
  const creditedRef = useRef(false)

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

  // Attach stream when <video> remounts on entering the camera phase.
  useEffect(() => {
    if (phase !== 'camera') return
    const stream = streamRef.current
    const video = videoRef.current
    if (!stream || !video) return
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    video.play().catch(() => {
      /* Safari/iOS async play() — frame still appears. */
    })
  }, [phase])

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
    const canvas = captureCanvasRef.current
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

    // Object-cover crop replication so the captured frame matches what
    // the kid saw on screen pixel-for-pixel.
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
      ctx.fillStyle = '#451a03'
      ctx.fillRect(0, 0, w, h)
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    // High quality at capture; we re-compress on the final merge step.
    setRawImage({ src: dataUrl, width: w, height: h })
    setStickers([])
    stopCamera() // release hardware immediately
    setPhase('decorate')
  }

  const handleSpawnSticker = (e: MouseEvent<HTMLDivElement>) => {
    if (phase !== 'decorate' || stickers.length >= MAX_STICKERS) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setStickers((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        x,
        y,
        emoji: pickRandomSticker(),
      },
    ])
  }

  const handleUndoSticker = () => {
    setStickers((prev) => prev.slice(0, -1))
  }

  const handleFinishDecorating = () => {
    if (!rawImage) return
    const canvas = captureCanvasRef.current
    const container = decorateContainerRef.current
    if (!canvas || !container) return

    const containerW = container.getBoundingClientRect().width
    if (containerW === 0) return

    // Bake into a canvas at the rawImage's native dimensions so the
    // merged photo doesn't lose resolution compared to the capture.
    canvas.width = rawImage.width
    canvas.height = rawImage.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Use an Image() so we can drawImage() the data-URL. Wrapped in a
    // promise-less callback because we need state updates to fire
    // AFTER the image has actually loaded and painted.
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rawImage.width, rawImage.height)

      // Uniform scale: container CSS pixels → canvas (= rawImage) px.
      // Container aspect is locked to rawImage aspect via the inline
      // aspect-ratio style, so X and Y scale identically.
      const uniformScale = rawImage.width / containerW

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      stickers.forEach((s) => {
        const cx = s.x * uniformScale
        const cy = s.y * uniformScale
        const isText = s.emoji.length > 2 // emoji = 1–2 code units
        if (isText) {
          // Render text chips with a golden pill background so they
          // pop against busy food photos (otherwise gold-on-yellow
          // dishes would vanish).
          const fontPx = Math.round(28 * uniformScale)
          ctx.font = `bold ${fontPx}px ui-sans-serif, system-ui, sans-serif`
          const padX = 14 * uniformScale
          const padY = 8 * uniformScale
          const metrics = ctx.measureText(s.emoji)
          const w = metrics.width + padX * 2
          const h = fontPx + padY * 2
          // Pill background
          ctx.fillStyle = 'rgba(252, 211, 77, 0.95)'
          roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2)
          ctx.fill()
          ctx.strokeStyle = 'rgba(180, 83, 9, 0.85)'
          ctx.lineWidth = 2 * uniformScale
          ctx.stroke()
          // Text on top
          ctx.fillStyle = '#7c2d12'
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
          ctx.shadowBlur = 3 * uniformScale
          ctx.fillText(s.emoji, cx, cy)
          ctx.shadowBlur = 0
        } else {
          const fontPx = Math.round(72 * uniformScale)
          ctx.font = `${fontPx}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`
          // Subtle warm drop-shadow under each emoji so it reads
          // against any background.
          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
          ctx.shadowBlur = 6 * uniformScale
          ctx.fillText(s.emoji, cx, cy)
          ctx.shadowBlur = 0
        }
      })

      // Bottom caption stamp — "Bữa cơm của Mẹ ❤️" pinned bottom-left
      // so the merged photo is self-describing even outside the app.
      const stampPad = 16 * uniformScale
      const stampFont = Math.round(18 * uniformScale)
      ctx.font = `bold ${stampFont}px ui-sans-serif, system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
      ctx.shadowBlur = 4
      ctx.fillStyle = '#fef3c7'
      ctx.fillText(
        '🍲 Bữa cơm của Mẹ · Lumina',
        stampPad,
        rawImage.height - stampPad,
      )
      ctx.shadowBlur = 0

      const merged = canvas.toDataURL('image/jpeg', 0.85)
      setFinalImage(merged)
      setPhase('review')
    }
    img.src = rawImage.src
  }

  const handleRetakePhoto = async () => {
    setFinalImage(null)
    setRawImage(null)
    setStickers([])
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
    if (!finalImage) return

    // 1. localStorage album (spec key).
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
      image: finalImage,
      timestamp: Date.now(),
      shapeName: 'Bữa cơm của Mẹ',
    })
    try {
      window.localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(album))
    } catch {
      /* Quota — keep going so the in-app save still fires. */
    }

    // 2. In-app diary so the photo shows up in FamilyPage too.
    saveMemory({
      imagePath: finalImage,
      questTitle: 'Bữa cơm đầy ắp tình yêu',
      regionId: 'vuong-quoc-gia-dinh',
    })

    // 3. Credit lesson + sub-node once per session.
    if (!creditedRef.current) {
      creditedRef.current = true
      setLessonProgress('animals', 1)
      completeSubNode('vuong-quoc-gia-dinh', 'vqgd-bua-com')
    }

    // 4. Toast then return to the Family Kingdom sub-map.
    setSavedToast(true)
    window.setTimeout(() => {
      navigate('/map?region=vuong-quoc-gia-dinh')
    }, 1700)
  }

  const handleExit = () => {
    stopCamera()
    navigate('/map?region=vuong-quoc-gia-dinh')
  }

  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-peach-500">
            Vương Quốc Gia Đình
          </p>
          <h1 className="text-xl font-display font-bold text-cocoa-900 sm:text-2xl">
            Bữa Cơm Của Mẹ
          </h1>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPhase
            key="intro"
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
            canvasRef={captureCanvasRef}
            onCapture={handleCapture}
            onCancel={handleCancelCamera}
          />
        )}
        {phase === 'decorate' && rawImage && (
          <DecoratePhase
            key="decorate"
            image={rawImage}
            stickers={stickers}
            maxStickers={MAX_STICKERS}
            containerRef={decorateContainerRef}
            onSpawn={handleSpawnSticker}
            onUndo={handleUndoSticker}
            onFinish={handleFinishDecorating}
            onRetake={handleRetakePhoto}
          />
        )}
        {phase === 'review' && finalImage && (
          <ReviewPhase
            key="review"
            image={finalImage}
            onRetake={handleRetakePhoto}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <SavedToast open={savedToast} />
    </PageLayout>
  )
}

/* ── Canvas rounded-rect helper ─────────────────────────────────────
   Native Path2D.roundRect() is recent in browser support; this poly
   covers the same need with a guaranteed cross-browser path. */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/* ════════════════════════════════════════════════════════════════════
   Phase 1 — Warm intro
   ════════════════════════════════════════════════════════════════════ */

interface IntroPhaseProps {
  error: string | null
  onOpenCamera: () => void
  onExit: () => void
}

function IntroPhase({ error, onOpenCamera, onExit }: IntroPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={springSoft}
      className="space-y-6"
    >
      {/* Floating bowl-of-rice hero card */}
      <div className="mx-auto grid max-w-xs place-items-center">
        <motion.div
          className="relative grid size-48 place-items-center rounded-[2.5rem] border-4 border-peach-400 shadow-pop sm:size-52"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(circle at 50% 30%, #fef3c7 0%, #fcd34d 50%, #f97316 100%)',
            boxShadow:
              '0 18px 30px -10px rgba(249, 115, 22, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 24px rgba(251, 191, 36, 0.45)',
          }}
        >
          {/* Tiny steam wisps rising above the bowl */}
          {[14, 36, 58].map((leftPct, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute top-4 size-1.5 rounded-full bg-white/80 blur-[1px]"
              style={{ left: `${leftPct}%` }}
              animate={{ y: [0, -22, -40], opacity: [0, 0.85, 0] }}
              transition={{
                duration: 2.2,
                delay: i * 0.45,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Bowl emoji centred + tiny hearts orbiting */}
          <span
            aria-hidden
            className="relative text-7xl leading-none sm:text-8xl"
            style={{ filter: 'drop-shadow(0 6px 10px rgba(154, 52, 18, 0.5))' }}
          >
            🍲
          </span>

          {[
            { pos: 'top-3 left-3', glyph: '❤️', delay: 0 },
            { pos: 'top-3 right-3', glyph: '✨', delay: 0.4 },
            { pos: 'bottom-3 left-3', glyph: '🌟', delay: 0.8 },
            { pos: 'bottom-3 right-3', glyph: '🥰', delay: 1.2 },
          ].map((d) => (
            <motion.span
              key={d.pos}
              aria-hidden
              className={cn(
                'absolute select-none text-xl leading-none sm:text-2xl',
                d.pos,
              )}
              animate={{ rotate: [-10, 10, -10], y: [0, -3, 0] }}
              transition={{
                duration: 3,
                delay: d.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(124, 45, 18, 0.45))',
              }}
            >
              {d.glyph}
            </motion.span>
          ))}

          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-peach-400 bg-cream-50 px-3 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-peach-500 shadow-soft">
            Bữa cơm của mẹ
          </span>
        </motion.div>
      </div>

      <div
        className="mx-auto max-w-xl rounded-3xl border-4 border-peach-300 p-5 text-center shadow-pop sm:p-6"
        style={{
          backgroundImage:
            'radial-gradient(80% 100% at 50% 0%, rgba(254, 215, 170, 0.85) 0%, transparent 70%), linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-peach-500">
          Khoảnh khắc gia đình
        </p>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-cocoa-900 sm:text-xl">
          Bữa cơm gia đình thật{' '}
          <span className="text-peach-500">ấm áp</span>! Bé hãy chụp lại món ăn
          mẹ nấu và thả tim nhé! 🍲
        </h2>
        <p className="mt-2 text-sm text-cocoa-700/85">
          Chụp xong, bé sẽ được chạm vào ảnh để{' '}
          <strong className="text-red-500">thả tim, sao</strong> và lời khen
          cho bữa cơm tuyệt vời này!
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
              '0 0 0 0 rgba(249, 115, 22, 0.55)',
              '0 0 0 16px rgba(249, 115, 22, 0)',
            ],
          }}
          transition={{
            boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeOut' },
          }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-peach-500 bg-gradient-to-br from-peach-400 to-peach-500 px-7 py-3 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200"
        >
          <Camera className="size-5" />
          Mở Camera
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

/* ════════════════════════════════════════════════════════════════════
   Phase 2 — Food Camera with cozy tablecloth border
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
        className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border-4 border-peach-500 bg-slate-950 shadow-pop sm:aspect-video sm:max-w-2xl"
        style={{
          boxShadow:
            '0 0 0 4px rgba(252, 211, 77, 0.45), 0 0 28px rgba(249, 115, 22, 0.55), inset 0 0 24px rgba(124, 45, 18, 0.3)',
        }}
      >
        {/* Live rear camera */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 size-full object-cover"
        />

        {/* Cozy tablecloth border + warm vignette overlay */}
        <CozyTableclothOverlay />

        {/* Top chrome */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 bg-gradient-to-b from-slate-950/80 to-transparent px-4 pb-8 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur hover:bg-white/25"
          >
            <ArrowLeft className="size-3.5" />
            Huỷ
          </button>
          <span
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-peach-300/70 bg-peach-700/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-peach-50 backdrop-blur"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            <span aria-hidden>🍲</span>
            Chụp món ăn
          </span>
        </div>

        {/* Bottom chrome — heart-shaped shutter */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-center bg-gradient-to-t from-slate-950/80 to-transparent px-4 pb-5 pt-12">
          <motion.button
            type="button"
            onClick={onCapture}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(249, 115, 22, 0.85)',
                '0 0 0 22px rgba(249, 115, 22, 0)',
              ],
            }}
            transition={{
              boxShadow: { duration: 1.4, repeat: Infinity, ease: 'easeOut' },
            }}
            aria-label="Chụp ảnh"
            className="grid place-items-center rounded-full border-4 border-cream-50 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200"
            style={{
              width: 80,
              height: 80,
              background:
                'radial-gradient(circle at 30% 30%, #fda4af, #be123c)',
            }}
          >
            {/* Heart core — strokeWidth=0 so it reads as a solid heart */}
            <Heart
              className="size-9 fill-cream-50 stroke-cream-50"
              strokeWidth={0}
            />
          </motion.button>
        </div>

        {/* Hidden canvas — sized at capture time. */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      <p className="text-center text-xs text-cocoa-700/70">
        Đưa bữa cơm của mẹ vào khung và nhấn nút <Heart className="inline size-3 fill-red-500 stroke-red-500" /> để chụp nhé!
      </p>
    </motion.section>
  )
}

/** Cozy kitchen overlay: red+cream checkered tablecloth strips at the
 *  edges + warm radial vignette. Non-interactive so the shutter +
 *  cancel buttons aren't blocked. */
function CozyTableclothOverlay() {
  // Repeating checker via background-image — 2 stacked gradients
  // build the classic gingham look without an image asset.
  const tableclothPattern = {
    backgroundImage:
      'repeating-conic-gradient(rgba(254, 226, 226, 0.85) 0% 25%, rgba(220, 38, 38, 0.7) 0% 50%)',
    backgroundSize: '22px 22px',
  } as const

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
      {/* Top + bottom checker strips */}
      <div
        className="absolute inset-x-3 top-3 h-3 rounded-t-md"
        style={tableclothPattern}
      />
      <div
        className="absolute inset-x-3 bottom-3 h-3 rounded-b-md"
        style={tableclothPattern}
      />
      {/* Left + right checker strips */}
      <div
        className="absolute inset-y-3 left-3 w-3 rounded-l-md"
        style={tableclothPattern}
      />
      <div
        className="absolute inset-y-3 right-3 w-3 rounded-r-md"
        style={tableclothPattern}
      />

      {/* Warm radial vignette — pulls focus to the centre dish */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(75% 60% at 50% 50%, transparent 55%, rgba(124, 45, 18, 0.45) 100%)',
        }}
      />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 3 — Interactive decoration
   ════════════════════════════════════════════════════════════════════ */

interface DecoratePhaseProps {
  image: CapturedFrame
  stickers: Sticker[]
  maxStickers: number
  containerRef: React.RefObject<HTMLDivElement | null>
  onSpawn: (e: MouseEvent<HTMLDivElement>) => void
  onUndo: () => void
  onFinish: () => void
  onRetake: () => void
}

function DecoratePhase({
  image,
  stickers,
  maxStickers,
  containerRef,
  onSpawn,
  onUndo,
  onFinish,
  onRetake,
}: DecoratePhaseProps) {
  const capped = stickers.length >= maxStickers
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={springSoft}
      className="space-y-4"
    >
      {/* Coach line */}
      <div className="mx-auto max-w-xl rounded-2xl border-2 border-peach-300 bg-peach-50 px-4 py-3 text-center shadow-soft">
        <p className="font-display text-base font-bold leading-snug text-cocoa-900">
          🥰 Chạm vào ảnh để thả tim, sao và lời khen cho mẹ nhé!
        </p>
        <p className="mt-1 text-xs text-cocoa-700/80">
          Đã thả {stickers.length}/{maxStickers} sticker — nhấn{' '}
          <strong>Hoàn thành trang trí</strong> khi xong.
        </p>
      </div>

      {/* Photo + tap layer + sticker overlay. Container aspect locked
          to the captured frame so the tap → bake coord mapping is a
          single uniform scale (no letterbox math). */}
      <div className="mx-auto w-full max-w-md">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-3xl border-4 border-peach-400 shadow-pop"
          style={{
            aspectRatio: `${image.width} / ${image.height}`,
            boxShadow:
              '0 18px 30px -8px rgba(249, 115, 22, 0.45), 0 0 0 4px rgba(252, 211, 77, 0.45)',
          }}
        >
          <img
            src={image.src}
            alt="Bữa cơm của mẹ"
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />

          {/* Tap layer — captures every click, disabled at cap. */}
          <div
            aria-hidden
            role="presentation"
            onClick={capped ? undefined : onSpawn}
            className={cn(
              'absolute inset-0 z-10',
              capped ? 'cursor-default' : 'cursor-pointer',
            )}
            style={{ touchAction: 'manipulation' }}
          />

          {/* Sticker overlay layer */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {stickers.map((s) => (
              <StickerNode key={s.id} sticker={s} />
            ))}
          </div>

          {/* Counter chip top-right */}
          <div className="pointer-events-none absolute right-3 top-3 z-30">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-peach-300 bg-peach-700/55 px-3 py-1 text-xs font-bold text-peach-50 shadow-soft backdrop-blur"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
            >
              <Sparkles className="size-3.5" />
              {stickers.length}/{maxStickers}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <motion.button
          type="button"
          onClick={onFinish}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          disabled={stickers.length === 0}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border-[3px] px-6 py-2.5 font-display text-sm font-bold shadow-pop transition-colors',
            'focus-visible:outline-none focus-visible:ring-4',
            stickers.length === 0
              ? 'cursor-not-allowed border-cream-200 bg-cream-100 text-cocoa-700/40'
              : 'border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white focus-visible:ring-emerald-200',
          )}
        >
          <Check className="size-4" />
          Hoàn thành trang trí
        </motion.button>
        <button
          type="button"
          onClick={onUndo}
          disabled={stickers.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
          Bỏ sticker cuối
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
        >
          <Camera className="size-4" />
          Chụp lại
        </button>
      </div>
    </motion.section>
  )
}

/** A single tapped sticker — spring pop-in then gentle infinite bob.
 *  Renders text stickers ("10 Điểm!") as a styled gold pill, emoji
 *  stickers as a large drop-shadowed glyph. */
function StickerNode({ sticker }: { sticker: Sticker }) {
  const isText = sticker.emoji.length > 2
  return (
    <motion.div
      className="absolute select-none"
      style={{
        left: sticker.x,
        top: sticker.y,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.2, 1], opacity: 1 }}
      transition={springBouncy}
    >
      {isText ? (
        <motion.span
          className="inline-block whitespace-nowrap rounded-full border-2 border-amber-700 bg-amber-300 px-3 py-1 font-display text-sm font-bold text-amber-900 shadow-pop"
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: '0 4px 10px rgba(124, 45, 18, 0.45)' }}
        >
          {sticker.emoji}
        </motion.span>
      ) : (
        <motion.span
          className="block text-5xl leading-none sm:text-6xl"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            filter:
              'drop-shadow(0 4px 8px rgba(124, 45, 18, 0.55)) drop-shadow(0 0 14px rgba(252, 165, 165, 0.55))',
          }}
        >
          {sticker.emoji}
        </motion.span>
      )}
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 4 — Kitchen polaroid review
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
        {/* Kitchen polaroid — warm wooden border + butter inner accent */}
        <motion.div
          className="relative w-full max-w-sm overflow-hidden rounded-xl border-4 p-3 pb-14 shadow-pop"
          initial={{ rotate: -5, y: 24, opacity: 0 }}
          animate={{ rotate: 2, y: 0, opacity: 1 }}
          transition={{ ...springBouncy, delay: 0.05 }}
          style={{
            // Faux-wood lacquer frame: stacked gradients in warm amber
            // tones with a subtle vertical grain.
            backgroundImage:
              'linear-gradient(180deg, #92400e 0%, #78350f 100%), repeating-linear-gradient(90deg, rgba(252,211,77,0.06) 0 2px, transparent 2px 7px)',
            borderColor: '#fcd34d',
            boxShadow:
              '0 0 28px rgba(249, 115, 22, 0.55), 0 0 50px rgba(252, 211, 77, 0.35)',
          }}
        >
          {/* Inner butter accent border + photo */}
          <div className="overflow-hidden rounded-lg border-2 border-amber-300 bg-black">
            <img
              src={image}
              alt="Bữa cơm đã trang trí"
              className="block w-full object-cover"
              draggable={false}
            />
          </div>

          {/* Caption strip — butter text on the wooden frame */}
          <p
            className="absolute inset-x-3 bottom-3 text-center font-display text-sm font-bold text-amber-100"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
          >
            Bữa cơm đầy ắp tình yêu! 🥰
          </p>

          {/* 4 butter corner pins */}
          {[
            'left-1.5 top-1.5',
            'right-1.5 top-1.5',
            'left-1.5 bottom-11',
            'right-1.5 bottom-11',
          ].map((pos) => (
            <span
              key={pos}
              aria-hidden
              className={cn(
                'pointer-events-none absolute size-2 rounded-full bg-amber-300',
                pos,
              )}
              style={{ boxShadow: '0 0 6px rgba(252, 211, 77, 0.95)' }}
            />
          ))}
        </motion.div>

        <p className="text-center text-sm text-cocoa-700">
          Tuyệt vời! Một bức ảnh đầy{' '}
          <strong className="text-peach-500">tình yêu thương</strong> dành cho
          mẹ. Lưu vào Nhật Ký để cả nhà cùng xem nhé!
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            onClick={onSave}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-peach-500 bg-gradient-to-br from-peach-400 to-peach-500 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200"
            style={{ boxShadow: '0 0 18px rgba(249, 115, 22, 0.55)' }}
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
            Chụp lại
          </button>
        </div>
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Saved toast
   ════════════════════════════════════════════════════════════════════ */

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
            className="inline-flex items-center gap-2 rounded-full border-2 border-amber-300 bg-peach-700/95 px-4 py-2 font-display text-sm font-bold text-amber-100 shadow-pop backdrop-blur"
            style={{ boxShadow: '0 0 22px rgba(252, 211, 77, 0.65)' }}
          >
            <span className="grid size-6 place-items-center rounded-full bg-amber-300 text-peach-700">
              <Check className="size-4" strokeWidth={3} />
            </span>
            Đã lưu vào Album Gia đình!
            <Heart
              className="size-3.5 fill-amber-200 stroke-amber-200"
              strokeWidth={0}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

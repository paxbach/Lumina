import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookHeart,
  Camera,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { useAppStore } from '@/store/useAppStore'
import { springBouncy, springSoft } from '@/utils/motion'

/* ════════════════════════════════════════════════════════════════════
   ShapeHunterMission ("Hình Khối Không Gian" — Núi Khoa Học)
   ────────────────────────────────────────────────────────────────────
   3-phase AR mini-game:

     intro   → Floating 3D shape card + "Mở Camera" pulse CTA.
     camera  → Live environment-camera feed framed by a dashed SVG
               cylinder guide; large glowing "Chụp Ảnh" button captures
               the current frame onto a hidden <canvas>, releases the
               camera tracks IMMEDIATELY, and advances to review.
     review  → Polaroid-tilted preview of the captured frame, with a
               "Đã tìm thấy Khối Trụ! 🌟" sticker badge. CTAs to retake
               or save into the family album (localStorage + the
               existing in-app diary so the photo also surfaces in
               FamilyPage's scrapbook).

   Safety: ALL stream tracks are stopped on unmount, on capture, on
   retake, and on "Quay về" — so the hardware indicator never lingers.
   ════════════════════════════════════════════════════════════════════ */

type Phase = 'intro' | 'camera' | 'review'

interface ShapeTarget {
  name: string
  icon: string
  description: string
}

const TARGET_SHAPE: ShapeTarget = {
  name: 'Khối Trụ',
  icon: '🛢️',
  description: 'Giống như lon nước hay hộp bút',
}

/** localStorage key per spec — keep verbatim so external tooling /
 *  parent panels can read the same array. */
const ALBUM_STORAGE_KEY = 'lumina_family_album'

/** Max width of the captured JPEG. Keeps each entry ~50–80 KB so the
 *  5–10 MB localStorage budget can host dozens of hunts without quota
 *  errors. */
const CAPTURE_MAX_WIDTH = 720

interface AlbumEntry {
  image: string // data:image/jpeg;base64,…
  timestamp: number
  shapeName: string
}

export default function ShapeHunterMission() {
  const navigate = useNavigate()
  const saveMemory = useAppStore((s) => s.saveMemory)
  const completeSubNode = useAppStore((s) => s.completeSubNode)
  const setLessonProgress = useAppStore((s) => s.setLessonProgress)

  const [phase, setPhase] = useState<Phase>('intro')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  /* ── Camera teardown ──────────────────────────────────────────────
     Idempotent. Called from: capture (success path), retake, exit
     button, and the unmount cleanup effect below. Without this the
     hardware camera light could stay on between phase changes or
     past a route navigation. */
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

  // Hardware safety net.
  useEffect(() => () => stopCamera(), [stopCamera])

  // When phase transitions INTO 'camera', the <video> element re-mounts
  // a beat later. Attach the already-acquired MediaStream as soon as
  // the element is in the DOM. We acquired the stream BEFORE flipping
  // phase so error handling lives in the click handler (toast on
  // intro), not here.
  useEffect(() => {
    if (phase !== 'camera') return
    const stream = streamRef.current
    const video = videoRef.current
    if (!stream || !video) return
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    video.play().catch(() => {
      /* Some Android WebViews resolve play() asynchronously; the
       * stream still appears. Silent on purpose. */
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
      const msg =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Bé chưa cho phép camera. Hãy bấm "Cho phép" ở thanh trình duyệt rồi thử lại nhé.'
          : name === 'NotFoundError' || name === 'DevicesNotFoundError'
            ? 'Không tìm thấy camera nào trên thiết bị của bé.'
            : 'Có lỗi khi mở camera — bé thử lại sau một chút nhé!'
      setCameraError(msg)
    }
  }

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const srcW = video.videoWidth
    const srcH = video.videoHeight
    // videoWidth is 0 until the first frame is decoded — bail if the
    // user smashed the shutter that fast.
    if (srcW === 0 || srcH === 0) return

    // Cap the output size so the base64 string fits comfortably in
    // localStorage. Preserves aspect ratio.
    const scale = Math.min(1, CAPTURE_MAX_WIDTH / srcW)
    const w = Math.round(srcW * scale)
    const h = Math.round(srcH * scale)
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

    setCapturedImage(dataUrl)
    // Release the camera the instant we have the frame — there's no
    // reason to keep the hardware lit through the review screen.
    stopCamera()
    setPhase('review')
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setPhase('intro')
  }

  const handleSave = () => {
    if (!capturedImage) return

    // 1. Write to the spec-mandated localStorage key.
    let album: AlbumEntry[] = []
    try {
      const raw = window.localStorage.getItem(ALBUM_STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) album = parsed as AlbumEntry[]
      }
    } catch {
      // Corrupted JSON — start fresh rather than crashing.
      album = []
    }
    album.push({
      image: capturedImage,
      timestamp: Date.now(),
      shapeName: TARGET_SHAPE.name,
    })
    try {
      window.localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(album))
    } catch {
      // QuotaExceeded — most likely the album has grown past the
      // browser cap. We still continue so the in-app diary save
      // below runs, and the toast still appears.
    }

    // 2. Also push into the in-app diary so the photo shows up in the
    //    existing FamilyPage scrapbook (single source of truth for any
    //    surface that already reads `diaryEntries`).
    saveMemory({
      imagePath: capturedImage,
      questTitle: `Hình khối: ${TARGET_SHAPE.name}`,
      regionId: 'nui-khoa-hoc',
    })

    // 3. Credit the science lesson + sub-node so the world-map
    //    completion ring lights up.
    setLessonProgress('shapes', 1)
    completeSubNode('nui-khoa-hoc', 'nkh-hinh-khoi-khong-gian')

    // 4. Toast then drift back to the map.
    setSavedToast(true)
    window.setTimeout(() => {
      navigate('/map?region=nui-khoa-hoc')
    }, 1600)
  }

  const handleExit = () => {
    stopCamera()
    navigate('/map?region=nui-khoa-hoc')
  }

  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-lavender-500">
            Núi Khoa Học
          </p>
          <h1 className="text-xl font-display font-bold text-cocoa-900 sm:text-2xl">
            Săn Hình Khối Không Gian
          </h1>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPhase
            key="intro"
            target={TARGET_SHAPE}
            error={cameraError}
            onOpenCamera={handleOpenCamera}
            onExit={handleExit}
          />
        )}
        {phase === 'camera' && (
          <CameraPhase
            key="camera"
            target={TARGET_SHAPE}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onCapture={handleCapture}
            onCancel={handleRetake}
          />
        )}
        {phase === 'review' && capturedImage && (
          <ReviewPhase
            key="review"
            target={TARGET_SHAPE}
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
   Phase 1 — Intro
   ════════════════════════════════════════════════════════════════════ */

interface IntroPhaseProps {
  target: ShapeTarget
  error: string | null
  onOpenCamera: () => void
  onExit: () => void
}

function IntroPhase({ target, error, onOpenCamera, onExit }: IntroPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={springSoft}
      className="space-y-6"
    >
      {/* Floating 3D-like shape card — gentle bob, drop-shadow halo, and
          a subtle inner sheen so a flat emoji reads as a sculpted prop. */}
      <FloatingShapeCard target={target} />

      <div
        className="mx-auto max-w-xl rounded-3xl border-4 border-lavender-300 bg-cream-50 p-5 text-center shadow-pop sm:p-6"
        style={{
          backgroundImage:
            'radial-gradient(80% 100% at 50% 0%, var(--color-lavender-100) 0%, transparent 70%), linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-cream-100) 100%)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
          Thử thách
        </p>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-cocoa-900 sm:text-xl">
          Thử thách: Tìm một đồ vật có{' '}
          <span className="text-lavender-500">[{target.name}]</span> trong nhà
          và chụp ảnh lại nhé!
        </h2>
        <p className="mt-2 text-sm text-cocoa-700/85">{target.description}</p>
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
              '0 0 0 0 rgba(167, 139, 250, 0.55)',
              '0 0 0 16px rgba(167, 139, 250, 0)',
            ],
          }}
          transition={{
            boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeOut' },
          }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-lavender-500 bg-gradient-to-br from-lavender-400 to-lavender-500 px-7 py-3 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200"
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

/** Pseudo-3D shape display: large rounded card, soft gradient + glow,
 *  gentle bob, slight pseudo-rotation under the emoji. */
function FloatingShapeCard({ target }: { target: ShapeTarget }) {
  return (
    <div className="mx-auto grid max-w-xs place-items-center">
      <motion.div
        className="relative grid size-44 place-items-center rounded-[2.5rem] border-4 border-lavender-300 shadow-pop sm:size-48"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'linear-gradient(160deg, var(--color-lavender-100) 0%, var(--color-cream-50) 50%, var(--color-lavender-200) 100%)',
          boxShadow:
            '0 18px 30px -10px rgba(167, 139, 250, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 -10px 20px rgba(167, 139, 250, 0.2)',
        }}
      >
        {/* Inner highlight sheen — fake light hitting the top of the card */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-6 top-4 h-12 w-20 rounded-full bg-white/55 blur-2xl"
        />
        {/* Soft floor shadow under the floating card */}
        <motion.span
          aria-hidden
          className="absolute -bottom-3 left-1/2 h-3 w-32 -translate-x-1/2 rounded-full bg-lavender-500/40 blur-md"
          animate={{ width: [128, 96, 128], opacity: [0.4, 0.25, 0.4] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.span
          aria-hidden
          className="relative select-none text-7xl leading-none sm:text-8xl"
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            filter: 'drop-shadow(0 6px 8px rgba(76, 29, 149, 0.45))',
          }}
        >
          {target.icon}
        </motion.span>

        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-lavender-300 bg-cream-50 px-3 py-0.5 font-display text-xs font-bold text-lavender-500 shadow-soft">
          {target.name}
        </span>
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 2 — Camera
   ════════════════════════════════════════════════════════════════════ */

interface CameraPhaseProps {
  target: ShapeTarget
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onCapture: () => void
  onCancel: () => void
}

function CameraPhase({
  target,
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
      className="space-y-4"
    >
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border-4 border-slate-900 bg-slate-950 shadow-pop sm:aspect-video sm:max-w-2xl">
        {/* Live camera */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 size-full object-cover"
        />

        {/* AR dashed cylinder guide — sits at viewport centre, pulses
            subtly so the kid knows it's an interactive target. */}
        <CylinderARGuide />

        {/* Top instruction strip */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-slate-950/85 to-transparent px-4 pb-6 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur hover:bg-white/25"
          >
            <ArrowLeft className="size-3.5" />
            Huỷ
          </button>
          <p
            className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-bold text-white shadow-soft backdrop-blur"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
          >
            Đưa <span className="text-lavender-200">{target.name}</span> vào
            khung
          </p>
        </div>

        {/* Capture button — large, glowing, pinned to bottom-centre */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-center bg-gradient-to-t from-slate-950/85 to-transparent px-4 pb-5 pt-10">
          <motion.button
            type="button"
            onClick={onCapture}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(255,255,255,0.6)',
                '0 0 0 18px rgba(255,255,255,0)',
              ],
            }}
            transition={{
              boxShadow: { duration: 1.5, repeat: Infinity, ease: 'easeOut' },
            }}
            className="grid place-items-center rounded-full border-4 border-white bg-gradient-to-br from-lavender-400 to-lavender-600 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200"
            style={{ width: 76, height: 76 }}
            aria-label="Chụp ảnh"
          >
            <span className="grid size-14 place-items-center rounded-full border-2 border-white/40 bg-white/95 text-lavender-500 shadow-inner sm:size-16">
              <Camera className="size-6 sm:size-7" strokeWidth={2.4} />
            </span>
          </motion.button>
        </div>

        {/* Hidden canvas — sized at capture time. */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      <p className="mx-auto max-w-md text-center text-xs text-cocoa-700/70">
        Mẹo: di chuyển camera để vật vừa vào trong khung hướng dẫn, rồi nhấn
        nút chụp lớn ở dưới.
      </p>
    </motion.section>
  )
}

/** Dashed-outline cylinder rendered as an SVG over the live camera
 *  feed — front-facing cylinder = ellipse top + 2 verticals + ellipse
 *  bottom. The dashed stroke pulses opacity so the kid reads it as a
 *  live AR target lock indicator, not a static frame. */
function CylinderARGuide() {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 200 260"
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-2/3 max-w-[260px] -translate-x-1/2 -translate-y-1/2"
      animate={{ opacity: [0.55, 1, 0.55] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        filter:
          'drop-shadow(0 0 8px rgba(196, 181, 253, 0.85)) drop-shadow(0 0 18px rgba(167, 139, 250, 0.45))',
      }}
    >
      {/* Top ellipse */}
      <ellipse
        cx="100"
        cy="36"
        rx="80"
        ry="22"
        fill="none"
        stroke="#e9d5ff"
        strokeWidth={3}
        strokeDasharray="9 7"
      />
      {/* Left vertical */}
      <line
        x1="20"
        y1="36"
        x2="20"
        y2="224"
        stroke="#e9d5ff"
        strokeWidth={3}
        strokeDasharray="9 7"
      />
      {/* Right vertical */}
      <line
        x1="180"
        y1="36"
        x2="180"
        y2="224"
        stroke="#e9d5ff"
        strokeWidth={3}
        strokeDasharray="9 7"
      />
      {/* Bottom ellipse — full stroke so the front lip reads first */}
      <ellipse
        cx="100"
        cy="224"
        rx="80"
        ry="22"
        fill="none"
        stroke="#e9d5ff"
        strokeWidth={3}
        strokeDasharray="9 7"
      />
      {/* Tiny corner crosshairs at the 4 cardinal points so the guide
          reads as a "lock zone", not just an outlined cylinder. */}
      {[
        { x: 20, y: 130 },
        { x: 180, y: 130 },
        { x: 100, y: 36 },
        { x: 100, y: 224 },
      ].map((p, i) => (
        <g key={i}>
          <line
            x1={p.x - 6}
            y1={p.y}
            x2={p.x + 6}
            y2={p.y}
            stroke="#f5f3ff"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={p.x}
            y1={p.y - 6}
            x2={p.x}
            y2={p.y + 6}
            stroke="#f5f3ff"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      ))}
    </motion.svg>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 3 — Polaroid Review
   ════════════════════════════════════════════════════════════════════ */

interface ReviewPhaseProps {
  target: ShapeTarget
  image: string
  onRetake: () => void
  onSave: () => void
}

function ReviewPhase({ target, image, onRetake, onSave }: ReviewPhaseProps) {
  // CSS variable hack so the tilt rotation can be tweaked once and the
  // sticker pre-compensates so it lands "upright on the polaroid".
  const polaroidStyle: CSSProperties = {
    transform: 'rotate(3deg)',
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={springBouncy}
      className="space-y-5"
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        {/* ── Polaroid frame ───────────────────────────────────── */}
        <motion.div
          className="relative w-full max-w-sm rounded-2xl bg-white p-4 pb-14 shadow-pop"
          style={polaroidStyle}
          initial={{ rotate: -8, y: 30, opacity: 0 }}
          animate={{ rotate: 3, y: 0, opacity: 1 }}
          transition={{ ...springBouncy, delay: 0.05 }}
        >
          {/* Photo */}
          <div className="overflow-hidden rounded-md bg-slate-100">
            <img
              src={image}
              alt={`Ảnh ${target.name}`}
              className="block aspect-square w-full object-cover"
            />
          </div>

          {/* Polaroid caption */}
          <p className="mt-3 text-center font-display text-sm font-bold text-cocoa-800">
            {target.name} · {new Date().toLocaleDateString('vi-VN')}
          </p>

          {/* "Đã tìm thấy" sticker — pre-rotated -3° so total tilt
              against the 3° polaroid lands at +0° (i.e. upright). */}
          <motion.div
            className="absolute -right-3 top-3 inline-flex items-center gap-1 rounded-full border-2 border-butter-400 bg-gradient-to-br from-butter-300 to-peach-300 px-3 py-1 font-display text-[11px] font-bold text-cocoa-900 shadow-pop sm:text-xs"
            initial={{ scale: 0, rotate: 30 }}
            animate={{ scale: 1, rotate: -6 }}
            transition={{ ...springBouncy, delay: 0.25 }}
            style={{
              boxShadow:
                '0 0 16px rgba(252, 211, 77, 0.7), inset 0 0 8px rgba(255, 251, 235, 0.5)',
            }}
          >
            <Sparkles className="size-3 fill-butter-500 stroke-butter-700" />
            Đã tìm thấy {target.name}! 🌟
          </motion.div>
        </motion.div>

        <p className="text-center text-sm text-cocoa-700">
          Tuyệt vời! Bé đã chụp được một{' '}
          <strong className="text-lavender-500">{target.name}</strong> đẹp đó.
          Lưu vào Nhật Ký để ba mẹ cùng xem nhé!
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            onClick={onSave}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-lavender-500 bg-gradient-to-br from-lavender-400 to-lavender-500 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200"
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
   Saved toast — quick confirmation before navigating back to the map
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
            className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-300 bg-white/90 px-4 py-2 font-display text-sm font-bold text-emerald-700 shadow-pop backdrop-blur"
            style={{
              boxShadow: '0 0 18px rgba(52, 211, 153, 0.55)',
            }}
          >
            <span className="grid size-6 place-items-center rounded-full bg-emerald-400 text-white">
              <Check className="size-4" strokeWidth={3} />
            </span>
            Đã lưu vào Nhật Ký Lumina!
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

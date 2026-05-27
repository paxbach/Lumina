import { useCallback, useEffect, useRef, useState } from 'react'
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
import { cn } from '@/utils/cn'
import { springBouncy, springSoft } from '@/utils/motion'

/* ════════════════════════════════════════════════════════════════════
   TetColorHuntMission ("Sắc Màu Ngày Tết" — Đảo Văn Hoá)
   ────────────────────────────────────────────────────────────────────
   AR colour-scavenger-hunt themed for Tết Nguyên Đán. The kid is given
   a target Tết colour (Đỏ / Vàng / Hồng Đào — randomised per session
   for replay variety) and points the rear camera at any real object
   matching that colour. The viewfinder is decorated with apricot
   blossoms + lanterns + a gold reticle (live AR overlay). On capture
   we bake a thick gold frame + a "Happy Lunar New Year" caption bar
   into the JPEG so the saved polaroid keeps the festive vibe forever.

   Phases:
     intro  → Warm red/gold gradient card with target colour + hint.
     camera → Live environment camera + Tết AR overlay + shutter.
     review → Red+gold festive polaroid + save / retake.

   Save: writes to BOTH the spec-named localStorage key
   `lumina_family_album` AND the in-app `saveMemory()` so the photo
   also surfaces in FamilyPage's scrapbook.

   Safety: stream tracks stopped on capture, retake, cancel, AND in
   the unmount cleanup effect — camera light NEVER lingers.
   ════════════════════════════════════════════════════════════════════ */

type Phase = 'intro' | 'camera' | 'review'

interface TetColor {
  id: 'red' | 'yellow' | 'pink'
  name: string
  /** Pure CSS hex. Used in chrome, drop-shadows, and the canvas
   *  caption tint. */
  hex: string
  /** rgba with built-in alpha for soft glow halos. */
  glow: string
  hint: string
  /** Lead emoji shown on the intro card. */
  emoji: string
}

const TET_COLORS: TetColor[] = [
  {
    id: 'red',
    name: 'Màu Đỏ May Mắn',
    hex: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.6)',
    hint: 'Bao lì xì, quả dưa hấu, câu đối, áo dài đỏ...',
    emoji: '🧧',
  },
  {
    id: 'yellow',
    name: 'Màu Vàng Phú Quý',
    hex: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.6)',
    hint: 'Hoa mai, đèn lồng, mâm ngũ quả, chuối...',
    emoji: '🌼',
  },
  {
    id: 'pink',
    name: 'Màu Hồng Đào',
    hex: '#fb7185',
    glow: 'rgba(251, 113, 133, 0.6)',
    hint: 'Hoa đào, bánh kẹo Tết, áo dài hồng...',
    emoji: '🌸',
  },
]

/** localStorage key shared with ShapeHunterMission, ColorMixGame, and
 *  CityBuilderMission — all four AR mini-games push into the same
 *  family album. */
const ALBUM_STORAGE_KEY = 'lumina_family_album'

/** Cap output width so each JPEG stays ~50–80 KB. */
const CAPTURE_MAX_WIDTH = 720

interface AlbumEntry {
  image: string
  timestamp: number
  shapeName: string
}

function pickTarget(exclude?: TetColor): TetColor {
  const pool = exclude
    ? TET_COLORS.filter((c) => c.id !== exclude.id)
    : TET_COLORS
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function TetColorHuntMission() {
  const navigate = useNavigate()
  const saveMemory = useAppStore((s) => s.saveMemory)
  const completeSubNode = useAppStore((s) => s.completeSubNode)
  const setLessonProgress = useAppStore((s) => s.setLessonProgress)

  const [phase, setPhase] = useState<Phase>('intro')
  const [target, setTarget] = useState<TetColor>(() => pickTarget())
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  /** Credit lesson + sub-node only on the first save in a session;
   *  replays after that are pure fun. */
  const creditedRef = useRef(false)

  /* ── Camera teardown — idempotent ──────────────────────────────── */
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

  // Attach stream once <video> remounts on phase change.
  useEffect(() => {
    if (phase !== 'camera') return
    const stream = streamRef.current
    const video = videoRef.current
    if (!stream || !video) return
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    video.play().catch(() => {
      /* Safari/iOS async play resolution — frame still appears. */
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
    const canvas = canvasRef.current
    const container = containerRef.current
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

    // ── 1. Draw the live video frame, matching object-cover crop ──
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
      ctx.fillStyle = '#7f1d1d'
      ctx.fillRect(0, 0, w, h)
    }

    // ── 2. Bake the festive frame ─────────────────────────────────
    // Thick translucent gold outer border — looks like a printed Tết
    // photo frame. Inset slightly so the corners are visible inside
    // the canvas bounds at any size.
    const goldOuter = 12 * scale
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)'
    ctx.lineWidth = goldOuter
    ctx.strokeRect(goldOuter / 2, goldOuter / 2, w - goldOuter, h - goldOuter)

    // Inner thin gold accent line for the engraved-frame look.
    const accentInset = goldOuter + 6 * scale
    ctx.strokeStyle = 'rgba(252, 211, 77, 0.55)'
    ctx.lineWidth = 2 * scale
    ctx.strokeRect(
      accentInset,
      accentInset,
      w - accentInset * 2,
      h - accentInset * 2,
    )

    // Bottom red caption bar with gold text — pinned inside the gold
    // frame so the border still reads at the very edge.
    const barH = 44 * scale
    const barY = h - goldOuter - barH
    ctx.fillStyle = 'rgba(127, 29, 29, 0.88)'
    ctx.fillRect(goldOuter, barY, w - goldOuter * 2, barH)

    ctx.font = `bold ${Math.round(16 * scale)}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fde68a'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 4
    ctx.fillText(
      '🧧  Happy Lunar New Year · Chúc Mừng Năm Mới  🧧',
      w / 2,
      barY + barH / 2,
    )
    ctx.shadowBlur = 0

    // Top-right "Đã tìm thấy" stamp so the photo is self-describing.
    const stampPad = goldOuter + 10 * scale
    ctx.font = `bold ${Math.round(14 * scale)}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillStyle = target.hex
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
    ctx.shadowBlur = 4
    ctx.fillText(`✦ ${target.name}`, w - stampPad, stampPad)
    ctx.shadowBlur = 0

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    stopCamera() // release hardware immediately
    setPhase('review')
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setCameraError(null)
    ;(async () => {
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
    })()
  }

  const handleCancelCamera = () => {
    stopCamera()
    setPhase('intro')
  }

  const handleSave = () => {
    if (!capturedImage) return

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
      image: capturedImage,
      timestamp: Date.now(),
      shapeName: `Sắc Tết: ${target.name}`,
    })
    try {
      window.localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(album))
    } catch {
      /* Quota — fall through so the in-app save still fires. */
    }

    // 2. Mirror into the in-app diary so the photo shows in FamilyPage.
    saveMemory({
      imagePath: capturedImage,
      questTitle: `Sắc Tết: ${target.name}`,
      regionId: 'dao-van-hoa',
    })

    // 3. Credit lesson + sub-node once per session.
    if (!creditedRef.current) {
      creditedRef.current = true
      setLessonProgress('colors', 1)
      completeSubNode('dao-van-hoa', 'dvh-sac-mau-tet')
    }

    // 4. Toast then return to the Đảo Văn Hoá sub-map. Reset for a
    //    fresh hunt if the kid re-enters the mission later.
    setSavedToast(true)
    window.setTimeout(() => {
      setSavedToast(false)
      setCapturedImage(null)
      setTarget(pickTarget(target))
      setPhase('intro')
      navigate('/map?region=dao-van-hoa')
    }, 1700)
  }

  const handleExit = () => {
    stopCamera()
    navigate('/map?region=dao-van-hoa')
  }

  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-500">
            Đảo Văn Hoá
          </p>
          <h1 className="text-xl font-display font-bold text-cocoa-900 sm:text-2xl">
            Săn Sắc Màu Ngày Tết
          </h1>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPhase
            key="intro"
            target={target}
            error={cameraError}
            onOpenCamera={handleOpenCamera}
            onExit={handleExit}
          />
        )}
        {phase === 'camera' && (
          <CameraPhase
            key="camera"
            target={target}
            containerRef={containerRef}
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
   Phase 1 — Festive intro
   ════════════════════════════════════════════════════════════════════ */

interface IntroPhaseProps {
  target: TetColor
  error: string | null
  onOpenCamera: () => void
  onExit: () => void
}

function IntroPhase({
  target,
  error,
  onOpenCamera,
  onExit,
}: IntroPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={springSoft}
      className="space-y-6"
    >
      {/* Festive hero card — red + gold gradient, floating blossoms +
          lanterns in corners, target colour swatch in centre. */}
      <FestiveTargetCard target={target} />

      <div
        className="mx-auto max-w-xl rounded-3xl border-4 border-red-400 p-5 text-center shadow-pop sm:p-6"
        style={{
          backgroundImage:
            'radial-gradient(80% 100% at 50% 0%, rgba(254, 226, 226, 0.95) 0%, transparent 70%), linear-gradient(180deg, #fff7ed 0%, #fee2e2 100%)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-500">
          Thử thách Sắc Tết
        </p>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-cocoa-900 sm:text-xl">
          Bé hãy tìm một đồ vật có{' '}
          <span style={{ color: target.hex, textShadow: `0 0 10px ${target.glow}` }}>
            [{target.name}]
          </span>{' '}
          trong nhà nhé! 🧧
        </h2>
        <p className="mt-2 text-sm text-cocoa-700/85">
          <strong className="text-red-500">Gợi ý:</strong> {target.hint}
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
              '0 0 0 0 rgba(239, 68, 68, 0.55)',
              '0 0 0 16px rgba(239, 68, 68, 0)',
            ],
          }}
          transition={{
            boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeOut' },
          }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-red-500 bg-gradient-to-br from-red-500 to-rose-600 px-7 py-3 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
        >
          <Camera className="size-5" />
          Mở Camera Tìm Kiếm
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

/** Festive hero card with the target colour. Warm red↔gold gradient,
 *  floating apricot blossoms + lanterns at the corners, the target
 *  colour rendered as a glowing swatch in the centre. */
function FestiveTargetCard({ target }: { target: TetColor }) {
  return (
    <div className="mx-auto grid max-w-xs place-items-center">
      <motion.div
        className="relative grid size-48 place-items-center rounded-[2.5rem] border-4 border-red-400 shadow-pop sm:size-52"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(circle at 50% 35%, #fef3c7 0%, #fca5a5 65%, #dc2626 100%)',
          boxShadow:
            '0 18px 30px -10px rgba(239, 68, 68, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 0 28px rgba(251, 191, 36, 0.45)',
        }}
      >
        {/* Corner blossoms + lanterns — small bobbing decorations. */}
        <CornerDecor pos="top-left" glyph="🌸" delay={0} />
        <CornerDecor pos="top-right" glyph="🌸" delay={0.4} />
        <CornerDecor pos="bottom-left" glyph="🏮" delay={0.8} />
        <CornerDecor pos="bottom-right" glyph="🏮" delay={1.2} />

        {/* Floor shadow */}
        <motion.span
          aria-hidden
          className="absolute -bottom-3 left-1/2 h-3 w-32 -translate-x-1/2 rounded-full blur-md"
          style={{ background: target.glow }}
          animate={{ width: [128, 96, 128], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Big colour swatch + emoji */}
        <div className="relative grid place-items-center gap-2">
          <motion.span
            aria-hidden
            className="relative grid size-20 place-items-center rounded-full border-4 border-white shadow-pop sm:size-24"
            style={{
              backgroundColor: target.hex,
              boxShadow: `0 0 26px 4px ${target.glow}, 0 0 50px 10px ${target.glow}`,
            }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-4xl leading-none sm:text-5xl" aria-hidden>
              {target.emoji}
            </span>
            {/* Glossy highlight */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-3 size-4 rounded-full bg-white/55 blur-sm"
            />
          </motion.span>
          <span className="rounded-full border-2 border-red-400 bg-white px-3 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-red-500 shadow-soft">
            {target.name}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

function CornerDecor({
  pos,
  glyph,
  delay,
}: {
  pos: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  glyph: string
  delay: number
}) {
  const placement: Record<typeof pos, string> = {
    'top-left': '-left-3 -top-3',
    'top-right': '-right-3 -top-3',
    'bottom-left': '-left-3 -bottom-3',
    'bottom-right': '-right-3 -bottom-3',
  }
  return (
    <motion.span
      aria-hidden
      className={cn(
        'absolute select-none text-2xl leading-none sm:text-3xl',
        placement[pos],
      )}
      animate={{
        rotate: [-8, 8, -8],
        y: [0, -3, 0],
      }}
      transition={{
        duration: 3.2,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        filter: 'drop-shadow(0 4px 6px rgba(127, 29, 29, 0.55))',
      }}
    >
      {glyph}
    </motion.span>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 2 — AR camera with Tết overlay
   ════════════════════════════════════════════════════════════════════ */

interface CameraPhaseProps {
  target: TetColor
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onCapture: () => void
  onCancel: () => void
}

function CameraPhase({
  target,
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
        className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border-4 border-red-500 bg-slate-950 shadow-pop sm:aspect-video sm:max-w-2xl"
        style={{
          boxShadow:
            '0 0 0 4px rgba(251, 191, 36, 0.5), 0 0 28px rgba(239, 68, 68, 0.65), inset 0 0 24px rgba(127, 29, 29, 0.35)',
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

        {/* AR overlay layer — non-interactive, sits above the video.
            Includes the gold-edge inner frame + festive corner emojis
            + the gold dashed reticle in the centre. */}
        <TetAROverlay target={target} />

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
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-yellow-400/70 bg-red-700/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-100 backdrop-blur"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{
                background: target.hex,
                boxShadow: `0 0 8px ${target.glow}`,
              }}
            />
            Tìm {target.name}
          </span>
        </div>

        {/* Bottom chrome — shutter button. */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-center bg-gradient-to-t from-slate-950/85 to-transparent px-4 pb-5 pt-12">
          <motion.button
            type="button"
            onClick={onCapture}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(251, 191, 36, 0.85)',
                '0 0 0 20px rgba(251, 191, 36, 0)',
              ],
            }}
            transition={{
              boxShadow: { duration: 1.4, repeat: Infinity, ease: 'easeOut' },
            }}
            aria-label="Chụp ảnh"
            className="grid place-items-center rounded-full border-4 border-yellow-400 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
            style={{
              width: 78,
              height: 78,
              background: 'radial-gradient(circle at 30% 30%, #fee2e2, #b91c1c)',
            }}
          >
            <span className="grid size-14 place-items-center rounded-full border-2 border-white/40 bg-white/95 text-red-600 shadow-inner sm:size-16">
              <Camera className="size-6 sm:size-7" strokeWidth={2.4} />
            </span>
          </motion.button>
        </div>

        {/* Hidden canvas — sized at capture time. */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      <p className="text-center text-xs text-cocoa-700/70">
        Đưa đồ vật{' '}
        <span style={{ color: target.hex, textShadow: `0 0 6px ${target.glow}` }}>
          {target.name.toLowerCase()}
        </span>{' '}
        vào vòng tròn vàng rồi nhấn nút chụp nhé!
      </p>
    </motion.section>
  )
}

/** Tết-themed AR overlay layered on top of the camera feed. Includes:
 *    • Inner gold edge frame
 *    • Animated blossoms (top corners) + lanterns (bottom corners)
 *    • Gold dashed reticle dead-centre, pulsing
 *  Pointer-events stays off so the shutter + cancel buttons aren't
 *  blocked. */
function TetAROverlay({ target }: { target: TetColor }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
    >
      {/* Inner gold edge frame — sits just inside the viewport border
          so the kid feels like they're looking through an engraved
          Tết lacquer photo frame. */}
      <div
        className="absolute inset-3 rounded-2xl border-2 border-yellow-400/85"
        style={{
          boxShadow:
            'inset 0 0 14px rgba(251, 191, 36, 0.55), 0 0 18px rgba(251, 191, 36, 0.35)',
        }}
      />
      <div className="absolute inset-5 rounded-2xl border border-yellow-200/45" />

      {/* Festive corner emojis — blossoms top, lanterns bottom. They
          bob/rotate gently for an alive feel. */}
      {(
        [
          { pos: 'top-3 left-3', glyph: '🌸', delay: 0 },
          { pos: 'top-3 right-3', glyph: '🌸', delay: 0.4 },
          { pos: 'bottom-3 left-3', glyph: '🏮', delay: 0.8 },
          { pos: 'bottom-3 right-3', glyph: '🏮', delay: 1.2 },
        ] as const
      ).map((d) => (
        <motion.span
          key={d.pos}
          className={cn(
            'absolute select-none text-3xl leading-none sm:text-4xl',
            d.pos,
          )}
          animate={{ rotate: [-8, 8, -8], y: [0, -3, 0] }}
          transition={{
            duration: 3.2,
            delay: d.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            filter:
              'drop-shadow(0 0 6px rgba(252, 211, 77, 0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}
        >
          {d.glyph}
        </motion.span>
      ))}

      {/* Gold dashed reticle — pulsing centre lock zone. Per spec:
          `border-2 border-yellow-400 border-dashed rounded-full`. */}
      <motion.div
        className="absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-yellow-400 sm:size-56"
        animate={{
          opacity: [0.65, 1, 0.65],
          scale: [0.96, 1.04, 0.96],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          boxShadow:
            '0 0 16px rgba(251, 191, 36, 0.85), inset 0 0 18px rgba(251, 191, 36, 0.4)',
        }}
      >
        {/* Centre target dot — tinted to the target colour so the kid
            sees what they're hunting for at the centre of the frame. */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            backgroundColor: target.hex,
            boxShadow: `0 0 14px ${target.glow}`,
          }}
        />
        {/* 4 crosshair ticks at cardinal points */}
        {[
          { c: 'left-1/2 top-0 -translate-x-1/2', l: 'h-3 w-px' },
          { c: 'left-1/2 bottom-0 -translate-x-1/2', l: 'h-3 w-px' },
          { c: 'left-0 top-1/2 -translate-y-1/2', l: 'h-px w-3' },
          { c: 'right-0 top-1/2 -translate-y-1/2', l: 'h-px w-3' },
        ].map((t, i) => (
          <span
            key={i}
            className={cn('absolute bg-yellow-200', t.c, t.l)}
            style={{ boxShadow: '0 0 6px rgba(252, 211, 77, 0.9)' }}
          />
        ))}
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 3 — Festive polaroid review
   ════════════════════════════════════════════════════════════════════ */

interface ReviewPhaseProps {
  target: TetColor
  image: string
  onRetake: () => void
  onSave: () => void
}

function ReviewPhase({ target, image, onRetake, onSave }: ReviewPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={springBouncy}
      className="space-y-5"
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        {/* Festive polaroid — red border, gold accents. The thick gold
            frame + bottom caption strip are ALREADY baked into the
            JPEG; the polaroid wrapper adds the red lacquer frame
            around it for the final printed-photo look. */}
        <motion.div
          className="relative w-full max-w-sm overflow-hidden rounded-xl border-4 border-red-500 bg-gradient-to-b from-red-700 to-red-900 p-3 pb-14 shadow-pop"
          initial={{ rotate: -5, y: 24, opacity: 0 }}
          animate={{ rotate: 2, y: 0, opacity: 1 }}
          transition={{ ...springBouncy, delay: 0.05 }}
          style={{
            boxShadow:
              '0 0 28px rgba(239, 68, 68, 0.6), 0 0 50px rgba(251, 191, 36, 0.35)',
          }}
        >
          {/* Inner gold accent border around the photo */}
          <div className="overflow-hidden rounded-lg border-2 border-yellow-300 bg-black">
            <img
              src={image}
              alt={`Đã tìm thấy ${target.name}`}
              className="block w-full object-cover"
            />
          </div>

          {/* Caption strip with gold text on red */}
          <p
            className="absolute inset-x-3 bottom-3 text-center font-display text-sm font-bold text-yellow-100"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
          >
            Đã tìm thấy sắc{' '}
            <span style={{ color: '#fef3c7' }}>
              {target.name.replace('Màu ', '').replace('May Mắn', '').replace('Phú Quý', '').trim()}
            </span>{' '}
            ngày Tết! 🎆
          </p>

          {/* 4 gold corner ornaments */}
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
                'pointer-events-none absolute size-2 rounded-full bg-yellow-300',
                pos,
              )}
              style={{ boxShadow: '0 0 6px rgba(253, 224, 71, 0.95)' }}
            />
          ))}
        </motion.div>

        <p className="text-center text-sm text-cocoa-700">
          Chúc Mừng Năm Mới! Bé đã chụp được khoảnh khắc{' '}
          <strong style={{ color: target.hex }}>{target.name}</strong> tuyệt
          đẹp. Lưu vào Nhật Ký để ba mẹ cùng xem nhé!
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            onClick={onSave}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-red-500 bg-gradient-to-br from-red-500 to-rose-600 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            style={{ boxShadow: '0 0 18px rgba(239, 68, 68, 0.55)' }}
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
   Saved toast — quick confirmation chip
   ────────────────────────────────────────────────────────────────────
   Copy matches the spec exactly: "Đã lưu vào Album Gia đình!" —
   distinct from the "Nhật Ký Lumina" wording used in other AR
   missions because this one is themed around the family album as
   the saved artefact.
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
            className="inline-flex items-center gap-2 rounded-full border-2 border-yellow-300 bg-red-700/95 px-4 py-2 font-display text-sm font-bold text-yellow-100 shadow-pop backdrop-blur"
            style={{ boxShadow: '0 0 22px rgba(251, 191, 36, 0.65)' }}
          >
            <span className="grid size-6 place-items-center rounded-full bg-yellow-300 text-red-700">
              <Check className="size-4" strokeWidth={3} />
            </span>
            Đã lưu vào Album Gia đình!
            <Sparkles className="size-3.5 fill-yellow-300 stroke-yellow-200" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

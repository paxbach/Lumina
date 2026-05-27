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
  Building2,
  Camera,
  Check,
  RotateCcw,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Confetti } from '@/components/quest/Confetti'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { springBouncy, springSoft } from '@/utils/motion'

/* ════════════════════════════════════════════════════════════════════
   CityBuilderMission ("Đếm Toà Nhà" — Thành Phố Thông Minh)
   ────────────────────────────────────────────────────────────────────
   AR-city counting game. The kid points the environment camera at any
   surface and TAPS to spawn holographic skyscrapers. Each tap inserts
   a building at the exact (x, y) of the tap and bumps the counter; on
   hitting the target, a celebration overlay invites the kid to snap a
   group photo with their AR city. The capture step bakes the building
   icons onto the JPEG via canvas so the saved photo keeps the
   "augmented" cityscape forever.

   Phases:
     intro    → Brief + "Mở Camera" CTA. Camera is OFF.
     build    → Live camera + tap-to-spawn. Counter ticks 0→target.
     capture  → All buildings placed. Glowing border + confetti +
                "📸 Chụp Kỷ Niệm" button. Camera still LIVE so the kid
                sees the final composition before pressing the shutter.
     review   → Polaroid frame holding the baked photo, save / retake.

   Coordinate system: building x/y are in CSS pixels of the viewport
   container (the same coordinate space the tap handler receives via
   `getBoundingClientRect()`). On capture we scale them to canvas
   pixels via the same ratio as drawImage, keeping holograms locked to
   the surfaces the kid tapped.

   Safety: camera tracks stopped on capture, retake, cancel, AND
   unmount cleanup — the hardware light never lingers.
   ════════════════════════════════════════════════════════════════════ */

type Phase = 'intro' | 'build' | 'capture' | 'review'

interface Building {
  id: number
  /** x in container CSS pixels (top-left origin). */
  x: number
  /** y in container CSS pixels. */
  y: number
  icon: string
}

const TARGET_COUNT = 5

// Variety so a skyline of 5 doesn't look like a cloned copy-paste.
// Cycle through them by spawn index.
const BUILDING_ICONS = ['🏢', '🏬', '🏨', '🏤', '🌆'] as const

/** localStorage key shared with ShapeHunterMission + ColorMixGame so
 *  all three AR mini-games push into the same family album. */
const ALBUM_STORAGE_KEY = 'lumina_family_album'

/** Cap output width — keeps each JPEG ~50–80 KB so the album doesn't
 *  blow past localStorage quota. */
const CAPTURE_MAX_WIDTH = 720

interface AlbumEntry {
  image: string
  timestamp: number
  shapeName: string
}

export default function CityBuilderMission() {
  const navigate = useNavigate()
  const saveMemory = useAppStore((s) => s.saveMemory)
  const completeSubNode = useAppStore((s) => s.completeSubNode)
  const setLessonProgress = useAppStore((s) => s.setLessonProgress)

  const [phase, setPhase] = useState<Phase>('intro')
  const [buildings, setBuildings] = useState<Building[]>([])
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  /** Increments on success-celebration enter to re-trigger confetti. */
  const [confettiKey, setConfettiKey] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  /** Crystals/sub-node only credited on the first save in a session. */
  const creditedRef = useRef(false)

  /* ── Camera teardown (idempotent) ─────────────────────────────── */
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

  // Attach stream when the <video> remounts on phase change.
  useEffect(() => {
    if (phase !== 'build' && phase !== 'capture') return
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

  // Auto-advance build → capture when the kid hits the target. Wrapped
  // in an effect so a sequence of rapid taps that overshoot still
  // settle on the celebration phase exactly once.
  useEffect(() => {
    if (phase !== 'build') return
    if (buildings.length >= TARGET_COUNT) {
      setPhase('capture')
      setConfettiKey((k) => k + 1)
    }
  }, [phase, buildings.length])

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
      setBuildings([])
      setPhase('build')
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

  const handleSpawn = (e: MouseEvent<HTMLDivElement>) => {
    // Disabled the moment the count caps. The auto-advance effect will
    // have already flipped phase to 'capture' by next tick.
    if (phase !== 'build' || buildings.length >= TARGET_COUNT) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setBuildings((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        x,
        y,
        icon: BUILDING_ICONS[prev.length % BUILDING_ICONS.length],
      },
    ])
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

    // Target canvas size = same aspect as view, capped at 720 wide.
    const scale = Math.min(1, CAPTURE_MAX_WIDTH / viewW)
    const canvasW = Math.round(viewW * scale)
    const canvasH = Math.round(viewH * scale)
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ─── 1. Draw the live video frame, matching object-cover crop ──
    // object-cover crops the video so it fills the container; we
    // replicate that crop with drawImage's source rect so the baked
    // photo matches what the kid saw on screen pixel-for-pixel.
    const videoW = video.videoWidth
    const videoH = video.videoHeight
    if (videoW > 0 && videoH > 0) {
      const videoAspect = videoW / videoH
      const canvasAspect = canvasW / canvasH
      let sx = 0
      let sy = 0
      let sw = videoW
      let sh = videoH
      if (videoAspect > canvasAspect) {
        // Video wider than container → crop sides.
        sw = videoH * canvasAspect
        sx = (videoW - sw) / 2
      } else {
        // Video taller than container → crop top/bottom.
        sh = videoW / canvasAspect
        sy = (videoH - sh) / 2
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvasW, canvasH)
    } else {
      // Video metadata not ready yet — fill with slate so at least the
      // baked emojis still show on a stable background.
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvasW, canvasH)
    }

    // ─── 2. Bake each building icon at its tapped coordinate ────────
    // View → canvas coord mapping uses the same uniform `scale` since
    // canvas aspect == view aspect by construction. Emoji rendered via
    // fillText against the system emoji font — colour comes for free.
    const fontPx = Math.round(56 * scale)
    ctx.font = `${fontPx}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(99, 102, 241, 0.95)'
    ctx.shadowBlur = 22 * scale
    buildings.forEach((b) => {
      const x = b.x * scale
      const y = b.y * scale
      ctx.fillText(b.icon, x, y)
    })
    ctx.shadowBlur = 0

    // ─── 3. Caption strip ──────────────────────────────────────────
    // Bottom-left badge "+5 toà nhà" stamped into the JPEG so the
    // saved photo is self-describing even outside the app.
    const stampPad = 14 * scale
    const stampFont = Math.round(18 * scale)
    ctx.font = `bold ${stampFont}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
    ctx.shadowBlur = 4
    ctx.fillStyle = '#fef3c7'
    ctx.fillText(
      `🏙️ ${TARGET_COUNT} toà nhà · Lumina City`,
      stampPad,
      canvasH - stampPad,
    )
    ctx.shadowBlur = 0

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    stopCamera() // release hardware immediately
    setPhase('review')
  }

  const handleBuildAgain = () => {
    // Retake from review → fresh stream, fresh skyline.
    setCapturedImage(null)
    setBuildings([])
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        streamRef.current = stream
        setPhase('build')
      } catch {
        setPhase('intro')
      }
    })()
  }

  const handleCancelBuild = () => {
    stopCamera()
    setBuildings([])
    setPhase('intro')
  }

  const handleSave = () => {
    if (!capturedImage) return

    // 1. Append to the spec-named localStorage album.
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
      shapeName: `${TARGET_COUNT} toà nhà thông minh`,
    })
    try {
      window.localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(album))
    } catch {
      /* Quota — keep going so the diary save below still fires. */
    }

    // 2. Mirror into the in-app diary so the photo also lands in
    //    FamilyPage's scrapbook.
    saveMemory({
      imagePath: capturedImage,
      questTitle: `Kiến trúc sư Lumina · ${TARGET_COUNT} toà nhà`,
      regionId: 'thanh-pho-thong-minh',
    })

    // 3. Credit the lesson + sub-node once per session so the world-
    //    map completion ring lights up.
    if (!creditedRef.current) {
      creditedRef.current = true
      setLessonProgress('numbers', 1)
      completeSubNode('thanh-pho-thong-minh', 'tptm-dem-toa-nha')
    }

    // 4. Toast + bounce back to the Smart City sub-map.
    setSavedToast(true)
    window.setTimeout(() => {
      navigate('/map?region=thanh-pho-thong-minh')
    }, 1600)
  }

  const handleExit = () => {
    stopCamera()
    navigate('/map?region=thanh-pho-thong-minh')
  }

  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-lavender-500">
            Thành Phố Thông Minh
          </p>
          <h1 className="text-xl font-display font-bold text-cocoa-900 sm:text-2xl">
            Kiến Trúc Sư Lumina
          </h1>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroPhase
            key="intro"
            targetCount={TARGET_COUNT}
            error={cameraError}
            onOpenCamera={handleOpenCamera}
            onExit={handleExit}
          />
        )}
        {(phase === 'build' || phase === 'capture') && (
          <BuildPhase
            key="build"
            phase={phase}
            buildings={buildings}
            targetCount={TARGET_COUNT}
            containerRef={containerRef}
            videoRef={videoRef}
            canvasRef={canvasRef}
            confettiKey={confettiKey}
            onSpawn={handleSpawn}
            onCapture={handleCapture}
            onCancel={handleCancelBuild}
          />
        )}
        {phase === 'review' && capturedImage && (
          <ReviewPhase
            key="review"
            image={capturedImage}
            targetCount={TARGET_COUNT}
            onRetake={handleBuildAgain}
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
  targetCount: number
  error: string | null
  onOpenCamera: () => void
  onExit: () => void
}

function IntroPhase({
  targetCount,
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
      {/* Floating mini-skyline card */}
      <div className="mx-auto grid max-w-xs place-items-center">
        <motion.div
          className="relative grid h-44 w-full place-items-end rounded-[2.25rem] border-4 border-lavender-300 bg-gradient-to-b from-slate-900 via-indigo-900 to-lavender-700 px-3 py-3 shadow-pop"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            boxShadow:
              '0 18px 30px -10px rgba(99, 102, 241, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
          }}
        >
          {/* Star sky dots */}
          {[
            { top: '15%', left: '12%' },
            { top: '22%', left: '78%' },
            { top: '35%', left: '45%' },
            { top: '10%', left: '60%' },
          ].map((p, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute size-1 rounded-full bg-white"
              style={{
                ...p,
                boxShadow: '0 0 8px rgba(255,255,255,0.95)',
              }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 2.4,
                delay: i * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Skyline silhouette */}
          <div className="flex w-full items-end justify-around gap-1">
            {[40, 64, 52, 76, 48].map((h, i) => (
              <motion.span
                key={i}
                className="relative inline-block w-7 rounded-t-md bg-gradient-to-b from-lavender-300 to-indigo-500 sm:w-8"
                style={{ height: h }}
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={{
                  duration: 2.2 + i * 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {/* Lit windows */}
                <span
                  aria-hidden
                  className="absolute left-1/2 top-2 size-1.5 -translate-x-1/2 rounded-sm bg-butter-300"
                  style={{ boxShadow: '0 0 6px rgba(252,211,77,0.9)' }}
                />
                <span
                  aria-hidden
                  className="absolute left-1/2 top-6 size-1.5 -translate-x-1/2 rounded-sm bg-butter-300"
                  style={{ boxShadow: '0 0 6px rgba(252,211,77,0.9)' }}
                />
              </motion.span>
            ))}
          </div>

          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-lavender-300 bg-cream-50 px-3 py-0.5 font-display text-xs font-bold text-lavender-500 shadow-soft">
            Lumina City
          </span>
        </motion.div>
      </div>

      <div
        className="mx-auto max-w-xl rounded-3xl border-4 border-lavender-300 bg-cream-50 p-5 text-center shadow-pop sm:p-6"
        style={{
          backgroundImage:
            'radial-gradient(80% 100% at 50% 0%, var(--color-lavender-100) 0%, transparent 70%), linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-cream-100) 100%)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
          Thử thách Đếm Số
        </p>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-cocoa-900 sm:text-xl">
          Mở camera và chạm vào màn hình để{' '}
          <span className="text-lavender-500">xây {targetCount} toà nhà</span>{' '}
          ngay trong phòng nhé!
        </h2>
        <p className="mt-2 text-sm text-cocoa-700/85">
          Mỗi lần bé chạm là một toà nhà lung linh mọc lên. Đếm to lên cùng
          Lumi: <strong className="text-lavender-500">1, 2, 3…</strong>
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

/* ════════════════════════════════════════════════════════════════════
   Phase 2 + 3 — Build / Capture (same viewport, different overlays)
   ════════════════════════════════════════════════════════════════════ */

interface BuildPhaseProps {
  phase: Phase
  buildings: Building[]
  targetCount: number
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  confettiKey: number
  onSpawn: (e: MouseEvent<HTMLDivElement>) => void
  onCapture: () => void
  onCancel: () => void
}

function BuildPhase({
  phase,
  buildings,
  targetCount,
  containerRef,
  videoRef,
  canvasRef,
  confettiKey,
  onSpawn,
  onCapture,
  onCancel,
}: BuildPhaseProps) {
  const matched = phase === 'capture'
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
        className={cn(
          'relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border-4 bg-slate-950 shadow-pop transition-colors sm:aspect-video sm:max-w-2xl',
          matched ? 'border-emerald-400' : 'border-lavender-500',
        )}
        style={{
          // Glowing border when celebrating — uses box-shadow not
          // border-width so the layout doesn't jump.
          boxShadow: matched
            ? '0 0 0 4px rgba(52, 211, 153, 0.5), 0 0 32px rgba(52, 211, 153, 0.7), inset 0 0 24px rgba(52, 211, 153, 0.35)'
            : '0 0 24px rgba(99, 102, 241, 0.4)',
        }}
      >
        {/* Live camera */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 size-full object-cover"
        />

        {/* Tap layer — transparent, captures every click. Disabled
            in 'capture' phase so the kid can't shove in a 6th building
            past the target. */}
        <div
          aria-hidden
          role="presentation"
          onClick={matched ? undefined : onSpawn}
          className={cn(
            'absolute inset-0 z-10',
            matched ? 'cursor-default' : 'cursor-crosshair',
          )}
          style={{ touchAction: 'manipulation' }}
        />

        {/* Top scrim + counter */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 bg-gradient-to-b from-slate-950/85 to-transparent px-4 pb-8 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur hover:bg-white/25"
          >
            <ArrowLeft className="size-3.5" />
            Huỷ
          </button>

          <motion.div
            key={buildings.length}
            initial={{ scale: 0.6, y: -6, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={springBouncy}
            className={cn(
              'pointer-events-auto inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-2 font-display font-bold shadow-pop backdrop-blur',
              matched
                ? 'border-emerald-300 bg-emerald-500/30 text-emerald-50'
                : 'border-lavender-300 bg-lavender-500/30 text-lavender-50',
            )}
            style={{
              boxShadow: matched
                ? '0 0 18px rgba(52, 211, 153, 0.7)'
                : '0 0 14px rgba(167, 139, 250, 0.55)',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.55)',
            }}
          >
            <Building2 className="size-4" />
            <span className="text-lg tabular-nums sm:text-xl">
              {buildings.length}
            </span>
            <span className="text-sm opacity-80">/ {targetCount}</span>
          </motion.div>
        </div>

        {/* Holographic building markers — each pops in with a spring
            then bobs gently so the AR composition feels alive. */}
        <div className="pointer-events-none absolute inset-0 z-20">
          {buildings.map((b) => (
            <BuildingMarker key={b.id} building={b} />
          ))}
        </div>

        {/* Confetti — fires on phase transition into 'capture'. */}
        {matched && (
          <Confetti
            key={`confetti-${confettiKey}`}
            trigger={confettiKey}
            count={48}
            className="z-30"
          />
        )}

        {/* Bottom scrim — only when celebrating, holds the shutter CTA. */}
        <AnimatePresence>
          {matched && (
            <motion.div
              key="capture-cta"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={springBouncy}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 bg-gradient-to-t from-slate-950/90 to-transparent px-4 pb-5 pt-12"
            >
              <p
                className="font-display text-sm font-bold text-emerald-200 sm:text-base"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
              >
                Tuyệt vời! Bé đã xây xong {targetCount} toà nhà!
              </p>
              <motion.button
                type="button"
                onClick={onCapture}
                whileHover={{ y: -2, scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(52, 211, 153, 0.7)',
                    '0 0 0 18px rgba(52, 211, 153, 0)',
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeOut',
                  },
                }}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-[3px] border-emerald-400 bg-gradient-to-br from-emerald-400 to-emerald-600 px-6 py-3 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
              >
                <Camera className="size-5" />
                📸 Chụp Kỷ Niệm
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden canvas — sized at capture time. */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      <p className="text-center text-xs text-cocoa-700/70">
        {matched
          ? 'Đứng cùng thành phố của bé và nhấn nút máy ảnh nhé!'
          : `Chạm vào màn hình ${targetCount - buildings.length} lần nữa để xây xong thành phố!`}
      </p>
    </motion.section>
  )
}

/** A single tapped building — pops in with spring, then gentle infinite
 *  bob. Drop-shadow makes it read as a holographic projection floating
 *  above the camera surface. */
function BuildingMarker({ building }: { building: Building }) {
  return (
    <motion.div
      className="absolute select-none"
      style={{
        left: building.x,
        top: building.y,
        // -translate centres the emoji visually on the tap point.
        transform: 'translate(-50%, -55%)',
      }}
      initial={{ scale: 0, y: 50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={springBouncy}
    >
      <motion.span
        aria-hidden
        className="block text-5xl leading-none sm:text-6xl"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          filter:
            'drop-shadow(0 0 10px rgba(99, 102, 241, 0.95)) drop-shadow(0 0 22px rgba(167, 139, 250, 0.55))',
        }}
      >
        {building.icon}
      </motion.span>
      {/* Glowing ground halo under each building */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full h-2 w-12 -translate-x-1/2 -translate-y-1 rounded-full bg-lavender-300 opacity-70 blur-md"
      />
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 4 — Polaroid review
   ════════════════════════════════════════════════════════════════════ */

interface ReviewPhaseProps {
  image: string
  targetCount: number
  onRetake: () => void
  onSave: () => void
}

function ReviewPhase({
  image,
  targetCount,
  onRetake,
  onSave,
}: ReviewPhaseProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={springBouncy}
      className="space-y-5"
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <motion.div
          className="relative w-full max-w-sm overflow-hidden rounded-xl border-4 border-lavender-400 bg-slate-900 p-3 pb-12 shadow-pop"
          initial={{ rotate: -5, y: 24, opacity: 0 }}
          animate={{ rotate: 2, y: 0, opacity: 1 }}
          transition={{ ...springBouncy, delay: 0.05 }}
          style={{
            boxShadow:
              '0 0 28px rgba(99, 102, 241, 0.65), 0 0 50px rgba(167, 139, 250, 0.35)',
          }}
        >
          <div className="overflow-hidden rounded-lg bg-black">
            <img
              src={image}
              alt={`Thành phố ${targetCount} toà nhà của bé`}
              className="block w-full object-cover"
            />
          </div>

          <p
            className="absolute inset-x-3 bottom-3 text-center font-display text-sm font-bold text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
          >
            🏙️ Kiến Trúc Sư Lumina · {targetCount} toà nhà
          </p>

          {/* Indigo corner mounts → sci-fi photo frame feel */}
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
                'pointer-events-none absolute size-1.5 rounded-full bg-lavender-200',
                pos,
              )}
              style={{ boxShadow: '0 0 6px rgba(196,181,253,0.95)' }}
            />
          ))}
        </motion.div>

        <p className="text-center text-sm text-cocoa-700">
          Tuyệt vời! Bé đã trở thành{' '}
          <strong className="text-lavender-500">Kiến trúc sư Lumina</strong> và
          xây xong cả một thành phố nhỏ. Lưu vào Nhật Ký để ba mẹ cùng xem nhé!
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
            Xây lại
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
          className="fixed left-1/2 top-6 z-50 -translate-x-1/2"
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={springBouncy}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-300 bg-white/90 px-4 py-2 font-display text-sm font-bold text-emerald-700 shadow-pop backdrop-blur"
            style={{ boxShadow: '0 0 18px rgba(52, 211, 153, 0.55)' }}
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

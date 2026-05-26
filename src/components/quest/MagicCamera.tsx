import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ImageIcon, RotateCcw, Sparkles, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { springBouncy, springSoft } from '@/utils/motion'
import { Button } from '@/components/ui/Button'
import { BurstParticles } from '@/components/games/BurstParticles'
import { StarSticker } from '@/components/family/StarSticker'
import {
  DecorateMemoryScreen,
  type MemoryDecoration,
} from '@/components/quest/DecorateMemoryScreen'
import { Sparkles as SparklesIcon } from 'lucide-react'

/**
 * MagicCamera — Lumina Radiant Pastel viewfinder + 2-mode capture (real
 * camera via getUserMedia, or upload via <input type="file">). Once a
 * photo arrives, it is enshrined in a glowing polaroid that pulses with
 * "knowledge light".
 *
 * Layout:
 *   ┌── Header (eyebrow + title + subtitle) ───────────────┐
 *   │                                                       │
 *   │  ┌── Viewfinder ─────────────────────────────────┐   │
 *   │  │  ✦ corner stars  ✦                            │   │
 *   │  │                                                │   │
 *   │  │     [placeholder | <video> | <polaroid>]      │   │
 *   │  │                                                │   │
 *   │  │  🌱 bottom sprouts 🌱                         │   │
 *   │  └────────────────────────────────────────────────┘   │
 *   │                                                       │
 *   │  ┌── Action row ───────────────────────────────────┐ │
 *   │  │ idle     → [📸 Chụp ảnh ngay] [🖼️ Tải từ album]  │ │
 *   │  │ live     → [● Chụp!] [✕ Đóng]                   │ │
 *   │  │ captured → [↺ Chụp lại]                          │ │
 *   │  └─────────────────────────────────────────────────┘ │
 *   └───────────────────────────────────────────────────────┘
 */

type Stage = 'idle' | 'live' | 'captured' | 'decorating' | 'saved' | 'error'

interface MagicCameraProps {
  title?: string
  subtitle?: string
  /**
   * Fires when the kid commits the photo via "Lưu vào Nhật ký Ánh sáng" in
   * the decoration step. Receives the raw image plus the optional decoration
   * payload (stickers + parent note). May return a Promise — the decorate
   * screen will keep its spinner up until resolution so the kid never sees
   * a fake "Đã lưu" on a failed save.
   */
  onCapture?: (
    imageDataUrl: string,
    decoration?: MemoryDecoration,
  ) => Promise<void> | void
  /**
   * Fires when the kid taps "Chụp lại" (retake). The parent can clear
   * any cached `initialImage` / saved flag so debug state stays clean
   * and a subsequent save flows through the full pipeline again.
   */
  onReset?: () => void
  /**
   * Fires when the kid taps the X in the full-screen overlay header.
   * Default behaviour (no prop) just collapses the overlay back to the
   * inline `idle` state. Parents that want to bounce the kid further
   * back (e.g. to the quest briefing) hook in here.
   */
  onExit?: () => void
  /** Display this image as the initial captured state. */
  initialImage?: string | null
  /** Label under the polaroid (e.g. quest title). */
  polaroidCaption?: string
  className?: string
}

/**
 * Stages that should commandeer the entire viewport. We render those
 * via a portal at `z-50` to escape the AppShell bottom-nav (`z-30`) and
 * any parent transforms / stacking contexts that would otherwise clip
 * `position: fixed`. Idle / saved / error stay inline so the kid sees
 * the polaroid in the surrounding quest layout.
 */
const OVERLAY_STAGES: ReadonlySet<Stage> = new Set([
  'live',
  'captured',
  'decorating',
])

export function MagicCamera({
  title = 'Lưu khoảnh khắc thật',
  subtitle = 'Bé có thể chụp ảnh thật hoặc chọn ảnh từ thư viện — Lumi sẽ nạp ánh sáng tri thức vào ảnh.',
  onCapture,
  onReset,
  onExit,
  initialImage,
  polaroidCaption,
  className,
}: MagicCameraProps) {
  const { play } = useSound()

  const [stage, setStage] = useState<Stage>(initialImage ? 'captured' : 'idle')
  const [image, setImage] = useState<string | null>(initialImage ?? null)
  const [error, setError] = useState<string | null>(null)
  /** Re-trigger the burst-particles / glow flash on every new capture. */
  const [burstKey, setBurstKey] = useState(0)
  /** Holds the saved decoration so the "saved" stage can re-display it. */
  const [savedDecoration, setSavedDecoration] = useState<MemoryDecoration | null>(null)
  /**
   * True while the parent's `onCapture` promise is in flight (canvas
   * EXIF strip + diary write). Passed into DecorateMemoryScreen so the
   * spinner replaces the save icon and edits stay locked. Setting it
   * back to false also triggers the transition to `stage = 'saved'`.
   */
  const [isSaving, setIsSaving] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Cleanup any active camera stream on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  /* ── Camera control ────────────────────────────────────────────── */

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const startCamera = async () => {
    play('pop')
    setError(null)

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        'Trình duyệt của bé chưa hỗ trợ camera. Bé thử "Tải ảnh từ album" nhé!',
      )
      setStage('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setStage('live')
      // The <video> only mounts on `live` — attach the stream after render.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
    } catch (e) {
      stopStream()
      setError(
        'Lumi cần xin phép camera. Hãy cho phép trong trình duyệt rồi thử lại nhé!',
      )
      setStage('error')
    }
  }

  const snapPhoto = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    play('correct')

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86)

    stopStream()
    setImage(dataUrl)
    setStage('captured')
    setBurstKey(Date.now())
    // NOTE: onCapture intentionally fires later — at the "Save" commit point
    // in the decoration step, not on snap. This lets the kid keep / discard /
    // decorate before committing to the Light Journal.
  }

  const cancelLive = () => {
    play('tap')
    stopStream()
    setStage('idle')
  }

  /* ── File upload ──────────────────────────────────────────────── */

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result
      if (typeof dataUrl !== 'string') return
      play('correct')
      setImage(dataUrl)
      setStage('captured')
      setBurstKey(Date.now())
      // Same as snap — defer onCapture until the kid commits in the decorate step.
    }
    reader.readAsDataURL(file)

    // Allow re-selecting the same file later
    e.target.value = ''
  }

  const handleRetake = () => {
    play('tap')
    setImage(null)
    setSavedDecoration(null)
    setStage('idle')
    setError(null)
    // Notify the parent so its `capturedImage` / `isPhotoSaved` state
    // resets in lockstep — otherwise stale flags could pretend the kid
    // already committed a memory that they just discarded.
    onReset?.()
  }

  /* ── Decoration flow ─────────────────────────────────────────── */

  const goToDecorate = () => {
    if (!image) return
    play('pop')
    setStage('decorating')
  }

  const handleDecorateBack = () => {
    if (isSaving) return
    play('tap')
    setStage('captured')
  }

  /**
   * Awaits the parent's persistence promise before transitioning to the
   * `saved` stage. While the promise is in flight, `isSaving` flips true
   * → DecorateMemoryScreen renders its stardust spinner over the save
   * button and locks the sticker palette / parent note input. Only when
   * the promise resolves cleanly does the kid see "✓ Đã lưu" on the
   * polaroid — no fake feedback on a failed save.
   */
  const handleDecorateSave = async (decoration: MemoryDecoration) => {
    if (!image || isSaving) return
    setSavedDecoration(decoration)
    setIsSaving(true)
    try {
      await onCapture?.(image, decoration)
      setStage('saved')
    } catch {
      // Stay on the decorating screen so the kid can retry; the
      // parent's error toast (if any) will surface alongside.
    } finally {
      setIsSaving(false)
    }
  }

  /* ── Exit (full-screen overlay X button) ─────────────────────── */

  const handleExit = () => {
    if (isSaving) return
    play('tap')
    stopStream()
    setImage(null)
    setSavedDecoration(null)
    setStage('idle')
    setError(null)
    onReset?.()
    onExit?.()
  }

  /* ── Render ───────────────────────────────────────────────────── */

  const useOverlay = OVERLAY_STAGES.has(stage)

  // Inline section — shown for idle / saved / error so the kid still
  // sees the polaroid in context. When the overlay is up, we collapse
  // the inline UI to a compact "đang ở camera" pill instead of a
  // full-height empty Card so the surrounding layout doesn't jitter.
  const inlineSection = useOverlay ? (
    <OverlayInlineStub onResume={() => { /* overlay already handles UX */ }} />
  ) : (
    <section className={cn('relative space-y-5', className)}>
      <Header
        title={stage === 'saved' ? 'Khoảnh khắc đã vào Nhật ký!' : title}
        subtitle={
          stage === 'saved'
            ? 'Lumi đã cất tấm ảnh cùng sticker và lời nhắn vào Nhật ký Ánh sáng. Cùng xem ở trang Gia đình nhé!'
            : subtitle
        }
      />

      <Viewfinder>
        <AnimatePresence mode="wait">
          {stage === 'idle' && <IdlePlaceholder key="idle" />}

          {stage === 'error' && (
            <ErrorState key="error" message={error ?? ''} />
          )}

          {stage === 'saved' && image && (
            <CapturedPolaroid
              key="saved"
              image={image}
              caption={savedDecoration?.note?.trim() || polaroidCaption}
              burstKey={burstKey}
              showSavedBadge
            />
          )}
        </AnimatePresence>
      </Viewfinder>

      <ActionRow
        stage={stage}
        onCamera={startCamera}
        onPickFile={() => {
          play('pop')
          fileInputRef.current?.click()
        }}
        onSnap={snapPhoto}
        onCancelLive={cancelLive}
        onRetake={handleRetake}
        onDecorate={goToDecorate}
      />

      {/* Hidden file input — triggered by "Tải từ album" button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
    </section>
  )

  return (
    <>
      {inlineSection}

      <FullScreenOverlay
        open={useOverlay}
        onExit={handleExit}
        canExit={!isSaving}
      >
        <AnimatePresence mode="wait">
          {stage === 'live' && (
            <LiveStageView
              key="live"
              videoRef={videoRef}
              onSnap={snapPhoto}
              onCancel={cancelLive}
            />
          )}

          {stage === 'captured' && image && (
            <CapturedStageView
              key="captured"
              image={image}
              caption={polaroidCaption}
              burstKey={burstKey}
              onRetake={handleRetake}
              onDecorate={goToDecorate}
            />
          )}

          {stage === 'decorating' && image && (
            <motion.div
              key="decorating"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={springSoft}
              className="mx-auto w-full max-w-2xl"
            >
              <DecorateMemoryScreen
                image={image}
                defaultNote={savedDecoration?.note}
                onSave={handleDecorateSave}
                onBack={handleDecorateBack}
                isSaving={isSaving}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </FullScreenOverlay>
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   FullScreenOverlay — portal-mounted, escapes AppShell bottom nav
   ────────────────────────────────────────────────────────────────────
   Renders into document.body so `position: fixed` reliably pins to the
   viewport regardless of parent transforms / filters / contain. Keeps
   the kid on the camera UI even when the bottom nav (z-30) or mobile
   keyboard would otherwise overlap.
   ════════════════════════════════════════════════════════════════════ */

interface FullScreenOverlayProps {
  open: boolean
  onExit: () => void
  /** Disabled while saving — prevents the kid accidentally bailing mid-save. */
  canExit: boolean
  children: React.ReactNode
}

function FullScreenOverlay({
  open,
  onExit,
  canExit,
  children,
}: FullScreenOverlayProps) {
  // Lock body scroll while the overlay is up — keyboard / pinch-zoom
  // shouldn't drag the viewport away from the camera UI.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (typeof document === 'undefined') return null

  const node = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="magic-camera-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Camera Phép Thuật"
          className="fixed inset-0 z-50 flex flex-col bg-cocoa-900/95 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            // Subtle warm radial behind the content so the black isn't flat
            backgroundImage:
              'radial-gradient(60% 60% at 50% 30%, rgba(255, 215, 120, 0.10) 0%, transparent 70%), radial-gradient(60% 60% at 50% 110%, rgba(180, 140, 255, 0.10) 0%, transparent 70%)',
          }}
        >
          {/* Top exit bar — sits ABOVE everything inside the overlay. */}
          <header
            className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-butter-300/60 bg-cocoa-900/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-butter-200 shadow-soft">
              <SparklesIcon className="size-3.5 fill-butter-300 stroke-butter-300" />
              Camera Phép Thuật
            </span>
            <motion.button
              type="button"
              onClick={onExit}
              disabled={!canExit}
              aria-label="Đóng camera"
              whileTap={canExit ? { scale: 0.94 } : undefined}
              whileHover={canExit ? { scale: 1.04 } : undefined}
              transition={springBouncy}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-display text-sm font-bold shadow-pop transition-colors',
                canExit
                  ? 'border-peach-300 bg-peach-100 text-peach-500 hover:bg-peach-200'
                  : 'cursor-not-allowed border-cream-200/40 bg-cocoa-900/40 text-cream-100/60',
              )}
            >
              <X className="size-4" />
              Thoát
            </motion.button>
          </header>

          {/* Scrollable body — flex-1 so it fills remaining space. */}
          <div className="flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(node, document.body)
}

/**
 * Tiny inline placeholder shown when the overlay has taken over. Lets
 * the kid see at-a-glance that the camera is somewhere on screen even
 * if their parent looks over their shoulder and only sees the page.
 */
function OverlayInlineStub({ onResume }: { onResume: () => void }) {
  return (
    <button
      type="button"
      onClick={onResume}
      className="flex w-full items-center justify-center gap-2 rounded-cozy border-2 border-dashed border-butter-300 bg-butter-50/60 px-4 py-6 text-sm font-semibold text-butter-500 shadow-soft hover:bg-butter-50"
    >
      <Camera className="size-4" />
      Camera đang mở trên toàn màn hình
    </button>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Stage views inside the overlay — wrap the existing inline elements
   in a centered, dark-friendly layout
   ════════════════════════════════════════════════════════════════════ */

function LiveStageView({
  videoRef,
  onSnap,
  onCancel,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  onSnap: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      key="live"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={springSoft}
      className="mx-auto flex w-full max-w-md flex-col items-center gap-5"
    >
      <Viewfinder>
        <LiveView videoRef={videoRef} />
      </Viewfinder>
      <div className="flex items-center justify-center gap-3">
        <SnapButton onClick={onSnap} />
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200/60 bg-cocoa-900/40 px-4 py-2 font-display text-sm font-bold text-cream-50 shadow-soft hover:bg-cocoa-900/60"
        >
          <X className="size-4" />
          Hủy
        </button>
      </div>
    </motion.div>
  )
}

function CapturedStageView({
  image,
  caption,
  burstKey,
  onRetake,
  onDecorate,
}: {
  image: string
  caption?: string
  burstKey: number
  onRetake: () => void
  onDecorate: () => void
}) {
  return (
    <motion.div
      key="captured"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={springSoft}
      className="mx-auto flex w-full max-w-md flex-col items-center gap-5"
    >
      <Viewfinder>
        <CapturedPolaroid image={image} caption={caption} burstKey={burstKey} />
      </Viewfinder>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200/60 bg-cocoa-900/40 px-4 py-2 font-display text-sm font-bold text-cream-50 shadow-soft hover:bg-cocoa-900/60"
        >
          <RotateCcw className="size-4" />
          Chụp lại
        </button>
        <Button
          tone="butter"
          size="md"
          onClick={onDecorate}
          leftIcon={<SparklesIcon className="size-5" />}
        >
          Trang trí kỷ niệm
        </Button>
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Header
   ════════════════════════════════════════════════════════════════════ */

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="text-center">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-butter-500">
        <Sparkles className="size-3.5 fill-butter-400 stroke-butter-500" />
        Camera Phép Thuật
      </p>
      <h3 className="mt-1 font-display text-2xl font-bold text-cocoa-900">
        {title}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-cocoa-700/80">
        {subtitle}
      </p>
    </header>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Viewfinder — gradient border + corner stars + bottom sprouts
   ════════════════════════════════════════════════════════════════════ */

function Viewfinder({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Outer radiant frame */}
      <div
        className="relative overflow-hidden rounded-cozy border-4 border-butter-300 p-2"
        style={{
          boxShadow:
            '0 0 18px 4px var(--color-butter-glow), var(--shadow-pop)',
          backgroundImage: `
            radial-gradient(60% 80% at 50% 0%, var(--color-butter-100) 0%, transparent 65%),
            radial-gradient(60% 80% at 50% 100%, var(--color-peach-100) 0%, transparent 65%),
            linear-gradient(160deg, var(--color-cream-50) 0%, var(--color-butter-50) 100%)
          `,
        }}
      >
        {/* Inner content area (4:3) */}
        <div
          className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-cream-100"
          style={{
            backgroundImage:
              'radial-gradient(60% 80% at 50% 50%, #1c1430 0%, #100922 100%)',
          }}
        >
          {children}
        </div>

        {/* Corner decorations — stars at top, sprouts at bottom */}
        <StarSticker
          color="butter" size={28} rotation={-18}
          style={{ position: 'absolute', top: -12, left: -12, zIndex: 5 }}
        />
        <StarSticker
          color="peach" size={26} rotation={22}
          style={{ position: 'absolute', top: -12, right: -10, zIndex: 5 }}
        />
        <span
          aria-hidden
          className="absolute -bottom-3 left-3 select-none text-2xl"
          style={{ filter: 'drop-shadow(0 2px 3px rgba(60,40,20,0.2))' }}
        >
          🌱
        </span>
        <span
          aria-hidden
          className="absolute -bottom-3 right-3 select-none text-2xl"
          style={{ filter: 'drop-shadow(0 2px 3px rgba(60,40,20,0.2))' }}
        >
          🌱
        </span>
      </div>

      {/* Drifting ambient sparkles around the frame */}
      <FrameSparkles />
    </div>
  )
}

function FrameSparkles() {
  // 6 sparkles around the frame at fixed angles, each on its own phase.
  const items = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2 + Math.PI / 4
        const r = 56 // % of half min-dim from frame center
        return {
          id: i,
          x: 50 + Math.cos(angle) * r,
          y: 50 + Math.sin(angle) * r * 0.6,
          size: 10 + (i % 3) * 3,
          delay: (i * 0.32) % 2,
        }
      }),
    [],
  )
  return (
    <div aria-hidden className="pointer-events-none absolute inset-[-8%]">
      {items.map((s) => (
        <motion.span
          key={s.id}
          className="absolute select-none text-butter-glow"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            fontSize: s.size,
            color: 'var(--color-butter-glow)',
            filter: 'drop-shadow(0 0 4px var(--color-butter-glow))',
          }}
          animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.8,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Stage views
   ════════════════════════════════════════════════════════════════════ */

function IdlePlaceholder() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.span
        className="text-5xl"
        animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 0 12px var(--color-butter-glow))' }}
      >
        📸
      </motion.span>
      <p className="px-6 font-display text-sm font-semibold text-butter-100">
        Lumi đang đợi… đặt khoảnh khắc vào khung nhé!
      </p>

      {/* Faint reticle in the centre */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-butter-300/40"
      />
    </motion.div>
  )
}

function LiveView({
  videoRef,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
}) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="size-full object-cover"
      />

      {/* Live indicator + scan-line */}
      <span
        aria-hidden
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/40 bg-cocoa-900/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cream-50 backdrop-blur"
      >
        <span className="size-1.5 animate-ping rounded-full bg-peach-400" />
        LIVE
      </span>
      <motion.span
        aria-hidden
        className="absolute inset-x-3 h-0.5 rounded-full bg-butter-300/70"
        style={{ boxShadow: '0 0 12px var(--color-butter-glow)' }}
        initial={{ y: '20%' }}
        animate={{ y: '80%' }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <span className="text-4xl">🔒</span>
      <p className="font-display text-sm font-semibold text-peach-200">
        Camera chưa sẵn sàng
      </p>
      <p className="text-xs leading-relaxed text-cream-100/80">{message}</p>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   CapturedPolaroid — photo + glow burst + pulsing tone-rotating halo
   ════════════════════════════════════════════════════════════════════ */

function CapturedPolaroid({
  image,
  caption,
  burstKey,
  showSavedBadge,
}: {
  image: string
  caption?: string
  burstKey: number
  /** When true, overlays a "✓ Đã lưu vào Nhật ký" badge in the corner. */
  showSavedBadge?: boolean
}) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Sparkle burst — fires once per new capture, key-triggered */}
      <BurstParticles
        trigger={burstKey}
        tone="butter"
        count={20}
        radius={120}
      />

      <motion.figure
        initial={{ scale: 0.78, rotate: -6, opacity: 0, y: 10 }}
        animate={{ scale: 1, rotate: -2, opacity: 1, y: 0 }}
        transition={springBouncy}
        className="relative w-[78%] rounded-lg border-[10px] border-cream-50 bg-cream-50 pb-3 shadow-pop"
      >
        {/* Pulsing tone-rotating halo around the polaroid — "knowledge
            light loading into the photo" */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-xl"
          animate={{
            boxShadow: [
              '0 0 28px 6px var(--color-butter-glow), 0 0 56px 14px var(--color-butter-glow)',
              '0 0 28px 6px var(--color-peach-glow),  0 0 56px 14px var(--color-peach-glow)',
              '0 0 28px 6px var(--color-lavender-glow), 0 0 56px 14px var(--color-lavender-glow)',
              '0 0 28px 6px var(--color-butter-glow), 0 0 56px 14px var(--color-butter-glow)',
            ],
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* The photo itself */}
        <div className="relative overflow-hidden rounded-sm bg-cocoa-900/10">
          <img
            src={image}
            alt={caption ?? 'Ảnh kỷ niệm'}
            className="block aspect-[4/3] w-full select-none object-cover"
            draggable={false}
          />

          {/* "Knowledge light loading" — brief radial wash that fades out
              on first reveal. Mounts once per burstKey, so retakes replay. */}
          <motion.span
            key={burstKey}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
            style={{
              background:
                'radial-gradient(circle at 50% 50%, var(--color-butter-glow) 0%, var(--color-peach-glow) 40%, transparent 70%)',
              mixBlendMode: 'screen',
            }}
          />
        </div>

        <figcaption className="mt-2 px-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-butter-500">
            {showSavedBadge ? '✓ ĐÃ VÀO NHẬT KÝ' : '✦ Tinh Thể Ký Ức ✦'}
          </p>
          {caption && (
            <p className="mt-0.5 line-clamp-2 font-display text-xs font-semibold text-cocoa-900">
              {showSavedBadge ? `"${caption}"` : caption}
            </p>
          )}
        </figcaption>

        {/* Saved badge — sits on the polaroid's top-right corner */}
        {showSavedBadge && (
          <motion.span
            aria-hidden
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 8, opacity: 1 }}
            transition={springBouncy}
            className="absolute -right-3 -top-3 inline-flex items-center gap-1 rounded-full border-2 border-mint-500 bg-mint-300 px-3 py-1 font-display text-[11px] font-bold text-white shadow-pop"
            style={{ boxShadow: 'var(--shadow-radiant-sage)' }}
          >
            <SparklesIcon className="size-3.5 fill-white stroke-white" />
            Đã lưu
          </motion.span>
        )}
      </motion.figure>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Action row — buttons differ per stage
   ════════════════════════════════════════════════════════════════════ */

interface ActionRowProps {
  stage: Stage
  onCamera: () => void
  onPickFile: () => void
  onSnap: () => void
  onCancelLive: () => void
  onRetake: () => void
  onDecorate: () => void
}

function ActionRow({
  stage,
  onCamera,
  onPickFile,
  onSnap,
  onCancelLive,
  onRetake,
  onDecorate,
}: ActionRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {(stage === 'idle' || stage === 'error') && (
        <>
          <Button
            tone="peach"
            size="md"
            onClick={onCamera}
            leftIcon={<Camera className="size-5" />}
          >
            Chụp ảnh ngay
          </Button>
          <Button
            tone="lavender"
            size="md"
            variant="soft"
            onClick={onPickFile}
            leftIcon={<ImageIcon className="size-5" />}
          >
            Tải ảnh từ album
          </Button>
        </>
      )}

      {stage === 'live' && (
        <>
          <SnapButton onClick={onSnap} />
          <button
            type="button"
            onClick={onCancelLive}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
          >
            <X className="size-4" />
            Đóng
          </button>
        </>
      )}

      {stage === 'captured' && (
        <>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-700 shadow-soft hover:bg-cream-100"
          >
            <RotateCcw className="size-4" />
            Chụp lại
          </button>
          <Button
            tone="butter"
            size="md"
            onClick={onDecorate}
            leftIcon={<SparklesIcon className="size-5" />}
          >
            Trang trí kỷ niệm
          </Button>
        </>
      )}

      {stage === 'saved' && (
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-700 shadow-soft hover:bg-cream-100"
        >
          <Camera className="size-4" />
          Chụp ảnh khác
        </button>
      )}
    </div>
  )
}

/** Large round shutter button — pulsing radiant glow. */
function SnapButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Chụp"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.04 }}
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(255, 215, 120, 0.6)',
          '0 0 0 24px rgba(255, 215, 120, 0)',
        ],
      }}
      transition={{
        boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeOut' },
        scale: { type: 'spring', stiffness: 320, damping: 22 },
      }}
      className="grid size-16 place-items-center rounded-full border-[5px] border-cream-50 bg-butter-300 shadow-pop"
    >
      <span
        className="block size-10 rounded-full border-4 border-butter-500 bg-butter-400"
        aria-hidden
      />
    </motion.button>
  )
}

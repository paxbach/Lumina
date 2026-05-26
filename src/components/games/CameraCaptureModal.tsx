import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  BookHeart,
  Camera,
  RotateCcw,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { useAppStore } from '@/store/useAppStore'

/* ════════════════════════════════════════════════════════════════════
   CameraCaptureModal
   ────────────────────────────────────────────────────────────────────
   Full-screen modal that replaces every `<input type="file">` flow in
   the prototype with a real-time `getUserMedia()` camera capture.

   Lifecycle:
     loading   — getUserMedia in flight; spinner over the viewport.
     ready     — live feed visible, shutter button armed.
     countdown — 3-2-1 overlay, audio ticks per second.
     flash     — short white frame, snapshot drawn to canvas.
     captured  — photo preview shrinks into a polaroid (white frame,
                 -1.5° tilt, shadow-2xl). Confirm / retake CTAs.
     saving    — saveMemory in flight (only when `saveContext` is set).
     saved     — green chip, modal auto-closes after the celebration.
     denied    — user blocked the permission prompt.
     error     — no camera, no MediaDevices, drawImage failed, etc.

   When `saveContext` is set, the modal calls store's `saveMemory()`
   directly so the captured photo lands at the top of the FamilyPage
   timeline without any extra plumbing through callers — the
   "Crucial Linkage" the diary integration spec asks for.

   Permission UX is non-fatal: if the kid blocks the prompt or the
   browser has no camera, the viewport swaps to an inline error card
   with an explanation. The modal never throws to the caller.
   ════════════════════════════════════════════════════════════════════ */

type Phase =
  | 'loading'
  | 'ready'
  | 'countdown'
  | 'flash'
  | 'captured'
  | 'saving'
  | 'saved'
  | 'denied'
  | 'error'

interface CameraCaptureModalProps {
  /** Visibility flag — modal unmounts on close so state resets cleanly. */
  open: boolean
  /** Close handler (X button, backdrop click, auto-close after save). */
  onClose: () => void
  /**
   * Fires when the photo is finalized. Called AFTER saveMemory resolves
   * if `saveContext` is set. Parent uses this to advance game state
   * (set photo, jump to next phase, etc.).
   */
  onCapture?: (imageBase64: string) => void
  /**
   * Optional auto-save context. When present, the modal calls
   * `useAppStore.saveMemory()` with the captured image — the EXIF/GPS
   * scrub + dayInJourney stamp + diary push happen inside the store,
   * so the new entry instantly appears as the latest polaroid on
   * `FamilyPage`'s timeline.
   */
  saveContext?: {
    questTitle: string
    regionId: string
  }
  /** Modal title — defaults to the generic Magic Camera framing. */
  title?: string
  /** Optional one-liner below the title. */
  subtitle?: string
}

const COUNTDOWN_START = 3
const COUNTDOWN_INTERVAL_MS = 800
const FLASH_DURATION_MS = 240

/** getUserMedia constraints — square aspect ratio so the captured
 *  frame matches the polaroid asset format the FamilyPage uses. */
const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    aspectRatio: { ideal: 1 },
    width:  { ideal: 1080 },
    height: { ideal: 1080 },
  },
  audio: false,
}

export function CameraCaptureModal(props: CameraCaptureModalProps) {
  // Outer wrapper handles enter/exit animation; inner body lives only
  // while `open` so state + camera stream reset cleanly between opens.
  return (
    <AnimatePresence>{props.open && <ModalBody {...props} />}</AnimatePresence>
  )
}

function ModalBody({
  onClose,
  onCapture,
  saveContext,
  title = 'Chụp khoảnh khắc kỳ diệu',
  subtitle,
}: CameraCaptureModalProps) {
  const { play } = useSound()
  const navigate = useNavigate()
  const saveMemory = useAppStore((s) => s.saveMemory)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // `<audio>` tag per spec — wire `src` to a real shutter asset later;
  // for now we fire Web Audio via `useSound('pop')` so the click works
  // out of the box without bundling an audio file.
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [phase, setPhase] = useState<Phase>('loading')
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_START)
  const [photo, setPhoto] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  /** Stops every track from the live stream — releases the camera so
   *  the indicator light goes off and other tabs can use it. */
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  /** Boot or reboot the camera stream and bind it to the <video>. */
  const startStream = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        'Trình duyệt không hỗ trợ camera. Hãy thử trên thiết bị có camera nhé!',
      )
      setPhase('error')
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
      streamRef.current = stream
      // Defer srcObject assignment one frame so the <video> is in the DOM.
      requestAnimationFrame(() => {
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        v.play().catch(() => {
          /* autoplay can refuse on locked-down browsers; user gesture
             already happened to open the modal so this rarely fires. */
        })
      })
      return true
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      if (denied) {
        setErrorMsg(
          'Bé chưa cho phép Lumi dùng camera. Hãy bấm "Cho phép" rồi mở lại trò chơi nhé!',
        )
        setPhase('denied')
      } else {
        setErrorMsg('Không kết nối được camera. Hãy thử lại sau nhé!')
        setPhase('error')
      }
      return false
    }
  }, [])

  // Mount-only boot. Modal body remounts on every open (because the
  // parent uses AnimatePresence + `open && <ModalBody />`) so this
  // effect runs exactly once per session — no deps gymnastics needed.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ok = await startStream()
      if (!cancelled && ok) setPhase('ready')
    })()
    return () => {
      cancelled = true
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Ticking 3→2→1→snap. State-driven so each tick re-renders the
   *  countdown overlay; snapshot fires when count hits 0. */
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) return
    const id = window.setTimeout(() => {
      const next = countdown - 1
      if (next > 0) {
        setCountdown(next)
        play('tick')
      } else {
        play('pop')
        // Trigger the audio tag fallback too in case a real asset is wired
        audioRef.current?.play().catch(() => {})
        takeSnapshot()
      }
    }, COUNTDOWN_INTERVAL_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown])

  const startCapture = () => {
    if (phase !== 'ready') return
    setCountdown(COUNTDOWN_START)
    setPhase('countdown')
    play('tick')
  }

  const takeSnapshot = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      setErrorMsg('Camera chưa sẵn sàng. Hãy thử lại nhé!')
      setPhase('error')
      return
    }

    // Flash overlay while we capture — feels like a real shutter.
    setPhase('flash')

    // Centre-crop to a square so the captured frame matches the
    // polaroid asset format used by FamilyPage's scrapbook timeline.
    const size = Math.min(video.videoWidth, video.videoHeight)
    const offsetX = (video.videoWidth - size) / 2
    const offsetY = (video.videoHeight - size) / 2

    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setErrorMsg('Không thể chụp ảnh. Hãy thử lại nhé!')
      setPhase('error')
      return
    }
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88)

    // Free the camera — we have the bytes, no reason to keep streaming.
    stopStream()

    // Reveal the polaroid after the flash settles.
    window.setTimeout(() => {
      setPhoto(dataUrl)
      setPhase('captured')
      play('correct')
    }, FLASH_DURATION_MS)
  }

  const handleConfirm = async () => {
    if (!photo) return
    setPhase('saving')

    if (saveContext) {
      try {
        await saveMemory({
          imagePath: photo,
          questTitle: saveContext.questTitle,
          regionId: saveContext.regionId,
        })
      } catch {
        // Non-fatal: still fire onCapture so the caller's flow advances.
      }
    }

    onCapture?.(photo)
    play('win')
    setPhase('saved')

    // No auto-close: the new SuccessActions card asks the kid to pick
    // either "Xem ngay trong Nhật Ký" (→ /family) or "Tiếp tục khám
    // phá" (→ onClose). Removing the timeout also removes a potential
    // leak when the modal unmounts mid-celebration.
  }

  /**
   * Primary success CTA — close the modal and route to FamilyPage so
   * the kid sees the new polaroid sitting at the top of the timeline.
   * AppShell's AnimatePresence handles the page-level fade transition,
   * so we don't add any extra delay here.
   */
  const handleViewDiary = () => {
    onClose()
    navigate('/family')
  }

  const handleRetake = async () => {
    setPhoto(null)
    setPhase('loading')
    const ok = await startStream()
    if (ok) setPhase('ready')
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center px-3 sm:px-4"
      style={{ background: 'rgba(15, 23, 42, 0.78)' }}
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.86, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border-4 border-amber-300 p-4 shadow-pop sm:p-5"
        style={{
          backgroundImage: `
            radial-gradient(60% 70% at 50% 0%, rgba(252, 211, 77, 0.28) 0%, transparent 70%),
            linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-butter-50) 100%)
          `,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng camera"
          className="absolute right-3 top-3 z-30 grid size-8 place-items-center rounded-full border-2 border-peach-300 bg-cream-50/95 text-peach-600 shadow-soft hover:bg-peach-100"
        >
          <X className="size-4" />
        </button>

        <div className="mb-3 pr-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
            Magic Camera · Lumi
          </p>
          <h2 className="mt-0.5 font-display text-base font-bold leading-snug text-cocoa-900 sm:text-lg">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-xs text-cocoa-700/80">{subtitle}</p>
          )}
        </div>

        <Viewport
          phase={phase}
          videoRef={videoRef}
          countdown={countdown}
          photo={photo}
          errorMsg={errorMsg}
        />

        {/* Hidden canvas — `drawImage` target, never displayed. */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />

        {/* Shutter audio per spec. `src` intentionally empty — wire a
            real shutter asset (e.g. /audio/shutter.mp3) when available;
            until then `useSound('pop')` provides the Web Audio click. */}
        <audio ref={audioRef} preload="auto" aria-hidden />

        <Controls
          phase={phase}
          onSnap={startCapture}
          onConfirm={handleConfirm}
          onRetake={handleRetake}
          onClose={onClose}
          onViewDiary={handleViewDiary}
        />
      </motion.div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Viewport — square card hosting video, overlays, polaroid, errors
   ════════════════════════════════════════════════════════════════════ */

interface ViewportProps {
  phase: Phase
  videoRef: RefObject<HTMLVideoElement | null>
  countdown: number
  photo: string | null
  errorMsg: string
}

function Viewport({
  phase,
  videoRef,
  countdown,
  photo,
  errorMsg,
}: ViewportProps) {
  const showVideo =
    phase === 'loading' ||
    phase === 'ready' ||
    phase === 'countdown' ||
    phase === 'flash'
  const showPhoto =
    phase === 'captured' || phase === 'saving' || phase === 'saved'
  const isError = phase === 'denied' || phase === 'error'

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm">
      {/* Always-mounted video so streamRef can latch on regardless of
          which overlay is currently shown. Hidden via opacity (rather
          than conditional render) so re-mounting doesn't restart the
          camera stream mid-countdown. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'absolute inset-0 size-full rounded-[2rem] bg-slate-950 object-cover transition-opacity',
          showVideo ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <AnimatePresence>
        {showVideo && phase !== 'loading' && <NeonScannerOverlay key="neon" />}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center rounded-[2rem] bg-slate-950/85 text-amber-200"
          >
            <div className="text-center">
              <Sparkles className="mx-auto size-10 animate-pulse" />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em]">
                Đang kết nối camera…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'countdown' && (
          <motion.div
            key={`count-${countdown}`}
            aria-live="polite"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.55, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <span
              className="font-display text-[7rem] font-black leading-none sm:text-[8rem]"
              style={{
                color: '#fde047',
                textShadow:
                  '0 0 16px rgba(253, 224, 71, 0.95), 0 0 32px rgba(252, 211, 77, 0.7), 0 6px 12px rgba(0,0,0,0.55)',
              }}
            >
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            key="flash"
            className="pointer-events-none absolute inset-0 rounded-[2rem] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.95, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: FLASH_DURATION_MS / 1000 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhoto && photo && (
          <motion.div
            key="polaroid"
            // Starts oversized + straight + invisible, springs DOWN to
            // a polaroid shape (white frame, tilt) — visually "shrinking
            // out of" the live viewport into the album asset format.
            initial={{ scale: 1.04, padding: 0, rotate: 0, opacity: 0 }}
            animate={{ scale: 0.92, padding: 14, rotate: -1.5, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            className="absolute inset-0 grid grid-rows-[1fr_auto] gap-2 rounded-2xl border border-amber-200 bg-white pb-2 shadow-2xl"
            style={{ transformOrigin: 'center center' }}
          >
            <img
              src={photo}
              alt="Khoảnh khắc vừa chụp"
              className="size-full rounded-md object-cover"
              draggable={false}
            />
            <p className="text-center font-display text-xs font-bold tracking-wide text-cocoa-900">
              Khoảnh khắc kỳ diệu ✨
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'saving' && (
          <motion.div
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-4 bottom-4 grid place-items-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-cream-50/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 shadow-soft">
              <Sparkles className="size-3 animate-pulse" />
              Đang lưu kỷ niệm…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The richer success state lives in the Controls section
          below the viewport — `SuccessActions` shows the title +
          subtitle + 2 CTAs once `phase === 'saved'`. The polaroid
          stays visible inside the viewport as the celebration anchor. */}

      <AnimatePresence>
        {isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center rounded-[2rem] bg-slate-950/92 px-6 text-center text-amber-100"
          >
            <div>
              <AlertTriangle className="mx-auto size-10 text-amber-300" />
              <p className="mt-3 font-display text-sm font-bold leading-snug">
                {errorMsg}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Neon scanner border — corner brackets + rotating dashed ring + scan
   line. Themed emerald per spec; amber timeline dots peek through via
   the modal's gradient backdrop.
   ════════════════════════════════════════════════════════════════════ */

function NeonScannerOverlay() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[2rem]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.span
        className="absolute inset-0 rounded-[2rem] border-2 border-dashed border-emerald-400/70"
        style={{ filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.65))' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      />

      <CornerBrackets />

      <motion.span
        className="absolute inset-x-3 h-[2px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent"
        style={{ boxShadow: '0 0 14px rgba(52, 211, 153, 0.85)' }}
        animate={{ top: ['10%', '88%', '10%'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Centre crosshair — soft, sits over the live feed */}
      <span
        className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300"
        style={{ boxShadow: '0 0 10px rgba(52, 211, 153, 0.95)' }}
      />
    </motion.div>
  )
}

function CornerBrackets() {
  const base =
    'absolute size-8 border-emerald-400 [filter:drop-shadow(0_0_6px_rgba(52,211,153,0.85))]'
  return (
    <div aria-hidden className="pointer-events-none absolute inset-4">
      <span className={cn(base, 'left-0 top-0 rounded-tl-lg border-l-[3px] border-t-[3px]')} />
      <span className={cn(base, 'right-0 top-0 rounded-tr-lg border-r-[3px] border-t-[3px]')} />
      <span className={cn(base, 'bottom-0 left-0 rounded-bl-lg border-b-[3px] border-l-[3px]')} />
      <span className={cn(base, 'bottom-0 right-0 rounded-br-lg border-b-[3px] border-r-[3px]')} />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Controls — phase-driven CTA row beneath the viewport
   ════════════════════════════════════════════════════════════════════ */

interface ControlsProps {
  phase: Phase
  onSnap: () => void
  onConfirm: () => void
  onRetake: () => void
  onClose: () => void
  onViewDiary: () => void
}

function Controls({
  phase,
  onSnap,
  onConfirm,
  onRetake,
  onClose,
  onViewDiary,
}: ControlsProps) {
  // `saved` phase swaps the compact button row for a full success
  // card. AnimatePresence with `mode="wait"` cross-fades the two
  // layouts so the modal grows smoothly into the celebration height
  // without a snap.
  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === 'saved' ? (
        <SuccessActions
          key="success"
          onViewDiary={onViewDiary}
          onContinue={onClose}
        />
      ) : (
        <motion.div
          key="default"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 flex min-h-[60px] flex-wrap items-center justify-center gap-3"
        >
          {phase === 'ready' && (
            <motion.button
              type="button"
              onClick={onSnap}
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              className="inline-flex items-center gap-2 rounded-full border-[3px] border-amber-500 bg-gradient-to-br from-amber-400 to-amber-500 px-7 py-3 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
            >
              <Camera className="size-5" />
              Bấm để chụp
            </motion.button>
          )}

          {phase === 'captured' && (
            <>
              <motion.button
                type="button"
                onClick={onConfirm}
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 rounded-full border-[3px] border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
              >
                <Zap className="size-4" />
                Lưu khoảnh khắc
              </motion.button>
              <button
                type="button"
                onClick={onRetake}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
              >
                <RotateCcw className="size-4" />
                Chụp lại
              </button>
            </>
          )}

          {(phase === 'denied' || phase === 'error') && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
            >
              Đóng
            </button>
          )}

          {/* Countdown / flash / loading / saving → status text keeps
              the row height stable so the modal doesn't jump while busy. */}
          {(phase === 'loading' ||
            phase === 'countdown' ||
            phase === 'flash' ||
            phase === 'saving') && (
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cocoa-700/60">
              {phase === 'countdown'
                ? 'Sẵn sàng — giữ máy chắc nhé!'
                : phase === 'flash'
                  ? '📸'
                  : phase === 'saving'
                    ? 'Đang lưu vào Sổ Ký Ức…'
                    : 'Đang kết nối camera'}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SuccessActions — celebratory success card with two CTAs
   ────────────────────────────────────────────────────────────────────
   Renders inside the modal where the Controls row used to sit, once
   `phase === 'saved'`. The bigger surface area (~150px) replaces the
   compact button strip so the modal grows naturally — Framer's spring
   smooths the height change.
   ════════════════════════════════════════════════════════════════════ */

function SuccessActions({
  onViewDiary,
  onContinue,
}: {
  onViewDiary: () => void
  onContinue: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="mt-4 overflow-hidden rounded-2xl border-2 border-amber-300 p-4 text-center shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(80% 70% at 50% 0%, rgba(253, 224, 71, 0.4) 0%, transparent 70%),
          linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-butter-50) 100%)
        `,
      }}
    >
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="font-display text-base font-bold leading-snug text-cocoa-900 sm:text-lg"
      >
        ✨ Lưu khoảnh khắc thành công!
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.3 }}
        className="mx-auto mt-2 max-w-prose text-xs leading-relaxed text-cocoa-700 sm:text-sm"
      >
        Bức ảnh kỷ niệm của bé và cả nhà đã được lưu giữ vào{' '}
        <strong className="font-display font-bold text-amber-700">
          Cuốn Sổ Ký Ức
        </strong>{' '}
        của gia đình Lumina.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.3 }}
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center"
      >
        {/* Primary — orange/amber gradient with a soft pulsing ring so
            the kid's eye lands here first. The `boxShadow` animation
            mimics the LeafScannerGame "Bật Camera" pulse for visual
            consistency across the prototype. */}
        <motion.button
          type="button"
          onClick={onViewDiary}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(251, 146, 60, 0.55)',
              '0 0 0 14px rgba(251, 146, 60, 0)',
            ],
          }}
          transition={{
            boxShadow: {
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeOut',
            },
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-orange-500 bg-gradient-to-br from-orange-400 via-amber-400 to-amber-500 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
        >
          <BookHeart className="size-4" />
          Xem ngay trong Nhật Ký
          <span aria-hidden>📖</span>
        </motion.button>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-cocoa-200 bg-transparent px-5 py-2 font-display text-sm font-bold text-cocoa-700 hover:bg-cream-100"
        >
          <Sparkles className="size-3.5" />
          Tiếp tục khám phá
        </button>
      </motion.div>
    </motion.section>
  )
}

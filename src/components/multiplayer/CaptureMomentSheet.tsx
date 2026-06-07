import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { useFamilyStore } from '@/store/useFamilyStore'
import { cn } from '@/utils/cn'
import { springBouncy } from '@/utils/motion'

/**
 * CaptureMomentSheet — full-screen capture flow with three sources:
 *
 *   1. 📷 Chụp khoảnh khắc
 *      • Mobile (coarse pointer): native file input with
 *        `capture="environment"` → device camera UI opens.
 *      • Desktop (fine pointer): `navigator.mediaDevices.getUserMedia`
 *        → in-app live video preview with a snap button.
 *      • Falls back to library picker if the camera is unavailable.
 *
 *   2. 🖼️ Chọn từ thư viện
 *      • Always opens the OS file picker (no `capture` attribute).
 *
 * Stage machine:
 *
 *   pick ──▶ (mobile camera)  ──▶ preview ──▶ submitting ──▶ success ──▶ close
 *   pick ──▶ live (desktop)   ──▶ preview ──▶ ...
 *   pick ──▶ library          ──▶ preview ──▶ ...
 *
 *   preview ──"Chụp lại"──▶ source that brought us here
 *
 * After the upload RPC returns, the parent receives `taskCompleted` /
 * `questCompleted` so it can fire its own animation; we also show a
 * short in-sheet "✨ Khoảnh khắc đã được lưu" before closing.
 */

export interface CaptureMomentSheetResult {
  taskCompleted: boolean
  questCompleted: boolean
}

interface CaptureMomentSheetProps {
  open: boolean
  /** Quest task this capture is for. `null` = standalone journal entry. */
  taskKey: string | null
  taskLabel?: string
  onClose: () => void
  onCompleted: (result: CaptureMomentSheetResult) => void
}

type Stage = 'pick' | 'live' | 'preview' | 'success'
type Source = 'camera' | 'library' | 'live'

export function CaptureMomentSheet({
  open,
  taskKey,
  taskLabel,
  onClose,
  onCompleted,
}: CaptureMomentSheetProps) {
  const members = useFamilyStore((s) => s.members)
  const currentMemberId = useFamilyStore((s) => s.currentMemberId)
  const uploadMoment = useFamilyStore((s) => s.uploadMoment)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>('pick')
  const [source, setSource] = useState<Source | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [memberId, setMemberId] = useState<string | null>(currentMemberId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Sync membership default when sheet opens. */
  useEffect(() => {
    if (open) setMemberId(currentMemberId)
  }, [open, currentMemberId])

  /* Manage preview object URL lifecycle. */
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  /* Hard reset everything when sheet closes. */
  useEffect(() => {
    if (open) return
    setStage('pick')
    setSource(null)
    setFile(null)
    setCaption('')
    setError(null)
    setSubmitting(false)
  }, [open])

  /* ─── source selectors ─────────────────────────────────────────── */

  const onCameraClick = useCallback(() => {
    setError(null)
    if (isCoarsePointer()) {
      // Mobile path — fire the OS native camera UI via input[capture].
      setSource('camera')
      cameraInputRef.current?.click()
    } else {
      // Desktop path — live preview via getUserMedia.
      setSource('live')
      setStage('live')
    }
  }, [])

  const onLibraryClick = useCallback(() => {
    setError(null)
    setSource('library')
    libraryInputRef.current?.click()
  }, [])

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      // Reset the input value so the same file can be picked again
      // after a "Chụp lại".
      e.target.value = ''
      if (!f) return
      if (!f.type.startsWith('image/')) {
        setError('Chỉ chấp nhận tệp ảnh nhé!')
        return
      }
      setError(null)
      setFile(f)
      setStage('preview')
    },
    [],
  )

  const onLiveCaptured = useCallback((blob: File) => {
    setFile(blob)
    setStage('preview')
  }, [])

  const onRetake = useCallback(() => {
    setFile(null)
    setError(null)
    // Route back to the source that took the original photo.
    if (source === 'live') {
      setStage('live')
    } else if (source === 'camera') {
      setStage('pick')
      // Brief tick so the input element is fresh before clicking.
      window.setTimeout(() => cameraInputRef.current?.click(), 0)
    } else if (source === 'library') {
      setStage('pick')
      window.setTimeout(() => libraryInputRef.current?.click(), 0)
    } else {
      setStage('pick')
    }
  }, [source])

  /* ─── confirm + upload ─────────────────────────────────────────── */

  async function confirm() {
    if (!file) {
      setError('Hãy chọn hoặc chụp một bức ảnh trước.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const result = await uploadMoment({
        file,
        caption: caption.trim() || undefined,
        memberId: memberId ?? undefined,
        questId: taskKey ? undefined : null,
        taskKey,
      })
      setStage('success')
      // Tell the parent (quest card, journal page) so it can fire its
      // own celebration alongside.
      onCompleted({
        taskCompleted: result.taskCompleted,
        questCompleted: result.questCompleted,
      })
      // Auto-close after the success beat plays.
      window.setTimeout(() => onClose(), 1_400)
    } catch (e) {
      setError(
        e instanceof Error
          ? `Tải ảnh lên không được: ${e.message}`
          : 'Tải ảnh lên không được. Hãy thử lại.',
      )
      setStage('preview')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── render ───────────────────────────────────────────────────── */

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-cocoa-900/45 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting && stage !== 'success') {
              onClose()
            }
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springBouncy}
            className={cn(
              'absolute inset-x-0 bottom-0 mx-auto flex max-h-[92vh] w-full max-w-lg flex-col gap-4',
              'rounded-t-[2rem] border-t-4 border-x-2 border-peach-200 bg-cream-50 px-5 pb-8 pt-4',
              'overflow-y-auto shadow-pop',
              'sm:bottom-1/2 sm:translate-y-1/2 sm:rounded-[2rem] sm:border-t-2',
            )}
          >
            {/* Header — close button hidden during success so the
                animation finishes uninterrupted. */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-peach-500">
                  Khoảnh khắc gia đình
                </p>
                <h2 className="font-display text-2xl leading-tight text-cocoa-900">
                  {stage === 'live'
                    ? 'Camera đang sẵn sàng'
                    : stage === 'preview'
                      ? 'Xem trước khoảnh khắc'
                      : stage === 'success'
                        ? 'Đã lưu vào nhật ký!'
                        : 'Ghi lại một bức ảnh thật'}
                </h2>
                {taskLabel && stage !== 'success' && (
                  <p className="mt-1 text-sm text-cocoa-700/80">
                    cho <strong>"{taskLabel}"</strong>
                  </p>
                )}
              </div>
              {stage !== 'success' && (
                <button
                  type="button"
                  onClick={() => !submitting && onClose()}
                  aria-label="Đóng"
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full border-2 border-cream-200 bg-white shadow-soft',
                    'hover:bg-cream-100',
                  )}
                  disabled={submitting}
                >
                  <X className="size-5 text-cocoa-700" />
                </button>
              )}
            </div>

            {/* Hidden inputs — separate refs + attributes for the two
                distinct UX paths. The camera one carries `capture` so
                mobile firmwares know to launch the camera UI; the
                library one omits it so they show the gallery. */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onFileChange}
            />
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onFileChange}
            />

            {/* Stage content. */}
            {stage === 'pick' && (
              <PickStage
                onCamera={onCameraClick}
                onLibrary={onLibraryClick}
              />
            )}

            {stage === 'live' && (
              <LiveCameraStage
                onCaptured={onLiveCaptured}
                onCancel={() => setStage('pick')}
                onUnavailable={(reason) => {
                  // Fall back to mobile-style capture input (which on
                  // desktop just opens the file picker — still better
                  // than a dead UI).
                  setError(reason)
                  setStage('pick')
                }}
              />
            )}

            {stage === 'preview' && previewUrl && (
              <PreviewStage
                previewUrl={previewUrl}
                onRetake={onRetake}
                members={members}
                memberId={memberId}
                onMember={setMemberId}
                caption={caption}
                onCaption={setCaption}
                onConfirm={confirm}
                submitting={submitting}
              />
            )}

            {stage === 'success' && <SuccessStage />}

            {error && stage !== 'success' && (
              <p className="rounded-xl border-2 border-peach-200 bg-peach-50 px-4 py-2 text-sm text-cocoa-800">
                {error}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Sub-stages
   ════════════════════════════════════════════════════════════════════ */

function PickStage({
  onCamera,
  onLibrary,
}: {
  onCamera: () => void
  onLibrary: () => void
}) {
  return (
    <>
      <p className="text-sm text-cocoa-700/85">
        Chụp một bức ảnh mới để hoàn thành thử thách — hoặc chọn từ
        thư viện nếu bạn đã có sẵn.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <PickerButton
          icon={<Camera className="size-6" />}
          label="Chụp khoảnh khắc"
          sublabel="Mở camera ngay"
          tone="peach"
          onClick={onCamera}
        />
        <PickerButton
          icon={<ImageIcon className="size-6" />}
          label="Chọn từ thư viện"
          sublabel="Ảnh đã chụp sẵn"
          tone="sky"
          onClick={onLibrary}
        />
      </div>
    </>
  )
}

/* ─── desktop live camera ──────────────────────────────────────────── */

function LiveCameraStage({
  onCaptured,
  onCancel,
  onUnavailable,
}: {
  onCaptured: (file: File) => void
  onCancel: () => void
  onUnavailable: (reason: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        onUnavailable('Trình duyệt này không hỗ trợ truy cập camera.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setReady(true)
      } catch (e) {
        if (cancelled) return
        const msg =
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Bạn chưa cấp quyền truy cập camera. Hãy bật quyền rồi thử lại.'
            : 'Không thể mở camera. Hãy chọn ảnh từ thư viện nhé.'
        onUnavailable(msg)
      }
    }

    void start()
    return () => {
      cancelled = true
      // Always stop tracks on unmount — otherwise the camera light
      // stays on and the OS keeps the device locked.
      const s = streamRef.current
      if (s) {
        s.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
    // We intentionally only run this once per mount. onUnavailable is
    // stable from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function snap() {
    const v = videoRef.current
    if (!v) return
    const w = v.videoWidth || 1280
    const h = v.videoHeight || 960
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onCaptured(
          new File([blob], `capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          }),
        )
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-cocoa-900/30 bg-cocoa-900 shadow-soft">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 size-full object-cover"
        />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-cocoa-900/70 text-white">
            <p className="font-display text-sm">Đang mở camera…</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          type="button"
          onClick={onCancel}
          whileTap={{ scale: 0.96 }}
          transition={springBouncy}
          className="rounded-cozy border-2 border-cream-200 bg-white px-4 py-3 font-display text-sm font-semibold text-cocoa-800 shadow-soft hover:bg-cream-50"
        >
          Huỷ
        </motion.button>
        <motion.button
          type="button"
          onClick={snap}
          disabled={!ready}
          whileTap={{ scale: 0.96 }}
          transition={springBouncy}
          className={cn(
            'flex items-center justify-center gap-2 rounded-cozy border-2 border-peach-500 bg-peach-400',
            'px-4 py-3 font-display text-sm font-semibold text-white shadow-pop',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Camera className="size-4" />
          Chụp
        </motion.button>
      </div>
    </div>
  )
}

/* ─── preview ─────────────────────────────────────────────────────── */

interface PreviewStageProps {
  previewUrl: string
  onRetake: () => void
  members: { id: string; displayName: string; avatar: string }[]
  memberId: string | null
  onMember: (id: string) => void
  caption: string
  onCaption: (v: string) => void
  onConfirm: () => void
  submitting: boolean
}

function PreviewStage({
  previewUrl,
  onRetake,
  members,
  memberId,
  onMember,
  caption,
  onCaption,
  onConfirm,
  submitting,
}: PreviewStageProps) {
  return (
    <>
      <div className="overflow-hidden rounded-2xl border-2 border-peach-200 bg-white shadow-soft">
        <img
          src={previewUrl}
          alt="Xem trước"
          className="aspect-[4/3] w-full object-cover"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          type="button"
          onClick={onRetake}
          disabled={submitting}
          whileTap={{ scale: 0.96 }}
          transition={springBouncy}
          className={cn(
            'flex items-center justify-center gap-2 rounded-cozy border-2 border-cream-200 bg-white',
            'px-4 py-3 font-display text-sm font-semibold text-cocoa-800 shadow-soft hover:bg-cream-50',
            'disabled:opacity-50',
          )}
        >
          <RefreshCcw className="size-4" />
          Chụp lại
        </motion.button>
        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          whileTap={{ scale: 0.96 }}
          transition={springBouncy}
          className={cn(
            'flex items-center justify-center gap-2 rounded-cozy border-2 border-peach-500 bg-peach-400',
            'px-4 py-3 font-display text-sm font-semibold text-white shadow-pop',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Sparkles className="size-4" />
          {submitting ? 'Đang lưu…' : 'Dùng ảnh này'}
        </motion.button>
      </div>

      {/* Member attribution */}
      {members.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cocoa-700/70">
            Khoảnh khắc này về
          </p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const selected = m.id === memberId
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onMember(m.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border-2 bg-white/85 px-3 py-1.5 text-sm shadow-soft transition-colors',
                    selected
                      ? 'border-peach-400 bg-peach-50'
                      : 'border-cream-200 hover:border-peach-200',
                  )}
                >
                  <span className="text-base" aria-hidden>
                    {m.avatar}
                  </span>
                  <span className="font-display font-semibold text-cocoa-900">
                    {m.displayName}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Caption */}
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-cocoa-700/70">
          Lời chú thích (tuỳ chọn)
        </span>
        <textarea
          value={caption}
          onChange={(e) => onCaption(e.target.value)}
          placeholder="VD: Gia đình Emma tìm được chiếc lá vàng đầu mùa thu 🍂"
          maxLength={200}
          rows={3}
          disabled={submitting}
          className={cn(
            'rounded-2xl border-2 border-cream-200 bg-white px-4 py-3 font-display text-base text-cocoa-900',
            'placeholder:text-cocoa-700/40',
            'focus:border-peach-300 focus:outline-none focus:ring-4 focus:ring-peach-100',
            'disabled:opacity-60',
          )}
        />
      </label>
    </>
  )
}

/* ─── success ─────────────────────────────────────────────────────── */

function SuccessStage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springBouncy}
      className="flex flex-col items-center gap-4 py-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.6, times: [0, 0.6, 1] }}
        className="grid size-20 place-items-center rounded-full bg-emerald-100"
      >
        <CheckCircle2 className="size-12 text-emerald-500" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-xl text-cocoa-900"
      >
        ✨ Khoảnh khắc đã được lưu
      </motion.p>
      <p className="text-sm text-cocoa-700/80">
        Các gia đình đồng hành sẽ thấy khoảnh khắc này ngay bây giờ.
      </p>
    </motion.div>
  )
}

/* ─── picker button ───────────────────────────────────────────────── */

function PickerButton({
  icon,
  label,
  sublabel,
  tone,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  tone: 'peach' | 'sky'
  onClick: () => void
}) {
  const colorMap = {
    peach: 'border-peach-300 bg-peach-100 text-peach-600',
    sky: 'border-sky-300 bg-sky-100 text-sky-600',
  }
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      transition={springBouncy}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-white/85 px-3 py-6 shadow-soft',
        colorMap[tone],
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-white shadow-soft">
        {icon}
      </span>
      <span className="font-display text-sm font-semibold text-cocoa-900">
        {label}
      </span>
      <span className="text-[11px] text-cocoa-700/70">{sublabel}</span>
    </motion.button>
  )
}

/* ─── helpers ─────────────────────────────────────────────────────── */

/**
 * True when the device's primary pointer is coarse — i.e. fingers on
 * phones / tablets. Used to decide whether to launch the OS camera UI
 * via `<input capture>` (mobile) or our in-app `getUserMedia` preview
 * (desktop / laptop).
 */
function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: coarse)').matches
}

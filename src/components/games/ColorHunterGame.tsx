import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as RMouseEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Eraser, Save, Sparkles, Timer, Upload } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { CameraCaptureModal } from './CameraCaptureModal'

interface ColorHunterGameProps {
  /** Fires when the kid saves a finished memory (photo + stickers). */
  onSave?: (imageBase64: string, questTitle: string) => void
}

interface ColorOption {
  id: string
  name: string
  hex: string
}

const COLORS: ColorOption[] = [
  { id: 'red',    name: 'Đỏ',         hex: '#ff7e58' },
  { id: 'green',  name: 'Xanh lá',    hex: '#3fc784' },
  { id: 'yellow', name: 'Vàng',       hex: '#ffc94a' },
  { id: 'blue',   name: 'Xanh dương', hex: '#84d0ff' },
  { id: 'pink',   name: 'Hồng',       hex: '#ff9eb5' },
  { id: 'purple', name: 'Tím',        hex: '#bea5ff' },
]

const STICKERS = ['⭐', '❤️', '🍃', '✨']
const TIMER_SECONDS = 60

type Phase = 'spin' | 'hunting' | 'editing' | 'saved'

interface Sticker {
  id: number
  emoji: string
  x: number
  y: number
}

export function ColorHunterGame({ onSave }: ColorHunterGameProps) {
  const { play } = useSound()

  const [phase, setPhase] = useState<Phase>('spin')
  const [spinning, setSpinning] = useState(false)
  const [wheelRot, setWheelRot] = useState(0)
  const [picked, setPicked] = useState<ColorOption | null>(null)
  const [timer, setTimer] = useState(TIMER_SECONDS)
  const [photo, setPhoto] = useState<string | null>(null)
  const [activeSticker, setActiveSticker] = useState<string | null>(null)
  const [stickers, setStickers] = useState<Sticker[]>([])

  // CameraCaptureModal handles the live-camera flow. The hidden file
  // input below is the gallery fallback — ba mẹ can pick an existing
  // photo of the target-coloured object. Both paths funnel into
  // `handleCaptured`.
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSpin = () => {
    if (spinning || phase !== 'spin') return
    play('pop')
    setSpinning(true)
    const idx = Math.floor(Math.random() * COLORS.length)
    const sliceAngle = 360 / COLORS.length
    const target =
      wheelRot - (wheelRot % 360) +
      360 * 5 +
      (360 - (idx * sliceAngle + sliceAngle / 2))
    setWheelRot(target)
    window.setTimeout(() => {
      setPicked(COLORS[idx])
      setSpinning(false)
      setPhase('hunting')
      setTimer(TIMER_SECONDS)
      play('correct')
    }, 2600)
  }

  useEffect(() => {
    if (phase !== 'hunting' || timer <= 0) return
    const id = window.setTimeout(() => setTimer((t) => t - 1), 1000)
    return () => window.clearTimeout(id)
  }, [phase, timer])

  const handleOpenCamera = () => setCameraOpen(true)
  const handleOpenGallery = () => fileInputRef.current?.click()

  const handleCaptured = (imageBase64: string) => {
    setPhoto(imageBase64)
    setPhase('editing')
    play('win')
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => handleCaptured(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handlePhotoClick = (e: RMouseEvent<HTMLDivElement>) => {
    if (!activeSticker || phase !== 'editing') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setStickers((s) => [
      ...s,
      { id: Date.now() + Math.random(), emoji: activeSticker, x, y },
    ])
    play('pop')
  }

  const handleSave = () => {
    if (!photo || !picked) return
    play('win')
    onSave?.(photo, `Săn màu ${picked.name} cùng cả nhà 🎨`)
    setPhase('saved')
  }

  const handlePlayAgain = () => {
    setPhase('spin')
    setSpinning(false)
    setPicked(null)
    setTimer(TIMER_SECONDS)
    setPhoto(null)
    setActiveSticker(null)
    setStickers([])
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {phase === 'spin' && (
          <SpinView
            key="spin"
            rotation={wheelRot}
            spinning={spinning}
            onSpin={handleSpin}
          />
        )}
        {phase === 'hunting' && picked && (
          <HuntingView
            key="hunt"
            color={picked}
            timer={timer}
            onCapture={handleOpenCamera}
            onUpload={handleOpenGallery}
          />
        )}
        {phase === 'editing' && photo && picked && (
          <EditingView
            key="edit"
            color={picked}
            photo={photo}
            stickers={stickers}
            activeSticker={activeSticker}
            onSelectSticker={setActiveSticker}
            onPhotoClick={handlePhotoClick}
            onClearStickers={() => setStickers([])}
            onSave={handleSave}
          />
        )}
        {phase === 'saved' && picked && (
          <SavedView key="saved" color={picked} onAgain={handlePlayAgain} />
        )}
      </AnimatePresence>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCaptured}
        title={picked ? `Săn màu ${picked.name}` : 'Săn màu cùng Lumi'}
        subtitle="Chụp một đồ vật trong phòng có đúng màu bé vừa quay nhé!"
      />

      {/* Gallery fallback — same FileReader pipeline as the camera. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

/* ─────────── Sub-views ─────────── */

function SpinView({
  rotation,
  spinning,
  onSpin,
}: {
  rotation: number
  spinning: boolean
  onSpin: () => void
}) {
  const sliceAngle = 360 / COLORS.length
  const conicStops = COLORS.map(
    (c, i) => `${c.hex} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`,
  ).join(', ')

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      className="grid place-items-center gap-5 text-center"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
          Vòng quay sắc màu
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-cocoa-900">
          Quay vòng để chọn màu đi săn nhé!
        </h2>
      </div>

      <div className="relative grid size-72 place-items-center sm:size-80">
        <span
          aria-hidden
          className="absolute -top-1 z-20 size-0 border-l-[14px] border-r-[14px] border-t-[20px] border-l-transparent border-r-transparent border-t-cocoa-900 drop-shadow"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border-[6px] border-cream-50 shadow-pop"
        />
        <motion.div
          aria-hidden
          className="absolute inset-2 rounded-full"
          style={{ background: `conic-gradient(${conicStops})` }}
          animate={{ rotate: rotation }}
          transition={{ duration: 2.5, ease: [0.22, 0.61, 0.36, 1] }}
        />
        <span
          aria-hidden
          className="absolute inset-6 rounded-full border-2 border-dashed border-cream-50/70"
        />
        <button
          type="button"
          onClick={onSpin}
          disabled={spinning}
          className={cn(
            'relative z-10 grid size-24 place-items-center rounded-full border-4 border-cream-50 bg-cream-50 font-display text-sm font-bold text-cocoa-900 shadow-pop transition-transform',
            spinning
              ? 'cursor-not-allowed opacity-80'
              : 'hover:scale-105 active:scale-95',
          )}
        >
          <span className="text-3xl leading-none">🎯</span>
          <span className="absolute -bottom-1 text-[9px] font-bold uppercase tracking-widest text-cocoa-700">
            {spinning ? 'Đang quay…' : 'Tap để quay'}
          </span>
        </button>
      </div>

      <motion.button
        type="button"
        onClick={onSpin}
        disabled={spinning}
        whileHover={spinning ? undefined : { y: -2, scale: 1.03 }}
        whileTap={spinning ? undefined : { scale: 0.95 }}
        className="inline-flex items-center gap-2 rounded-full border-4 border-peach-300 bg-peach-400 px-7 py-3 font-display text-lg font-bold text-white shadow-pop disabled:opacity-60"
      >
        Quay màu sắc
        <Sparkles className="size-5" />
      </motion.button>

      <p className="max-w-md text-sm text-cocoa-700/80">
        Vòng quay sẽ chọn ngẫu nhiên một màu — sau đó cả nhà có 60 giây cùng
        đi tìm một vật có đúng màu đó nhé!
      </p>
    </motion.section>
  )
}

function HuntingView({
  color,
  timer,
  onCapture,
  onUpload,
}: {
  color: ColorOption
  timer: number
  onCapture: () => void
  onUpload: () => void
}) {
  const progress = timer / TIMER_SECONDS
  const isOut = timer <= 0

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="space-y-5"
    >
      <div
        className="relative overflow-hidden rounded-[2rem] border-4 p-6 text-center shadow-pop"
        style={{
          borderColor: color.hex,
          background: `linear-gradient(180deg, ${color.hex}1f, var(--color-cream-50))`,
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: color.hex }}
        >
          Nhiệm vụ ngoài đời
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold leading-snug text-cocoa-900">
          Cả nhà hãy cùng tìm một vật màu{' '}
          <span style={{ color: color.hex }}>{color.name}</span>{' '}
          và chụp ảnh lại nhé!
        </h2>

        <motion.div
          aria-hidden
          className="mx-auto mt-5 size-24 rounded-full border-4 border-cream-50 shadow-pop"
          style={{ backgroundColor: color.hex }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border-2 border-cream-200 bg-cream-50/95 px-4 py-1.5 shadow-soft">
          <Timer className="size-4 text-cocoa-700" />
          <span
            className={cn(
              'font-display text-base font-bold tabular-nums',
              isOut ? 'text-peach-500' : 'text-cocoa-900',
            )}
          >
            {isOut ? 'Hết giờ!' : `${timer}s`}
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-200">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color.hex }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ ease: 'linear', duration: 0.5 }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <motion.button
          type="button"
          onClick={onCapture}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-peach-300 bg-gradient-to-br from-peach-400 to-peach-500 px-5 py-4 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200"
        >
          <Camera className="size-5" />
          Bật Magic Camera
        </motion.button>
        <motion.button
          type="button"
          onClick={onUpload}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-lavender-300 bg-lavender-100 px-5 py-4 font-display text-base font-bold text-cocoa-900 shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200"
        >
          <Upload className="size-5" />
          Tải ảnh từ máy
        </motion.button>
      </div>

      <p className="text-center text-xs text-cocoa-700/70">
        Mẹo: chụp cận cảnh để Lumi nhận diện màu chính xác hơn nhé!
      </p>
    </motion.section>
  )
}

function EditingView({
  color,
  photo,
  stickers,
  activeSticker,
  onSelectSticker,
  onPhotoClick,
  onClearStickers,
  onSave,
}: {
  color: ColorOption
  photo: string
  stickers: Sticker[]
  activeSticker: string | null
  onSelectSticker: (s: string | null) => void
  onPhotoClick: (e: RMouseEvent<HTMLDivElement>) => void
  onClearStickers: () => void
  onSave: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="space-y-5"
    >
      <div className="text-center">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: color.hex }}
        >
          Trang trí kỷ niệm
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-cocoa-900">
          Chọn sticker rồi chạm vào ảnh để dán nhé!
        </h2>
      </div>

      <motion.div
        className="mx-auto w-full max-w-sm rotate-[-1.5deg] rounded-2xl border-4 border-cream-50 bg-cream-50 p-3 pb-5 shadow-pop"
        whileHover={{ rotate: 0 }}
      >
        <div
          onClick={onPhotoClick}
          className={cn(
            'relative overflow-hidden rounded-xl bg-cocoa-900/5',
            activeSticker ? 'cursor-crosshair' : 'cursor-default',
          )}
        >
          <img
            src={photo}
            alt="Khoảnh khắc gia đình"
            className="block aspect-square w-full select-none object-cover"
            draggable={false}
          />
          {stickers.map((s) => (
            <motion.span
              key={s.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none text-4xl"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
              }}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
            >
              {s.emoji}
            </motion.span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between px-1.5">
          <span className="font-display text-sm font-bold text-cocoa-900">
            Săn màu {color.name}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-cocoa-700/70">
            {new Date().toLocaleDateString('vi-VN')}
          </span>
        </div>
      </motion.div>

      <div className="rounded-3xl border-2 border-cream-200 bg-cream-50/80 p-4 shadow-soft">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cocoa-700/70">
          Bộ sticker
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {STICKERS.map((s) => (
            <motion.button
              key={s}
              type="button"
              onClick={() => onSelectSticker(activeSticker === s ? null : s)}
              whileHover={{ y: -2, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'grid size-14 place-items-center rounded-2xl border-4 bg-white text-3xl shadow-soft transition-colors',
                activeSticker === s
                  ? 'border-butter-400 bg-butter-50'
                  : 'border-cream-200',
              )}
            >
              {s}
            </motion.button>
          ))}
          <button
            type="button"
            onClick={onClearStickers}
            disabled={stickers.length === 0}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-3 py-1.5 text-xs font-bold text-cocoa-700 shadow-soft hover:bg-cream-100 disabled:opacity-50"
          >
            <Eraser className="size-4" />
            Xoá hết
          </button>
        </div>
        <p className="mt-2 text-[11px] text-cocoa-700/70">
          {activeSticker
            ? `Bấm vào ảnh để dán "${activeSticker}". Bấm sticker lần nữa để bỏ chọn.`
            : 'Chạm 1 sticker, sau đó chạm vào ảnh để dán.'}
        </p>
      </div>

      <motion.button
        type="button"
        onClick={onSave}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-mint-300 bg-mint-400 px-5 py-4 font-display text-base font-bold text-white shadow-pop"
      >
        <Save className="size-5" />
        Lưu kỷ niệm
      </motion.button>
    </motion.section>
  )
}

function SavedView({
  color,
  onAgain,
}: {
  color: ColorOption
  onAgain: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="grid place-items-center gap-4 rounded-[2rem] border-4 border-butter-300 p-8 text-center shadow-pop"
      style={{
        background: `linear-gradient(180deg, var(--color-butter-50), ${color.hex}1f)`,
      }}
    >
      <motion.span
        aria-hidden
        animate={{ scale: [1, 1.18, 1], rotate: [-4, 4, -4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="block text-7xl"
      >
        ✨
      </motion.span>
      <h3 className="font-display text-2xl font-bold text-cocoa-900">
        Đã lưu vào Album gia đình!
      </h3>
      <p className="max-w-sm text-sm text-cocoa-700">
        Khoảnh khắc săn màu {color.name} đã được Lumi cất vào Sổ Ký Ức. Cả
        nhà cùng xem lại tại trang Gia Đình nhé!
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-2 rounded-full border-4 border-lavender-300 bg-lavender-400 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop hover:bg-lavender-500"
      >
        Săn màu mới
      </button>
    </motion.section>
  )
}

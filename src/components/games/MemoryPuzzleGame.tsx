import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ImageUp, RotateCcw, Save } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { CameraCaptureModal } from './CameraCaptureModal'

interface MemoryPuzzleGameProps {
  onSolve?: (imageBase64: string, questTitle: string) => void
}

const COLS = 2
const ROWS = 2
const TOTAL = COLS * ROWS

type Phase = 'upload' | 'playing' | 'solved' | 'saved'

function shuffleIndices(n: number): number[] {
  let result: number[] = []
  do {
    result = Array.from({ length: n }, (_, i) => i)
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
  } while (result.every((v, i) => v === i))
  return result
}

export function MemoryPuzzleGame({ onSolve }: MemoryPuzzleGameProps) {
  const { play } = useSound()

  const [phase, setPhase] = useState<Phase>('upload')
  const [image, setImage] = useState<string | null>(null)
  const [slots, setSlots] = useState<number[]>(() => shuffleIndices(TOTAL))
  const [selected, setSelected] = useState<number | null>(null)

  // CameraCaptureModal owns the live-camera capture flow. The hidden
  // file input is the gallery fallback for ba mẹ that prefers picking
  // an existing family photo — both code paths end up in the same
  // `handleCaptured` so puzzle init is identical.
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSolved = useMemo(() => slots.every((v, i) => v === i), [slots])

  const handleOpenCamera = () => setCameraOpen(true)
  const handleOpenGallery = () => fileInputRef.current?.click()

  const handleCaptured = (imageBase64: string) => {
    setImage(imageBase64)
    setSlots(shuffleIndices(TOTAL))
    setSelected(null)
    setPhase('playing')
    play('correct')
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => handleCaptured(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSlotClick = (slotIdx: number) => {
    if (phase !== 'playing') return
    if (selected === null) {
      setSelected(slotIdx)
      play('tap')
      return
    }
    if (selected === slotIdx) {
      setSelected(null)
      return
    }
    setSlots((s) => {
      const next = [...s]
      ;[next[selected], next[slotIdx]] = [next[slotIdx], next[selected]]
      return next
    })
    play('pop')
    setSelected(null)
  }

  useEffect(() => {
    if (isSolved && phase === 'playing') {
      play('win')
      const id = window.setTimeout(() => setPhase('solved'), 400)
      return () => window.clearTimeout(id)
    }
  }, [isSolved, phase, play])

  const handleShuffle = () => {
    setSlots(shuffleIndices(TOTAL))
    setSelected(null)
    play('tap')
  }

  const handleSave = () => {
    if (!image) return
    play('win')
    onSolve?.(image, 'Ghép lại kỷ niệm gia đình 🧩')
    setPhase('saved')
  }

  const handleReset = () => {
    setPhase('upload')
    setImage(null)
    setSlots(shuffleIndices(TOTAL))
    setSelected(null)
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {phase === 'upload' && (
          <motion.section
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            className="space-y-5"
          >
            <div
              className="relative overflow-hidden rounded-[2rem] border-4 border-lavender-200 p-7 text-center shadow-pop"
              style={{
                background:
                  'linear-gradient(180deg, var(--color-lavender-50) 0%, var(--color-cream-50) 100%)',
              }}
            >
              <motion.span
                aria-hidden
                className="block text-6xl"
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                🧩
              </motion.span>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
                Lời nhắn cho ba mẹ
              </p>
              <h2 className="mt-1 font-display text-xl font-bold leading-snug text-cocoa-900">
                Ba mẹ hãy chọn một bức ảnh gia đình hạnh phúc bất kỳ để thử
                thách con nhé!
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-cocoa-700/85">
                Lumi sẽ cắt bức ảnh thành 4 mảnh — bé sẽ ghép lại để khôi
                phục ký ức của cả nhà.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <motion.button
                type="button"
                onClick={handleOpenCamera}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-lavender-300 bg-gradient-to-br from-lavender-400 to-lavender-500 px-5 py-4 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200"
              >
                <Camera className="size-5" />
                Bật Magic Camera
              </motion.button>
              <motion.button
                type="button"
                onClick={handleOpenGallery}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-lavender-200 bg-cream-50 px-5 py-4 font-display text-base font-bold text-cocoa-800 shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200"
              >
                <ImageUp className="size-5" />
                Tải ảnh từ máy
              </motion.button>
            </div>
          </motion.section>
        )}

        {phase === 'playing' && image && (
          <motion.section
            key="playing"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className="space-y-5"
          >
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
                Bé là Nhà Ghép Hình
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-cocoa-900">
                Chạm 2 ô để đổi chỗ — ghép lại đúng bức ảnh nhé!
              </h2>
            </div>

            <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl border-2 border-cream-200 bg-cream-50/90 px-3 py-2 shadow-soft">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cocoa-700/70">
                Mẫu
              </span>
              <img
                src={image}
                alt="Ảnh mẫu"
                className="size-12 rounded-lg border-2 border-cream-200 object-cover"
              />
            </div>

            <div
              className="mx-auto grid w-full max-w-md gap-2 rounded-2xl border-4 border-cream-50 bg-cream-50 p-2 shadow-pop"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              }}
            >
              {slots.map((pieceIdx, slotIdx) => {
                const col = pieceIdx % COLS
                const row = Math.floor(pieceIdx / COLS)
                const inPlace = pieceIdx === slotIdx
                const isSelected = selected === slotIdx
                return (
                  <motion.button
                    key={slotIdx}
                    type="button"
                    onClick={() => handleSlotClick(slotIdx)}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.94 }}
                    animate={
                      isSelected
                        ? { scale: [1, 0.96, 1], rotate: [-0.6, 0.6, -0.6] }
                        : undefined
                    }
                    transition={
                      isSelected
                        ? { duration: 0.8, repeat: Infinity }
                        : undefined
                    }
                    className={cn(
                      'aspect-square rounded-xl border-4 transition-shadow',
                      isSelected
                        ? 'border-butter-400 shadow-pop ring-4 ring-butter-200'
                        : inPlace
                          ? 'border-mint-300'
                          : 'border-cream-200',
                    )}
                    style={{
                      backgroundImage: `url(${image})`,
                      backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
                      backgroundPosition: `${(col / (COLS - 1)) * 100}% ${
                        (row / (ROWS - 1)) * 100
                      }%`,
                    }}
                  />
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleShuffle}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-1.5 text-sm font-semibold text-cocoa-700 shadow-soft hover:bg-cream-100"
              >
                <RotateCcw className="size-4" />
                Trộn lại
              </button>
              <span className="text-xs text-cocoa-700/70">
                Đã đúng:{' '}
                <strong className="tabular-nums text-cocoa-900">
                  {slots.filter((v, i) => v === i).length}/{TOTAL}
                </strong>
              </span>
            </div>
          </motion.section>
        )}

        {phase === 'solved' && image && (
          <SolvedView
            key="solved"
            image={image}
            onSave={handleSave}
            onReset={handleReset}
          />
        )}

        {phase === 'saved' && (
          <motion.section
            key="saved"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="grid place-items-center gap-3 rounded-[2rem] border-4 border-peach-300 p-8 text-center shadow-pop"
            style={{
              background:
                'linear-gradient(180deg, var(--color-peach-50) 0%, var(--color-lavender-50) 100%)',
            }}
          >
            <motion.span
              aria-hidden
              className="block text-7xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              ❤️
            </motion.span>
            <h3 className="font-display text-2xl font-bold text-cocoa-900">
              Đã lưu vào Album!
            </h3>
            <p className="max-w-md text-sm text-cocoa-700">
              Khoảnh khắc gia đình của bé đã được Lumi giữ lại trong Sổ Ký
              Ức. Cùng cả nhà mở Album để ôn lại nhé!
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 rounded-full border-4 border-lavender-300 bg-lavender-400 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop hover:bg-lavender-500"
            >
              Ghép kỷ niệm mới
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCaptured}
        title="Chọn ảnh gia đình"
        subtitle="Lumi sẽ cắt thành 4 mảnh để bé ghép lại nhé!"
      />

      {/* Gallery fallback — same FileReader pipeline pipes the picked
          image into handleCaptured, so puzzle init is identical for
          both camera and upload paths. */}
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

/* ─────────── Solved view with heart burst ─────────── */

function SolvedView({
  image,
  onSave,
  onReset,
}: {
  image: string
  onSave: () => void
  onReset: () => void
}) {
  const hearts = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        angle: (i / 14) * Math.PI * 2 + Math.random() * 0.3,
        delay: Math.random() * 0.25,
        scale: 0.6 + Math.random() * 0.7,
      })),
    [],
  )

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="relative overflow-visible rounded-[2rem] border-4 border-peach-300 p-7 text-center shadow-pop"
      style={{
        background:
          'linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-peach-50) 100%)',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {hearts.map((h) => {
          const r = 220
          const x = Math.cos(h.angle) * r
          const y = Math.sin(h.angle) * r
          return (
            <motion.span
              key={h.id}
              className="absolute left-1/2 top-1/2 text-3xl"
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{ x, y, scale: h.scale, opacity: [0, 1, 0] }}
              transition={{
                duration: 1.4,
                delay: h.delay,
                ease: 'easeOut',
                times: [0, 0.3, 1],
              }}
              style={{
                filter: 'drop-shadow(0 0 8px rgba(255,160,160,0.6))',
              }}
            >
              ❤️
            </motion.span>
          )
        })}
      </div>

      <motion.div
        initial={{ rotate: -3, scale: 0.95 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="relative z-10 mx-auto w-full max-w-xs rounded-2xl border-4 border-cream-50 bg-cream-50 p-3 pb-5 shadow-pop"
      >
        <img
          src={image}
          alt="Bức ảnh đã ghép lại"
          className="block aspect-square w-full rounded-xl object-cover"
        />
        <p className="mt-3 font-display text-sm font-bold text-cocoa-900">
          Kỷ niệm gia đình
        </p>
      </motion.div>

      <h3 className="relative z-10 mt-5 font-display text-xl font-bold leading-snug text-cocoa-900">
        Hãy bảo ba mẹ kể cho con nghe về kỷ niệm trong bức ảnh này nhé! ❤️
      </h3>

      <div className="relative z-10 mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-cream-200 bg-cream-50 px-4 py-2.5 font-display text-sm font-semibold text-cocoa-700 shadow-soft hover:bg-cream-100"
        >
          Ghép ảnh khác
        </button>
        <motion.button
          type="button"
          onClick={onSave}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 rounded-2xl border-4 border-peach-300 bg-peach-400 px-6 py-2.5 font-display text-base font-bold text-white shadow-pop"
        >
          <Save className="size-5" />
          Lưu vào Album
        </motion.button>
      </div>
    </motion.section>
  )
}

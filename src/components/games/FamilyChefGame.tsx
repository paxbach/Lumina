import { useRef, useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, ChefHat, Star, Upload, Utensils } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { useAppStore } from '@/store/useAppStore'
import { CameraCaptureModal } from './CameraCaptureModal'

const QUEST_TITLE = 'Siêu đầu bếp nhí 🍳'

interface FamilyChefGameProps {
  /**
   * Region the captured photo should be attributed to in the diary.
   * The page wrapper reads this from the sub-map URL query (?region=)
   * and forwards it here so the CameraCaptureModal can auto-save with
   * the correct region tag. Defaults to the family kingdom region.
   */
  regionId?: string
  /**
   * Legacy callback retained for parents that still want to react to a
   * save event (e.g. tick a sub-node complete). The modal now auto-
   * writes the diary entry itself via `saveContext`, so this fires
   * AFTER the diary entry is persisted.
   */
  onSave?: (imageBase64: string, questTitle: string) => void
}

interface RecipeStep {
  id: string
  emoji: string
  title: string
  kidRole: string
  parentRole: string
  tone: 'mint' | 'peach' | 'butter'
}

const STEPS: RecipeStep[] = [
  {
    id: 'pick',
    emoji: '🥬',
    title: 'Chọn nguyên liệu',
    kidRole: 'Con nhặt rau xà lách, cà chua bi và dưa leo.',
    parentRole: 'Ba mẹ rửa sạch và đặt vào tô lớn.',
    tone: 'mint',
  },
  {
    id: 'mix',
    emoji: '🥗',
    title: 'Cả nhà cùng trộn sốt',
    kidRole: 'Con khuấy đều dầu olive + chanh + mật ong.',
    parentRole: 'Ba mẹ rưới sốt lên rau, trộn nhẹ tay nhé.',
    tone: 'butter',
  },
  {
    id: 'plate',
    emoji: '🍽️',
    title: 'Bày món thật đẹp',
    kidRole: 'Con xếp rau theo hình vòng tròn vui mắt.',
    parentRole: 'Ba mẹ rắc thêm hạt mè rang lên trên.',
    tone: 'peach',
  },
]

const STEP_TONE: Record<RecipeStep['tone'], { border: string; bg: string; text: string }> = {
  mint:   { border: 'border-mint-300',   bg: 'bg-mint-50',   text: 'text-mint-500' },
  peach:  { border: 'border-peach-300',  bg: 'bg-peach-50',  text: 'text-peach-500' },
  butter: { border: 'border-butter-300', bg: 'bg-butter-50', text: 'text-butter-500' },
}

type Phase = 'cooking' | 'photo' | 'saved'

export function FamilyChefGame({
  regionId = 'vuong-quoc-gia-dinh',
  onSave,
}: FamilyChefGameProps) {
  const { play } = useSound()

  const saveMemory = useAppStore((s) => s.saveMemory)

  const [phase, setPhase] = useState<Phase>('cooking')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [photo, setPhoto] = useState<string | null>(null)
  // CameraCaptureModal drives the live-camera path (and auto-saves to
  // the diary via `saveContext`). The hidden file input is the gallery
  // fallback — its handler mirrors the modal's diary write inline so
  // both paths produce the same FamilyPage polaroid.
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allDone = STEPS.every((s) => checked.has(s.id))

  const toggle = (id: string) => {
    setChecked((s) => {
      const next = new Set(s)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        play('correct')
      }
      return next
    })
  }

  const handleOpenCamera = () => setCameraOpen(true)
  const handleOpenGallery = () => fileInputRef.current?.click()

  /**
   * Camera modal callback. Modal has ALREADY written the diary entry
   * via `saveContext` by the time this fires; we just keep a local
   * copy of the photo for the celebration card, signal the sub-node
   * complete, and flip to 'saved'.
   */
  const handleCaptured = (imageBase64: string) => {
    setPhoto(imageBase64)
    onSave?.(imageBase64, QUEST_TITLE)
    play('win')
    setPhase('saved')
  }

  /**
   * Gallery upload path. The modal isn't involved so we mirror its
   * diary write inline — same saveMemory call shape, same questTitle
   * + regionId — so the polaroid still lands on FamilyPage's timeline
   * regardless of whether ba mẹ snapped fresh or picked an existing
   * shot.
   */
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('read-failed'))
      reader.readAsDataURL(file)
    })
    try {
      await saveMemory({
        imagePath: dataUrl,
        questTitle: QUEST_TITLE,
        regionId,
      })
    } catch {
      // Non-fatal — the celebration view still shows the photo even
      // if the diary write itself fails.
    }
    handleCaptured(dataUrl)
  }

  const handleNext = () => {
    if (allDone) {
      play('correct')
      setPhase('photo')
    }
  }

  const handleReplay = () => {
    setPhase('cooking')
    setChecked(new Set())
    setPhoto(null)
  }

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border-4 border-peach-200 p-5 shadow-pop"
        style={{
          background:
            'linear-gradient(135deg, var(--color-peach-50) 0%, var(--color-butter-50) 60%, var(--color-mint-50) 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-white/70 text-3xl shadow-inset-soft">
            🍳
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-peach-500">
              Công thức cả nhà
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-cocoa-900">
              Món Salad Tri Thức
            </h2>
            <p className="mt-1 text-xs text-cocoa-700/80">
              Cùng vào bếp 3 bước — kết thúc bằng một bức ảnh ấm áp.
            </p>
          </div>
        </div>
      </motion.header>

      <AnimatePresence mode="wait">
        {phase === 'cooking' && (
          <motion.section
            key="cooking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {STEPS.map((step, i) => {
              const isDone = checked.has(step.id)
              const t = STEP_TONE[step.tone]
              return (
                <motion.button
                  key={step.id}
                  type="button"
                  onClick={() => toggle(step.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex w-full items-start gap-4 rounded-3xl border-4 p-5 text-left shadow-soft transition-colors',
                    isDone
                      ? 'border-mint-400 bg-mint-50'
                      : cn(t.border, t.bg),
                  )}
                >
                  <span
                    className={cn(
                      'grid size-14 shrink-0 place-items-center rounded-2xl border-2 bg-white text-3xl shadow-inset-soft',
                      isDone ? 'border-mint-400' : t.border,
                    )}
                  >
                    {step.emoji}
                  </span>
                  <div className="flex-1">
                    <p
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-[0.25em]',
                        isDone ? 'text-mint-500' : t.text,
                      )}
                    >
                      Bước {i + 1}
                    </p>
                    <h3 className="mt-0.5 font-display text-base font-bold text-cocoa-900">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-cocoa-700">
                      <span className="font-bold text-cocoa-900">🧒 Con: </span>
                      {step.kidRole}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-cocoa-700">
                      <span className="font-bold text-cocoa-900">👨‍👩 Ba mẹ: </span>
                      {step.parentRole}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors',
                      isDone
                        ? 'border-mint-500 bg-mint-300 text-white'
                        : 'border-cream-200 bg-cream-50 text-cream-200',
                    )}
                    aria-hidden
                  >
                    <Check className="size-5" />
                  </span>
                </motion.button>
              )
            })}

            <motion.button
              type="button"
              disabled={!allDone}
              onClick={handleNext}
              whileHover={allDone ? { y: -2, scale: 1.02 } : undefined}
              whileTap={allDone ? { scale: 0.96 } : undefined}
              className={cn(
                'flex w-full items-center justify-center gap-3 rounded-2xl border-4 px-5 py-4 font-display text-base font-bold shadow-pop transition-all',
                allDone
                  ? 'border-lavender-300 bg-lavender-400 text-white'
                  : 'cursor-not-allowed border-cream-200 bg-cream-100 text-cocoa-700/50 shadow-soft',
              )}
            >
              <Utensils className="size-5" />
              {allDone
                ? 'Đến bước cuối — chụp ảnh cả nhà!'
                : `Hoàn thành ${checked.size}/${STEPS.length} bước`}
            </motion.button>
          </motion.section>
        )}

        {phase === 'photo' && (
          <motion.section
            key="photo"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className="space-y-5"
          >
            <div className="rounded-[2rem] border-4 border-butter-300 bg-butter-50 p-6 text-center shadow-pop">
              <ChefHat className="mx-auto size-12 text-butter-500" />
              <h3 className="mt-3 font-display text-xl font-bold text-cocoa-900">
                Bước cuối: chụp ảnh cả nhà cùng món ăn!
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-cocoa-700/85">
                Bật Magic Camera, đếm 3-2-1 rồi chụp một tấm ảnh cả nhà bên
                món Salad Tri Thức — Lumi sẽ tự lưu khoảnh khắc vào Sổ Ký Ức
                gia đình.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <motion.button
                type="button"
                onClick={handleOpenCamera}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-peach-300 bg-gradient-to-br from-peach-400 to-peach-500 px-5 py-4 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200"
              >
                <Camera className="size-5" />
                Bật Magic Camera
              </motion.button>
              <motion.button
                type="button"
                onClick={handleOpenGallery}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-lavender-300 bg-lavender-100 px-5 py-4 font-display text-base font-bold text-cocoa-900 shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200"
              >
                <Upload className="size-5" />
                Tải ảnh từ máy
              </motion.button>
            </div>
          </motion.section>
        )}

        {phase === 'saved' && (
          <motion.section
            key="saved"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="rounded-[2rem] border-4 border-mint-300 p-8 text-center shadow-pop"
            style={{
              background:
                'linear-gradient(180deg, var(--color-mint-50) 0%, var(--color-butter-50) 100%)',
            }}
          >
            <motion.span
              aria-hidden
              className="block text-7xl"
              animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              👨‍🍳
            </motion.span>
            <div className="mt-3 flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 240,
                    damping: 16,
                    delay: 0.2 + i * 0.15,
                  }}
                >
                  <Star className="size-7 fill-butter-400 stroke-butter-500" />
                </motion.span>
              ))}
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold text-cocoa-900">
              Siêu đầu bếp nhí đã hoàn thành!
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-cocoa-700">
              Lumi đã lưu khoảnh khắc cả nhà cùng nấu ăn vào Sổ Ký Ức. Cả nhà
              cùng thưởng thức món Salad Tri Thức nào!
            </p>

            {/* Polaroid preview of the just-captured photo so the kid sees
                their handiwork in the celebration card. */}
            {photo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
                animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="mx-auto mt-5 w-full max-w-[220px] rounded-xl border-[10px] border-cream-50 bg-cream-50 pb-3 shadow-pop"
              >
                <img
                  src={photo}
                  alt="Cả nhà với món Salad Tri Thức"
                  className="block aspect-square w-full rounded-md object-cover"
                />
                <p className="mt-2 text-center font-display text-xs font-bold text-cocoa-900">
                  Bữa ăn ấm áp ✨
                </p>
              </motion.div>
            )}
            <button
              type="button"
              onClick={handleReplay}
              className="mt-5 rounded-full border-4 border-peach-300 bg-peach-400 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop hover:bg-peach-500"
            >
              Nấu món khác
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCaptured}
        // saveContext is the "Crucial Linkage": the modal calls
        // saveMemory() inline so the polaroid pops onto FamilyPage's
        // timeline the instant the shutter fires — no extra round-trip
        // through the page wrapper.
        saveContext={{ questTitle: QUEST_TITLE, regionId }}
        title="Chụp cả nhà cùng món Salad Tri Thức"
        subtitle="Đếm 3-2-1 rồi chụp nhé! Lumi sẽ tự lưu vào Sổ Ký Ức."
      />

      {/* Gallery fallback. handleFileChange mirrors the modal's
          saveMemory call so the diary entry shape matches whichever
          path ba mẹ takes. */}
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

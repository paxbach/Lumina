import { useRef, useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Check,
  RotateCcw,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { CameraCaptureModal } from './CameraCaptureModal'

/* ════════════════════════════════════════════════════════════════════
   ZooSafariPhotoGame
   ────────────────────────────────────────────────────────────────────
   The "THÁM HIỂM SAFARI" centre node of Rừng Kỳ Diệu — Node 4. Three
   phases:

     choose  → kid picks an animal (Sư Tử / Voi / Khỉ).
     capture → safari viewfinder with corner brackets centres the
               chosen animal. Two CTAs: device camera (`capture=
               environment`) and gallery file picker — same dual-input
               pattern as ColorHunterGame.
     success → captured photo rendered as a polaroid memory card,
               +1 crystal badge, "Hoàn thành nhiệm vụ" CTA.

   Isolated scope: no router / store coupling here. Parent
   ZooPhotoQuestPage wires `onSavePhoto` (→ diary save) and
   `onComplete` (→ completeSubNode + nav back).
   ════════════════════════════════════════════════════════════════════ */

type Phase = 'choose' | 'capture' | 'success'

interface AnimalChoice {
  id: 'lion' | 'elephant' | 'monkey'
  name: string
  emoji: string
  /** Hex accent shared between tile border, viewfinder ring, badges. */
  accent: string
  /** Pastel tint used in `${hex}26` form for tile background washes. */
  accentSoft: string
  /** Single-line descriptor under the tile name. */
  blurb: string
  /** Vietnamese phrase plugged into the capture-step header. */
  encounter: string
}

const ANIMALS: AnimalChoice[] = [
  {
    id: 'lion',
    name: 'Sư Tử',
    emoji: '🦁',
    accent: '#f97316',
    accentSoft: '#f97316',
    blurb: 'Chúa tể rừng xanh',
    encounter: 'một chú Sư Tử oai vệ',
  },
  {
    id: 'elephant',
    name: 'Voi',
    emoji: '🐘',
    accent: '#64748b',
    accentSoft: '#64748b',
    blurb: 'Khổng lồ hiền lành',
    encounter: 'một bạn Voi khổng lồ',
  },
  {
    id: 'monkey',
    name: 'Khỉ',
    emoji: '🐒',
    accent: '#a16207',
    accentSoft: '#a16207',
    blurb: 'Bạn vui nhộn',
    encounter: 'một chú Khỉ nhanh nhẹn',
  },
]

interface ZooSafariPhotoGameProps {
  /**
   * Fired the moment the kid captures or uploads a photo. Parent saves
   * to the diary (EXIF-scrub + region attribution). Async so the page
   * can show a brief "saving" state on the success view.
   */
  onSavePhoto?: (
    imageBase64: string,
    animal: AnimalChoice,
  ) => Promise<void> | void
  /**
   * Fires when the kid taps "Hoàn thành nhiệm vụ" on the success view.
   * Parent advances completeSubNode + navigates back to the sub-map.
   */
  onComplete?: () => void
}

export function ZooSafariPhotoGame({
  onSavePhoto,
  onComplete,
}: ZooSafariPhotoGameProps) {
  const { play } = useSound()
  const [phase, setPhase] = useState<Phase>('choose')
  const [animal, setAnimal] = useState<AnimalChoice | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // CameraCaptureModal owns the live-camera flow. The hidden file
  // input is the gallery fallback — same FileReader → handleCaptured
  // pipeline as the camera path so the success view + diary save fire
  // identically regardless of source.
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickAnimal = (choice: AnimalChoice) => {
    play('pop')
    setAnimal(choice)
    setPhase('capture')
  }

  const handleOpenCamera = () => setCameraOpen(true)
  const handleOpenGallery = () => fileInputRef.current?.click()

  const handleCaptured = async (imageBase64: string) => {
    if (!animal) return
    setPhoto(imageBase64)
    setPhase('success')
    play('win')
    // Save to diary in the background. Failures swallowed so the
    // success view still renders the polaroid preview.
    try {
      setSaving(true)
      await onSavePhoto?.(imageBase64, animal)
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      void handleCaptured(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRetake = () => {
    setPhoto(null)
    setPhase('capture')
  }

  const handleChangeAnimal = () => {
    setPhoto(null)
    setAnimal(null)
    setPhase('choose')
  }

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {phase === 'choose' && (
          <ChooseAnimalView
            key="choose"
            animals={ANIMALS}
            onPick={handlePickAnimal}
          />
        )}
        {phase === 'capture' && animal && (
          <CaptureView
            key="capture"
            animal={animal}
            onCamera={handleOpenCamera}
            onUpload={handleOpenGallery}
            onChangeAnimal={handleChangeAnimal}
          />
        )}
        {phase === 'success' && animal && photo && (
          <SuccessView
            key="success"
            animal={animal}
            photo={photo}
            saving={saving}
            onRetake={handleRetake}
            onChangeAnimal={handleChangeAnimal}
            onComplete={onComplete}
          />
        )}
      </AnimatePresence>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCaptured}
        title={
          animal
            ? `Chụp ảnh cùng ${animal.name}`
            : 'Chụp khoảnh khắc safari'
        }
        subtitle="Đếm 3-2-1 rồi chụp một bức ảnh thật đẹp nhé!"
      />

      {/* Gallery fallback — same FileReader → handleCaptured. */}
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

/* ════════════════════════════════════════════════════════════════════
   Phase 1 — Choose animal
   ════════════════════════════════════════════════════════════════════ */

function ChooseAnimalView({
  animals,
  onPick,
}: {
  animals: AnimalChoice[]
  onPick: (choice: AnimalChoice) => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="space-y-4"
    >
      {/* Lumi speech card */}
      <div className="flex items-start gap-3">
        <motion.span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-amber-300 bg-amber-100 text-3xl shadow-soft"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          🐾
        </motion.span>
        <div className="relative flex-1 rounded-2xl border-2 border-amber-200 bg-cream-50 p-4 shadow-soft">
          <span
            aria-hidden
            className="absolute -left-2 top-5 size-3 rotate-45 border-b-2 border-l-2 border-amber-200 bg-cream-50"
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
            Lumi nói
          </p>
          <p className="mt-1 font-display text-base font-bold leading-snug text-cocoa-900">
            Bé chọn một con vật để cùng Lumi đi tìm trong sở thú nhé!
          </p>
        </div>
      </div>

      {/* 3-up animal tiles — grid-cols-3 at every breakpoint so they
          stay legible side-by-side even on phone widths. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {animals.map((a) => (
          <motion.button
            key={a.id}
            type="button"
            onClick={() => onPick(a)}
            whileHover={{ y: -4, scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-4 bg-cream-50 p-3 shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
            style={{
              borderColor: a.accent,
              backgroundImage: `radial-gradient(140% 90% at 50% 0%, ${a.accentSoft}26 0%, transparent 65%)`,
            }}
            aria-label={`Chọn ${a.name}`}
          >
            <span
              className="grid size-14 place-items-center rounded-full border-4 bg-white text-3xl shadow-soft sm:size-16 sm:text-4xl"
              style={{ borderColor: a.accent }}
            >
              {a.emoji}
            </span>
            <span className="text-center font-display text-[12px] font-bold leading-tight text-cocoa-900 sm:text-sm">
              {a.name}
            </span>
            <span className="text-center text-[10px] italic text-cocoa-700/70">
              {a.blurb}
            </span>
          </motion.button>
        ))}
      </div>

      <p className="text-center text-xs italic text-cocoa-700/70">
        Mẹo: bé có thể chụp một bạn thú thật, một bức tượng, hoặc một bức
        tranh đều được nhé!
      </p>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 2 — Capture (safari viewfinder + camera / upload CTAs)
   ════════════════════════════════════════════════════════════════════ */

function CaptureView({
  animal,
  onCamera,
  onUpload,
  onChangeAnimal,
}: {
  animal: AnimalChoice
  onCamera: () => void
  onUpload: () => void
  onChangeAnimal: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="space-y-4"
    >
      {/* Header strip — restates the chosen animal in the safari band. */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2.5 shadow-soft"
        style={{
          borderColor: animal.accent,
          background: `linear-gradient(90deg, ${animal.accent}1f 0%, var(--color-cream-50) 100%)`,
        }}
      >
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.3em]"
            style={{ color: animal.accent }}
          >
            Nhiệm vụ chụp ảnh
          </p>
          <p className="mt-0.5 font-display text-sm font-bold text-cocoa-900">
            Cùng bé đi tìm{' '}
            <span style={{ color: animal.accent }}>{animal.encounter}</span>{' '}
            nhé!
          </p>
        </div>
        <button
          type="button"
          onClick={onChangeAnimal}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cream-200 bg-cream-50 px-2.5 py-1 text-[10px] font-bold text-cocoa-700/70 shadow-soft hover:bg-cream-100"
        >
          <ArrowLeft className="size-3" />
          Đổi
        </button>
      </div>

      {/* Safari viewfinder — dark frame, corner brackets, animal silhouette
          breathing in the centre. Reads as "live camera ready to snap". */}
      <SafariViewfinder animal={animal} />

      {/* Dual CTAs — primary opens the full-screen CameraCaptureModal
          (live feed + 3-2-1 + polaroid shrink), secondary opens the
          gallery picker. Side-by-side on sm+, stacked on phone. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <motion.button
          type="button"
          onClick={onCamera}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 px-5 py-4 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
          style={{
            backgroundImage: `linear-gradient(135deg, ${animal.accent} 0%, #92400e 100%)`,
            borderColor: animal.accent,
          }}
        >
          <Camera className="size-5" />
          Bật Magic Camera
        </motion.button>
        <motion.button
          type="button"
          onClick={onUpload}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-cream-300 bg-cream-50 px-5 py-4 font-display text-base font-bold text-cocoa-800 shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cream-200"
        >
          <Upload className="size-5" />
          Tải ảnh từ máy
        </motion.button>
      </div>

      <p className="text-center text-xs italic text-cocoa-700/70">
        Mẹo: chụp cận cảnh để Lumi nhận ra bạn thú dễ hơn nhé!
      </p>
    </motion.section>
  )
}

function SafariViewfinder({ animal }: { animal: AnimalChoice }) {
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-3xl border-2 shadow-pop"
      style={{
        borderColor: `${animal.accent}99`,
        background:
          'linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)',
      }}
    >
      {/* Faint scanline grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.18) 0 1px, transparent 1px 5px)',
        }}
      />

      {/* Animal silhouette — large emoji that breathes so the viewport
          reads as "alive" rather than a frozen placeholder. */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-7xl sm:text-8xl"
        animate={{
          scale: [1, 1.06, 1],
          y: ['-50%', '-52%', '-50%'],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          filter: `drop-shadow(0 0 18px ${animal.accent}80)`,
        }}
      >
        {animal.emoji}
      </motion.span>

      {/* Corner brackets — same neon-bracket motif as LeafScannerGame
          so the kid recognises the "AI camera" framing. Colour borrowed
          from the chosen animal's accent for thematic continuity. */}
      <CornerBrackets color={animal.accent} />

      {/* Status chip */}
      <div
        className="absolute left-1/2 top-3 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-stone-900/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] shadow-soft backdrop-blur"
        style={{ borderColor: `${animal.accent}aa`, color: animal.accent }}
      >
        <span
          className="size-1.5 rounded-full"
          style={{
            backgroundColor: animal.accent,
            boxShadow: `0 0 8px ${animal.accent}`,
          }}
        />
        Camera Ready · {animal.name}
      </div>
    </div>
  )
}

function CornerBrackets({ color }: { color: string }) {
  const cornerBase =
    'absolute size-7 sm:size-9 border-current'
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-3"
      style={{
        color,
        filter: `drop-shadow(0 0 6px ${color}cc)`,
      }}
    >
      <span className={cn(cornerBase, 'left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-md')} />
      <span className={cn(cornerBase, 'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-md')} />
      <span className={cn(cornerBase, 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md')} />
      <span className={cn(cornerBase, 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md')} />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Phase 3 — Success (polaroid memory card + reward + CTAs)
   ════════════════════════════════════════════════════════════════════ */

function SuccessView({
  animal,
  photo,
  saving,
  onRetake,
  onChangeAnimal,
  onComplete,
}: {
  animal: AnimalChoice
  photo: string
  saving: boolean
  onRetake: () => void
  onChangeAnimal: () => void
  onComplete?: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="space-y-4"
    >
      {/* Polaroid memory card — slight tilt + thick cream border so it
          reads as "instant photo just developed". */}
      <div className="grid place-items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="relative w-full max-w-xs rounded-xl border-[10px] border-cream-50 bg-cream-50 pb-5 shadow-pop"
          style={{
            boxShadow:
              '0 18px 32px -14px rgba(120, 70, 30, 0.45), var(--shadow-pop)',
          }}
        >
          <div className="overflow-hidden rounded-md bg-stone-900/5">
            <img
              src={photo}
              alt={`Kỷ niệm chụp với ${animal.name}`}
              className="block aspect-square w-full select-none object-cover"
              draggable={false}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between px-2">
            <span className="font-display text-sm font-bold text-cocoa-900">
              {animal.emoji} {animal.name} cùng Lumi
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
              style={{
                color: animal.accent,
                backgroundColor: `${animal.accent}1f`,
              }}
            >
              Safari
            </span>
          </div>
        </motion.div>
      </div>

      {/* Saving hint — small inline pill, only when the diary save is
          still in flight. */}
      <AnimatePresence>
        {saving && (
          <motion.p
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-[11px] italic text-cocoa-700/70"
          >
            Đang lưu vào Nhật ký Ánh sáng…
          </motion.p>
        )}
      </AnimatePresence>

      {/* Reward summary card */}
      <div className="rounded-2xl border-4 border-amber-300 bg-gradient-to-b from-amber-50 to-cream-50 p-4 text-center shadow-soft">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-amber-400 bg-cream-50 px-3 py-1 text-sm font-bold text-amber-600 shadow-soft">
          <Sparkles className="size-4 fill-amber-300 stroke-amber-500" />
          +1 Tinh thể · Thẻ kỷ niệm mới
        </div>
        <p className="mt-3 px-1 text-sm leading-relaxed text-cocoa-800">
          Tuyệt vời! Bé đã ghi lại khoảnh khắc với{' '}
          <strong style={{ color: animal.accent }}>{animal.name}</strong>.
          Khoảnh khắc này đã được Lumi cất vào Nhật ký Ánh sáng.
        </p>
      </div>

      {/* CTAs — primary complete, secondaries retake / pick new animal */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <motion.button
          type="button"
          onClick={onComplete}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 rounded-full border-[3px] border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
        >
          <Zap className="size-4" />
          Hoàn thành nhiệm vụ
        </motion.button>
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
        >
          <Camera className="size-4" />
          Chụp lại
        </button>
        <button
          type="button"
          onClick={onChangeAnimal}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-cocoa-700/70 hover:bg-cream-100 hover:text-cocoa-900"
        >
          <RotateCcw className="size-4" />
          Chọn con vật khác
        </button>
      </div>

      {/* Tiny "saved" badge below the action row once the save resolves. */}
      {!saving && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-sage-600">
          <Check className="size-3.5" />
          Đã lưu vào sổ ký ức
        </p>
      )}
    </motion.section>
  )
}

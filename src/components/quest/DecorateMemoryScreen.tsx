import { useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Save, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { springBouncy, springSoft } from '@/utils/motion'
import { Button } from '@/components/ui/Button'
import { Confetti } from '@/components/quest/Confetti'
import type { PastelTone } from '@/types'

/**
 * DecorateMemoryScreen — kid + parent decorate a captured photo before it
 * lands in the Light Journal. Three little tools:
 *
 *   1. Sticker Board — tap a sticker, it lands on the photo at a random
 *      spot. Tap a placed sticker to remove it.
 *   2. Parent Note   — short single-line input ("Hôm nay con rất dũng cảm!").
 *   3. Save          — fires a confetti burst, then calls onSave with the
 *      decoration payload so the consumer can persist it.
 *
 * Saved state stays mounted so the kid sees their finished masterpiece;
 * a small "Đã lưu" badge confirms persistence happened.
 */

/* ─── Sticker palette ─────────────────────────────────────────────── */

export type StickerKind = 'lumi' | 'heart' | 'star' | 'medal' | 'sparkle' | 'crown' | 'rainbow' | 'rose'

interface StickerOption {
  id: StickerKind
  label: string
  /** For emoji-based stickers. Lumi uses a custom SVG instead. */
  glyph?: string
  tone: PastelTone
}

const STICKERS: StickerOption[] = [
  { id: 'lumi',    label: 'Lumi',         tone: 'butter'   },
  { id: 'heart',   label: 'Trái tim',     glyph: '💕', tone: 'peach'    },
  { id: 'star',    label: 'Ngôi sao',     glyph: '⭐', tone: 'butter'   },
  { id: 'medal',   label: 'Huy chương',   glyph: '🏅', tone: 'butter'   },
  { id: 'sparkle', label: 'Lấp lánh',     glyph: '✨', tone: 'lavender' },
  { id: 'crown',   label: 'Vương miện',   glyph: '👑', tone: 'butter'   },
  { id: 'rainbow', label: 'Cầu vồng',     glyph: '🌈', tone: 'lavender' },
  { id: 'rose',    label: 'Hoa hồng',     glyph: '🌹', tone: 'peach'    },
]

const TONE_PALETTE_BG: Record<PastelTone, string> = {
  peach:    'bg-peach-100 border-peach-300 hover:bg-peach-200',
  mint:     'bg-sage-100 border-sage-300 hover:bg-sage-200',
  butter:   'bg-butter-100 border-butter-300 hover:bg-butter-200',
  lavender: 'bg-lavender-100 border-lavender-300 hover:bg-lavender-200',
  sky:      'bg-sky-100 border-sky-300 hover:bg-sky-200',
}

const TONE_GLOW: Record<PastelTone, string> = {
  peach:    'var(--color-peach-glow)',
  mint:     'var(--color-sage-glow)',
  butter:   'var(--color-butter-glow)',
  lavender: 'var(--color-lavender-glow)',
  sky:      'var(--color-sky-glow)',
}

/* ─── Placed-sticker data + props ─────────────────────────────────── */

export interface PlacedSticker {
  /** Unique id per placement (so the same sticker kind can be placed twice). */
  uid: string
  kind: StickerKind
  /** Position % of the photo container. */
  x: number
  y: number
  rotation: number
  size: number
}

export interface MemoryDecoration {
  stickers: PlacedSticker[]
  note: string
}

interface DecorateMemoryScreenProps {
  image: string
  /**
   * Fires when the kid taps "Lưu vào Nhật ký Ánh sáng". The parent owns
   * the heavy work (canvas EXIF strip + diary persistence) and may return
   * a Promise; if it does, this screen will keep the spinner up until
   * resolution so the kid never sees a fake "Đã lưu" on a failed save.
   */
  onSave: (decoration: MemoryDecoration) => Promise<void> | void
  onBack: () => void
  /** Optional pre-filled parent note. */
  defaultNote?: string
  /**
   * True while the parent is persisting the photo (EXIF scrub + write to
   * diary). Disables further edits and shows a pulsating stardust loader
   * over the save button. The parent should set this back to false (or
   * unmount this screen) once the save promise resolves.
   */
  isSaving?: boolean
}

export function DecorateMemoryScreen({
  image,
  onSave,
  onBack,
  defaultNote = '',
  isSaving = false,
}: DecorateMemoryScreenProps) {
  const { play } = useSound()
  const [placed, setPlaced] = useState<PlacedSticker[]>([])
  const [note, setNote] = useState(defaultNote)
  const [confettiKey, setConfettiKey] = useState<number | null>(null)
  /**
   * Locks the UI the moment the kid taps Save — even before isSaving
   * arrives from the parent the next tick. Prevents double-fires on
   * impatient double-taps.
   */
  const [pending, setPending] = useState(false)
  const locked = pending || isSaving

  const handleAddSticker = (kind: StickerKind) => {
    if (locked) return
    play('pop')
    // Spread placements across the photo, avoiding the very edges.
    const x = 12 + Math.random() * 76
    const y = 12 + Math.random() * 70
    const rotation = (Math.random() - 0.5) * 30 // ±15°
    const size = 36 + Math.random() * 16 // 36–52 px
    setPlaced((prev) => [
      ...prev,
      { uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, x, y, rotation, size },
    ])
  }

  const handleRemoveSticker = (uid: string) => {
    if (locked) return
    play('tap')
    setPlaced((prev) => prev.filter((s) => s.uid !== uid))
  }

  const handleClear = () => {
    if (locked || placed.length === 0) return
    play('tap')
    setPlaced([])
  }

  const handleNoteChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (locked) return
    setNote(e.target.value.slice(0, 120))
  }

  /**
   * Save flow:
   *   1. Local-lock UI (pending=true) so further taps are no-ops.
   *   2. Play `win` chime + confetti burst — celebratory feedback fires
   *      immediately so it doesn't feel laggy if the persistence takes a
   *      few hundred ms.
   *   3. Await the parent's `onSave`. The parent flips `isSaving` from
   *      false → true → false around its async work; either signal keeps
   *      the spinner visible.
   *   4. The "✓ Đã lưu" badge is now the parent's responsibility — when
   *      MagicCamera transitions to its `saved` stage, this whole screen
   *      unmounts and the polaroid replaces it.
   */
  const handleSave = async () => {
    if (locked) return
    play('win')
    setConfettiKey(Date.now())
    setPending(true)
    try {
      await onSave({ stickers: placed, note: note.trim() })
    } finally {
      // Keep `pending` true if parent already unmounted us; otherwise
      // release the lock so a retry is possible after an error.
      setPending(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ ...springSoft, mass: 0.7 }}
      className="space-y-5"
    >
      <header className="text-center">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
          ✨ Trang trí kỷ niệm
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold text-cocoa-900">
          Dán sticker và để ba mẹ ghi vài chữ nhé!
        </h3>
      </header>

      {/* Photo + placed stickers + confetti when saving */}
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-cozy border-4 border-butter-300 bg-cream-50 p-2 shadow-pop"
        style={{ boxShadow: '0 0 18px 4px var(--color-butter-glow), var(--shadow-pop)' }}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-cocoa-900/10">
          <img
            src={image}
            alt="Ảnh kỷ niệm"
            className="size-full select-none object-cover"
            draggable={false}
          />

          {/* Placed stickers — click to remove */}
          <AnimatePresence>
            {placed.map((s) => (
              <PlacedStickerNode
                key={s.uid}
                placed={s}
                onRemove={() => handleRemoveSticker(s.uid)}
                disabled={locked}
              />
            ))}
          </AnimatePresence>

          {/* While the parent is persisting (EXIF strip + diary write), tint
              the photo so it feels frozen — the spinner over the save button
              tells the kid where the work is happening. */}
          <AnimatePresence>
            {locked && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-cocoa-900/15 backdrop-blur-[1px]"
              />
            )}
          </AnimatePresence>

          {/* Confetti burst on save — sits above the photo */}
          {confettiKey != null && <Confetti trigger={confettiKey} count={36} />}
        </div>

        {note.trim().length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSoft}
            className="mt-2 px-2 text-center font-fun text-sm italic text-cocoa-800"
          >
            "{note}"
          </motion.p>
        )}
      </div>

      {/* Sticker palette */}
      <section>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-butter-500">
              Sticker Board
            </p>
            <p className="font-display text-sm font-semibold text-cocoa-900">
              Chạm để dán lên ảnh ({placed.length})
            </p>
          </div>
          {placed.length > 0 && !locked && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 rounded-full border-2 border-cream-200 bg-cream-50 px-2.5 py-1 text-[11px] font-bold text-cocoa-700 shadow-soft hover:bg-cream-100"
            >
              <X className="size-3" />
              Gỡ hết
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {STICKERS.map((s) => (
            <StickerPaletteButton
              key={s.id}
              sticker={s}
              onClick={() => handleAddSticker(s.id)}
              disabled={locked}
            />
          ))}
        </div>

        <p className="mt-2 text-[11px] text-cocoa-700/60">
          Mẹo: chạm vào sticker đã dán để gỡ ra nhé.
        </p>
      </section>

      {/* Parent note input */}
      <section>
        <label
          htmlFor="parent-note"
          className="block text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500"
        >
          Ghi chú của Ba Mẹ
        </label>
        <p className="mt-0.5 font-display text-sm font-semibold text-cocoa-900">
          Hôm nay ba mẹ cảm thấy gì về con?
        </p>
        <div className="relative mt-2">
          <input
            id="parent-note"
            type="text"
            value={note}
            onChange={handleNoteChange}
            placeholder="Ví dụ: Hôm nay con rất dũng cảm!"
            maxLength={120}
            disabled={locked}
            className={cn(
              'w-full rounded-cozy border-2 border-lavender-200 bg-lavender-50/60 px-4 py-3',
              'font-fun text-base text-cocoa-900 shadow-soft outline-none',
              'placeholder:text-cocoa-700/50',
              'focus:border-lavender-400 focus:ring-4 focus:ring-lavender-200',
              'disabled:opacity-80',
            )}
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-bold tabular-nums text-cocoa-700/50">
            {note.length}/120
          </span>
        </div>
      </section>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={locked}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100 disabled:opacity-60"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </button>

        <div className="relative">
          <Button
            tone="butter"
            size="lg"
            onClick={handleSave}
            disabled={locked}
            leftIcon={
              locked ? (
                <StardustSpinner size={18} />
              ) : (
                <Save className="size-5" />
              )
            }
          >
            {locked
              ? 'Đang gửi ánh sáng vào Nhật ký…'
              : 'Lưu vào Nhật ký Ánh sáng'}
          </Button>
        </div>
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   StardustSpinner — small pulsating loader inside the save button.
   Lives here (not /ui) because the visual is only meaningful in the
   diary-save context: 3 orbiting sparkles around a centered star core.
   ════════════════════════════════════════════════════════════════════ */
function StardustSpinner({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      {/* Central core */}
      <motion.span
        className="absolute inset-0 grid place-items-center"
        animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 0 4px var(--color-butter-glow))' }}
      >
        ★
      </motion.span>
      {/* 3 orbiting dust motes */}
      <motion.span
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2
          const r = size * 0.55
          return (
            <span
              key={i}
              className="absolute rounded-full bg-cream-50"
              style={{
                width: 3,
                height: 3,
                left: '50%',
                top: '50%',
                transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`,
                boxShadow: '0 0 4px var(--color-butter-glow)',
              }}
            />
          )
        })}
      </motion.span>
    </span>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Sticker palette button — tone-matched, bouncy hover, glow
   ════════════════════════════════════════════════════════════════════ */

interface StickerPaletteButtonProps {
  sticker: StickerOption
  onClick: () => void
  disabled?: boolean
}

function StickerPaletteButton({
  sticker,
  onClick,
  disabled,
}: StickerPaletteButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Dán sticker ${sticker.label}`}
      whileTap={disabled ? undefined : { scale: 0.92, y: 1 }}
      whileHover={
        disabled
          ? undefined
          : {
              y: -3,
              scale: 1.05,
              boxShadow: `0 0 16px 2px ${TONE_GLOW[sticker.tone]}`,
            }
      }
      transition={springBouncy}
      className={cn(
        'group relative aspect-square rounded-2xl border-2 p-1 shadow-soft transition-colors',
        TONE_PALETTE_BG[sticker.tone],
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
      style={{
        boxShadow: `0 0 8px 0 ${TONE_GLOW[sticker.tone]}`,
      }}
    >
      <span className="grid h-full place-items-center">
        <StickerGlyph kind={sticker.id} size={36} />
      </span>

      {/* Always-on subtle twinkle in the corner — "this thing is enchanted" */}
      <motion.span
        aria-hidden
        className="absolute -right-1 -top-1 text-xs"
        style={{ color: TONE_GLOW[sticker.tone], filter: `drop-shadow(0 0 3px ${TONE_GLOW[sticker.tone]})` }}
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.7, 1.1, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        ✦
      </motion.span>
    </motion.button>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Placed sticker — absolutely positioned on the photo, click removes it
   ════════════════════════════════════════════════════════════════════ */

interface PlacedStickerNodeProps {
  placed: PlacedSticker
  onRemove: () => void
  disabled?: boolean
}

function PlacedStickerNode({
  placed,
  onRemove,
  disabled,
}: PlacedStickerNodeProps) {
  const option = STICKERS.find((s) => s.id === placed.kind)
  if (!option) return null
  return (
    <motion.button
      type="button"
      onClick={onRemove}
      disabled={disabled}
      aria-label={`Gỡ sticker ${option.label}`}
      initial={{ scale: 0, rotate: placed.rotation - 30, opacity: 0 }}
      animate={{ scale: 1, rotate: placed.rotation, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={springBouncy}
      whileHover={disabled ? undefined : { scale: 1.1 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5"
      style={{
        left: `${placed.x}%`,
        top: `${placed.y}%`,
        filter: `drop-shadow(0 0 6px ${TONE_GLOW[option.tone]}) drop-shadow(0 4px 4px rgba(0,0,0,0.25))`,
      }}
    >
      <StickerGlyph kind={placed.kind} size={placed.size} />
    </motion.button>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Sticker rendering — Lumi gets a custom SVG, others use emoji
   ════════════════════════════════════════════════════════════════════ */

/**
 * Render the visual for a single sticker kind at a given size. Exported
 * so the Family scrapbook can re-render the exact stickers the kid
 * placed during decoration, without duplicating the palette or the
 * Lumi-specific SVG.
 *
 * `kind` is typed loosely as string here so the diary storage layer
 * (`DiarySticker.kind: string`) can hand values straight through; any
 * unknown kind falls back to a generic sparkle glyph.
 */
export function StickerGlyph({
  kind,
  size,
}: {
  kind: StickerKind | string
  size: number
}) {
  if (kind === 'lumi') {
    return <LumiSticker size={size} />
  }
  const option = STICKERS.find((s) => s.id === kind)
  return (
    <span
      aria-hidden
      className="block select-none leading-none"
      style={{ fontSize: size }}
    >
      {option?.glyph ?? '✨'}
    </span>
  )
}

function LumiSticker({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      className="block"
    >
      <defs>
        <radialGradient id="lumi-sticker-body" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="oklch(96% 0.06 88)" />
          <stop offset="55%" stopColor="var(--color-butter-300)" />
          <stop offset="100%" stopColor="var(--color-butter-500)" />
        </radialGradient>
      </defs>

      {/* Pulsing halo */}
      <circle cx={20} cy={20} r={19} fill="var(--color-butter-glow)" opacity={0.55} />

      {/* Lavender ears poking from top */}
      <ellipse
        cx={13}
        cy={7}
        rx={3}
        ry={4.5}
        fill="var(--color-lavender-300)"
        stroke="var(--color-lavender-500)"
        strokeWidth={0.8}
        transform="rotate(-18 13 7)"
      />
      <ellipse
        cx={27}
        cy={7}
        rx={3}
        ry={4.5}
        fill="var(--color-lavender-300)"
        stroke="var(--color-lavender-500)"
        strokeWidth={0.8}
        transform="rotate(18 27 7)"
      />

      {/* Body */}
      <circle
        cx={20}
        cy={20}
        r={14}
        fill="url(#lumi-sticker-body)"
        stroke="var(--color-butter-500)"
        strokeWidth={1.5}
      />

      {/* Cheeks */}
      <circle cx={12} cy={23} r={1.8} fill="var(--color-peach-300)" opacity={0.85} />
      <circle cx={28} cy={23} r={1.8} fill="var(--color-peach-300)" opacity={0.85} />

      {/* Face */}
      <circle cx={15} cy={19} r={1.4} fill="var(--color-cocoa-900)" />
      <circle cx={25} cy={19} r={1.4} fill="var(--color-cocoa-900)" />
      <path
        d="M 15 24 Q 20 27 25 24"
        stroke="var(--color-cocoa-900)"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />

      {/* Tiny shine */}
      <ellipse
        cx={14}
        cy={14}
        rx={2}
        ry={1.4}
        fill="white"
        opacity={0.65}
        transform="rotate(-25 14 14)"
      />
    </svg>
  )
}

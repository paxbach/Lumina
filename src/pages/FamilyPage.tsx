import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useSound } from '@/hooks/useSound'
import {
  Calendar,
  Camera,
  Heart,
  Map as MapIcon,
  MapPin,
  PawPrint,
  ScrollText,
  Send,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { ShareWithGrandparentsModal } from '@/components/family/ShareWithGrandparentsModal'
import { StarSticker, type StickerColor } from '@/components/family/StarSticker'
import {
  WashiTape,
  type WashiColor,
} from '@/components/family/WashiTape'
import { StickerGlyph } from '@/components/quest/DecorateMemoryScreen'
import { useAppStore } from '@/store/useAppStore'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/utils/cn'
import { springBouncy, springSoft } from '@/utils/motion'
import type { DiaryEntry, PastelTone } from '@/types'

/* ════════════════════════════════════════════════════════════════════
   Tone tables — keep class names static so Tailwind JIT keeps them.
   ════════════════════════════════════════════════════════════════════ */

const REGION_TONE: Record<string, PastelTone> = {
  'rung-ky-dieu':         'mint',
  'thanh-pho-thong-minh': 'lavender',
  'dao-van-hoa':          'butter',
  'nui-khoa-hoc':         'sky',
  'vuong-quoc-gia-dinh':  'peach',
}

const REGION_BADGE: Record<PastelTone, string> = {
  peach:    'border-peach-200 bg-peach-50 text-peach-500',
  mint:     'border-sage-200 bg-sage-50 text-sage-500',
  butter:   'border-butter-200 bg-butter-50 text-cocoa-800',
  lavender: 'border-lavender-200 bg-lavender-50 text-lavender-500',
  sky:      'border-sky-200 bg-sky-50 text-cocoa-800',
}

const WASHI_PALETTE: WashiColor[] = ['peach', 'butter', 'sage', 'lavender', 'sky']
const STICKER_PALETTE: StickerColor[] = ['butter', 'peach', 'sage', 'lavender', 'sky']

/* ════════════════════════════════════════════════════════════════════
   Seeded random — stable decoration values per photo across re-renders.
   ════════════════════════════════════════════════════════════════════ */

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seedRand(seed: string, salt = 0): number {
  // Mulberry32-ish — deterministic 0..1
  let t = (hashStr(seed) + Math.imul(salt, 2654435761)) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

interface PolaroidDecor {
  tilt: number
  // Tape #1 — always present, top-left ish
  washi1: { color: WashiColor; rotation: number; topPct: number; leftPct: number }
  // Tape #2 — sometimes, top-right ish
  washi2: { color: WashiColor; rotation: number; topPct: number; rightPct: number } | null
  // Star stickers — 1 always, 2nd sometimes
  star1: { color: StickerColor; size: number; rotation: number; top: string; left: string }
  star2: { color: StickerColor; size: number; rotation: number; top: string; left: string } | null
}

function decorFor(photoId: string): PolaroidDecor {
  // Bumped to ±3° per scrapbook spec — slightly more chaotic, feels more
  // like polaroids tossed onto a desk than a CMS gallery.
  const tilt = seedRand(photoId, 1) * 6 - 3 // [-3°, 3°]

  // Washi tape #1 — left corner
  const washi1Color = WASHI_PALETTE[Math.floor(seedRand(photoId, 2) * WASHI_PALETTE.length)]
  const washi1: PolaroidDecor['washi1'] = {
    color: washi1Color,
    rotation: -22 + seedRand(photoId, 3) * 16, // [-22°, -6°]
    topPct: -3 + seedRand(photoId, 4) * 5,     // peek above the photo
    leftPct: 6 + seedRand(photoId, 5) * 12,
  }

  // Washi tape #2 — right corner, 55% chance
  let washi2: PolaroidDecor['washi2'] = null
  if (seedRand(photoId, 6) > 0.45) {
    let washi2Color = WASHI_PALETTE[Math.floor(seedRand(photoId, 7) * WASHI_PALETTE.length)]
    if (washi2Color === washi1Color) {
      // avoid double tape of same color — bump to next swatch
      washi2Color = WASHI_PALETTE[(WASHI_PALETTE.indexOf(washi1Color) + 1) % WASHI_PALETTE.length]
    }
    washi2 = {
      color: washi2Color,
      rotation: 6 + seedRand(photoId, 8) * 16, // [6°, 22°]
      topPct: -3 + seedRand(photoId, 9) * 5,
      rightPct: 4 + seedRand(photoId, 10) * 12,
    }
  }

  // Sticker positions (CSS coords). Corners: TL / TR / BL / BR / outside.
  // We use "outside" the polaroid for visual interest — sticker pokes past the frame.
  const cornerSlots = [
    { top: '-14px', left: '-14px' }, // TL outside
    { top: '-12px', left: 'calc(100% - 18px)' }, // TR outside
    { top: 'calc(100% - 18px)', left: '-12px' }, // BL outside
    { top: 'calc(100% - 22px)', left: 'calc(100% - 22px)' }, // BR outside
  ]
  const slot1 = cornerSlots[Math.floor(seedRand(photoId, 11) * 4)]
  const star1: PolaroidDecor['star1'] = {
    color: STICKER_PALETTE[Math.floor(seedRand(photoId, 12) * STICKER_PALETTE.length)],
    size: 30 + Math.floor(seedRand(photoId, 13) * 12), // 30–42
    rotation: -18 + seedRand(photoId, 14) * 36,
    ...slot1,
  }

  let star2: PolaroidDecor['star2'] = null
  if (seedRand(photoId, 15) > 0.5) {
    // pick a different corner
    const otherSlots = cornerSlots.filter((s) => s !== slot1)
    const slot2 = otherSlots[Math.floor(seedRand(photoId, 16) * otherSlots.length)]
    star2 = {
      color: STICKER_PALETTE[Math.floor(seedRand(photoId, 17) * STICKER_PALETTE.length)],
      size: 22 + Math.floor(seedRand(photoId, 18) * 12),
      rotation: -18 + seedRand(photoId, 19) * 36,
      ...slot2,
    }
  }

  return { tilt, washi1, washi2, star1, star2 }
}

/* ════════════════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════════════════ */

export default function FamilyPage() {
  // Displayable name now comes from the UserContext (onboarding profile)
  // rather than the legacy Zustand `profile` field. Falls back to a
  // gentle generic if the context is somehow empty so the header never
  // renders as "Sổ ký ức của undefined".
  const { currentUser } = useUser()
  const displayName = currentUser?.name ?? 'Bé'
  // Single source of truth: every captured memory now lives in
  // `diaryEntries`. The Scrapbook reads it directly so stickers + parent
  // notes + dayInJourney flow through with no shape-mapping shim.
  const diaryEntries = useAppStore((s) => s.diaryEntries)
  const regions = useAppStore((s) => s.regions)
  const deleteDiaryEntry = useAppStore((s) => s.deleteDiaryEntry)
  const [shareOpen, setShareOpen] = useState(false)
  /**
   * id of the entry pending parent-confirmation deletion. `null` when no
   * confirm dialog is up. Lives at page level (not on the Polaroid) so
   * tapping a second trash button cleanly replaces the dialog instead of
   * stacking two modals.
   */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const regionName = (id: string): string =>
    regions.find((r) => r.id === id)?.name ?? 'Vùng khác'

  const isEmpty = diaryEntries.length === 0
  const pendingEntry =
    pendingDeleteId != null
      ? diaryEntries.find((e) => e.id === pendingDeleteId) ?? null
      : null

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return
    deleteDiaryEntry(pendingDeleteId)
    setPendingDeleteId(null)
  }

  return (
    <PageLayout
      maxWidth="lg"
      // Warm parchment background — replaces the default cream so the
      // whole scroll surface reads like aged scrapbook paper. The radial
      // glow lives inside <ScrapbookStage> so it sits behind the album
      // rather than washing out the sticky header.
      className="bg-[#faf6ee]"
      header={
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-peach-500">
            Nhật ký Ánh sáng
          </p>
          <h1 className="text-2xl font-display font-bold text-cocoa-900">
            Sổ ký ức của {displayName}
          </h1>
          <p className="mt-0.5 text-xs text-cocoa-700/70">
            Mỗi tấm ảnh là một khoảnh khắc ngoài đời bé đã chinh phục cùng
            gia đình.
          </p>
        </div>
      }
    >
      {isEmpty ? (
        <EmptyState />
      ) : (
        <ScrapbookStage>
          <ShareBanner
            photoCount={diaryEntries.length}
            onShare={() => setShareOpen(true)}
          />

          <ScrapbookTitle />

          <Timeline
            entries={diaryEntries}
            regionName={regionName}
            onRequestDelete={(id) => setPendingDeleteId(id)}
          />
        </ScrapbookStage>
      )}

      <ShareWithGrandparentsModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        photoCount={diaryEntries.length}
      />

      <DeleteConfirmModal
        entry={pendingEntry}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </PageLayout>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ScrapbookStage — parchment-textured stage with ambient radial glow
   ════════════════════════════════════════════════════════════════════ */

function ScrapbookStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Soft warm radial glow behind the scrapbook — gives the page a
          "lit from above" cinematic feel. Sits at -z so polaroids land
          on top of it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[60vh]"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 30%, rgba(255, 215, 150, 0.35) 0%, rgba(255, 200, 160, 0.15) 40%, transparent 75%)',
        }}
      />
      {/* Faint paper grain — subtle so it reads as texture, not noise. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(120, 80, 30, 0.8) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      {children}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   DeleteConfirmModal — cozy parent guardrail for memory deletion
   ════════════════════════════════════════════════════════════════════ */

interface DeleteConfirmModalProps {
  entry: DiaryEntry | null
  onCancel: () => void
  onConfirm: () => void
}

function DeleteConfirmModal({
  entry,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận xoá kỷ niệm"
          className="fixed inset-0 z-50 grid place-items-center bg-cocoa-900/45 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.85, y: 16, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={springBouncy}
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border-4 border-peach-300 p-6 text-center shadow-pop"
            style={{
              backgroundImage: `
                radial-gradient(60% 70% at 50% 0%, var(--color-peach-100) 0%, transparent 70%),
                radial-gradient(60% 70% at 50% 110%, var(--color-butter-100) 0%, transparent 70%),
                linear-gradient(180deg, #fffaf2 0%, #faf0e0 100%)
              `,
            }}
          >
            <WashiTape
              color="peach"
              rotation={-12}
              width={5}
              style={{ top: -8, left: '20%' }}
            />

            <motion.span
              aria-hidden
              className="block select-none text-5xl"
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              💌
            </motion.span>

            <h3 className="mt-3 font-display text-xl font-bold leading-snug text-cocoa-900">
              Xoá ký ức này?
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-cocoa-700">
              Ba mẹ có chắc muốn xoá ký ức này không? Hành động này không thể
              hoàn tác đâu ạ! <span className="text-peach-500">❤️</span>
            </p>

            {/* Mini preview of the entry being deleted so the parent
                sees exactly what's about to disappear. */}
            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl border-2 border-cream-200 bg-cream-50/90 px-3 py-2 shadow-soft">
              <img
                src={entry.imagePath}
                alt={entry.questTitle}
                className="size-12 rounded-lg object-cover shadow-inset-soft"
                draggable={false}
              />
              <div className="min-w-0 text-left">
                <p className="truncate font-display text-sm font-bold text-cocoa-900">
                  {entry.questTitle}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-cocoa-700/70">
                  Ngày thứ {entry.dayInJourney}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <motion.button
                type="button"
                onClick={onCancel}
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -1 }}
                transition={springSoft}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
              >
                <X className="size-4" />
                Giữ lại
              </motion.button>
              <motion.button
                type="button"
                onClick={onConfirm}
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -2, scale: 1.03 }}
                transition={springBouncy}
                className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-peach-500 bg-gradient-to-br from-peach-400 to-peach-500 px-4 py-2 font-display text-sm font-bold text-white shadow-pop"
              >
                <Trash2 className="size-4" />
                Xoá kỷ niệm
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Share CTA — top banner + compact header version
   ════════════════════════════════════════════════════════════════════ */

interface ShareBannerProps {
  photoCount: number
  onShare: () => void
}

function ShareBanner({ photoCount, onShare }: ShareBannerProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, mass: 0.6 }}
      className="relative mb-8 overflow-hidden rounded-cozy border-4 border-peach-300 shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(60% 80% at 0% 0%, var(--color-butter-100) 0%, transparent 65%),
          radial-gradient(60% 80% at 100% 100%, var(--color-peach-200) 0%, transparent 65%),
          linear-gradient(135deg, var(--color-cream-50) 0%, var(--color-peach-50) 100%)
        `,
      }}
    >
      {/* Decorative washi tape on the top-left of the banner */}
      <WashiTape
        color="butter"
        rotation={-14}
        width={6}
        style={{ top: -10, left: 24 }}
      />
      <WashiTape
        color="sage"
        rotation={12}
        width={5}
        style={{ top: -8, right: 70 }}
      />

      {/* Free-floating stars */}
      <StarSticker
        color="butter"
        size={32}
        rotation={-12}
        style={{ position: 'absolute', top: 18, right: 22 }}
      />
      <StarSticker
        color="peach"
        size={22}
        rotation={18}
        style={{ position: 'absolute', bottom: 14, left: 26 }}
      />

      <div className="relative flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-7">
        <div className="flex items-start gap-4">
          <motion.span
            className="grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-peach-200 bg-cream-50 text-3xl shadow-soft"
            animate={{ rotate: [-4, 4, -4] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            💌
          </motion.span>
          <div>
            <h2 className="font-display text-xl font-bold leading-tight text-cocoa-900">
              Gửi tới ông bà ở quê nhé!
            </h2>
            <p className="mt-1 max-w-md text-sm text-cocoa-700/85">
              Đã có{' '}
              <strong className="tabular-nums text-cocoa-900">
                {photoCount}
              </strong>{' '}
              khoảnh khắc đẹp được lưu lại — ông bà sẽ rất vui khi nhìn thấy
              hành trình của cháu.
            </p>
          </div>
        </div>

        <ShareButton onClick={onShare} />
      </div>
    </motion.section>
  )
}

interface ShareButtonProps {
  onClick: () => void
}

function ShareButton({ onClick }: ShareButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={springBouncy}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-cozy border-[3px] border-peach-500 px-6 py-3 font-display text-base font-bold text-white shadow-pop',
        // Warm gradient stands out from the cream page background
        'bg-gradient-to-br from-peach-400 to-peach-500',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200',
      )}
    >
      <Heart className="size-5 fill-cream-50/40" />
      Chia sẻ với ông bà
      <Send className="size-4" />
    </motion.button>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Scrapbook title — hand-drawn-style header with wavy underline
   ════════════════════════════════════════════════════════════════════ */

function ScrapbookTitle() {
  return (
    <div className="relative mx-auto mb-6 w-fit text-center">
      <p className="font-display text-base font-bold text-cocoa-900">
        Trang ký ức của gia đình
      </p>
      <svg
        aria-hidden
        viewBox="0 0 160 12"
        className="mx-auto h-2.5 w-40 text-peach-400"
      >
        <path
          d="M 4 6 Q 14 1, 24 6 T 44 6 T 64 6 T 84 6 T 104 6 T 124 6 T 144 6 T 156 6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Empty state
   ════════════════════════════════════════════════════════════════════ */

function EmptyState() {
  const navigate = useNavigate()
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={springSoft}
      className="mx-auto mt-6 max-w-xl"
    >
      <div
        className="relative overflow-hidden rounded-cozy border-4 border-peach-200 p-10 text-center shadow-pop"
        style={{
          backgroundImage: `
            radial-gradient(50% 60% at 50% 0%, var(--color-peach-100) 0%, transparent 70%),
            radial-gradient(60% 70% at 50% 110%, var(--color-lavender-100) 0%, transparent 70%),
            linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-peach-50) 100%)
          `,
        }}
      >
        <WashiTape
          color="butter"
          rotation={-14}
          width={6}
          style={{ top: -10, left: '20%' }}
        />
        <StarSticker
          color="peach"
          size={40}
          rotation={-12}
          style={{ position: 'absolute', top: 12, right: 18 }}
        />

        <motion.span
          aria-hidden
          className="block select-none text-7xl"
          animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          📸
        </motion.span>

        <h2 className="mt-5 font-display text-xl font-bold text-cocoa-900">
          Sổ lưu niệm còn trống
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cocoa-700">
          Nhật ký đang đợi những ký ức đầu tiên! Hãy cùng Lumi tham gia các
          nhiệm vụ ngoài đời thật để lưu giữ khoảnh khắc tuổi thơ nhé!{' '}
          <span className="text-peach-500">✨</span>
        </p>

        {/* Directional CTA — sends the kid (and parent) to the World Map
            where they can pick a quest and start filling the diary. */}
        <motion.button
          type="button"
          onClick={() => navigate('/map')}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={springBouncy}
          className={cn(
            'mt-6 inline-flex items-center gap-2 rounded-full border-[3px] border-peach-500 px-5 py-2.5',
            'bg-gradient-to-br from-peach-400 to-peach-500 font-display text-sm font-bold text-white shadow-pop',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200',
          )}
        >
          <MapIcon className="size-4" />
          Mở bản đồ phiêu lưu
          <Sparkles className="size-4 fill-cream-50/40" />
        </motion.button>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-sage-200 bg-cream-50/90 px-4 py-1.5 text-xs font-bold text-sage-500 shadow-soft">
          <Heart className="size-3.5 fill-peach-300 stroke-peach-500" />
          Cùng nhau tạo nên kỷ niệm
        </div>
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Timeline
   ════════════════════════════════════════════════════════════════════ */

interface TimelineProps {
  entries: DiaryEntry[]
  regionName: (id: string) => string
  onRequestDelete: (id: string) => void
}

/* Stagger reveal — parent orchestrates, each Polaroid floats in on its
   own beat. `delayChildren` gives the glowing spine a moment to draw
   first so the items feel like they're landing onto the timeline. */
const timelineListVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.25,
    },
  },
}

const timelineItemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springSoft, mass: 0.65 },
  },
}

function Timeline({ entries, regionName, onRequestDelete }: TimelineProps) {
  // Pop-sound limiter — fire once per scroll-reveal batch instead of
  // per item, so a fast scroll doesn't machine-gun the speakers.
  const { play } = useSound()
  const popOnceRef = useRef(false)

  return (
    // The outer wrapper is a relative positioning context for the axis.
    // Inside, every `<TimelineItem>` is a row with a fixed-width
    // (`w-14`) aperture column on the left and a `flex-1` content column
    // on the right that hosts the staggered polaroid. The aperture dot
    // (size-7, centered inside the w-14 column) ends up at x ≈ 28px,
    // which lines up with the axis (left-[26px] + w-[3px] → center
    // ≈ 27.5px) at every breakpoint.
    <div className="relative mx-auto max-w-3xl">
      {/* ─── Continuous glowing timeline axis ────────────────────────
          A single gradient track that visually sews every entry
          together from the very first aperture to the very last.
          `top-4 / bottom-4` tucks the bright tips just inside the
          aperture column padding so the line never appears to spill
          past the dots. Uses `drop-shadow-[...]` arbitrary value so
          the magical bioluminescent halo is one CSS hop instead of an
          extra layered SVG. */}
      <motion.span
        aria-hidden
        initial={{ scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        className="pointer-events-none absolute left-[26px] top-4 bottom-4 w-[3px] origin-top rounded-full bg-gradient-to-b from-amber-300 via-pink-300 to-purple-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]"
      />

      <motion.ol
        variants={timelineListVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        onViewportEnter={() => {
          if (popOnceRef.current) return
          popOnceRef.current = true
          play('pop')
        }}
        // Generous vertical rhythm between memories so the staggered
        // left/right alignment doesn't visually collide.
        className="relative space-y-12 sm:space-y-16"
      >
        {entries.map((entry, i) => (
          <TimelineItem
            key={entry.id}
            entry={entry}
            index={i}
            isLatest={i === 0}
            regionName={regionName(entry.regionId)}
            onRequestDelete={onRequestDelete}
          />
        ))}
      </motion.ol>

      <p className="mt-12 flex items-center justify-center gap-2 text-xs font-semibold text-amber-900/60">
        <ScrollText className="size-4" />
        Hết trang sổ lưu niệm — tiếp tục phiêu lưu để mở thêm khoảnh khắc nhé!
      </p>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────── */

/**
 * Tone → category-icon mapping for the timeline aperture core. Mirrors
 * `REGION_TONE`: each biome gets a distinct mini-glyph so the kid can
 * skim the album and read which world each memory came from.
 *
 *   - peach    → heart   (Vương quốc Gia đình)
 *   - mint     → camera  (Sở Thú / former Rừng Kỳ Diệu — photo missions)
 *   - butter   → star    (Đảo Văn Hoá)
 *   - lavender → camera  (Thành phố Thông Minh)
 *   - sky      → paw     (Núi Khoa Học)
 */
const TIMELINE_NODE_ICON: Record<PastelTone, React.ComponentType<{ className?: string }>> = {
  peach:    Heart,
  mint:     Camera,
  butter:   Star,
  lavender: Camera,
  sky:      PawPrint,
}

const TIMELINE_NODE_ICON_COLOR: Record<PastelTone, string> = {
  peach:    'text-peach-500',
  mint:     'text-sage-500',
  butter:   'text-butter-500',
  lavender: 'text-lavender-500',
  sky:      'text-sky-500',
}

/* ────────────────────────────────────────────────────────────────── */

interface TimelineItemProps {
  entry: DiaryEntry
  index: number
  /**
   * `true` for the newest entry (index 0 in a newest-first list). Drives
   * the "breathing" aperture animation + the inner active dot so the kid
   * sees at a glance which memory is the latest.
   */
  isLatest: boolean
  regionName: string
  onRequestDelete: (id: string) => void
}

function TimelineItem({
  entry,
  index,
  isLatest,
  regionName,
  onRequestDelete,
}: TimelineItemProps) {
  const tone = REGION_TONE[entry.regionId] ?? 'peach'
  const decor = useMemo(() => decorFor(entry.id), [entry.id])
  const Icon = TIMELINE_NODE_ICON[tone]
  const iconColor = TIMELINE_NODE_ICON_COLOR[tone]

  return (
    <motion.li
      variants={timelineItemVariants}
      // Row layout — fixed-width aperture column + flexible polaroid
      // column. `items-start` glues each anchor to the top of its card
      // so dots track the axis at every viewport width.
      className="relative flex items-start"
    >
      {/* ─── Aperture column ──────────────────────────────────────────
          `w-14` (56px) wraps the size-7 (28px) aperture; `place-items-
          center` horizontally centers the dot, which lands at x = 28px
          inside the outer container — right under the axis (left-[26px]
          → center ≈ 27.5px). The `pt-6` push aligns the dot vertically
          with the top of the polaroid caption strip. */}
      <div className="grid w-14 shrink-0 place-items-center pt-6">
        <Aperture index={index} isLatest={isLatest} Icon={Icon} iconColor={iconColor} />
      </div>

      {/* Polaroid column. `min-w-0` lets the card shrink inside the
          flex row so long captions don't shove the timeline off-axis. */}
      <div className="min-w-0 flex-1">
        <Polaroid
          entry={entry}
          index={index}
          regionName={regionName}
          tone={tone}
          decor={decor}
          onDelete={() => onRequestDelete(entry.id)}
        />
      </div>
    </motion.li>
  )
}

/* ────────────────────────────────────────────────────────────────── */

interface ApertureProps {
  index: number
  isLatest: boolean
  Icon: React.ComponentType<{ className?: string }>
  iconColor: string
}

/**
 * Scrapbook-style camera-aperture node. Uniform amber ring across all
 * entries so the timeline reads as a single threaded chain rather than
 * a rainbow of regional colours competing with the polaroid's badge.
 * Every ring breathes gently (low amplitude, staggered delay); the
 * newest entry layers a brighter pulse + an active neon-gold dot on
 * top to mark the freshest milestone.
 */
function Aperture({ index, isLatest, Icon, iconColor }: ApertureProps) {
  return (
    <motion.span
      aria-hidden
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true, margin: '-90px' }}
      // Gentle breath for every node; stronger for the latest. The
      // staggered delay (capped at 6 to avoid runaway sync drift on
      // long diaries) gives the chain a "twinkle along the line" feel
      // instead of all rings pulsing in unison.
      animate={
        isLatest
          ? { scale: [1, 1.1, 1] }
          : { scale: [1, 1.035, 1] }
      }
      transition={{
        duration: isLatest ? 2.2 : 3.6,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: 0.2 + Math.min(index, 6) * 0.18,
      }}
      className="relative z-10 grid size-7 place-items-center rounded-full border-2 border-amber-300 bg-white shadow-sm"
      style={{
        boxShadow: isLatest
          ? '0 0 0 4px rgba(251, 191, 36, 0.18), 0 0 14px rgba(251, 191, 36, 0.55), 0 1px 2px rgba(120, 70, 30, 0.18)'
          : '0 0 8px rgba(251, 191, 36, 0.35), 0 1px 2px rgba(120, 70, 30, 0.18)',
      }}
    >
      <Icon className={cn('size-3.5', iconColor)} />

      {/* Active milestone dot — neon gold pulse, only on the newest
          memory. Sits dead-center on top of the icon to read as the
          "you are here" beacon of the album. */}
      {isLatest && (
        <motion.span
          aria-hidden
          className="absolute size-2 rounded-full bg-amber-400"
          animate={{ opacity: [0.55, 1, 0.55], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            boxShadow:
              '0 0 8px rgba(251, 191, 36, 0.95), 0 0 14px rgba(132, 204, 22, 0.45)',
          }}
        />
      )}
    </motion.span>
  )
}

/* ────────────────────────────────────────────────────────────────── */

interface PolaroidProps {
  entry: DiaryEntry
  /** Row index in the timeline (0 = newest). Drives the scrapbook-style
   *  alternating tilt — odd rows lean right, even rows lean left — on top
   *  of the per-id micro-jitter from `decorFor`, so the column reads as
   *  hand-pasted photos rather than a tidy CMS grid. */
  index: number
  regionName: string
  tone: PastelTone
  decor: PolaroidDecor
  onDelete: () => void
}

function Polaroid({
  entry,
  index,
  regionName,
  tone,
  decor,
  onDelete,
}: PolaroidProps) {
  const hasStickers = entry.stickers.length > 0
  const hasNote = !!entry.parentNote?.trim()

  // Staggered grid alignment. 1st card (visually "odd", index 0) leans
  // slightly clockwise and nudges right; 2nd card ("even", index 1)
  // leans counter-clockwise, nudges left, and floats to the right edge
  // via `ml-auto`. The pattern repeats, producing the hand-pasted
  // SO-LE scrapbook stagger. `hover:rotate-0` straightens on hover so
  // the photo reads cleanly when the reader leans in.
  const isOdd = index % 2 === 0
  const staggerClasses = isOdd
    ? 'rotate-1 translate-x-2 shadow-md md:max-w-md'
    : '-rotate-1 -translate-x-2 shadow-lg md:max-w-md ml-auto'

  return (
    <article
      // `group/polaroid` so the delete button + inner glow can react to
      // hover purely via Tailwind, no JS state needed.
      className={cn(
        'group/polaroid relative w-full rounded-xl border-[10px] border-cream-50 bg-cream-50 p-0 pb-6',
        // CSS-driven tilt + translate + shadow per the scrapbook spec.
        // `transition-all duration-300` smooths the hover straighten +
        // scale-up so the card lifts gracefully under the cursor.
        staggerClasses,
        'transition-all duration-300 ease-out hover:rotate-0 hover:translate-x-0 hover:scale-[1.02] hover:shadow-2xl',
      )}
    >
      {/* Delete button — peach circle, fades in on hover/focus via
          group-hover so it doesn't compete with the photo at rest.
          `e.stopPropagation()` keeps the trash click from being read
          as a polaroid press. */}
      <button
        type="button"
        aria-label={`Xoá ký ức "${entry.questTitle}"`}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className={cn(
          'absolute -right-3 -top-3 z-20 grid size-9 place-items-center rounded-full',
          'border-2 border-peach-400 bg-peach-100 text-peach-500 shadow-pop',
          'opacity-55 scale-[0.85] transition-all duration-200',
          'group-hover/polaroid:opacity-100 group-hover/polaroid:scale-100',
          'hover:bg-peach-200 hover:scale-110 hover:rotate-6',
          'focus-visible:opacity-100 focus-visible:scale-100',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200',
        )}
      >
        <Trash2 className="size-4" />
      </button>

      {/* Washi tape #1 — top corner */}
      <WashiTape
        color={decor.washi1.color}
        rotation={decor.washi1.rotation}
        width={5.5}
        style={{
          top: `${decor.washi1.topPct}%`,
          left: `${decor.washi1.leftPct}%`,
          zIndex: 5,
        }}
      />

      {/* Washi tape #2 — sometimes */}
      {decor.washi2 && (
        <WashiTape
          color={decor.washi2.color}
          rotation={decor.washi2.rotation}
          width={5}
          style={{
            top: `${decor.washi2.topPct}%`,
            right: `${decor.washi2.rightPct}%`,
            zIndex: 5,
          }}
        />
      )}

      {/* Photo + sticker overlay. The container is `relative` so each
          DiarySticker can be positioned via x/y % directly on top of
          the image — preserving the exact spots the kid stamped
          during the decorate step. */}
      <div className="relative overflow-hidden bg-cocoa-900/5">
        <img
          src={entry.imagePath}
          alt={entry.questTitle}
          loading="lazy"
          draggable={false}
          className="block aspect-[4/3] w-full select-none object-cover"
        />

        {/* Inner bioluminescent glow — radial wash that brightens on
            hover via group-hover. `mix-blend-screen` warms highlights
            instead of greying out shadows. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18] transition-opacity duration-300 group-hover/polaroid:opacity-70"
          style={{
            background:
              'radial-gradient(60% 70% at 50% 45%, rgba(255, 220, 150, 0.95) 0%, rgba(255, 190, 130, 0.3) 50%, transparent 80%)',
            mixBlendMode: 'screen',
          }}
        />

        {hasStickers && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
          >
            {entry.stickers.map((s, i) => (
              <span
                key={`${entry.id}-sticker-${i}`}
                className="absolute"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  // Compose translate (centering) + rotate in a single
                  // transform so they don't collide with each other.
                  transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                  filter:
                    'drop-shadow(0 0 6px rgba(255, 215, 120, 0.7)) drop-shadow(0 4px 4px rgba(0,0,0,0.25))',
                }}
              >
                <StickerGlyph kind={s.kind} size={s.size} />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Parent note — warm handwritten quote underneath the photo,
          framed by hand-drawn curly quotes in peach. Only renders when
          the parent actually wrote something. */}
      {hasNote && (
        <p className="mt-2 px-2 text-center font-serif text-sm italic leading-relaxed text-amber-900/80">
          <span className="text-peach-500" aria-hidden>“</span>
          {entry.parentNote}
          <span className="text-peach-500" aria-hidden>”</span>
        </p>
      )}

      {/* ─── Caption block ─────────────────────────────────────────
          Three handwritten-feeling lines layered cleanly:
            1. Eyebrow — "NGÀY THỨ X TRONG HÀNH TRÌNH" in peach,
               extra letter-spacing for the diary-stamp feel.
            2. Title  — bold display, the quest name.
            3. Meta   — region pill + handwritten serif date.
          Spacing tuned so the caption breathes without crowding the
          polaroid's bottom border. */}
      <div className="mt-3.5 space-y-2 px-4 font-fun">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-peach-500/90">
          <Calendar className="size-3.5" />
          <span>
            Ngày thứ <span className="tabular-nums">{entry.dayInJourney}</span>{' '}
            trong hành trình
          </span>
        </div>

        <p className="font-display text-base font-bold leading-snug text-cocoa-900">
          {entry.questTitle}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-bold tracking-wide',
              REGION_BADGE[tone],
            )}
          >
            <MapPin className="size-3" />
            {regionName}
          </span>

          <span className="inline-flex items-center gap-1 font-serif text-[11px] italic tracking-wide text-amber-900/70">
            <Sparkles className="size-3 fill-butter-300 stroke-butter-500" />
            {entry.displayDate}
          </span>
        </div>
      </div>

      {/* Star stickers — float outside the polaroid frame */}
      <StarSticker
        color={decor.star1.color}
        size={decor.star1.size}
        rotation={decor.star1.rotation}
        style={{
          position: 'absolute',
          top: decor.star1.top,
          left: decor.star1.left,
          zIndex: 10,
        }}
      />

      {decor.star2 && (
        <StarSticker
          color={decor.star2.color}
          size={decor.star2.size}
          rotation={decor.star2.rotation}
          style={{
            position: 'absolute',
            top: decor.star2.top,
            left: decor.star2.left,
            zIndex: 10,
          }}
        />
      )}
    </article>
  )
}

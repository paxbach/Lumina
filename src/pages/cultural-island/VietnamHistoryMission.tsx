import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { IconButton } from '@/components/ui/IconButton'
import { CameraCaptureModal } from '@/components/games/CameraCaptureModal'
import { cn } from '@/utils/cn'
import { springBouncy, springSoft } from '@/utils/motion'

/* ════════════════════════════════════════════════════════════════════
   VietnamHistoryMission — "Hành Trình Ngược Dòng Thời Gian"
   ────────────────────────────────────────────────────────────────────
   Detail page for the Đảo Văn Hoá history mission. Four sections:

     1. Lumi Kể       — bronze-drum hero banner + story copy
     2. (dots)        — amber pagination dots
     3. Mục tiêu      — mission description card with polaroid side art
     4. Cấp độ        — 3-card difficulty selector (Dễ / Trung bình /
                        Phiêu lưu) with reward chips
     5. Sticky CTA    — orange "Bắt đầu hành trình 📸" that opens the
                        full-screen CameraCaptureModal. Captured photo
                        auto-saves to the diary via saveContext so the
                        polaroid lands at the top of FamilyPage's
                        timeline tagged to `dao-van-hoa`.

   No store / sub-node coupling on this page itself — it's wireable
   from any region sub-node (or a deep-link) by navigating to
   `/cultural-island/vietnam-history`. Each captured polaroid is
   attributed to `dao-van-hoa` regardless of the entry point.
   ════════════════════════════════════════════════════════════════════ */

const CULTURE_REGION_ID = 'dao-van-hoa'

type Difficulty = 'easy' | 'medium' | 'adventure'

interface RewardChip {
  /** Single-character glyph rendered as text (no asset dependency). */
  glyph: string
  /** Short Vietnamese label. */
  label: string
}

interface DifficultyOption {
  id: Difficulty
  /** "Dễ" / "Trung bình" / "Phiêu lưu" — shown as a badge in the card. */
  level: string
  title: string
  description: string
  emoji: string
  /** Hex accent driving the card border, badge, glow halo. */
  accent: string
  rewards: RewardChip[]
}

const DIFFICULTIES: DifficultyOption[] = [
  {
    id: 'easy',
    level: 'Dễ',
    title: 'Sách sử mở ra',
    description:
      'Trò chơi ảo trên máy — bé dùng ngón tay nối các hình ảnh lịch sử như Thánh Gióng, Tháp Rùa vào đúng câu chuyện để nhận diện.',
    emoji: '📖',
    accent: '#fbbf24',
    rewards: [{ glyph: '💎', label: '2 Gems' }],
  },
  {
    id: 'medium',
    level: 'Trung bình',
    title: 'Đi tìm Trống Đồng Đông Sơn',
    description:
      'Trò chơi thực tế — cùng mẹ ghé thăm một bảo tàng lịch sử / văn hoá gần nhà, dùng Magic Camera chụp ảnh một chiếc Trống Đồng hoặc hiện vật gốm sứ cổ để giải mã.',
    emoji: '🥁',
    accent: '#f97316',
    rewards: [
      { glyph: '💎', label: '3 Gems' },
      { glyph: '⭐', label: '2 Stars' },
    ],
  },
  {
    id: 'adventure',
    level: 'Phiêu lưu',
    title: 'Nhà khảo cổ đại tài',
    description:
      'Thử thách dã ngoại nâng cao — chụp hình cùng mẹ trước cổng di tích lịch sử hoặc bảo tàng, viết một lời cảm ơn ngắn bằng giọng nói để lưu vào Nhật Ký.',
    emoji: '🏛️',
    accent: '#dc2626',
    rewards: [
      { glyph: '💎', label: '5 Gems' },
      { glyph: '⭐', label: '3 Stars' },
      { glyph: '🏅', label: '1 Hùng Vương Badge' },
    ],
  },
]

export default function VietnamHistoryMission() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Difficulty>('medium')
  const [cameraOpen, setCameraOpen] = useState(false)

  const current =
    DIFFICULTIES.find((d) => d.id === selected) ?? DIFFICULTIES[0]

  return (
    <PageLayout
      maxWidth="lg"
      // Warm pastel wash inheriting the Lumina universe palette —
      // cream → butter → peach diagonal so the page feels like aged
      // historical parchment without being yellowed out.
      className="bg-gradient-to-br from-cream-50 via-butter-50 to-peach-50 pb-36"
      header={
        <div className="flex items-center gap-3">
          <IconButton label="Quay lại" tone="cream" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </IconButton>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
              Đảo Văn Hoá · Nhiệm vụ lịch sử
            </p>
            <h1 className="mt-0.5 font-display text-xl font-bold leading-snug text-cocoa-900 sm:text-2xl">
              Hành Trình Ngược Dòng Thời Gian
            </h1>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <StoryBanner />
        <PaginationDots active={0} total={4} />
        <MissionCard />
        <DifficultySection
          options={DIFFICULTIES}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <StickyBottomBar
        eyebrow={current.level}
        title={current.title}
        onStart={() => setCameraOpen(true)}
      />

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        // saveContext writes the captured polaroid directly into the
        // store's diaryEntries via saveMemory — so the photo appears
        // at the top of FamilyPage's timeline the moment the shutter
        // fires, tagged to `dao-van-hoa` so the timeline pill picks
        // up the cultural-island colour.
        saveContext={{
          questTitle: `Mật mã Cổ vật · ${current.title}`,
          regionId: CULTURE_REGION_ID,
        }}
        title={`Chụp ảnh cùng ${current.title}`}
        subtitle="Đếm 3-2-1 rồi chụp cổ vật / di tích bé tìm thấy nhé!"
      />
    </PageLayout>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Section 1 — Lumi kể (bronze drum + story copy)
   ════════════════════════════════════════════════════════════════════ */

function StoryBanner() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className="relative overflow-hidden rounded-[2.5rem] border-4 border-amber-300 p-5 shadow-pop sm:p-6"
      style={{
        backgroundImage: `
          radial-gradient(60% 80% at 20% 20%, rgba(252, 211, 77, 0.28) 0%, transparent 60%),
          radial-gradient(60% 80% at 100% 100%, rgba(254, 240, 138, 0.45) 0%, transparent 65%),
          linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-butter-100) 100%)
        `,
      }}
    >
      <div className="flex items-start gap-4">
        <BronzeDrumIcon />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
            Lumi kể
          </p>
          <p className="mt-2 text-sm leading-relaxed text-cocoa-800 sm:text-base">
            <strong className="font-display font-bold text-cocoa-900">
              Áo choàng lịch sử
            </strong>{' '}
            của Đảo Văn Hoá đang bị phai mờ ký ức! Bé có muốn cùng Lumi
            ngược dòng thời gian, hoá thân thành các{' '}
            <strong className="font-display font-bold text-amber-700">
              nhà khảo cổ nhí
            </strong>{' '}
            để đi tìm lại báu vật ngàn năm của nước mình không?
          </p>
        </div>
      </div>
    </motion.section>
  )
}

/** Glowing trống đồng (Đông Sơn bronze drum) — 12-ray sun motif on a
 *  radial bronze gradient with a soft amber halo behind. Pure SVG so it
 *  scales cleanly at any density. */
function BronzeDrumIcon() {
  const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
  return (
    <motion.div
      aria-hidden
      className="relative grid size-16 shrink-0 place-items-center sm:size-20"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          background:
            'radial-gradient(circle, rgba(252, 211, 77, 0.75) 0%, transparent 70%)',
        }}
      />
      <svg viewBox="0 0 80 80" className="relative size-full">
        <defs>
          <radialGradient id="drum-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#fde68a" />
            <stop offset="50%"  stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#drum-grad)" stroke="#78350f" strokeWidth="1.5" />
        {/* Concentric rings */}
        <circle cx="40" cy="40" r="28" fill="none" stroke="#92400e" strokeWidth="0.8" opacity="0.55" />
        <circle cx="40" cy="40" r="20" fill="none" stroke="#92400e" strokeWidth="0.8" opacity="0.7" />
        <circle cx="40" cy="40" r="12" fill="none" stroke="#92400e" strokeWidth="0.8" opacity="0.85" />
        {/* 12 radial rays */}
        {rays.map((deg) => (
          <line
            key={deg}
            x1="40"
            y1="40"
            x2={40 + 26 * Math.cos((deg * Math.PI) / 180)}
            y2={40 + 26 * Math.sin((deg * Math.PI) / 180)}
            stroke="#78350f"
            strokeWidth="0.6"
            opacity="0.45"
          />
        ))}
        {/* Sun motif star at center */}
        <polygon
          points="40,28 42.4,37 51.8,37 44.2,42.8 47,52 40,46.6 33,52 35.8,42.8 28.2,37 37.6,37"
          fill="#fde68a"
          stroke="#78350f"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Pagination dots — amber, active dot stretched
   ════════════════════════════════════════════════════════════════════ */

function PaginationDots({ active, total }: { active: number; total: number }) {
  return (
    <div
      role="tablist"
      aria-label="Trang giới thiệu"
      className="flex items-center justify-center gap-2"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-selected={i === active}
          role="tab"
          className={cn(
            'rounded-full transition-all duration-300',
            i === active
              ? 'h-2 w-7 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.85)]'
              : 'size-2 bg-amber-300/55',
          )}
        />
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Section 2 — Mục tiêu (mission card + museum polaroid)
   ════════════════════════════════════════════════════════════════════ */

function MissionCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: 0.1 }}
      className="rounded-[2rem] border-4 border-peach-200 bg-cream-50 p-5 shadow-soft sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-peach-500">
            Mục tiêu
          </p>
          <h2 className="mt-1 font-display text-base font-bold leading-snug text-cocoa-900 sm:text-lg">
            Làm nhiệm vụ{' '}
            <span className="text-peach-600">
              &ldquo;Mật mã Cổ vật Hoàng thành&rdquo;
            </span>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-cocoa-700">
            Cùng ba mẹ tham gia hai thử thách đặc biệt:{' '}
            <strong className="font-bold text-cocoa-900">
              giải mã câu đố lịch sử
            </strong>{' '}
            ngay trên ứng dụng và{' '}
            <strong className="font-bold text-cocoa-900">
              cùng mẹ thực hiện một chuyến dã ngoại
            </strong>{' '}
            đến Bảo tàng gần nhất để truy tìm Trống đồng hoặc cổ vật thật
            ngoài đời nhé!
          </p>
        </div>
        <MuseumPolaroid />
      </div>
    </motion.section>
  )
}

/** Tilted polaroid frame containing a stylised museum / ancient crown
 *  emoji. Hidden on phone so the description gets the full width. */
function MuseumPolaroid() {
  return (
    <motion.div
      aria-hidden
      animate={{ rotate: [-2, 2, -2] }}
      transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
      className="hidden w-24 shrink-0 rounded-xl border-[8px] border-cream-50 bg-cream-50 pb-2 shadow-pop sm:block"
    >
      <div
        className="grid aspect-square place-items-center rounded-md text-5xl"
        style={{
          background:
            'linear-gradient(180deg, #fde68a 0%, #d97706 60%, #7c2d12 100%)',
        }}
      >
        🏛️
      </div>
      <p className="mt-1 text-center text-[8px] font-bold uppercase tracking-[0.2em] text-cocoa-700/70">
        Bảo tàng
      </p>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Section 3 — Difficulty cards (3 horizontal cards)
   ════════════════════════════════════════════════════════════════════ */

function DifficultySection({
  options,
  selected,
  onSelect,
}: {
  options: DifficultyOption[]
  selected: Difficulty
  onSelect: (next: Difficulty) => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: 0.2 }}
      className="space-y-3"
    >
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
          Chọn cấp độ phiêu lưu
        </p>
        <h2 className="mt-0.5 font-display text-lg font-bold text-cocoa-900">
          Bé muốn thử thách cỡ nào?
        </h2>
      </div>

      <div
        role="radiogroup"
        aria-label="Cấp độ phiêu lưu"
        className="grid gap-3 sm:grid-cols-3"
      >
        {options.map((opt) => (
          <DifficultyCard
            key={opt.id}
            option={opt}
            selected={opt.id === selected}
            onSelect={() => onSelect(opt.id)}
          />
        ))}
      </div>
    </motion.section>
  )
}

function DifficultyCard({
  option,
  selected,
  onSelect,
}: {
  option: DifficultyOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={springBouncy}
      className={cn(
        'relative flex flex-col items-stretch gap-2 rounded-2xl border-4 bg-cream-50 p-4 text-left shadow-soft transition-shadow',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200',
        selected && 'shadow-pop',
      )}
      style={{
        borderColor: selected ? option.accent : 'var(--color-cream-200)',
        backgroundImage: selected
          ? `radial-gradient(120% 80% at 50% 0%, ${option.accent}1a 0%, transparent 65%), linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-cream-100) 100%)`
          : `radial-gradient(120% 80% at 50% 0%, ${option.accent}0d 0%, transparent 65%)`,
        boxShadow: selected
          ? `0 0 0 4px ${option.accent}25, var(--shadow-pop)`
          : undefined,
      }}
    >
      {/* Header — level badge + emoji */}
      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{
            color: option.accent,
            backgroundColor: `${option.accent}1f`,
            border: `1.5px solid ${option.accent}`,
          }}
        >
          {option.level}
        </span>
        <span
          aria-hidden
          className="text-3xl"
          style={{
            filter: selected
              ? `drop-shadow(0 0 8px ${option.accent}cc)`
              : undefined,
          }}
        >
          {option.emoji}
        </span>
      </div>

      <h3 className="font-display text-base font-bold leading-snug text-cocoa-900">
        {option.title}
      </h3>
      <p className="text-xs leading-relaxed text-cocoa-700/85">
        {option.description}
      </p>

      {/* Reward chips — push to bottom so cards align across the row */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
        {option.rewards.map((r) => (
          <span
            key={r.label}
            className="inline-flex items-center gap-1 rounded-full border-2 border-butter-200 bg-butter-50 px-2 py-0.5 text-[10px] font-bold text-cocoa-900"
          >
            <span aria-hidden>{r.glyph}</span>
            {r.label}
          </span>
        ))}
      </div>

      {selected && (
        <span
          aria-hidden
          className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-cream-50 text-white shadow-pop"
          style={{ backgroundColor: option.accent }}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </motion.button>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Sticky bottom CTA — floats above the AppShell bottom nav (z-30)
   ════════════════════════════════════════════════════════════════════ */

function StickyBottomBar({
  eyebrow,
  title,
  onStart,
}: {
  eyebrow: string
  title: string
  onStart: () => void
}) {
  return (
    <div
      // `bottom-24` clears the AppShell bottom nav (~80px including
      // safe-area padding). z-30 = same plane as the nav so backdrop
      // blur reads cohesively against it.
      className="pointer-events-none fixed inset-x-0 bottom-24 z-30 mx-auto max-w-[1024px] px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springBouncy, delay: 0.4 }}
        className="pointer-events-auto flex items-center gap-3 rounded-full border-2 border-amber-200 bg-cream-50/95 p-2 pl-4 shadow-pop backdrop-blur"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-600">
            Cấp độ · {eyebrow}
          </p>
          <p className="truncate font-display text-sm font-bold text-cocoa-900">
            {title}
          </p>
        </div>

        <motion.button
          type="button"
          onClick={onStart}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          transition={springBouncy}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border-[3px] border-orange-500 bg-gradient-to-br from-orange-400 to-orange-500 px-5 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
        >
          Bắt đầu hành trình
          <span aria-hidden className="text-base">📸</span>
        </motion.button>
      </motion.div>
    </div>
  )
}

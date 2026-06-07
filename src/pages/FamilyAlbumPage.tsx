import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, GalleryHorizontal } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Card } from '@/components/ui'
import { useFamilyStore } from '@/store/useFamilyStore'
import { familyPhotoPublicUrl } from '@/lib/familyPhotos'
import type { FamilyMoment } from '@/types/family'
import { cn } from '@/utils/cn'
import { staggerContainer, staggerItem } from '@/utils/motion'

/**
 * Family Album — month-grouped, then quest-grouped grid of every
 * captured moment. Standalone (no-quest) entries fall under a
 * "📓 Nhật ký gia đình" bucket per month.
 */
export default function FamilyAlbumPage() {
  const navigate = useNavigate()
  const family = useFamilyStore((s) => s.family)
  const moments = useFamilyStore((s) => s.moments)
  const quest = useFamilyStore((s) => s.quest)

  // Single active quest in MVP — when moments reference its id, we
  // can resolve a nice title. For completed/historical quests we'd
  // need to fetch the list; out of scope for Phase 3.
  const questTitleById = useMemo(() => {
    const map = new Map<string, string>()
    if (quest) map.set(quest.id, quest.title)
    return map
  }, [quest])

  const monthGroups = useMemo(() => groupByMonthAndQuest(moments), [moments])

  if (!family) {
    return (
      <PageLayout maxWidth="lg">
        <div className="grid place-items-center gap-4 py-20 text-center">
          <div className="text-5xl">🖼️</div>
          <p className="font-display text-lg text-cocoa-900">
            Gia đình bạn cần tham gia một Phòng Gia Đình để mở album.
          </p>
          <Button tone="lavender" onClick={() => navigate('/family-dashboard')}>
            Về trang gia đình
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      maxWidth="lg"
      className="bg-[#faf6ee]"
      header={
        <div className="flex w-full items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/family-dashboard')}
            aria-label="Quay lại"
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-full border-2 border-cream-200 bg-white shadow-soft',
              'hover:bg-cream-50',
            )}
          >
            <ChevronLeft className="size-5 text-cocoa-700" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lavender-500">
              Album gia đình
            </p>
            <h1 className="truncate font-display text-2xl text-cocoa-900">
              {family.familyName}
            </h1>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border-2 border-lavender-200 bg-lavender-50 px-3 py-1.5 sm:flex">
            <GalleryHorizontal className="size-4 text-lavender-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-cocoa-700">
              {moments.length} ảnh
            </span>
          </div>
        </div>
      }
    >
      {monthGroups.length === 0 ? (
        <EmptyAlbum />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-10 pb-16"
        >
          {monthGroups.map((mg) => (
            <section key={mg.label} className="flex flex-col gap-6">
              <h2 className="font-display text-lg text-cocoa-900">{mg.label}</h2>
              {mg.byQuest.map((qg) => {
                const heading =
                  qg.questId === null
                    ? '📓 Nhật ký gia đình'
                    : `🌟 ${questTitleById.get(qg.questId) ?? 'Nhiệm vụ'}`
                return (
                  <div key={qg.questId ?? 'standalone'} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base text-cocoa-800">{heading}</h3>
                      <span className="text-xs text-cocoa-700/70">{qg.moments.length} ảnh</span>
                    </div>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                      {qg.moments.map((m) => (
                        <AlbumTile key={m.id} moment={m} />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </section>
          ))}
        </motion.div>
      )}
    </PageLayout>
  )
}

/* ─── grouping ─────────────────────────────────────────────────────── */

interface QuestGroup {
  questId: string | null
  moments: FamilyMoment[]
}
interface MonthGroup {
  /** Year-month string used as map key (e.g. `2026-06`). */
  key: string
  /** Human-readable Vietnamese label (e.g. `Tháng 6, 2026`). */
  label: string
  byQuest: QuestGroup[]
}

function groupByMonthAndQuest(moments: FamilyMoment[]): MonthGroup[] {
  if (moments.length === 0) return []
  const sorted = [...moments].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  )
  const byMonth = new Map<string, Map<string | null, FamilyMoment[]>>()
  for (const m of sorted) {
    const d = new Date(m.capturedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth.has(key)) byMonth.set(key, new Map())
    const qMap = byMonth.get(key)!
    const qid = m.questId
    if (!qMap.has(qid)) qMap.set(qid, [])
    qMap.get(qid)!.push(m)
  }
  return Array.from(byMonth.entries()).map(([key, qMap]) => {
    const [y, mm] = key.split('-').map(Number)
    const label = `Tháng ${mm}, ${y}`
    const byQuest: QuestGroup[] = Array.from(qMap.entries()).map(
      ([questId, ms]) => ({ questId, moments: ms }),
    )
    return { key, label, byQuest }
  })
}

/* ─── tile ─────────────────────────────────────────────────────────── */

function AlbumTile({ moment }: { moment: FamilyMoment }) {
  const url = familyPhotoPublicUrl(moment.photoPath)
  return (
    <motion.li
      variants={staggerItem}
      className="group relative aspect-square overflow-hidden rounded-xl border-2 border-cream-200 bg-cream-100 shadow-soft"
    >
      {url ? (
        <img src={url} alt={moment.caption ?? ''} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-3xl text-cocoa-700/40">
          {moment.memberAvatar}
        </div>
      )}
      <span className="absolute bottom-1 left-1 rounded-full bg-cocoa-900/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {moment.memberAvatar}
      </span>
    </motion.li>
  )
}

function EmptyAlbum() {
  return (
    <Card tone="cream" padding="lg" className="flex flex-col items-center gap-4 py-12 text-center">
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="text-6xl"
      >
        🖼️
      </motion.div>
      <p className="font-display text-xl text-cocoa-900">
        Album đang chờ những bức ảnh đầu tiên
      </p>
      <p className="max-w-sm text-sm text-cocoa-700/80">
        Ảnh được nhóm theo <strong>tháng</strong> và{' '}
        <strong>nhiệm vụ</strong> — như những trang sách đẹp gọn gàng để
        cả nhà cùng xem lại.
      </p>
    </Card>
  )
}

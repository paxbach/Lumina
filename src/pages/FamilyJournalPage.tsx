import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, ChevronLeft } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Card } from '@/components/ui'
import { useFamilyStore } from '@/store/useFamilyStore'
import { familyPhotoPublicUrl } from '@/lib/familyPhotos'
import type { FamilyMoment } from '@/types/family'
import { CaptureMomentSheet } from '@/components/multiplayer/CaptureMomentSheet'
import { cn } from '@/utils/cn'
import { springBouncy, staggerContainer, staggerItem } from '@/utils/motion'

/**
 * Family Journal — newest-first vertical timeline of every captured
 * moment. Phase 3 binds real data: moments come from the Zustand
 * slice that Realtime keeps in sync.
 */
export default function FamilyJournalPage() {
  const navigate = useNavigate()
  const family = useFamilyStore((s) => s.family)
  const moments = useFamilyStore((s) => s.moments)
  const [showCapture, setShowCapture] = useState(false)

  const groups = useMemo(() => groupMomentsByDay(moments), [moments])

  if (!family) {
    return (
      <PageLayout maxWidth="lg">
        <div className="grid place-items-center gap-4 py-20 text-center">
          <div className="text-5xl">📓</div>
          <p className="font-display text-lg text-cocoa-900">
            Gia đình bạn cần tham gia một Phòng Gia Đình để mở nhật ký.
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
      maxWidth="md"
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-peach-500">
              Nhật ký gia đình
            </p>
            <h1 className="truncate font-display text-2xl text-cocoa-900">
              {family.familyName}
            </h1>
          </div>
        </div>
      }
    >
      {groups.length === 0 ? (
        <EmptyJournal />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-6 pb-32"
        >
          {groups.map((g) => (
            <section key={g.label} className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa-700/60">
                {g.label}
              </h2>
              {g.moments.map((m) => (
                <MomentCard key={m.id} moment={m} />
              ))}
            </section>
          ))}
        </motion.div>
      )}

      {/* Floating CTA — opens a standalone capture (no quest link). */}
      <motion.button
        type="button"
        onClick={() => setShowCapture(true)}
        whileTap={{ scale: 0.94 }}
        whileHover={{ y: -2 }}
        transition={springBouncy}
        aria-label="Ghi lại khoảnh khắc mới"
        className={cn(
          'fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full',
          'border-2 border-peach-500 bg-peach-400 px-5 py-3 font-display font-semibold text-white shadow-pop',
          'sm:right-8',
        )}
      >
        <Camera className="size-5" />
        Ghi lại khoảnh khắc
      </motion.button>

      <CaptureMomentSheet
        open={showCapture}
        taskKey={null}
        onClose={() => setShowCapture(false)}
        onCompleted={() => setShowCapture(false)}
      />
    </PageLayout>
  )
}

/* ─── grouping helpers ─────────────────────────────────────────────── */

interface MomentGroup {
  label: string
  moments: FamilyMoment[]
}

function groupMomentsByDay(moments: FamilyMoment[]): MomentGroup[] {
  if (moments.length === 0) return []
  const sorted = [...moments].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  )
  const today = startOfDay(new Date())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const groups = new Map<string, MomentGroup>()
  for (const m of sorted) {
    const d = startOfDay(new Date(m.capturedAt))
    let key: string
    if (d.getTime() === today.getTime()) key = 'Hôm nay'
    else if (d.getTime() === yesterday.getTime()) key = 'Hôm qua'
    else key = d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groups.has(key)) groups.set(key, { label: key, moments: [] })
    groups.get(key)!.moments.push(m)
  }
  return Array.from(groups.values())
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/* ─── moment card ──────────────────────────────────────────────────── */

function MomentCard({ moment }: { moment: FamilyMoment }) {
  const url = familyPhotoPublicUrl(moment.photoPath)
  const time = new Date(moment.capturedAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <motion.article
      variants={staggerItem}
      className="overflow-hidden rounded-cozy border-2 border-cream-200 bg-white shadow-soft"
    >
      <div className="relative aspect-[4/3] w-full bg-cream-100">
        {url ? (
          <img src={url} alt={moment.caption ?? ''} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-4xl text-cocoa-700/40">
            {moment.memberAvatar}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-cocoa-700/70">
          <span className="text-base" aria-hidden>
            {moment.memberAvatar}
          </span>
          <span className="font-semibold text-cocoa-900">{moment.memberName}</span>
          <span>·</span>
          <span>{time}</span>
        </div>
        {moment.caption && (
          <p className="text-sm leading-relaxed text-cocoa-800">{moment.caption}</p>
        )}
      </div>
    </motion.article>
  )
}

function EmptyJournal() {
  return (
    <Card tone="cream" padding="lg" className="flex flex-col items-center gap-4 py-12 text-center">
      <motion.div
        animate={{ rotate: [-3, 3, -3], y: [0, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="text-6xl"
      >
        📓
      </motion.div>
      <p className="font-display text-xl text-cocoa-900">
        Trang đầu tiên đang đợi cả nhà
      </p>
      <p className="max-w-sm text-sm text-cocoa-700/80">
        Mỗi bức ảnh bạn lưu lại sẽ tự động dán vào nhật ký — kèm tên
        người chụp, ngày tháng và một dòng chú thích nhỏ.
      </p>
    </Card>
  )
}

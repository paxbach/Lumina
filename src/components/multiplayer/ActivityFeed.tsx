import { AnimatePresence, motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import { Card } from '@/components/ui'
import { useFamilyStore } from '@/store/useFamilyStore'
import type { ActivityEntry, ActivityKind } from '@/types/family'
import { cn } from '@/utils/cn'

/**
 * Section C — Activity Feed
 * ──────────────────────────
 * Newest-first stream of family events. Animates new entries in from the
 * top with a soft slide so cross-tab updates feel "live" without being
 * noisy. Capped at MAX_ACTIVITIES in the store.
 */

const KIND_STYLE: Record<ActivityKind, { ring: string; bg: string; emoji: string }> = {
  family_created:   { ring: 'border-lavender-300', bg: 'bg-lavender-50', emoji: '🏡' },
  member_joined:    { ring: 'border-sky-300',      bg: 'bg-sky-50',      emoji: '✨' },
  task_completed:   { ring: 'border-sage-300',     bg: 'bg-sage-50',     emoji: '🌱' },
  quest_completed:  { ring: 'border-peach-300',    bg: 'bg-peach-50',    emoji: '🎉' },
  reward_unlocked:  { ring: 'border-butter-300',   bg: 'bg-butter-50',   emoji: '🎁' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 5_000) return 'Vừa xong'
  if (diff < 60_000) return `${Math.round(diff / 1000)}s trước`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} phút trước`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} giờ trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

export function ActivityFeed() {
  const activities = useFamilyStore((s) => s.activities)

  return (
    <Card tone="lavender" padding="lg" className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lavender-500">
          <Radio className="size-5" />
          <h2 className="font-display text-lg text-cocoa-900">Dòng hoạt động</h2>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-cocoa-700">
          Live
        </span>
      </header>

      <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {activities.map((a) => (
            <ActivityRow key={a.id} entry={a} />
          ))}
        </AnimatePresence>
        {activities.length === 0 && (
          <li className="rounded-xl bg-white/60 px-4 py-6 text-center text-sm text-cocoa-700/70">
            Chưa có hoạt động nào. Hãy bắt đầu đóng góp vào nhiệm vụ chung!
          </li>
        )}
      </ul>
    </Card>
  )
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const style = KIND_STYLE[entry.kind]
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={cn(
        'flex items-start gap-3 rounded-2xl border-2 px-3 py-2 shadow-soft',
        style.ring,
        style.bg,
      )}
    >
      <div className="relative grid size-10 shrink-0 place-items-center rounded-full border-2 border-white bg-white/80 text-lg shadow-soft">
        <span aria-hidden>{entry.actorAvatar ?? style.emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-cocoa-900">{entry.message}</p>
        <p className="mt-0.5 text-[11px] text-cocoa-700/70">
          {relativeTime(entry.createdAt)}
        </p>
      </div>
    </motion.li>
  )
}

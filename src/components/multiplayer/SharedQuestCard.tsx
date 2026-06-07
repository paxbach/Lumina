import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, CheckCircle2, ScrollText, Sparkles } from 'lucide-react'
import { Card, ProgressBar } from '@/components/ui'
import {
  useFamilyStore,
  selectQuestPercent,
} from '@/store/useFamilyStore'
import type { FamilyMoment } from '@/types/family'
import { familyPhotoPublicUrl } from '@/lib/familyPhotos'
import { cn } from '@/utils/cn'
import { springBouncy } from '@/utils/motion'
import { CaptureMomentSheet } from './CaptureMomentSheet'

/**
 * Section B — Shared Quest (Phase 3 refactor)
 * ───────────────────────────────────────────
 * Every task is now completed by *capturing a real photo*, not by
 * clicking a counter. The task row shows:
 *   • Emoji + label + per-task progress bar.
 *   • Thumbnails of every moment captured for the task.
 *   • A "📸 Ghi lại khoảnh khắc" CTA that opens the CaptureMomentSheet.
 *
 * The card finishes with a Quest Gallery showing all photos across
 * tasks. Celebration animation fires when a single photo completes a
 * task (returned by uploadMoment via the RPC).
 */
export function SharedQuestCard() {
  const quest = useFamilyStore((s) => s.quest)
  const currentMemberId = useFamilyStore((s) => s.currentMemberId)
  const percent = useFamilyStore(selectQuestPercent)

  const [activeTaskKey, setActiveTaskKey] = useState<string | null>(null)
  const [celebrateKey, setCelebrateKey] = useState<string | null>(null)

  if (!quest) {
    return (
      <Card tone="sage" padding="lg">
        <div className="flex flex-col items-center gap-2 py-4 text-center text-cocoa-700/70">
          <ScrollText className="size-8" />
          <p className="font-display text-base">Chưa có nhiệm vụ chung.</p>
        </div>
      </Card>
    )
  }

  const completed = quest.status === 'completed'
  const canCapture = !!currentMemberId && !completed
  const activeTaskLabel =
    activeTaskKey != null
      ? quest.tasks.find((t) => t.key === activeTaskKey)?.label ?? undefined
      : undefined

  return (
    <Card tone="sage" padding="lg" className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sage-500">
          <ScrollText className="size-5" />
          <h2 className="font-display text-lg text-cocoa-900">Nhiệm vụ chung</h2>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
            completed
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-white/70 text-cocoa-700',
          )}
        >
          {completed ? 'Đã hoàn thành 🎉' : `${percent}%`}
        </span>
      </header>

      <div>
        <h3 className="font-display text-2xl text-cocoa-900">{quest.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-cocoa-700/85">
          {quest.description}
        </p>
      </div>

      <ProgressBar value={percent / 100} tone="mint" size="lg" />

      <ul className="flex flex-col gap-4">
        {quest.tasks.map((t) => (
          <TaskRow
            key={t.key}
            taskKey={t.key}
            label={t.label}
            emoji={t.emoji}
            required={t.required}
            canCapture={canCapture}
            onCapture={() => setActiveTaskKey(t.key)}
            celebrating={celebrateKey === t.key}
          />
        ))}
      </ul>

      <QuestGallery />

      {!canCapture && !completed && (
        <p className="rounded-xl bg-white/60 px-4 py-3 text-center text-xs text-cocoa-700">
          Bạn chưa tham gia gia đình nào trên tab này. Vui lòng tham gia trước.
        </p>
      )}

      {/* Capture sheet, mounted at card level so the modal sits above
          everything. */}
      <CaptureMomentSheet
        open={activeTaskKey != null}
        taskKey={activeTaskKey}
        taskLabel={activeTaskLabel}
        onClose={() => setActiveTaskKey(null)}
        onCompleted={(r) => {
          if (r.taskCompleted && activeTaskKey) {
            const key = activeTaskKey
            setCelebrateKey(key)
            window.setTimeout(() => {
              setCelebrateKey((k) => (k === key ? null : k))
            }, 2_200)
          }
        }}
      />
    </Card>
  )
}

/* ─── per-task row ──────────────────────────────────────────────────── */

interface TaskRowProps {
  taskKey: string
  label: string
  emoji: string
  required: number
  canCapture: boolean
  onCapture: () => void
  celebrating: boolean
}

function TaskRow({
  taskKey,
  label,
  emoji,
  required,
  canCapture,
  onCapture,
  celebrating,
}: TaskRowProps) {
  // useShallow stabilises the filtered-array reference so React's
  // useSyncExternalStore doesn't see a "changed" snapshot on every
  // render. Without it, `.filter(...)` returns a new array every
  // time → Maximum update depth exceeded.
  const moments = useFamilyStore(
    useShallow((s) =>
      s.quest
        ? s.moments.filter((m) => m.questId === s.quest!.id && m.taskKey === taskKey)
        : [],
    ),
  )
  const got = moments.length
  const done = got >= required

  return (
    <motion.li
      layout
      className={cn(
        'flex flex-col gap-3 rounded-2xl border-2 bg-white/80 px-4 py-3 shadow-soft',
        done ? 'border-emerald-300' : 'border-cream-200',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-2xl text-2xl',
            done ? 'bg-emerald-100' : 'bg-sage-100',
          )}
        >
          <span aria-hidden>{done ? '✅' : emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-display text-base',
              done ? 'text-cocoa-700/75 line-through' : 'text-cocoa-900',
            )}
          >
            {label}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <ProgressBar
              value={got / Math.max(1, required)}
              tone={done ? 'mint' : 'butter'}
              size="sm"
              className="flex-1"
            />
            <span className="text-xs font-bold tabular-nums text-cocoa-700">
              {got} / {required}
            </span>
          </div>
        </div>
        {done ? (
          <CheckCircle2 className="size-7 shrink-0 text-emerald-500" />
        ) : (
          <motion.button
            type="button"
            onClick={onCapture}
            disabled={!canCapture}
            whileTap={{ scale: 0.94 }}
            whileHover={{ y: -1, scale: 1.03 }}
            transition={springBouncy}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-2 text-xs font-display font-semibold shadow-soft',
              'border-peach-400 bg-peach-400 text-white hover:bg-peach-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <Camera className="size-4" />
            Ghi lại khoảnh khắc
          </motion.button>
        )}
      </div>

      {/* Per-task moment chips (thumbnails with captions). */}
      {moments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {moments.map((m) => (
            <MomentChip key={m.id} moment={m} />
          ))}
        </ul>
      )}

      {/* Celebration burst when a photo just completes the task. */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={springBouncy}
            className="flex items-center gap-2 rounded-xl bg-butter-100 px-3 py-2 text-sm font-display text-cocoa-900"
          >
            <Sparkles className="size-4 text-butter-500" />
            Nhiệm vụ nhỏ này đã hoàn thành nhờ bức ảnh vừa rồi! 🎊
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

/* ─── moment chip: thumbnail + caption ─────────────────────────────── */

function MomentChip({ moment }: { moment: FamilyMoment }) {
  // Synchronous: getPublicUrl is a local string-builder, no Promise
  // needed. Direct call in render keeps the component pure and
  // avoids the setState-during-render anti-pattern.
  const url = familyPhotoPublicUrl(moment.photoPath)
  const captionFallback = moment.caption?.trim() || `${moment.memberAvatar} ${moment.memberName}`
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springBouncy}
      className="flex items-center gap-2 rounded-full border-2 border-cream-200 bg-white px-1.5 py-1 shadow-soft"
    >
      <span className="grid size-8 shrink-0 overflow-hidden rounded-full bg-cream-100">
        {url ? (
          <img src={url} alt="" className="size-8 object-cover" />
        ) : (
          <span className="grid size-8 place-items-center text-base">
            {moment.memberAvatar}
          </span>
        )}
      </span>
      <span className="max-w-[160px] truncate pr-2 text-xs text-cocoa-800">
        {captionFallback}
      </span>
    </motion.li>
  )
}

/* ─── Quest Gallery ────────────────────────────────────────────────── */

function QuestGallery() {
  const gallery = useFamilyStore(
    useShallow((s) =>
      s.quest
        ? s.moments.filter((m) => m.questId === s.quest!.id)
        : [],
    ),
  )
  if (gallery.length === 0) return null
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white/60 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-sage-500">
          Khoảnh khắc đã ghi
        </p>
        <span className="text-xs font-semibold text-cocoa-700/70">
          {gallery.length} ảnh
        </span>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {gallery.map((m) => (
          <GalleryThumb key={m.id} moment={m} />
        ))}
      </div>
    </div>
  )
}

function GalleryThumb({ moment }: { moment: FamilyMoment }) {
  const url = familyPhotoPublicUrl(moment.photoPath)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springBouncy}
      className="relative size-20 shrink-0 overflow-hidden rounded-xl border-2 border-cream-200 bg-cream-100 shadow-soft"
    >
      {url ? (
        <img
          src={url}
          alt={moment.caption ?? ''}
          className="size-full object-cover"
        />
      ) : (
        <span className="grid size-full place-items-center text-2xl">
          {moment.memberAvatar}
        </span>
      )}
      <span className="absolute bottom-1 right-1 rounded-full bg-cocoa-900/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {moment.memberAvatar}
      </span>
    </motion.div>
  )
}

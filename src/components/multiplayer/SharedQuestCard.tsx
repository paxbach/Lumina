import { motion } from 'framer-motion'
import { CheckCircle2, ScrollText } from 'lucide-react'
import { Card, ProgressBar } from '@/components/ui'
import {
  useFamilyStore,
  selectQuestPercent,
} from '@/store/useFamilyStore'
import { cn } from '@/utils/cn'
import { springBouncy } from '@/utils/motion'

/**
 * Section B — Shared Quest
 * ─────────────────────────
 * One active quest per family in MVP. Each task shows aggregate progress
 * across all members; tapping "+ Đóng góp" calls contributeToTask which
 * invokes a Supabase RPC; other tabs receive the change via Realtime.
 */
export function SharedQuestCard() {
  const quest = useFamilyStore((s) => s.quest)
  const currentMemberId = useFamilyStore((s) => s.currentMemberId)
  const contribute = useFamilyStore((s) => s.contributeToTask)
  const percent = useFamilyStore(selectQuestPercent)

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
  const canContribute = !!currentMemberId && !completed

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

      <ul className="flex flex-col gap-3">
        {quest.tasks.map((t) => {
          const done = t.progress >= t.required
          return (
            <motion.li
              key={t.key}
              layout
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 bg-white/80 px-4 py-3 shadow-soft',
                done ? 'border-emerald-300' : 'border-cream-200',
              )}
            >
              <div
                className={cn(
                  'grid size-12 shrink-0 place-items-center rounded-2xl text-2xl',
                  done ? 'bg-emerald-100' : 'bg-sage-100',
                )}
              >
                <span aria-hidden>{done ? '✅' : t.emoji}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  'font-display text-base',
                  done ? 'text-cocoa-700/60 line-through' : 'text-cocoa-900',
                )}>
                  {t.label}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <ProgressBar
                    value={t.progress / Math.max(1, t.required)}
                    tone={done ? 'mint' : 'butter'}
                    size="sm"
                    className="flex-1"
                  />
                  <span className="text-xs font-bold tabular-nums text-cocoa-700">
                    {t.progress} / {t.required}
                  </span>
                </div>
              </div>
              {done ? (
                <CheckCircle2 className="size-7 shrink-0 text-emerald-500" />
              ) : (
                <motion.button
                  type="button"
                  onClick={() => contribute(t.key)}
                  disabled={!canContribute}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ y: -1, scale: 1.03 }}
                  transition={springBouncy}
                  className={cn(
                    'shrink-0 rounded-full border-2 px-4 py-2 text-sm font-display font-semibold shadow-soft',
                    'border-sage-300 bg-sage-400 text-white hover:bg-sage-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  + Đóng góp
                </motion.button>
              )}
            </motion.li>
          )
        })}
      </ul>

      {!canContribute && !completed && (
        <p className="rounded-xl bg-white/60 px-4 py-3 text-center text-xs text-cocoa-700">
          Bạn chưa tham gia gia đình nào trên tab này. Vui lòng tham gia trước.
        </p>
      )}
    </Card>
  )
}


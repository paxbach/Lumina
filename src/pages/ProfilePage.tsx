import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, ShieldAlert, X } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card } from '@/components/ui/Card'
import { StarBadge } from '@/components/ui/StarBadge'
import { useAppStore } from '@/store/useAppStore'
import { useUser } from '@/contexts/UserContext'
import { springBouncy, springSoft } from '@/utils/motion'

export default function ProfilePage() {
  const navigate = useNavigate()
  // Identity (name + avatar) — UserContext / localStorage. Game progress
  // (stars, lesson completion) still lives in the Zustand store.
  const { currentUser } = useUser()
  const displayName = currentUser?.name ?? 'Bé'
  const displayAvatar = currentUser?.avatar ?? '✨'
  const stars = useAppStore((s) => s.profile.stars)
  const lessons = useAppStore((s) => s.lessons)
  const resetAll = useAppStore((s) => s.resetAll)

  const completed = lessons.filter((l) => l.progress >= 1).length

  // Two-step confirmation guards against an accidental tap wiping every
  // bit of progress (diary, region completions, Lumi stats). Modal lives
  // at page-level so re-tapping the button cleanly re-opens it instead
  // of stacking dialogs.
  const [resetOpen, setResetOpen] = useState(false)

  const handleConfirmReset = () => {
    resetAll()
    setResetOpen(false)
    // Bounce to home so the kid sees the fresh state immediately —
    // staying on Profile would just show the same now-zeroed numbers.
    navigate('/')
  }

  return (
    <PageLayout
      header={
        <div>
          <p className="text-xs uppercase tracking-widest text-lavender-500 font-semibold">
            Hồ sơ
          </p>
          <h1 className="text-2xl font-display font-semibold">Bé của Lumina</h1>
        </div>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Card tone="peach" padding="lg" className="flex flex-col items-center text-center">
          <div className="grid size-28 place-items-center rounded-full bg-white/70 text-7xl shadow-inset-soft">
            <span aria-hidden>{displayAvatar}</span>
          </div>
          <h2 className="mt-4 text-2xl font-display font-bold">{displayName}</h2>
          <StarBadge count={stars} className="mt-3" />
        </Card>

        <Card tone="mint" padding="lg">
          <h3 className="text-lg font-display font-semibold">Thành tích</h3>
          <dl className="mt-4 space-y-3 text-cocoa-800">
            <div className="flex items-center justify-between">
              <dt>Bài học đã hoàn thành</dt>
              <dd className="font-display text-xl font-bold tabular-nums">
                {completed}/{lessons.length}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Tổng số sao</dt>
              <dd className="font-display text-xl font-bold tabular-nums">{stars}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* ─── Danger zone ─────────────────────────────────────────────
          Sits below the achievement cards so the kid has to scroll past
          their progress before reaching the wipe button. Visual style
          (peach border + shield icon) signals "đây là vùng nguy hiểm,
          ba mẹ nên đọc kỹ trước khi bấm". */}
      <section className="mt-6">
        <Card tone="cream" padding="lg" className="border-peach-200">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border-2 border-peach-300 bg-peach-100 text-peach-500 shadow-soft">
              <ShieldAlert className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-bold text-cocoa-900">
                Vùng dành cho ba mẹ
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-cocoa-700">
                Reset toàn bộ tiến trình sẽ xoá nhật ký kỷ niệm, đặt lại tất cả các
                vùng đất, sao, tinh thể và trạng thái Lumi về như lần đầu cài đặt.
                Hành động này <strong>không thể hoàn tác</strong>.
              </p>
              <motion.button
                type="button"
                onClick={() => setResetOpen(true)}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={springSoft}
                className="mt-4 inline-flex items-center gap-2 rounded-full border-[3px] border-peach-500 bg-gradient-to-br from-peach-400 to-peach-500 px-5 py-2.5 font-display text-sm font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peach-200"
              >
                <RotateCcw className="size-4" />
                Reset toàn bộ tiến trình
              </motion.button>
            </div>
          </div>
        </Card>
      </section>

      <ResetConfirmModal
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </PageLayout>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ResetConfirmModal — parent guardrail before wiping all progress
   ════════════════════════════════════════════════════════════════════ */

interface ResetConfirmModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

function ResetConfirmModal({ open, onCancel, onConfirm }: ResetConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận reset toàn bộ tiến trình"
          className="fixed inset-0 z-50 grid place-items-center bg-cocoa-900/45 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.85, y: 16, opacity: 0, rotate: -1 }}
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
            <motion.span
              aria-hidden
              className="block select-none text-5xl"
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              ⚠️
            </motion.span>

            <h3 className="mt-3 font-display text-xl font-bold leading-snug text-cocoa-900">
              Reset toàn bộ tiến trình?
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-cocoa-700">
              Sau khi reset, bé sẽ mất tất cả nhật ký kỷ niệm, sao, tinh thể và các
              vùng đất đã chinh phục. Ba mẹ có chắc chắn không?
            </p>

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
                <RotateCcw className="size-4" />
                Reset ngay
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

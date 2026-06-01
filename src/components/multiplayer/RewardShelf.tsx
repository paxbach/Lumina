import { motion } from 'framer-motion'
import { Gift } from 'lucide-react'
import { Card } from '@/components/ui'
import { useFamilyStore } from '@/store/useFamilyStore'
import { cn } from '@/utils/cn'
import { springBouncy, staggerContainer, staggerItem } from '@/utils/motion'

/**
 * Section D — Shared Rewards
 * ───────────────────────────
 * Cards for every unlocked reward (badge / stars / memory). Empty state
 * teases the user with a "?" placeholder card so the section never
 * feels broken before the first quest completes.
 */
export function RewardShelf() {
  const rewards = useFamilyStore((s) => s.rewards)

  return (
    <Card tone="butter" padding="lg" className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-butter-500">
          <Gift className="size-5" />
          <h2 className="font-display text-lg text-cocoa-900">
            Phần thưởng gia đình
          </h2>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-cocoa-700">
          {rewards.length} mở khóa
        </span>
      </header>

      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {rewards.map((r) => (
          <motion.li
            key={r.id}
            variants={staggerItem}
            whileHover={{ y: -2, scale: 1.02 }}
            transition={springBouncy}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border-2 border-butter-300 bg-white/85 px-3 py-4 text-center shadow-soft',
            )}
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-butter-100 text-3xl">
              <span aria-hidden>{r.emoji}</span>
            </div>
            <p className="font-display text-sm leading-tight text-cocoa-900">
              {r.title}
            </p>
            <p className="text-[11px] leading-tight text-cocoa-700/75">
              {r.description}
            </p>
          </motion.li>
        ))}
        {/* Locked placeholder — always one, ahead of unlock cap. */}
        <motion.li
          variants={staggerItem}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-butter-200 bg-white/50 px-3 py-4 text-center"
        >
          <div className="grid size-14 place-items-center rounded-2xl bg-cream-100 text-3xl text-cocoa-700/40">
            <span aria-hidden>?</span>
          </div>
          <p className="font-display text-sm text-cocoa-700/60">
            Sắp mở khóa
          </p>
        </motion.li>
      </motion.ul>
    </Card>
  )
}

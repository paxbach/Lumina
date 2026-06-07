import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { Card } from '@/components/ui'
import {
  useFamilyStore,
  selectMemberIsOnline,
} from '@/store/useFamilyStore'
import { cn } from '@/utils/cn'
import { staggerContainer, staggerItem } from '@/utils/motion'

/**
 * Section A — Family Members
 * ────────────────────────────
 * Lists every joined member with role + online dot. Pulses gently for
 * online members; goes warm-gray when their tab hasn't pinged in 8s.
 */
export function MembersPanel() {
  const members = useFamilyStore((s) => s.members)
  const currentMemberId = useFamilyStore((s) => s.currentMemberId)
  // Presence map is refreshed by useFamilyRealtime on every Supabase
  // 'sync' event; reading it here keeps the online dot in lockstep.
  const presence = useFamilyStore((s) => s.presence)

  return (
    <Card tone="peach" padding="lg" className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-peach-500">
          <Users className="size-5" />
          <h2 className="font-display text-lg text-cocoa-900">
            Gia Đình Đồng Hành
          </h2>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-cocoa-700">
          {members.length} gia đình
        </span>
      </header>

      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3"
      >
        {members.map((m) => {
          const online = selectMemberIsOnline(
            { members, currentMemberId, presence } as never,
            m.id,
          )
          const isMe = m.id === currentMemberId
          return (
            <motion.li
              key={m.id}
              variants={staggerItem}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 bg-white/80 px-3 py-2 shadow-soft',
                isMe ? 'border-peach-300' : 'border-cream-200',
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    'grid size-12 place-items-center rounded-full border-2 text-2xl',
                    isMe ? 'border-peach-300 bg-peach-50' : 'border-cream-200 bg-cream-50',
                  )}
                >
                  <span aria-hidden>{m.avatar}</span>
                </div>
                <span
                  aria-label={online ? 'Online' : 'Offline'}
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-white',
                    online ? 'bg-emerald-400' : 'bg-cocoa-700/30',
                  )}
                >
                  {online && (
                    <motion.span
                      animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-emerald-400/60"
                    />
                  )}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate font-display text-base text-cocoa-900">
                    {m.displayName}
                  </p>
                  {isMe && (
                    <span className="rounded-full bg-peach-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cocoa-800">
                      Bạn
                    </span>
                  )}
                </div>
                <p className="text-xs text-cocoa-700/70">
                  {m.role === 'parent' ? 'Ba / Mẹ' : 'Bé'} ·{' '}
                  <span className={online ? 'text-emerald-600' : 'text-cocoa-700/60'}>
                    {online ? 'Đang tham gia' : 'Vắng'}
                  </span>
                </p>
              </div>
            </motion.li>
          )
        })}
      </motion.ul>
    </Card>
  )
}

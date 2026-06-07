import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Mail } from 'lucide-react'
import { useFamilyStore } from '@/store/useFamilyStore'
import { cn } from '@/utils/cn'
import { springBouncy } from '@/utils/motion'

/**
 * Top-bar invite-code chip. Tap to copy the family invite code to the
 * clipboard, with a soft "Đã sao chép" confirmation. Used in the
 * FamilyDashboard header.
 */
export function InviteCodeBadge({ className }: { className?: string }) {
  const family = useFamilyStore((s) => s.family)
  const [copied, setCopied] = useState(false)
  if (!family) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(family.inviteCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_400)
    } catch {
      // Some browsers (esp. unfocused tab) reject clipboard writes.
      // Fall back to a visual hint only.
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_400)
    }
  }

  return (
    <motion.button
      type="button"
      onClick={copy}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      transition={springBouncy}
      aria-label={`Sao chép Mã Kết Nối Gia Đình ${family.inviteCode}`}
      className={cn(
        'group flex items-center gap-2 rounded-cozy border-2 border-lavender-200 bg-white/85',
        'px-3 py-2 shadow-soft hover:border-lavender-300',
        className,
      )}
    >
      <Mail className="size-4 text-lavender-500" />
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-cocoa-700/70">
          Mã kết nối
        </span>
        <span className="font-display text-sm tracking-[0.18em] text-cocoa-900">
          {family.inviteCode}
        </span>
      </div>
      <span
        className={cn(
          'ml-1 grid size-7 place-items-center rounded-full border border-lavender-200 bg-lavender-50 transition-colors',
          copied && 'border-emerald-300 bg-emerald-100',
        )}
      >
        {copied ? (
          <Check className="size-4 text-emerald-600" />
        ) : (
          <Copy className="size-4 text-lavender-500" />
        )}
      </span>
    </motion.button>
  )
}

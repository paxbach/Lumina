import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'
import { useFamilyStore } from '@/store/useFamilyStore'
import { familyPhotoPublicUrl } from '@/lib/familyPhotos'
import type { FamilyMoment } from '@/types/family'
import { cn } from '@/utils/cn'
import { springBouncy } from '@/utils/motion'

/**
 * Dashboard surface — horizontal scroll of the family's most recent
 * captured moments. Replaces the "Family Memory Score" placeholder in
 * the dashboard layout while still keeping the rest of Section A–D.
 *
 * Tap any card → /family-journal (full timeline).
 */
export function RecentMemoriesStrip() {
  const navigate = useNavigate()
  // useShallow stabilises the sliced reference — otherwise every
  // render returns a new array and useSyncExternalStore loops.
  const moments = useFamilyStore(useShallow((s) => s.moments.slice(0, 8)))
  if (moments.length === 0) return null
  return (
    <Card tone="cream" padding="md" className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-peach-500">
          <Heart className="size-5 fill-peach-300 text-peach-500" />
          <h2 className="font-display text-lg text-cocoa-900">
            Kỷ niệm gần đây
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/family-journal')}
          className="text-xs font-semibold text-cocoa-700 underline-offset-4 hover:underline"
        >
          Xem nhật ký →
        </button>
      </header>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {moments.map((m) => (
          <MemoryThumb
            key={m.id}
            moment={m}
            onClick={() => navigate('/family-journal')}
          />
        ))}
      </div>
    </Card>
  )
}

function MemoryThumb({
  moment,
  onClick,
}: {
  moment: FamilyMoment
  onClick: () => void
}) {
  const url = familyPhotoPublicUrl(moment.photoPath)
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -2 }}
      transition={springBouncy}
      className={cn(
        'group relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-cream-200 bg-cream-100 text-left shadow-soft',
      )}
    >
      {url ? (
        <img src={url} alt={moment.caption ?? ''} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-3xl text-cocoa-700/40">
          {moment.memberAvatar}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cocoa-900/70 to-transparent p-2 text-white">
        <p className="text-[10px] font-semibold opacity-90">
          {moment.memberAvatar} {moment.memberName}
        </p>
        {moment.caption && (
          <p className="line-clamp-2 text-[11px] leading-tight">
            {moment.caption}
          </p>
        )}
      </div>
    </motion.button>
  )
}

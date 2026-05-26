import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { cn } from '@/utils/cn'
import { BurstParticles } from '@/components/games/BurstParticles'
import { LumiCharacter } from '@/components/dashboard/LumiCharacter'

interface DiscoveryCardProps {
  /** Gameified item name, e.g. "Lá Phong Đỏ Lửa". */
  itemName: string
  /** Big emoji to feature. */
  itemEmoji: string
  /** 1..5 magical power rating. */
  power: number
  /** Lumi-told story about the discovery. */
  story: string
  /** Knowledge tease (linked to deeper lesson). */
  knowledgeHook: string
  className?: string
}

export function DiscoveryCard({
  itemName,
  itemEmoji,
  power,
  story,
  knowledgeHook,
  className,
}: DiscoveryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className={cn('space-y-5', className)}
    >
      {/* Hero — featured item with light beams */}
      <section
        className="relative overflow-hidden rounded-[2rem] border-4 border-butter-300 px-6 py-7 shadow-pop"
        style={{
          backgroundImage: `
            radial-gradient(60% 70% at 50% 100%, var(--color-peach-200) 0%, transparent 70%),
            radial-gradient(40% 50% at 50% 0%, rgba(255, 215, 120, 0.35) 0%, transparent 65%),
            linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-butter-100) 100%)
          `,
        }}
      >
        <BurstParticles trigger="discovery" count={18} tone="butter" radius={130} />

        {/* God-ray streaks */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'conic-gradient(from 70deg at 50% 110%, transparent 0deg, rgba(255,215,120,0.25) 30deg, transparent 60deg, rgba(255,215,120,0.2) 90deg, transparent 120deg, rgba(255,215,120,0.2) 150deg, transparent 180deg)',
          }}
        />

        <div className="relative flex flex-col items-center gap-3 text-center">
          <motion.span
            className="text-[6rem] leading-none"
            aria-hidden
            initial={{ scale: 0.4, rotate: -15 }}
            animate={{ scale: 1, rotate: 0, y: [0, -6, 0] }}
            transition={{
              scale: { type: 'spring', stiffness: 220, damping: 14, delay: 0.2 },
              rotate: { type: 'spring', stiffness: 220, damping: 14, delay: 0.2 },
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
            }}
            style={{
              filter:
                'hue-rotate(-10deg) saturate(1.5) drop-shadow(0 8px 14px rgba(160, 40, 20, 0.35))',
            }}
          >
            {itemEmoji}
          </motion.span>

          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-butter-500">
            Phát hiện ✦ Quý hiếm
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight text-cocoa-900">
            {itemName}
          </h2>

          {/* Power stars */}
          <div className="inline-flex items-center gap-1 rounded-full border-2 border-butter-400 bg-butter-100 px-3 py-1 shadow-soft">
            <span className="text-[10px] font-bold uppercase tracking-widest text-butter-500">
              Phép thuật
            </span>
            <span className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    'size-4 transition-colors',
                    i <= power
                      ? 'fill-butter-400 stroke-butter-500'
                      : 'fill-none stroke-butter-300',
                  )}
                />
              ))}
            </span>
          </div>
        </div>
      </section>

      {/* Lumi narrates the story */}
      <section className="rounded-3xl border-4 border-lavender-200 bg-lavender-50/80 p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <LumiCharacter size={88} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-500">
              Lumi kể
            </p>
            <p className="mt-1 font-display text-base font-medium leading-relaxed text-cocoa-900">
              {story}
            </p>
          </div>
        </div>
      </section>

      {/* Knowledge hook — tease deeper learning */}
      <section className="rounded-3xl border-2 border-mint-200 bg-mint-50 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/70 text-2xl shadow-inset-soft">
            📖
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-mint-500">
              Bí ẩn chờ khám phá
            </p>
            <p className="mt-0.5 font-display text-sm font-semibold text-cocoa-900">
              {knowledgeHook}
            </p>
          </div>
        </div>
      </section>
    </motion.div>
  )
}

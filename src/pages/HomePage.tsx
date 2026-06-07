import { motion } from 'framer-motion'
import { Flame, Gem, Volume2, VolumeX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { IconButton } from '@/components/ui/IconButton'
import { BigActionButton } from '@/components/dashboard/BigActionButton'
import { LumiCharacter } from '@/components/dashboard/LumiCharacter'
import { SparkleField } from '@/components/dashboard/SparkleField'
import { StatChip } from '@/components/dashboard/StatChip'
import { TreeProgressBar } from '@/components/dashboard/TreeProgressBar'
import { DailyNPCGreeting } from '@/components/npc/DailyNPCGreeting'
import { useAppStore } from '@/store/useAppStore'
import { useUser } from '@/contexts/UserContext'

export default function HomePage() {
  const navigate = useNavigate()
  // Identity (name + avatar) comes from UserContext now; the Zustand
  // `profile` still owns game progress fields the rest of this page uses.
  const { currentUser } = useUser()
  const displayName = currentUser?.name ?? 'Bé'
  const streak = useAppStore((s) => s.streak)
  const crystals = useAppStore((s) => s.knowledgeCrystals)
  const forestRevival = useAppStore((s) => s.forestRevival)
  const soundEnabled = useAppStore((s) => s.soundEnabled)
  const toggleSound = useAppStore((s) => s.toggleSound)

  return (
    <PageLayout
      maxWidth="xl"
      header={
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-lavender-500">
              Lumina Adventure
            </p>
            <h1 className="text-xl font-display font-bold leading-tight text-cocoa-900">
              Chào {displayName}!
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <StatChip
              icon={<Flame className="fill-peach-300 stroke-peach-500" />}
              value={streak}
              label="ngày"
              tone="peach"
            />
            <StatChip
              icon={<Gem className="fill-lavender-300 stroke-lavender-500" />}
              value={crystals}
              label="tinh thể"
              tone="lavender"
            />
            <IconButton
              label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              onClick={toggleSound}
              tone="cream"
            >
              {soundEnabled ? <Volume2 /> : <VolumeX />}
            </IconButton>
          </div>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Picture-book opening — NPC greeter for the day */}
        <DailyNPCGreeting />

        {/* Hero — forest scene with Lumi at center */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          className="relative overflow-hidden rounded-[2.5rem] border-4 border-mint-200 shadow-pop"
          style={{
            backgroundImage: `
              radial-gradient(60% 90% at 50% 110%, var(--color-mint-200) 0%, transparent 70%),
              radial-gradient(45% 55% at 15% 0%, var(--color-lavender-200) 0%, transparent 65%),
              radial-gradient(45% 55% at 90% 5%, var(--color-peach-200) 0%, transparent 65%),
              linear-gradient(180deg, var(--color-sky-cozy-50) 0%, var(--color-mint-50) 100%)
            `,
          }}
        >
          <SparkleField count={24} />

          {/* Forest silhouette — bottom trees */}
          <ForestFloor />

          <div className="relative grid place-items-center gap-4 px-6 pb-12 pt-14 sm:gap-6 sm:pt-16">
            <LumiCharacter size={240} level={50} />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border-2 border-cream-200 bg-cream-50/90 px-5 py-3 text-center shadow-soft backdrop-blur"
            >
              <p className="font-display text-base text-cocoa-800 sm:text-lg">
                Chào <span className="font-bold text-lavender-500">{displayName}</span>!
                Hôm nay mình đi khám phá gì nào?
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Forest revival + actions */}
        <section className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-stretch">
          {/* Tree progress */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center justify-between gap-3 rounded-3xl border-2 border-mint-200 bg-cream-50/80 p-5 shadow-soft"
          >
            <p className="text-center text-xs font-bold uppercase tracking-widest text-mint-500">
              Tiến độ rừng
            </p>
            <TreeProgressBar value={forestRevival} />
          </motion.div>

          {/* Big action buttons */}
          <div className="grid gap-4 sm:grid-cols-1">
            <BigActionButton
              emoji="🗺️"
              title="Nhận Nhiệm Vụ Mới"
              subtitle="Khám phá điều bí ẩn trong Rừng Kỳ Diệu"
              tone="lavender"
              onClick={() => navigate('/quests')}
            />
            <BigActionButton
              emoji="🌟"
              title="Chơi cùng Lumi"
              subtitle="Cho Lumi ăn, học và chơi mini-game"
              tone="peach"
              onClick={() => navigate('/lumi')}
            />
            <BigActionButton
              emoji="💖"
              title="Cùng gia đình"
              subtitle="Mời bố mẹ xem hành trình của bé"
              tone="mint"
              onClick={() => navigate('/family')}
            />
            <BigActionButton
              emoji="🏡"
              title="Phòng Gia Đình (Demo)"
              subtitle="Kết nối với các gia đình khác để cùng khám phá và lưu giữ khoảnh khắc"
              tone="sky"
              onClick={() => navigate('/family-dashboard')}
            />
          </div>
        </section>
      </div>
    </PageLayout>
  )
}

/** Cozy bottom-of-forest silhouette — decorative trees. */
function ForestFloor() {
  const trees = [
    { glyph: '🌲', x: 4,  y: 88, size: 44 },
    { glyph: '🌳', x: 14, y: 92, size: 50 },
    { glyph: '🌲', x: 26, y: 90, size: 40 },
    { glyph: '🌳', x: 78, y: 92, size: 46 },
    { glyph: '🌲', x: 90, y: 88, size: 42 },
    { glyph: '🍄', x: 36, y: 95, size: 22 },
    { glyph: '🌸', x: 66, y: 95, size: 22 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32">
      {trees.map((t, i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            fontSize: t.size,
            transform: 'translate(-50%, -100%)',
            filter: 'drop-shadow(0 3px 2px rgba(60,40,20,0.18))',
          }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3 + (i % 3) * 0.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {t.glyph}
        </motion.span>
      ))}
    </div>
  )
}

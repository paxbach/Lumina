import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Compass, MapPin, Sparkles } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/utils/cn'
import { staggerContainer, staggerItem } from '@/utils/motion'
import { useAppStore } from '@/store/useAppStore'
import { QUESTS } from '@/data/quests'
import type { Region, SubNode } from '@/types'

/**
 * Mock per-quest "progress %" so the list feels alive in pitches/demos.
 * Real signal would come from a sub-node graph; for now we give every
 * quest a stable, deterministic starter value tied to its id. Override
 * with the kid's actual completion state below.
 */
const QUEST_DEMO_PROGRESS: Record<string, number> = {
  'red-leaf':            0,
  'find-way-home':       0.15,
  'festival-ingredient': 0.2,
  'star-journey':        0.05,
  'bedtime-story':       0.3,
}

/**
 * Compute real progress for a quest if its sub-node lives in the regions
 * graph (1 if completed, otherwise the demo value). Keeps the list honest
 * once a kid has actually finished a quest.
 */
function resolveProgress(regions: Region[], questId: string): number {
  for (const r of regions) {
    for (const n of r.subNodes) {
      if (n.type === 'quest' && n.targetId === questId) {
        if (n.isCompleted) return 1
      }
    }
  }
  return QUEST_DEMO_PROGRESS[questId] ?? 0
}

/**
 * Collect every sub-node that opts into a custom `routePath` across
 * every region — these are "extra" missions outside the curated QUESTS
 * data (e.g. Hành Trình Lịch Sử on Đảo Văn Hoá). We surface them in
 * their own section so they're discoverable from the missions hub even
 * without diving into the sub-map.
 */
interface SpecialMission {
  node: SubNode
  regionId: string
  regionName: string
}

function collectSpecialMissions(regions: Region[]): SpecialMission[] {
  const out: SpecialMission[] = []
  for (const r of regions) {
    for (const n of r.subNodes) {
      if (n.routePath) {
        out.push({ node: n, regionId: r.id, regionName: r.name })
      }
    }
  }
  return out
}

export default function QuestsPage() {
  const navigate = useNavigate()
  const regions = useAppStore((s) => s.regions)

  const specialMissions = useMemo(
    () => collectSpecialMissions(regions),
    [regions],
  )

  const handleOpenSpecial = (m: SpecialMission) => {
    // Forward region + node query string so the destination page can
    // look the node up and the post-mission back-nav lands the kid on
    // the right sub-map (WorldMapPage reads `?region=`).
    const params = new URLSearchParams({
      region: m.regionId,
      node: m.node.id,
    }).toString()
    navigate(`${m.node.routePath}?${params}`)
  }

  return (
    <PageLayout
      header={
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
              Sổ tay phiêu lưu
            </p>
            <h1 className="text-2xl font-display font-bold text-cocoa-900">
              Nhiệm vụ đang mở
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-lavender-200 bg-lavender-100 px-3 py-1.5 text-xs font-bold text-lavender-500 shadow-soft">
            <Compass className="size-4" />
            Chương {QUESTS[0].chapter}
          </span>
        </div>
      }
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {QUESTS.map((q) => {
          // Source of truth: each QuestDef now carries its own `tone`
          // (matched to the region theme), and progress comes from the
          // live regions graph rather than a hand-curated dictionary.
          const tone = q.tone
          const progress = resolveProgress(regions, q.id)
          return (
            <motion.div variants={staggerItem} key={q.id}>
              <Card tone={tone} className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <motion.div
                    className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/70 text-4xl shadow-inset-soft"
                    animate={{ rotate: [-4, 4, -4] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span aria-hidden>{q.heroEmoji}</span>
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa-700/60">
                      Chương · {q.chapter}
                    </p>
                    <h3 className="mt-0.5 font-display text-xl font-bold text-cocoa-900">
                      {q.title}
                    </h3>
                    <p className="mt-1 text-sm italic text-cocoa-700/85">
                      "{q.tagline}"
                    </p>
                  </div>
                </div>

                <ProgressBar value={progress} tone={tone} showLabel />

                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-cocoa-700/80">
                    <MapPin className="size-3.5" />
                    {q.location} · {q.distance}
                  </span>
                  <Button tone={tone} size="sm" onClick={() => navigate(`/quests/${q.id}`)}>
                    Khám phá
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ─── Hoạt động đặc biệt ──────────────────────────────────────
          Sub-nodes that opt into `routePath` (custom destination pages
          outside the standard quest / lesson / game routing) surface
          here. Auto-populated — adding a new routePath sub-node in the
          store makes it appear without further wiring. */}
      {specialMissions.length > 0 && (
        <section className="mt-10">
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
              Hoạt động đặc biệt
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-cocoa-900">
              Khám phá ngoài đời thật
            </h2>
            <p className="mt-1 text-xs text-cocoa-700/70">
              Các nhiệm vụ dã ngoại / lịch sử / sự kiện không nằm trong
              chương phiêu lưu chính — bé tham gia khi nào tiện nhé!
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {specialMissions.map((m) => (
              <motion.button
                key={m.node.id}
                variants={staggerItem}
                type="button"
                onClick={() => handleOpenSpecial(m)}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'group flex items-start gap-3 rounded-3xl border-4 border-amber-200 bg-cream-50 p-4 text-left shadow-soft transition-shadow hover:shadow-pop',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200',
                )}
                style={{
                  backgroundImage:
                    'radial-gradient(120% 80% at 50% 0%, rgba(252, 211, 77, 0.15) 0%, transparent 65%)',
                }}
              >
                <motion.span
                  aria-hidden
                  className="grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-amber-300 bg-amber-50 text-3xl shadow-soft"
                  animate={{ rotate: [-4, 4, -4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {m.node.emoji ?? '✨'}
                </motion.span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600">
                    <MapPin className="size-3" />
                    {m.regionName}
                  </p>
                  <h3 className="mt-0.5 font-display text-base font-bold leading-snug text-cocoa-900">
                    {m.node.label}
                  </h3>
                  {m.node.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cocoa-700/85">
                      {m.node.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {m.node.isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sage-300 bg-sage-100 px-2 py-0.5 text-[10px] font-bold text-sage-600">
                        <Check className="size-3" />
                        Đã hoàn thành
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Sparkles className="size-3" />
                        Hoạt động mới
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 transition-transform group-hover:translate-x-0.5">
                      Khám phá
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </section>
      )}
    </PageLayout>
  )
}

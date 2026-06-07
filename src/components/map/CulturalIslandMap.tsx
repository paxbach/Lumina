import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Region, SubNode } from '@/types'
import { springBouncy, staggerItem } from '@/utils/motion'

/**
 * CulturalIslandMap — Vietnamese heritage island for "Đảo Văn Hóa"
 *
 * A vibrant, handcrafted cultural island floating on a calm sea, celebrating
 * Vietnamese traditions for children aged 5–10. Four landmark zones sit on a
 * multi-elevation island linked by decorative cultural trails:
 *
 *  - Sắc Màu Ngày Tết  (center)  — Tết village square: peach/apricot blossoms,
 *                                  red lanterns, bánh chưng, market stalls
 *  - Lễ Hội Ánh Sáng   (top-r)   — Hội An lantern festival: river, lantern
 *                                  boats, wooden bridges, glowing lanterns
 *  - Ghép Lại Kỷ Niệm  (low-l)   — Memory garden: hanging photo frames,
 *                                  memory stones, sparkling family memories
 *  - Hành Trình Lịch Sử (low-r)  — Heritage trail: temple gate, drums,
 *                                  monuments, waving banners
 *
 * VISUAL ONLY. Quest data/IDs/unlock/progression are untouched — every
 * landmark resolves its real `SubNode` from the store by its canonical id
 * (`dvh-*`) and forwards taps to `onNodeClick(node)` exactly as before.
 */

interface CulturalIslandMapProps {
  region: Region
  onNodeClick: (node: SubNode) => void
}

/* Landmark anchor points, in percent of the canvas. Used both for the
   absolute-positioned zones and for the SVG trail endpoints (converted to
   the 1000×750 viewBox below). Positions are purely cosmetic. */
const POS = {
  tet: { x: 50, y: 47 }, // center — heart of the island
  festival: { x: 74, y: 29 }, // upper right — lantern river
  garden: { x: 26, y: 66 }, // lower left — memory garden
  heritage: { x: 73, y: 69 }, // lower right — heritage trail
} as const

const VB_W = 1000
const VB_H = 750
const vx = (pct: number) => (pct / 100) * VB_W
const vy = (pct: number) => (pct / 100) * VB_H

/** Gentle quadratic trail between two anchors, bowed toward the island center. */
function trail(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ax = vx(a.x)
  const ay = vy(a.y)
  const bx = vx(b.x)
  const by = vy(b.y)
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2 - 26 // bow upward a touch for a path-like arc
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`
}

export function CulturalIslandMap({ region, onNodeClick }: CulturalIslandMapProps) {
  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-4 border-butter-400 shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(120% 80% at 50% -10%, #fff7e6 0%, transparent 55%),
          radial-gradient(80% 60% at 50% 55%, rgba(255,255,255,0.45) 0%, transparent 70%),
          linear-gradient(175deg, #fde8c8 0%, #cdeaf2 38%, #a9dcec 100%)
        `,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          SKY AMBIENCE
          ════════════════════════════════════════════════════════════════════ */}
      <WarmSun />
      <DriftingClouds />
      <FlyingKites />
      <FlyingBirds />
      <SkyLanterns />
      <FloatingButterflies />
      <FallingPetals />

      {/* ════════════════════════════════════════════════════════════════════
          ISLAND TERRAIN (multi-elevation, isometric feel)
          ════════════════════════════════════════════════════════════════════ */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ci-ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfe7f2" />
            <stop offset="100%" stopColor="#8fd3e8" />
          </linearGradient>
          <radialGradient id="ci-island" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#e9f29a" />
            <stop offset="55%" stopColor="#cfe06b" />
            <stop offset="100%" stopColor="#a9c24a" />
          </radialGradient>
          <linearGradient id="ci-plateau" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4f7b0" />
            <stop offset="100%" stopColor="#d7e480" />
          </linearGradient>
          <linearGradient id="ci-beach" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbeccb" />
            <stop offset="100%" stopColor="#ecd6a6" />
          </linearGradient>
          <linearGradient id="ci-river" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#aee6f5" />
            <stop offset="100%" stopColor="#7fc9e6" />
          </linearGradient>
        </defs>

        {/* Ocean */}
        <rect width={VB_W} height={VB_H} fill="url(#ci-ocean)" />

        {/* Drop shadow under the island for floating depth */}
        <ellipse cx="510" cy="640" rx="370" ry="92" fill="#1f6b86" opacity="0.18" />

        {/* Island base (lower elevation) */}
        <path
          d="M 500 150 Q 815 235 868 405 Q 835 575 595 632 Q 340 662 192 585 Q 92 452 150 296 Q 252 172 500 150 Z"
          fill="url(#ci-island)"
        />
        {/* Beach rim */}
        <path
          d="M 500 168 Q 792 248 842 405 Q 812 556 588 610 Q 350 638 210 568 Q 120 446 172 304 Q 268 196 500 168 Z"
          fill="url(#ci-beach)"
          opacity="0.55"
        />
        {/* Elevated plateau (upper elevation, where the Tết square sits) */}
        <path
          d="M 500 196 Q 720 250 752 392 Q 726 520 556 560 Q 372 580 268 506 Q 196 410 246 312 Q 330 226 500 196 Z"
          fill="url(#ci-plateau)"
        />
        {/* Lantern-festival river winding through the top-right */}
        <path
          d="M 760 215 Q 700 300 720 380 Q 742 450 690 510"
          fill="none"
          stroke="url(#ci-river)"
          strokeWidth="34"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Decorative cultural trails between landmarks (stone walkways) */}
        {(
          [
            [POS.tet, POS.festival],
            [POS.tet, POS.garden],
            [POS.tet, POS.heritage],
          ] as const
        ).map(([a, b], i) => (
          <g key={`trail-${i}`}>
            <path
              d={trail(a, b)}
              fill="none"
              stroke="#b58a4e"
              strokeWidth="16"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path
              d={trail(a, b)}
              fill="none"
              stroke="#f6e7c6"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="2 20"
              opacity="0.9"
            />
          </g>
        ))}
      </svg>

      {/* ════════════════════════════════════════════════════════════════════
          AMBIENT WATER LIFE (in front of terrain, behind landmarks)
          ════════════════════════════════════════════════════════════════════ */}
      <OceanShimmer />
      <WoodenDocks />
      <FloatingBoats />
      <LanternBoats />

      {/* ════════════════════════════════════════════════════════════════════
          LANDMARK ZONES — resolve real SubNodes by canonical store id
          ════════════════════════════════════════════════════════════════════ */}

      {/* CENTER · Sắc Màu Ngày Tết — village square (most prominent) */}
      <QuestLandmark
        region={region}
        nodeId="dvh-sac-mau-tet"
        onNodeClick={onNodeClick}
        pos={POS.tet}
        size="lg"
        theme={tetTheme}
        decor={<TetSquareDecor />}
      />

      {/* ZONE 1 · Lễ Hội Ánh Sáng — Hội An lantern festival */}
      <QuestLandmark
        region={region}
        nodeId="dvh-le-hoi"
        onNodeClick={onNodeClick}
        pos={POS.festival}
        size="md"
        theme={festivalTheme}
        decor={<LanternFestivalDecor />}
      />

      {/* ZONE 2 · Ghép Lại Kỷ Niệm — memory garden */}
      <QuestLandmark
        region={region}
        nodeId="dvh-vu-dieu"
        onNodeClick={onNodeClick}
        pos={POS.garden}
        size="md"
        theme={gardenTheme}
        decor={<MemoryGardenDecor />}
      />

      {/* ZONE 3 · Hành Trình Lịch Sử — heritage trail */}
      <QuestLandmark
        region={region}
        nodeId="dvh-lich-su"
        onNodeClick={onNodeClick}
        pos={POS.heritage}
        size="md"
        theme={heritageTheme}
        decor={<HeritageTrailDecor />}
      />

      {/* ════════════════════════════════════════════════════════════════════
          FOREGROUND DECORATIONS
          ════════════════════════════════════════════════════════════════════ */}
      <CoconutTrees />
      <LotusPond />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SHARED LANDMARK NODE
   ──────────────────────────────────────────────────────────────────
   One renderer for all four quests. `nodeId` is the canonical store id —
   if it cannot be resolved the landmark renders nothing (logic-safe).
   ════════════════════════════════════════════════════════════════════ */

interface LandmarkTheme {
  /** Ring/border around the node button. */
  border: string
  bg: string
  hoverBg: string
  /** Glow aura color (rgba). */
  glow: string
  /** Label pill classes. */
  labelBorder: string
  labelBg: string
  labelText: string
  /** Small platform base color under the node. */
  base: string
}

interface QuestLandmarkProps {
  region: Region
  nodeId: string
  onNodeClick: (node: SubNode) => void
  pos: { x: number; y: number }
  size: 'lg' | 'md'
  theme: LandmarkTheme
  decor: ReactNode
}

function QuestLandmark({
  region,
  nodeId,
  onNodeClick,
  pos,
  size,
  theme,
  decor,
}: QuestLandmarkProps) {
  const node = region.subNodes.find((n) => n.id === nodeId)
  if (!node) return null

  const done = node.isCompleted
  const btnSize = size === 'lg' ? 'size-20' : 'size-16'
  const emojiSize = size === 'lg' ? 'text-4xl' : 'text-3xl'

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      {/* Scenic decorations clustered around the landmark */}
      {decor}

      {/* Celebration burst for completed quests */}
      {done && <CelebrationBurst />}

      {/* Soft platform / shadow base for "object on terrain" feel */}
      <div
        className={`absolute left-1/2 top-[58%] -z-10 h-5 w-24 -translate-x-1/2 rounded-[50%] blur-[2px] ${theme.base}`}
      />

      {/* Pulsing glow aura (warm lantern light when active, golden when done) */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size === 'lg' ? 150 : 120,
          height: size === 'lg' ? 150 : 120,
          background: `radial-gradient(circle, ${done ? 'rgba(250,204,21,0.55)' : theme.glow} 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Quest node button — forwards the REAL SubNode, unchanged */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        className={`pointer-events-auto relative z-10 grid ${btnSize} place-items-center rounded-full border-4 ${
          done ? 'border-amber-400 bg-amber-50' : `${theme.border} ${theme.bg}`
        } shadow-pop transition-colors ${theme.hoverBg}`}
        aria-label={node.label}
      >
        <span className={emojiSize}>{node.emoji}</span>

        {done && (
          <>
            <span className="pointer-events-none absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-2 border-amber-500 bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-soft">
              <Check className="size-4" />
            </span>
            {/* Golden lantern badge */}
            <span className="pointer-events-none absolute -bottom-2 -left-2 select-none text-lg drop-shadow">
              🏅
            </span>
          </>
        )}
      </motion.button>

      {/* Title pill below the node */}
      <motion.div
        className={`pointer-events-none absolute left-1/2 ${
          size === 'lg' ? 'top-28' : 'top-24'
        } -translate-x-1/2 whitespace-nowrap rounded-full border-2 px-3 py-1 text-center font-display text-xs font-bold shadow-soft backdrop-blur ${theme.labelBorder} ${theme.labelBg} ${theme.labelText}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        {node.label}
      </motion.div>
    </div>
  )
}

/** Confetti + firework sparkles around a completed landmark. */
function CelebrationBurst() {
  const bits = ['🎉', '⭐', '✨', '🎊', '🏮', '🌟']
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0">
      {bits.map((b, i) => {
        const angle = (i / bits.length) * Math.PI * 2
        const r = 46
        return (
          <motion.span
            key={`burst-${i}`}
            className="absolute select-none text-base"
            style={{ left: Math.cos(angle) * r, top: Math.sin(angle) * r }}
            animate={{ scale: [0.6, 1.1, 0.6], opacity: [0.4, 1, 0.4], rotate: [0, 20, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
          >
            {b}
          </motion.span>
        )
      })}
    </div>
  )
}

/* ── Landmark themes ─────────────────────────────────────────────── */

const tetTheme: LandmarkTheme = {
  border: 'border-red-400',
  bg: 'bg-red-100',
  hoverBg: 'hover:bg-red-200',
  glow: 'rgba(248,113,113,0.5)',
  labelBorder: 'border-red-300',
  labelBg: 'bg-red-50/90',
  labelText: 'text-red-700',
  base: 'bg-amber-900/20',
}

const festivalTheme: LandmarkTheme = {
  border: 'border-orange-400',
  bg: 'bg-orange-100',
  hoverBg: 'hover:bg-orange-200',
  glow: 'rgba(251,146,60,0.5)',
  labelBorder: 'border-orange-300',
  labelBg: 'bg-orange-50/90',
  labelText: 'text-orange-700',
  base: 'bg-orange-900/20',
}

const gardenTheme: LandmarkTheme = {
  border: 'border-rose-400',
  bg: 'bg-rose-100',
  hoverBg: 'hover:bg-rose-200',
  glow: 'rgba(244,114,182,0.5)',
  labelBorder: 'border-rose-300',
  labelBg: 'bg-rose-50/90',
  labelText: 'text-rose-700',
  base: 'bg-rose-900/20',
}

const heritageTheme: LandmarkTheme = {
  border: 'border-amber-600',
  bg: 'bg-yellow-100',
  hoverBg: 'hover:bg-yellow-200',
  glow: 'rgba(217,164,65,0.55)',
  labelBorder: 'border-amber-300',
  labelBg: 'bg-yellow-50/90',
  labelText: 'text-amber-800',
  base: 'bg-amber-900/25',
}

/* ════════════════════════════════════════════════════════════════════
   PER-LANDMARK SCENERY
   ════════════════════════════════════════════════════════════════════ */

function TetSquareDecor() {
  return (
    <>
      {/* Peach & apricot blossom trees */}
      <motion.div
        className="absolute -left-20 -top-16 select-none text-5xl"
        animate={{ rotate: [-3, 3, -3], y: [-2, 3, -2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🌸
      </motion.div>
      <motion.div
        className="absolute -right-20 -top-12 select-none text-5xl"
        animate={{ rotate: [3, -3, 3], y: [3, -2, 3] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        🌼
      </motion.div>
      {/* Red lanterns strung above */}
      <motion.div
        className="absolute -right-12 -top-16 select-none text-3xl"
        animate={{ y: [-4, 6, -4], rotate: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      >
        🏮
      </motion.div>
      <motion.div
        className="absolute -left-14 top-2 select-none text-2xl"
        animate={{ y: [4, -5, 4], rotate: [0, -6, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        🏮
      </motion.div>
      {/* Bánh chưng display — drawn so it reads as the real green sticky-rice
          cake tied with a red string, which no emoji captures. */}
      <motion.div
        className="absolute -bottom-8 -left-14"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative size-7 rounded-[5px] border-2 border-green-800 bg-gradient-to-br from-green-600 to-green-800 shadow-soft">
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-red-500/90" />
          <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-red-500/90" />
        </div>
      </motion.div>
      {/* Lì xì + decorative market stall */}
      <motion.div
        className="absolute -bottom-6 -left-4 select-none text-2xl"
        animate={{ scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        🧧
      </motion.div>
      <motion.div
        className="absolute -bottom-8 -right-12 select-none text-3xl"
        animate={{ y: [2, -4, 2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        ⛩️
      </motion.div>
      <motion.div
        className="absolute -bottom-5 -right-2 select-none text-xl"
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      >
        🎏
      </motion.div>
    </>
  )
}

function LanternFestivalDecor() {
  return (
    <>
      <motion.div
        className="absolute -right-10 -top-12 select-none text-4xl"
        animate={{ y: [-8, 8, -8], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🏮
      </motion.div>
      <motion.div
        className="absolute -left-12 -top-6 select-none text-3xl"
        animate={{ y: [6, -8, 6], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        🏮
      </motion.div>
      {/* Traditional Hội An houses */}
      <motion.div
        className="absolute -left-16 -bottom-2 select-none text-3xl"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      >
        🏘️
      </motion.div>
      {/* Wooden bridge + sparkle reflections */}
      <motion.div
        className="absolute -bottom-8 -left-8 select-none text-3xl"
        animate={{ rotate: [0, 2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🌉
      </motion.div>
      {/* Candle reflection shimmering on the water */}
      <motion.div
        className="absolute -bottom-9 left-2 h-2 w-12 rounded-[50%] bg-amber-300/70 blur-[2px]"
        animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1.1, 0.8] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-6 right-0 select-none text-xl"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        ✨
      </motion.div>
    </>
  )
}

function MemoryGardenDecor() {
  return (
    <>
      {/* Hanging photo frames */}
      <motion.div
        className="absolute -left-14 -top-10 select-none text-4xl"
        animate={{ rotate: [-4, 4, -4], y: [-3, 4, -3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🖼️
      </motion.div>
      <motion.div
        className="absolute -right-12 -top-4 select-none text-3xl"
        animate={{ rotate: [4, -4, 4], y: [3, -4, 3] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        📷
      </motion.div>
      {/* Puzzle-shaped decoration (echoes the "ghép" / piecing-together theme) */}
      <motion.div
        className="absolute -left-4 -top-14 select-none text-2xl"
        animate={{ rotate: [-8, 8, -8], y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      >
        🧩
      </motion.div>
      {/* Softly turning scrapbook pages */}
      <motion.div
        className="absolute -right-4 -top-12 select-none text-2xl"
        animate={{ rotateY: [0, 60, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        📖
      </motion.div>
      {/* Memory stones + sparkles */}
      <motion.div
        className="absolute -bottom-7 -left-10 select-none text-2xl"
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🪨
      </motion.div>
      <motion.div
        className="absolute -bottom-5 -right-8 select-none text-xl"
        animate={{ opacity: [0.4, 1, 0.4], y: [0, -6, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        ✨
      </motion.div>
    </>
  )
}

function HeritageTrailDecor() {
  return (
    <>
      {/* Temple gate + monument */}
      <motion.div
        className="absolute -right-12 -top-12 select-none text-4xl"
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        ⛩️
      </motion.div>
      <motion.div
        className="absolute -left-14 -top-4 select-none text-3xl"
        animate={{ y: [4, -5, 4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        🏛️
      </motion.div>
      {/* Heritage museum */}
      <motion.div
        className="absolute -right-4 -top-16 select-none text-2xl"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        🏯
      </motion.div>
      {/* Traditional drum + waving banner */}
      <motion.div
        className="absolute -bottom-7 -left-10 select-none text-3xl"
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🥁
      </motion.div>
      <motion.div
        className="absolute -bottom-6 -right-10 select-none text-3xl"
        animate={{ rotate: [0, 14, 0], x: [0, 2, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        🚩
      </motion.div>
      {/* Festival banner waving */}
      <motion.div
        className="absolute -bottom-4 left-2 select-none text-xl"
        animate={{ rotate: [-10, 10, -10], x: [0, 3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        🎏
      </motion.div>
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SKY & WATER AMBIENCE
   ════════════════════════════════════════════════════════════════════ */

function WarmSun() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-[14%] top-[10%] size-20 rounded-full"
      style={{ background: 'radial-gradient(circle, #ffe7a3 0%, #ffd166 55%, transparent 75%)' }}
      animate={{ opacity: [0.75, 1, 0.75], scale: [0.97, 1.04, 0.97] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function DriftingClouds() {
  const clouds = [
    { top: '12%', size: 'text-5xl', dur: 26, delay: 0 },
    { top: '20%', size: 'text-4xl', dur: 32, delay: 6 },
    { top: '8%', size: 'text-3xl', dur: 38, delay: 12 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {clouds.map((c, i) => (
        <motion.span
          key={`cloud-${i}`}
          className={`absolute select-none ${c.size} opacity-80`}
          style={{ top: c.top, left: '-12%' }}
          animate={{ x: ['0%', '120vw'] }}
          transition={{ duration: c.dur, repeat: Infinity, ease: 'linear', delay: c.delay }}
        >
          ☁️
        </motion.span>
      ))}
    </div>
  )
}

function FlyingKites() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1].map((i) => (
        <motion.span
          key={`kite-${i}`}
          className="absolute select-none text-3xl"
          style={{ right: `${12 + i * 22}%`, top: `${6 + i * 6}%` }}
          animate={{ y: [0, -14, 0], x: [0, 10, 0], rotate: [-8, 8, -8] }}
          transition={{ duration: 7 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i }}
        >
          🪁
        </motion.span>
      ))}
    </div>
  )
}

function FlyingBirds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`bird-${i}`}
          className="absolute select-none text-xl"
          style={{ top: `${16 + i * 9}%`, left: '-10%' }}
          animate={{ x: ['0%', '120vw'], y: [0, -18, 0] }}
          transition={{ duration: 16 + i * 3, repeat: Infinity, ease: 'linear', delay: i * 5 }}
        >
          {i === 1 ? '🕊️' : '🐦'}
        </motion.span>
      ))}
    </div>
  )
}

function SkyLanterns() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={`skylantern-${i}`}
          className="absolute select-none text-2xl"
          style={{ left: `${22 + i * 18}%`, bottom: '-8%' }}
          animate={{ y: [0, -460], x: [0, (i % 2 === 0 ? 1 : -1) * 26], opacity: [0, 1, 0], scale: [0.7, 1, 0.85] }}
          transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 2.4 }}
        >
          🏮
        </motion.span>
      ))}
    </div>
  )
}

function FloatingButterflies() {
  const pts = [
    { left: '20%', top: '30%' },
    { left: '60%', top: '22%' },
    { left: '44%', top: '52%' },
    { left: '78%', top: '46%' },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pts.map((p, i) => (
        <motion.span
          key={`butterfly-${i}`}
          className="absolute select-none text-lg"
          style={{ left: p.left, top: p.top }}
          animate={{ x: [0, 34, 0], y: [0, -40, 0], rotate: [0, 18, -18, 0] }}
          transition={{ duration: 8 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 1.1 }}
        >
          🦋
        </motion.span>
      ))}
    </div>
  )
}

function FallingPetals() {
  const cols = [8, 24, 40, 56, 72, 88]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {cols.map((left, i) => (
        <motion.span
          key={`petal-${i}`}
          className="absolute select-none text-sm"
          style={{ left: `${left}%`, top: '-6%' }}
          animate={{ y: [0, 560], x: [0, Math.sin(i) * 36], rotate: [0, 320], opacity: [1, 0.2] }}
          transition={{ duration: 7 + (i % 3), repeat: Infinity, ease: 'easeIn', delay: i * 0.9 }}
        >
          🌸
        </motion.span>
      ))}
    </div>
  )
}

function OceanShimmer() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`shimmer-${i}`}
          className="absolute inset-x-0 h-16 bg-gradient-to-t from-white/25 to-transparent"
          style={{ bottom: `${4 + i * 7}%` }}
          animate={{ opacity: [0.2, 0.5, 0.2], y: [0, 5, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
        />
      ))}
    </div>
  )
}

function WoodenDocks() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Two simple plank piers reaching from the beach into the sea */}
      {[
        { left: '20%', top: '74%', rot: -12 },
        { left: '70%', top: '76%', rot: 10 },
      ].map((d, i) => (
        <div
          key={`dock-${i}`}
          className="absolute"
          style={{ left: d.left, top: d.top, transform: `rotate(${d.rot}deg)` }}
        >
          <div className="h-2.5 w-16 rounded-sm bg-gradient-to-r from-amber-700 to-amber-800 shadow-soft" />
          <div className="mx-auto h-3 w-[3px] bg-amber-900/80" />
          <span className="absolute -top-3 right-0 select-none text-sm">⚓</span>
        </div>
      ))}
    </div>
  )
}

function FloatingBoats() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1].map((i) => (
        <motion.span
          key={`boat-${i}`}
          className="absolute select-none text-3xl"
          style={{ left: i === 0 ? '12%' : '80%', top: '82%' }}
          animate={{ x: i === 0 ? [0, 70, 0] : [0, -70, 0], y: [0, -6, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 15 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 3 }}
        >
          ⛵
        </motion.span>
      ))}
    </div>
  )
}

function LanternBoats() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1].map((i) => (
        <motion.span
          key={`lboat-${i}`}
          className="absolute select-none text-xl"
          style={{ left: `${64 + i * 6}%`, top: `${44 + i * 5}%` }}
          animate={{ y: [0, -4, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
        >
          🪔
        </motion.span>
      ))}
    </div>
  )
}

function CoconutTrees() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[0, 1].map((i) => (
        <motion.span
          key={`coconut-${i}`}
          className="absolute select-none text-5xl"
          style={{ left: i === 0 ? '6%' : '90%', top: i === 0 ? '40%' : '34%' }}
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
        >
          🌴
        </motion.span>
      ))}
    </div>
  )
}

function LotusPond() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`lotus-${i}`}
          className="absolute select-none text-2xl"
          style={{ left: `${36 + i * 16}%`, bottom: '9%' }}
          animate={{ y: [0, -8, 0], rotate: [-4, 4, -4] }}
          transition={{ duration: 5 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        >
          🪷
        </motion.span>
      ))}
    </div>
  )
}

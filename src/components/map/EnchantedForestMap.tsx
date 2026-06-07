import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Region, SubNode } from '@/types'
import { springBouncy, staggerItem } from '@/utils/motion'

/**
 * EnchantedForestMap — V2 "WOW" 3D safari adventure world for "Rừng Kỳ Diệu"
 *
 * A living diorama-style magical forest island viewed at a soft 45° angle:
 * layered hills, a winding stream with wooden bridges, glowing rocks and drifting
 * fog. A giant Safari Gate anchors the heart of the map; four quest landmarks sit
 * around it, joined by discovery trails (stones, bridges, animal footprints,
 * signposts) instead of straight lines. The forest is full of life — butterflies,
 * squirrels, birds, rabbits, deer and fireflies wander without affecting play.
 *
 *  - THÁM HIỂM SAFARI       (centre)  — giant glowing safari gate + torches
 *  - Cây Cổ Thụ Tri Thức    (top-l)   — Ancient Wisdom Tree, flying books, fruit
 *  - Thác Nước Màu          (top-r)   — Rainbow Waterfall (the showpiece)
 *  - Hang Đom Đóm           (low-r)   — Crystal Firefly Cave (mysterious)
 *  - Ghép Lá Rừng           (low-l)   — Leaf-crafting garden
 *
 * When every quest is complete the whole forest is "revived": a panoramic
 * rainbow, gathered animals, light fireworks and a "Người Bảo Vệ Rừng Kỳ Diệu"
 * banner appear.
 *
 * VISUAL ONLY. Quest data/IDs/unlock/progression/click-handlers/routes are
 * untouched — every landmark resolves its real `SubNode` from the store by its
 * canonical id (`rkd-forest-*`) and forwards taps to `onNodeClick(node)`.
 */

interface EnchantedForestMapProps {
  region: Region
  onNodeClick: (node: SubNode) => void
}

/* Landmark anchors in percent — cosmetic only. Used for the absolute zones and
   to derive the SVG trail endpoints (converted to the 1000×750 viewBox). */
const POS = {
  hub: { x: 50, y: 53 }, // giant safari gate (heart of the map)
  wisdom: { x: 19, y: 27 }, // ancient wisdom tree
  waterfall: { x: 81, y: 25 }, // rainbow waterfall
  cave: { x: 83, y: 75 }, // crystal firefly cave
  leaf: { x: 17, y: 75 }, // leaf garden
} as const

const VB_W = 1000
const VB_H = 750
const vx = (pct: number) => (pct / 100) * VB_W
const vy = (pct: number) => (pct / 100) * VB_H

function trail(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ax = vx(a.x)
  const ay = vy(a.y)
  const bx = vx(b.x)
  const by = vy(b.y)
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2 + 28
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`
}

export function EnchantedForestMap({ region, onNodeClick }: EnchantedForestMapProps) {
  const allDone =
    region.subNodes.length > 0 && region.subNodes.every((n) => n.isCompleted)
  // First not-yet-done node reads as the "current" landmark (gold glow). Purely
  // cosmetic — does not gate access or change click behaviour.
  const currentId = region.subNodes.find((n) => !n.isCompleted)?.id ?? null

  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-4 border-sage-400 shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(110% 80% at 50% -8%, #d6f0ff 0%, transparent 50%),
          radial-gradient(80% 60% at 50% 60%, rgba(255,255,255,0.35) 0%, transparent 72%),
          linear-gradient(180deg, #bfe3f0 0%, #cdeecb 42%, #b6dca0 100%)
        `,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          BACKGROUND DEPTH — far mountains, clouds, distant birds
          ════════════════════════════════════════════════════════════════════ */}
      <FarMountains />
      <SkyClouds />
      <DistantBirds />

      {/* ════════════════════════════════════════════════════════════════════
          TERRAIN — hills, stream, bridges, glowing rocks + discovery trails
          ════════════════════════════════════════════════════════════════════ */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="ef-island" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#bfe89a" />
            <stop offset="55%" stopColor="#8fd07a" />
            <stop offset="100%" stopColor="#5fa860" />
          </radialGradient>
          <linearGradient id="ef-hill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a7df8c" />
            <stop offset="100%" stopColor="#79c06a" />
          </linearGradient>
          <linearGradient id="ef-stream" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b6ecff" />
            <stop offset="100%" stopColor="#7cc9ef" />
          </linearGradient>
          <linearGradient id="ef-trail" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e7cda0" />
            <stop offset="100%" stopColor="#c79e63" />
          </linearGradient>
        </defs>

        {/* Floating island shadow */}
        <ellipse cx="510" cy="660" rx="400" ry="86" fill="#2f5e2a" opacity="0.18" />

        {/* Island base */}
        <path
          d="M 500 150 Q 830 235 872 410 Q 840 588 590 642 Q 330 672 188 588 Q 86 452 150 292 Q 256 168 500 150 Z"
          fill="url(#ef-island)"
        />
        {/* Rolling hills (elevation) */}
        <path d="M 200 360 Q 330 250 470 330 Q 560 380 470 430 Q 330 470 200 360 Z" fill="url(#ef-hill)" opacity="0.85" />
        <path d="M 560 300 Q 690 220 800 320 Q 840 380 740 410 Q 620 420 560 300 Z" fill="url(#ef-hill)" opacity="0.8" />

        {/* Winding stream */}
        <path
          d="M 300 240 Q 360 360 300 470 Q 250 560 360 620"
          fill="none"
          stroke="url(#ef-stream)"
          strokeWidth="30"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M 720 250 Q 660 360 720 470 Q 770 560 660 630"
          fill="none"
          stroke="url(#ef-stream)"
          strokeWidth="26"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Glowing rocks */}
        {[
          { cx: 360, cy: 470, r: 13 },
          { cx: 660, cy: 500, r: 11 },
          { cx: 470, cy: 600, r: 10 },
        ].map((rk, i) => (
          <motion.circle
            key={`rock-${i}`}
            cx={rk.cx}
            cy={rk.cy}
            r={rk.r}
            fill="#9be7ff"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.6 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          />
        ))}

        {/* Discovery trails between hub and each landmark */}
        {(
          [
            [POS.hub, POS.wisdom],
            [POS.hub, POS.waterfall],
            [POS.hub, POS.cave],
            [POS.hub, POS.leaf],
          ] as const
        ).map(([a, b], i) => (
          <g key={`trail-${i}`}>
            <path d={trail(a, b)} fill="none" stroke="url(#ef-trail)" strokeWidth="18" strokeLinecap="round" opacity="0.6" />
            <path
              d={trail(a, b)}
              fill="none"
              stroke="#fff6e0"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="2 22"
              opacity="0.85"
            />
          </g>
        ))}
      </svg>

      {/* Wooden bridges over the streams */}
      <WoodenBridges />

      {/* Animal footprints + signposts along the trails */}
      <TrailMarkers />

      {/* ════════════════════════════════════════════════════════════════════
          MIDGROUND — bushes & big background trees
          ════════════════════════════════════════════════════════════════════ */}
      <ForestMidground />

      {/* ════════════════════════════════════════════════════════════════════
          AMBIENT LIFE & PARTICLES
          ════════════════════════════════════════════════════════════════════ */}
      <ForestCreatures />
      <FallingLeaves />
      <FloatingSpores />
      <DriftingFog />

      {/* ════════════════════════════════════════════════════════════════════
          CENTRE — GIANT SAFARI GATE (≈30% of the map)
          ════════════════════════════════════════════════════════════════════ */}
      <SafariGateHub region={region} onNodeClick={onNodeClick} currentId={currentId} />

      {/* ════════════════════════════════════════════════════════════════════
          QUEST LANDMARKS — resolve real SubNodes by canonical store id
          ════════════════════════════════════════════════════════════════════ */}
      <ForestLandmark
        region={region}
        nodeId="rkd-forest-leaf-scanner"
        onNodeClick={onNodeClick}
        currentId={currentId}
        pos={POS.wisdom}
        theme={wisdomTheme}
        decor={<WisdomTreeDecor />}
      />
      <ForestLandmark
        region={region}
        nodeId="rkd-forest-color-picker"
        onNodeClick={onNodeClick}
        currentId={currentId}
        pos={POS.waterfall}
        theme={waterfallTheme}
        decor={<WaterfallDecor />}
      />
      <ForestLandmark
        region={region}
        nodeId="rkd-forest-light-detector"
        onNodeClick={onNodeClick}
        currentId={currentId}
        pos={POS.cave}
        theme={caveTheme}
        decor={<FireflyCaveDecor />}
      />
      <ForestLandmark
        region={region}
        nodeId="rkd-forest-shape-match"
        onNodeClick={onNodeClick}
        currentId={currentId}
        pos={POS.leaf}
        theme={leafTheme}
        decor={<LeafGardenDecor />}
      />

      {/* ════════════════════════════════════════════════════════════════════
          FOREGROUND — flowers, grass, near falling leaves (parallax depth)
          ════════════════════════════════════════════════════════════════════ */}
      <ForegroundFlora />

      {/* 100% completion celebration overlay (derived from quest data) */}
      {allDone && <CompletionCelebration />}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   CENTRE — GIANT SAFARI GATE HUB
   ════════════════════════════════════════════════════════════════════ */

function SafariGateHub({
  region,
  onNodeClick,
  currentId,
}: EnchantedForestMapProps & { currentId: string | null }) {
  const node = region.subNodes.find((n) => n.id === 'rkd-forest-zoo-safari')
  if (!node) return null

  const done = node.isCompleted
  const isCurrent = node.id === currentId

  return (
    <div
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${POS.hub.x}%`, top: `${POS.hub.y}%` }}
    >
      {/* Large warm halo so the hub is the first thing the eye lands on */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-60 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${
            done ? 'rgba(74,222,128,0.5)' : 'rgba(255,196,90,0.5)'
          } 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.94, 1.06, 0.94] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Fireflies orbiting the gate */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <motion.span
            key={`gate-fly-${i}`}
            className="absolute left-1/2 top-1/2 size-1.5 rounded-full bg-lime-200"
            style={{ boxShadow: '0 0 7px 3px rgba(190,242,100,0.9)' }}
            animate={{
              x: [Math.cos(a) * 70, Math.cos(a + 1) * 70],
              y: [Math.sin(a) * 50, Math.sin(a + 1) * 50],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          />
        )
      })}

      {/* The gate: vines, torches, lion-head crest, big wooden arch */}
      <div className="relative grid w-56 place-items-center">
        {/* Vines draping the top */}
        <motion.span
          className="absolute -top-6 left-2 select-none text-3xl"
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          🌿
        </motion.span>
        <motion.span
          className="absolute -top-6 right-2 select-none text-3xl"
          animate={{ rotate: [6, -6, 6] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          🌿
        </motion.span>

        {/* Glowing lion-head crest */}
        <motion.span
          className="absolute -top-10 left-1/2 -translate-x-1/2 select-none text-4xl"
          style={{ filter: 'drop-shadow(0 0 10px rgba(255,196,90,0.95))' }}
          animate={{ scale: [0.96, 1.06, 0.96] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          🦁
        </motion.span>

        {/* Wooden gate structure */}
        <div className="flex items-end gap-10">
          {/* Left post + torch */}
          <div className="relative">
            <div
              className="h-28 w-7 rounded-t-md"
              style={{ background: 'linear-gradient(90deg,#6b4423,#9a6a3c,#6b4423)', boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.3)' }}
            />
            <motion.span
              className="absolute -top-6 left-1/2 -translate-x-1/2 select-none text-2xl"
              animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              🔥
            </motion.span>
          </div>
          {/* Right post + torch */}
          <div className="relative">
            <div
              className="h-28 w-7 rounded-t-md"
              style={{ background: 'linear-gradient(90deg,#6b4423,#9a6a3c,#6b4423)', boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.3)' }}
            />
            <motion.span
              className="absolute -top-6 left-1/2 -translate-x-1/2 select-none text-2xl"
              animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            >
              🔥
            </motion.span>
          </div>
        </div>
        {/* Cross beam */}
        <div
          className="absolute top-2 h-7 w-48 rounded-md"
          style={{ background: 'linear-gradient(180deg,#7a4e29,#5e3c20)', boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.35)' }}
        />

        {/* Central quest button mounted in the gateway */}
        <motion.button
          type="button"
          onClick={() => onNodeClick(node)}
          variants={staggerItem}
          whileHover={{ scale: 1.18, y: -10 }}
          whileTap={{ scale: 0.9 }}
          transition={springBouncy}
          className={`pointer-events-auto absolute bottom-2 left-1/2 z-10 grid size-24 -translate-x-1/2 place-items-center rounded-full border-4 shadow-pop transition-colors ${
            done
              ? 'border-green-400 bg-green-50'
              : isCurrent
                ? 'border-amber-400 bg-amber-50'
                : 'border-peach-400 bg-peach-100 hover:bg-peach-200'
          }`}
          aria-label={node.label}
        >
          <span className="text-5xl">{node.emoji}</span>
          {done && (
            <span className="pointer-events-none absolute -right-3 -top-3 grid size-8 place-items-center rounded-full border-2 border-green-500 bg-gradient-to-br from-green-300 to-green-500 text-white shadow-soft">
              <Check className="size-4" />
            </span>
          )}
        </motion.button>
      </div>

      {/* Hub label */}
      <motion.div
        className="absolute left-1/2 top-[150px] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-peach-300 bg-peach-50/90 px-4 py-1.5 text-center font-display text-xs font-bold text-peach-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div>{node.label}</div>
        <div className="mt-0.5 text-[10px] text-peach-600">⭐ HUB</div>
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SHARED QUEST LANDMARK (the four outer zones)
   ════════════════════════════════════════════════════════════════════ */

interface LandmarkTheme {
  border: string
  bg: string
  hoverBg: string
  glow: string
  labelBorder: string
  labelBg: string
  labelText: string
  base: string
}

interface ForestLandmarkProps {
  region: Region
  nodeId: string
  onNodeClick: (node: SubNode) => void
  currentId: string | null
  pos: { x: number; y: number }
  theme: LandmarkTheme
  decor: ReactNode
}

function ForestLandmark({
  region,
  nodeId,
  onNodeClick,
  currentId,
  pos,
  theme,
  decor,
}: ForestLandmarkProps) {
  const node = region.subNodes.find((n) => n.id === nodeId)
  if (!node) return null

  const done = node.isCompleted
  const isCurrent = node.id === currentId

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      {decor}

      {/* Completed → flowers blooming around the node */}
      {done && <BloomingFlowers />}

      {/* Glow aura: completed → green, current → gold, else theme tint */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${
            done
              ? 'rgba(74,222,128,0.55)'
              : isCurrent
                ? 'rgba(255,196,90,0.6)'
                : theme.glow
          } 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Platform base */}
      <div
        className={`absolute left-1/2 top-[58%] -z-10 h-5 w-24 -translate-x-1/2 rounded-[50%] blur-[2px] ${theme.base}`}
      />

      {/* Quest button — forwards the REAL SubNode, unchanged */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        className={`pointer-events-auto relative z-10 grid size-16 place-items-center rounded-full border-4 shadow-pop transition-colors ${
          done
            ? 'border-green-400 bg-green-50'
            : isCurrent
              ? 'border-amber-400 bg-amber-50'
              : `${theme.border} ${theme.bg} ${theme.hoverBg}`
        }`}
        aria-label={node.label}
      >
        <span className="text-3xl">{node.emoji}</span>
        {done && (
          <span className="pointer-events-none absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-2 border-green-500 bg-gradient-to-br from-green-300 to-green-500 text-white shadow-soft">
            <Check className="size-4" />
          </span>
        )}
      </motion.button>

      {/* Title pill */}
      <motion.div
        className={`pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap rounded-full border-2 px-3 py-1 text-center font-display text-[11px] font-bold shadow-soft backdrop-blur ${theme.labelBorder} ${theme.labelBg} ${theme.labelText}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        {node.label}
      </motion.div>
    </div>
  )
}

/** Ring of little flowers blooming around a completed node. */
function BloomingFlowers() {
  const flowers = ['🌸', '🌼', '🌺', '🌷', '🌻', '💐']
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0">
      {flowers.map((f, i) => {
        const angle = (i / flowers.length) * Math.PI * 2
        const r = 44
        return (
          <motion.span
            key={`bloom-${i}`}
            className="absolute select-none text-sm"
            style={{ left: Math.cos(angle) * r, top: Math.sin(angle) * r }}
            initial={{ scale: 0 }}
            animate={{ scale: [0.7, 1, 0.85], rotate: [0, 12, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
          >
            {f}
          </motion.span>
        )
      })}
    </div>
  )
}

/* ── Landmark themes ─────────────────────────────────────────────── */

const wisdomTheme: LandmarkTheme = {
  border: 'border-mint-400',
  bg: 'bg-mint-100',
  hoverBg: 'hover:bg-mint-200',
  glow: 'rgba(110,231,183,0.5)',
  labelBorder: 'border-mint-300',
  labelBg: 'bg-mint-50/90',
  labelText: 'text-mint-700',
  base: 'bg-green-900/20',
}

const waterfallTheme: LandmarkTheme = {
  border: 'border-sky-400',
  bg: 'bg-sky-100',
  hoverBg: 'hover:bg-sky-200',
  glow: 'rgba(56,189,248,0.5)',
  labelBorder: 'border-sky-300',
  labelBg: 'bg-sky-50/90',
  labelText: 'text-sky-700',
  base: 'bg-sky-900/20',
}

const caveTheme: LandmarkTheme = {
  border: 'border-purple-400',
  bg: 'bg-purple-100',
  hoverBg: 'hover:bg-purple-200',
  glow: 'rgba(192,132,252,0.55)',
  labelBorder: 'border-purple-300',
  labelBg: 'bg-purple-50/90',
  labelText: 'text-purple-700',
  base: 'bg-purple-900/25',
}

const leafTheme: LandmarkTheme = {
  border: 'border-butter-400',
  bg: 'bg-butter-100',
  hoverBg: 'hover:bg-butter-200',
  glow: 'rgba(250,204,21,0.5)',
  labelBorder: 'border-butter-300',
  labelBg: 'bg-butter-50/90',
  labelText: 'text-butter-700',
  base: 'bg-amber-900/20',
}

/* ════════════════════════════════════════════════════════════════════
   PER-LANDMARK SCENERY
   ════════════════════════════════════════════════════════════════════ */

function WisdomTreeDecor() {
  return (
    <>
      {/* Giant glowing tree */}
      <motion.div
        className="absolute left-1/2 -top-16 -translate-x-1/2 select-none text-7xl"
        style={{ filter: 'drop-shadow(0 0 14px rgba(134,239,172,0.85))' }}
        animate={{ scale: [0.98, 1.03, 0.98] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🌳
      </motion.div>
      {/* Books orbiting slowly */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <motion.span
            key={`book-${i}`}
            className="absolute left-1/2 -top-10 select-none text-2xl"
            animate={{
              x: [Math.cos(a) * 46, Math.cos(a + 2) * 46],
              y: [Math.sin(a) * 30, Math.sin(a + 2) * 30],
              rotate: [0, 360],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear', delay: i * 0.6 }}
          >
            📖
          </motion.span>
        )
      })}
      {/* Glowing knowledge fruit */}
      <motion.span
        className="absolute -right-6 -top-2 select-none text-xl"
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.15, 0.9] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        🟡
      </motion.span>
      {/* Falling leaves */}
      <motion.span
        className="absolute -left-8 top-2 select-none text-base"
        animate={{ y: [0, 30], opacity: [1, 0], rotate: [0, 200] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeIn' }}
      >
        🍃
      </motion.span>
    </>
  )
}

function WaterfallDecor() {
  return (
    <>
      {/* Real rainbow over the showpiece falls */}
      <motion.span
        className="absolute -left-10 -top-14 select-none text-6xl"
        animate={{ opacity: [0.7, 1, 0.7], scale: [0.97, 1.04, 0.97] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🌈
      </motion.span>
      {/* Tall cascade — stacked color-shifting bands */}
      <motion.div
        className="absolute left-1/2 -top-6 h-16 w-7 -translate-x-1/2 overflow-hidden rounded-b-xl"
        style={{ boxShadow: '0 0 12px rgba(125,211,252,0.7)' }}
        animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <div className="size-full bg-gradient-to-b from-sky-300 via-cyan-200 to-blue-400" />
      </motion.div>
      {/* Flowing droplets */}
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={`drop-${i}`}
          className="absolute left-1/2 select-none text-base"
          style={{ marginLeft: -6 + i * 4 }}
          animate={{ y: [-4, 42], opacity: [0.9, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeIn', delay: i * 0.25 }}
        >
          💧
        </motion.span>
      ))}
      {/* Shimmer reflection at the base */}
      <motion.div
        className="absolute left-1/2 top-9 h-2 w-14 -translate-x-1/2 rounded-[50%] bg-cyan-200/70 blur-[2px]"
        animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.85, 1.1, 0.85] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  )
}

function FireflyCaveDecor() {
  return (
    <>
      {/* Purple cave mouth */}
      <motion.div
        className="absolute left-1/2 -top-10 size-16 -translate-x-1/2 rounded-t-full"
        style={{ background: 'radial-gradient(circle at 50% 70%, #3b1d5e 0%, #6b21a8 70%, #7e22ce 100%)', boxShadow: '0 0 16px rgba(168,85,247,0.6)' }}
        animate={{ scale: [0.97, 1.03, 0.97] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Glowing crystals */}
      <motion.span
        className="absolute -left-10 -top-6 select-none text-3xl"
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        💎
      </motion.span>
      <motion.span
        className="absolute -right-8 -top-2 select-none text-2xl"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        🔮
      </motion.span>
      {/* Swarm of fireflies */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.span
          key={`fly-${i}`}
          className="absolute left-1/2 top-1/2 size-1.5 rounded-full bg-lime-200"
          style={{ boxShadow: '0 0 6px 2px rgba(190,242,100,0.9)' }}
          animate={{
            x: [Math.cos(i) * 30, Math.cos(i + 2) * 38, Math.cos(i) * 30],
            y: [Math.sin(i) * 26 - 14, Math.sin(i + 2) * 30 - 14, Math.sin(i) * 26 - 14],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        />
      ))}
    </>
  )
}

function LeafGardenDecor() {
  return (
    <>
      {/* Giant leaf ring */}
      <motion.div
        className="absolute left-1/2 -top-12 size-20 -translate-x-1/2 rounded-full border-4 border-lime-400/70"
        style={{ boxShadow: '0 0 12px rgba(163,230,53,0.6)' }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        {['🍃', '🍂', '🌿', '🍀'].map((l, i) => {
          const a = (i / 4) * Math.PI * 2
          return (
            <span
              key={`ring-leaf-${i}`}
              className="absolute select-none text-lg"
              style={{ left: `calc(50% + ${Math.cos(a) * 36}px)`, top: `calc(50% + ${Math.sin(a) * 36}px)`, transform: 'translate(-50%,-50%)' }}
            >
              {l}
            </span>
          )
        })}
      </motion.div>
      {/* Wooden crafting table */}
      <motion.span
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 select-none text-2xl"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🪵
      </motion.span>
      {/* Butterfly crossing */}
      <motion.span
        className="absolute -right-10 top-0 select-none text-xl"
        animate={{ x: [0, -40, 0], y: [0, -16, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🦋
      </motion.span>
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   DEPTH LAYERS, MARKERS & AMBIENCE
   ════════════════════════════════════════════════════════════════════ */

function FarMountains() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[14%] opacity-60">
      <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="h-28 w-full">
        <path d="M0 200 L150 70 L260 160 L380 50 L520 170 L640 80 L800 180 L920 90 L1000 200 Z" fill="#9bc6c4" />
        <path d="M0 200 L120 120 L300 190 L460 110 L640 195 L820 120 L1000 200 Z" fill="#7fb0ad" opacity="0.8" />
      </svg>
    </div>
  )
}

function SkyClouds() {
  const clouds = [
    { top: '8%', size: 'text-5xl', dur: 30, delay: 0 },
    { top: '16%', size: 'text-4xl', dur: 38, delay: 8 },
    { top: '5%', size: 'text-3xl', dur: 46, delay: 16 },
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

function DistantBirds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`fbird-${i}`}
          className="absolute select-none text-sm opacity-80"
          style={{ top: `${12 + i * 7}%`, left: '-10%' }}
          animate={{ x: ['0%', '120vw'], y: [0, -14, 0] }}
          transition={{ duration: 20 + i * 4, repeat: Infinity, ease: 'linear', delay: i * 6 }}
        >
          🐦
        </motion.span>
      ))}
    </div>
  )
}

function WoodenBridges() {
  const bridges = [
    { left: '30%', top: '62%', rot: -18 },
    { left: '70%', top: '63%', rot: 16 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {bridges.map((b, i) => (
        <div
          key={`bridge-${i}`}
          className="absolute"
          style={{ left: b.left, top: b.top, transform: `rotate(${b.rot}deg)` }}
        >
          <div className="flex gap-[2px]">
            {[...Array(6)].map((_, j) => (
              <div key={j} className="h-2.5 w-2 rounded-sm bg-gradient-to-b from-amber-600 to-amber-800 shadow-soft" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TrailMarkers() {
  // Animal footprints near each trail midpoint + a signpost at the hub edge.
  const mids = [POS.wisdom, POS.waterfall, POS.cave, POS.leaf].map((p) => ({
    x: (POS.hub.x + p.x) / 2,
    y: (POS.hub.y + p.y) / 2 + 4,
  }))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {mids.map((m, i) => (
        <motion.span
          key={`paw-${i}`}
          className="absolute select-none text-xs opacity-70"
          style={{ left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%,-50%)' }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        >
          🐾
        </motion.span>
      ))}
      <span className="absolute left-[58%] top-[46%] select-none text-lg">🪧</span>
    </div>
  )
}

function ForestMidground() {
  const bushes = [
    { e: '🌲', left: '6%', top: '30%', s: 'text-5xl' },
    { e: '🌲', left: '92%', top: '32%', s: 'text-5xl' },
    { e: '🌳', left: '40%', top: '20%', s: 'text-4xl' },
    { e: '🌳', left: '62%', top: '64%', s: 'text-4xl' },
    { e: '🪴', left: '34%', top: '48%', s: 'text-2xl' },
    { e: '🌿', left: '66%', top: '40%', s: 'text-2xl' },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {bushes.map((b, i) => (
        <motion.span
          key={`mid-${i}`}
          className={`absolute select-none ${b.s} opacity-90`}
          style={{ left: b.left, top: b.top }}
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        >
          {b.e}
        </motion.span>
      ))}
    </div>
  )
}

function ForestCreatures() {
  const creatures = [
    { e: '🦋', left: '24%', top: '40%', kind: 'fly', dur: 9 },
    { e: '🦋', left: '60%', top: '30%', kind: 'fly', dur: 11 },
    { e: '🐿️', left: '12%', top: '56%', kind: 'hop', dur: 5 },
    { e: '🐇', left: '44%', top: '84%', kind: 'hop', dur: 4.5 },
    { e: '🦌', left: '80%', top: '56%', kind: 'walk', dur: 7 },
    { e: '🦜', left: '70%', top: '46%', kind: 'fly', dur: 10 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {creatures.map((c, i) => (
        <motion.span
          key={`creature-${i}`}
          className="absolute select-none text-xl"
          style={{ left: c.left, top: c.top }}
          animate={
            c.kind === 'fly'
              ? { x: [0, 36, -20, 0], y: [0, -34, 16, 0], rotate: [0, 14, -14, 0] }
              : c.kind === 'hop'
                ? { y: [0, -14, 0], x: [0, 12, 0] }
                : { x: [0, 24, 0] }
          }
          transition={{ duration: c.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
        >
          {c.e}
        </motion.span>
      ))}
    </div>
  )
}

function FallingLeaves() {
  const cols = [10, 26, 42, 58, 74, 90]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {cols.map((left, i) => (
        <motion.span
          key={`leaf-${i}`}
          className="absolute select-none text-base"
          style={{ left: `${left}%`, top: '-5%' }}
          animate={{ y: [0, 560], x: [0, Math.sin(i) * 40], rotate: [0, 540], opacity: [1, 0.2] }}
          transition={{ duration: 8 + (i % 3), repeat: Infinity, ease: 'linear', delay: i * 0.9 }}
        >
          {i % 2 === 0 ? '🍂' : '🍃'}
        </motion.span>
      ))}
    </div>
  )
}

function FloatingSpores() {
  const pts = [
    { left: '20%', top: '36%' },
    { left: '48%', top: '28%' },
    { left: '68%', top: '52%' },
    { left: '34%', top: '60%' },
    { left: '82%', top: '40%' },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {pts.map((p, i) => (
        <motion.span
          key={`spore-${i}`}
          className="absolute size-1.5 rounded-full bg-white"
          style={{ left: p.left, top: p.top, boxShadow: '0 0 6px 2px rgba(255,255,255,0.8)' }}
          animate={{ opacity: [0, 0.9, 0], y: [-10, 14], scale: [0.6, 1, 0.6] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
        />
      ))}
    </div>
  )
}

function DriftingFog() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1].map((i) => (
        <motion.div
          key={`fog-${i}`}
          className="absolute h-24 w-[60%] rounded-full bg-white/25 blur-2xl"
          style={{ top: `${44 + i * 14}%`, left: i === 0 ? '-20%' : '60%' }}
          animate={{ x: i === 0 ? [0, 240, 0] : [0, -240, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 26 + i * 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function ForegroundFlora() {
  const flora = [
    { e: '🌸', left: '8%', top: '88%' },
    { e: '🌼', left: '24%', top: '92%' },
    { e: '🌿', left: '40%', top: '90%' },
    { e: '🌻', left: '60%', top: '92%' },
    { e: '🍄', left: '78%', top: '90%' },
    { e: '🌷', left: '92%', top: '88%' },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30">
      {flora.map((f, i) => (
        <motion.span
          key={`flora-${i}`}
          className="absolute select-none text-3xl drop-shadow"
          style={{ left: f.left, top: f.top }}
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        >
          {f.e}
        </motion.span>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   100% COMPLETION CELEBRATION (derived from quest completion data)
   ════════════════════════════════════════════════════════════════════ */

function CompletionCelebration() {
  const animals = ['🦁', '🦌', '🐿️', '🐇', '🦜', '🦋']
  const fireworks = ['🎆', '✨', '🎇', '⭐', '🌟']
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40">
      {/* Map-wide golden revival glow */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(70% 60% at 50% 45%, rgba(255,221,120,0.35) 0%, transparent 70%)' }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Panoramic rainbow */}
      <motion.div
        className="absolute left-1/2 top-[6%] h-40 w-[120%] -translate-x-1/2 rounded-t-full border-[10px] border-transparent"
        style={{
          borderImage:
            'linear-gradient(90deg,#f87171,#fb923c,#fde047,#4ade80,#38bdf8,#a78bfa) 1',
          borderBottom: 'none',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.85, y: 0 }}
        transition={{ duration: 1 }}
      />

      {/* Light fireworks */}
      {fireworks.map((f, i) => (
        <motion.span
          key={`fw-${i}`}
          className="absolute select-none text-3xl"
          style={{ left: `${12 + i * 18}%`, top: `${16 + (i % 2) * 12}%` }}
          animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3], rotate: [0, 20, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        >
          {f}
        </motion.span>
      ))}

      {/* Animals gathered around the hub */}
      <div className="absolute left-1/2 top-[66%] flex -translate-x-1/2 gap-1">
        {animals.map((a, i) => (
          <motion.span
            key={`gather-${i}`}
            className="select-none text-2xl"
            animate={{ y: [0, -8, 0], rotate: [-6, 6, -6] }}
            transition={{ duration: 1.8 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
          >
            {a}
          </motion.span>
        ))}
      </div>

      {/* Champion banner */}
      <motion.div
        className="absolute left-1/2 top-[40%] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-amber-400 bg-gradient-to-r from-amber-100 to-butter-100 px-6 py-2 text-center font-display text-base font-extrabold text-amber-800 shadow-pop"
        initial={{ scale: 0.6, opacity: 0, y: 8 }}
        animate={{ scale: [0.95, 1.05, 0.95], opacity: 1, y: 0 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🏆 Người Bảo Vệ Rừng Kỳ Diệu
      </motion.div>
    </div>
  )
}

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Region, SubNode } from '@/types'
import { springBouncy, staggerItem } from '@/utils/motion'

/**
 * FamilyKingdomMap — cozy storybook 3D diorama for "Vương Quốc Gia Đình"
 *
 * A warm little family castle floating among soft clouds in golden sunset
 * light — Disney Dreamlight Valley × Animal Crossing × cozy storybook. A
 * decorative castle anchors the centre; three quest landmarks sit around it,
 * linked by a heart-stone light path:
 *
 *  - Bữa Cơm Của Mẹ          — family dining table: hot rice, steam, kid chair
 *  - Câu Chuyện Trước Khi Ngủ — reading corner: little bed, lamp, open book, moon
 *  - Siêu Đầu Bếp Nhí        — mini kitchen: stove, pot, cookies, chef hat
 *
 * VISUAL ONLY. Quest data/IDs/unlock/progression are untouched — each landmark
 * resolves its real `SubNode` from the store by canonical id (`vqgd-*`) and
 * forwards taps to `onNodeClick(node)` exactly as the generic map did.
 */

interface FamilyKingdomMapProps {
  region: Region
  onNodeClick: (node: SubNode) => void
}

/* Landmark anchors in percent — cosmetic only. The castle is decorative;
   the three quests orbit it. Used for the absolute zones and to derive the
   SVG heart-path endpoints (converted to the 1000×750 viewBox). */
const POS = {
  castle: { x: 50, y: 42 }, // decorative centre
  meal: { x: 25, y: 40 }, // family dining table
  story: { x: 75, y: 38 }, // bedtime reading corner
  chef: { x: 50, y: 76 }, // mini kitchen
} as const

const VB_W = 1000
const VB_H = 750
const vx = (pct: number) => (pct / 100) * VB_W
const vy = (pct: number) => (pct / 100) * VB_H

/** Gentle light path between two anchors, bowed downward like a garden lane. */
function lane(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ax = vx(a.x)
  const ay = vy(a.y)
  const bx = vx(b.x)
  const by = vy(b.y)
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2 + 24
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`
}

export function FamilyKingdomMap({ region, onNodeClick }: FamilyKingdomMapProps) {
  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-4 border-amber-300 shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(120% 90% at 50% -10%, #fff3d6 0%, transparent 55%),
          radial-gradient(80% 60% at 50% 55%, rgba(255,236,200,0.55) 0%, transparent 72%),
          linear-gradient(180deg, #ffe3c2 0%, #ffd9b0 38%, #ffc8d6 100%)
        `,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          SKY AMBIENCE — sunset glow, clouds, birds, drifting hearts & lights
          ════════════════════════════════════════════════════════════════════ */}
      <SunsetGlow />
      <DriftingClouds />
      <FlyingBirds />
      <HangingLanterns />
      <GlowingHearts />
      <SparkleStars />

      {/* ════════════════════════════════════════════════════════════════════
          CLOUD KINGDOM GROUND + heart-stone light path
          ════════════════════════════════════════════════════════════════════ */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="fk-cloud" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="60%" stopColor="#ffeccb" />
            <stop offset="100%" stopColor="#ffd9a8" />
          </radialGradient>
          <linearGradient id="fk-path" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe7a3" />
            <stop offset="100%" stopColor="#ffcf6b" />
          </linearGradient>
        </defs>

        {/* Soft shadow under the floating kingdom */}
        <ellipse cx="510" cy="650" rx="380" ry="86" fill="#c98a5a" opacity="0.16" />

        {/* Big fluffy cloud island the kingdom rests on */}
        <path
          d="M 250 470
             Q 180 470 170 410 Q 120 400 140 340 Q 110 300 170 280
             Q 200 220 280 250 Q 340 200 430 240 Q 500 200 570 240
             Q 660 205 710 260 Q 800 250 820 320 Q 880 340 850 410
             Q 880 470 800 480 Q 760 530 660 510 Q 560 545 460 515
             Q 360 545 300 505 Q 260 500 250 470 Z"
          fill="url(#fk-cloud)"
        />

        {/* Heart-stone light lanes from the castle to each quest */}
        {(
          [
            [POS.castle, POS.meal],
            [POS.castle, POS.story],
            [POS.castle, POS.chef],
          ] as const
        ).map(([a, b], i) => (
          <g key={`lane-${i}`}>
            <path
              d={lane(a, b)}
              fill="none"
              stroke="url(#fk-path)"
              strokeWidth="16"
              strokeLinecap="round"
              opacity="0.7"
            />
            <motion.path
              d={lane(a, b)}
              fill="none"
              stroke="#fff7e0"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="2 22"
              animate={{ strokeDashoffset: [0, -48] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            />
          </g>
        ))}
      </svg>

      {/* Heart-shaped stepping stones drawn as emoji along each lane midpoint */}
      <HeartStones />

      {/* ════════════════════════════════════════════════════════════════════
          CENTRE — decorative family castle
          ════════════════════════════════════════════════════════════════════ */}
      <CastleHub />

      {/* ════════════════════════════════════════════════════════════════════
          QUEST LANDMARKS — resolve real SubNodes by canonical store id
          ════════════════════════════════════════════════════════════════════ */}

      {/* Bữa Cơm Của Mẹ — family dining table */}
      <QuestLandmark
        region={region}
        nodeId="vqgd-bua-com"
        onNodeClick={onNodeClick}
        pos={POS.meal}
        theme={mealTheme}
        decor={<MealTableDecor />}
      />

      {/* Câu Chuyện Trước Khi Ngủ — reading corner */}
      <QuestLandmark
        region={region}
        nodeId="vqgd-cau-chuyen"
        onNodeClick={onNodeClick}
        pos={POS.story}
        theme={storyTheme}
        decor={<ReadingCornerDecor />}
      />

      {/* Siêu Đầu Bếp Nhí — mini kitchen */}
      <QuestLandmark
        region={region}
        nodeId="vqgd-cung-choi"
        onNodeClick={onNodeClick}
        pos={POS.chef}
        theme={chefTheme}
        decor={<MiniKitchenDecor />}
      />

      {/* ════════════════════════════════════════════════════════════════════
          FOREGROUND SCATTER — toys, planes, polaroids, falling leaves
          ════════════════════════════════════════════════════════════════════ */}
      <CozyScatter />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   CENTRE CASTLE (decorative, non-interactive)
   ════════════════════════════════════════════════════════════════════ */

function CastleHub() {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${POS.castle.x}%`, top: `${POS.castle.y}%` }}
    >
      {/* Warm halo */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,209,102,0.55) 0%, transparent 70%)' }}
        animate={{ opacity: [0.55, 0.9, 0.55], scale: [0.95, 1.06, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Chimney smoke rising */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`smoke-${i}`}
          className="absolute left-[58%] -top-2 size-3 rounded-full bg-white/70 blur-[2px]"
          animate={{ y: [-2, -34], x: [0, 6, 0], opacity: [0.7, 0], scale: [0.7, 1.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeOut', delay: i * 1.2 }}
        />
      ))}

      {/* Bird perched on the roof */}
      <motion.span
        className="absolute -top-7 left-1/2 -translate-x-1/2 select-none text-lg"
        animate={{ y: [0, -2, 0], rotate: [-4, 4, -4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🐦
      </motion.span>

      {/* Castle + heart */}
      <div className="relative grid place-items-center">
        <span className="select-none text-7xl drop-shadow-[0_6px_10px_rgba(180,120,60,0.35)]">🏰</span>
        <motion.span
          className="absolute -bottom-1 select-none text-2xl"
          animate={{ scale: [0.92, 1.12, 0.92] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          ❤️
        </motion.span>
        {/* Glowing windows */}
        {[
          { left: '38%', top: '46%' },
          { left: '56%', top: '46%' },
          { left: '47%', top: '60%' },
        ].map((w, i) => (
          <motion.span
            key={`win-${i}`}
            className="absolute size-1.5 rounded-[2px] bg-amber-200"
            style={{ left: w.left, top: w.top, boxShadow: '0 0 6px 2px rgba(253,224,71,0.9)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          />
        ))}
      </div>

      {/* Kingdom title banner */}
      <motion.div
        className="absolute left-1/2 top-[88px] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-amber-300 bg-amber-50/90 px-4 py-1 text-center font-display text-sm font-bold text-amber-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Vương Quốc Gia Đình
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SHARED QUEST LANDMARK
   ════════════════════════════════════════════════════════════════════ */

interface LandmarkTheme {
  border: string
  bg: string
  hoverBg: string
  /** Active (current) glow — warm gold per spec. */
  glow: string
  labelBorder: string
  labelBg: string
  labelText: string
  base: string
}

interface QuestLandmarkProps {
  region: Region
  nodeId: string
  onNodeClick: (node: SubNode) => void
  pos: { x: number; y: number }
  theme: LandmarkTheme
  decor: ReactNode
}

function QuestLandmark({
  region,
  nodeId,
  onNodeClick,
  pos,
  theme,
  decor,
}: QuestLandmarkProps) {
  const node = region.subNodes.find((n) => n.id === nodeId)
  if (!node) return null

  const done = node.isCompleted

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      {decor}

      {done && <CelebrationBurst />}

      {/* Platform base */}
      <div
        className={`absolute left-1/2 top-[58%] -z-10 h-5 w-24 -translate-x-1/2 rounded-[50%] blur-[2px] ${theme.base}`}
      />

      {/* Glow aura — completed: green; current/active: warm gold */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${
            done ? 'rgba(74,222,128,0.55)' : theme.glow
          } 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Quest node button — forwards the REAL SubNode, unchanged */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        className={`pointer-events-auto relative z-10 grid size-16 place-items-center rounded-3xl border-4 ${
          done ? 'border-green-400 bg-green-50' : `${theme.border} ${theme.bg}`
        } shadow-pop transition-colors ${theme.hoverBg}`}
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
        className={`pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap rounded-full border-2 px-3 py-1 text-center font-display text-xs font-bold shadow-soft backdrop-blur ${theme.labelBorder} ${theme.labelBg} ${theme.labelText}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        {node.label}
      </motion.div>
    </div>
  )
}

/** Small confetti + hearts burst around a completed quest. */
function CelebrationBurst() {
  const bits = ['🎉', '💚', '✨', '🎊', '⭐', '💛']
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-0">
      {bits.map((b, i) => {
        const angle = (i / bits.length) * Math.PI * 2
        const r = 44
        return (
          <motion.span
            key={`burst-${i}`}
            className="absolute select-none text-base"
            style={{ left: Math.cos(angle) * r, top: Math.sin(angle) * r }}
            animate={{ scale: [0.6, 1.1, 0.6], opacity: [0.4, 1, 0.4], rotate: [0, 18, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.16 }}
          >
            {b}
          </motion.span>
        )
      })}
    </div>
  )
}

/* ── Landmark themes (warm cozy palette) ─────────────────────────── */

const mealTheme: LandmarkTheme = {
  border: 'border-orange-300',
  bg: 'bg-orange-100',
  hoverBg: 'hover:bg-orange-200',
  glow: 'rgba(251,191,36,0.55)',
  labelBorder: 'border-orange-300',
  labelBg: 'bg-orange-50/90',
  labelText: 'text-orange-700',
  base: 'bg-orange-900/20',
}

const storyTheme: LandmarkTheme = {
  border: 'border-amber-300',
  bg: 'bg-amber-100',
  hoverBg: 'hover:bg-amber-200',
  glow: 'rgba(251,191,36,0.55)',
  labelBorder: 'border-amber-300',
  labelBg: 'bg-amber-50/90',
  labelText: 'text-amber-700',
  base: 'bg-amber-900/20',
}

const chefTheme: LandmarkTheme = {
  border: 'border-rose-300',
  bg: 'bg-rose-100',
  hoverBg: 'hover:bg-rose-200',
  glow: 'rgba(251,191,36,0.55)',
  labelBorder: 'border-rose-300',
  labelBg: 'bg-rose-50/90',
  labelText: 'text-rose-700',
  base: 'bg-rose-900/20',
}

/* ════════════════════════════════════════════════════════════════════
   PER-LANDMARK SCENERY
   ════════════════════════════════════════════════════════════════════ */

function MealTableDecor() {
  return (
    <>
      {/* Hot rice bowl with rising steam */}
      <motion.div
        className="absolute -left-14 -top-10 select-none text-3xl"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🍚
      </motion.div>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`steam-${i}`}
          className="absolute size-2 rounded-full bg-white/70 blur-[1.5px]"
          style={{ left: `-${52 - i * 6}px`, top: '-44px' }}
          animate={{ y: [0, -22], opacity: [0.7, 0], scale: [0.6, 1.3] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut', delay: i * 0.5 }}
        />
      ))}
      {/* Wooden table + kid chair */}
      <motion.div
        className="absolute -bottom-7 -left-10 select-none text-2xl"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        🍽️
      </motion.div>
      <motion.div
        className="absolute -bottom-6 -right-8 select-none text-2xl"
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🪑
      </motion.div>
      {/* Flickering warm light */}
      <motion.div
        className="absolute -right-10 -top-6 select-none text-xl"
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        🕯️
      </motion.div>
    </>
  )
}

function ReadingCornerDecor() {
  return (
    <>
      {/* Glowing moon */}
      <motion.div
        className="absolute -right-12 -top-12 select-none text-4xl"
        animate={{ opacity: [0.7, 1, 0.7], y: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.8))' }}
      >
        🌙
      </motion.div>
      {/* Little bed + night lamp */}
      <motion.div
        className="absolute -left-14 -top-4 select-none text-2xl"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🛏️
      </motion.div>
      <motion.div
        className="absolute -left-6 -top-12 select-none text-xl"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        🪔
      </motion.div>
      {/* Open book with softly turning pages */}
      <motion.div
        className="absolute -bottom-7 -left-8 select-none text-2xl"
        animate={{ rotateY: [0, 55, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        📖
      </motion.div>
      {/* Twinkling stars */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`star-${i}`}
          className="absolute select-none text-sm"
          style={{ left: `${-20 + i * 24}px`, top: `${-34 - (i % 2) * 8}px` }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.1, 0.7] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        >
          ⭐
        </motion.span>
      ))}
    </>
  )
}

function MiniKitchenDecor() {
  return (
    <>
      {/* Chef hat */}
      <motion.div
        className="absolute -left-12 -top-12 select-none text-3xl"
        animate={{ y: [0, -3, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        👩‍🍳
      </motion.div>
      {/* Stove + small pot with rising smoke */}
      <motion.div
        className="absolute -right-12 -top-8 select-none text-2xl"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🍲
      </motion.div>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`ksmoke-${i}`}
          className="absolute size-2 rounded-full bg-white/65 blur-[1.5px]"
          style={{ right: `${-40 + i * 4}px`, top: '-40px' }}
          animate={{ y: [0, -20], opacity: [0.65, 0], scale: [0.6, 1.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: i * 0.5 }}
        />
      ))}
      {/* Slowly spinning cookie */}
      <motion.div
        className="absolute -bottom-7 -left-8 select-none text-2xl"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      >
        🍪
      </motion.div>
      <motion.div
        className="absolute -bottom-6 -right-6 select-none text-xl"
        animate={{ scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        🧁
      </motion.div>
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   AMBIENCE
   ════════════════════════════════════════════════════════════════════ */

function HeartStones() {
  // Heart stepping-stones placed near each lane midpoint between the castle
  // and a quest, computed from the same anchors as the SVG lanes.
  const mids = [POS.meal, POS.story, POS.chef].map((p) => ({
    x: (POS.castle.x + p.x) / 2,
    y: (POS.castle.y + p.y) / 2 + 3,
  }))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {mids.map((m, i) => (
        <motion.span
          key={`heartstone-${i}`}
          className="absolute select-none text-sm"
          style={{ left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%, -50%)' }}
          animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        >
          💛
        </motion.span>
      ))}
    </div>
  )
}

function SunsetGlow() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[8%] size-24 -translate-x-1/2 rounded-full"
      style={{ background: 'radial-gradient(circle, #fff0c0 0%, #ffcf6b 55%, transparent 75%)' }}
      animate={{ opacity: [0.7, 1, 0.7], scale: [0.97, 1.05, 0.97] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function DriftingClouds() {
  const clouds = [
    { top: '14%', size: 'text-5xl', dur: 30, delay: 0 },
    { top: '24%', size: 'text-4xl', dur: 36, delay: 8 },
    { top: '9%', size: 'text-3xl', dur: 42, delay: 15 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {clouds.map((c, i) => (
        <motion.span
          key={`cloud-${i}`}
          className={`absolute select-none ${c.size} opacity-90`}
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

function FlyingBirds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`bird-${i}`}
          className="absolute select-none text-base"
          style={{ top: `${16 + i * 8}%`, left: '-10%' }}
          animate={{ x: ['0%', '120vw'], y: [0, -16, 0] }}
          transition={{ duration: 17 + i * 3, repeat: Infinity, ease: 'linear', delay: i * 5 }}
        >
          {i === 1 ? '🕊️' : '🐦'}
        </motion.span>
      ))}
    </div>
  )
}

function HangingLanterns() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[18, 38, 62, 82].map((left, i) => (
        <motion.span
          key={`lantern-${i}`}
          className="absolute select-none text-2xl"
          style={{ left: `${left}%`, top: '-2%' }}
          animate={{ y: [0, 6, 0], rotate: [-5, 5, -5], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        >
          🏮
        </motion.span>
      ))}
    </div>
  )
}

function GlowingHearts() {
  const cols = [12, 30, 50, 70, 88]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {cols.map((left, i) => (
        <motion.span
          key={`gheart-${i}`}
          className="absolute select-none text-sm"
          style={{ left: `${left}%`, bottom: '-6%' }}
          animate={{ y: [0, -520], x: [0, (i % 2 === 0 ? 1 : -1) * 24], opacity: [0, 1, 0], scale: [0.7, 1, 0.8] }}
          transition={{ duration: 11 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 1.8 }}
        >
          💗
        </motion.span>
      ))}
    </div>
  )
}

function SparkleStars() {
  const pts = [
    { left: '22%', top: '20%' },
    { left: '70%', top: '18%' },
    { left: '40%', top: '14%' },
    { left: '84%', top: '30%' },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pts.map((p, i) => (
        <motion.span
          key={`sparkle-${i}`}
          className="absolute select-none text-xs"
          style={{ left: p.left, top: p.top }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1.1, 0.6] }}
          transition={{ duration: 2.4 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
        >
          ✨
        </motion.span>
      ))}
    </div>
  )
}

function CozyScatter() {
  // Decorative only — placed away from the quest nodes so nothing is occluded.
  const items = [
    { e: '🧸', left: '10%', top: '64%', dur: 5 },
    { e: '✈️', left: '84%', top: '20%', dur: 9 },
    { e: '⭐', left: '88%', top: '62%', dur: 4 },
    { e: '🍃', left: '14%', top: '24%', dur: 7 },
    { e: '📸', left: '8%', top: '46%', dur: 6 },
    { e: '🎈', left: '90%', top: '46%', dur: 6.5 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {items.map((it, i) => (
        <motion.span
          key={`scatter-${i}`}
          className="absolute select-none text-2xl"
          style={{ left: it.left, top: it.top }}
          animate={
            it.e === '✈️'
              ? { x: [0, 30, 0], y: [0, -10, 0], rotate: [-6, 6, -6] }
              : it.e === '🍃'
                ? { y: [0, 24, 0], x: [0, 14, 0], rotate: [0, 40, 0] }
                : { y: [0, -8, 0], rotate: [-5, 5, -5] }
          }
          transition={{ duration: it.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
        >
          {it.e}
        </motion.span>
      ))}
    </div>
  )
}

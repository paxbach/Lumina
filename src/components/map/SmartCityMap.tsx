import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Region, SubNode } from '@/types'
import { springBouncy, staggerItem } from '@/utils/motion'

/**
 * SmartCityMap — miniature futuristic city for "Thành Phố Thông Minh"
 *
 * A bright, tabletop smart-city viewed from a soft isometric angle, built for
 * children aged 5–10. Three city landmarks sit on layered blocks connected by
 * real roads with lane markings and crosswalks:
 *
 *  - Tìm Đường Về Nhà   (center) — central plaza: fountain, street signs,
 *                                  crosswalks, robot guide, map kiosk
 *  - Đếm Toà Nhà        (top-l)  — Skyline District: colorful skyscrapers,
 *                                  rooftop gardens, observation tower, cranes
 *  - Vòng Quay Săn Màu  (low-r)  — Color Energy Park: giant Ferris wheel,
 *                                  rainbow light towers, energy generators
 *
 * VISUAL ONLY. Quest data/IDs/unlock/progression are untouched — each landmark
 * resolves its real `SubNode` from the store by its canonical id (`tptm-*`)
 * and forwards taps to `onNodeClick(node)` exactly as the generic map did.
 */

interface SmartCityMapProps {
  region: Region
  onNodeClick: (node: SubNode) => void
}

/* Landmark anchors in percent — cosmetic only. Used for the absolute zones
   and to derive the SVG road endpoints (converted to the 1000×750 viewBox). */
const POS = {
  hub: { x: 50, y: 53 }, // central plaza
  skyline: { x: 28, y: 31 }, // skyline district
  park: { x: 75, y: 66 }, // color energy park
} as const

const VB_W = 1000
const VB_H = 750
const vx = (pct: number) => (pct / 100) * VB_W
const vy = (pct: number) => (pct / 100) * VB_H

/** Slightly bent road between two anchors so it reads like a city street. */
function road(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ax = vx(a.x)
  const ay = vy(a.y)
  const bx = vx(b.x)
  const by = vy(b.y)
  const mx = (ax + bx) / 2 + 18
  const my = (ay + by) / 2
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`
}

export function SmartCityMap({ region, onNodeClick }: SmartCityMapProps) {
  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-4 border-sky-400 shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(120% 80% at 50% -10%, #fff6d8 0%, transparent 50%),
          radial-gradient(90% 70% at 50% 60%, rgba(255,255,255,0.4) 0%, transparent 72%),
          linear-gradient(180deg, #bfe6ff 0%, #d9f1ff 42%, #d6f0e2 100%)
        `,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          SKY AMBIENCE
          ════════════════════════════════════════════════════════════════════ */}
      <DaySun />
      <DriftingClouds />
      <AdBlimp />
      <FlyingDrones />
      <FlyingBirds />

      {/* ════════════════════════════════════════════════════════════════════
          CITY GROUND (layered isometric blocks + road network)
          ════════════════════════════════════════════════════════════════════ */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sc-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d7f0dd" />
            <stop offset="100%" stopColor="#bfe3c8" />
          </linearGradient>
          <linearGradient id="sc-plaza" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef3f8" />
            <stop offset="100%" stopColor="#d7e0ea" />
          </linearGradient>
          <linearGradient id="sc-block" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6eefb" />
            <stop offset="100%" stopColor="#cdd9ee" />
          </linearGradient>
        </defs>

        {/* Grassy base */}
        <rect width={VB_W} height={VB_H} fill="url(#sc-ground)" />

        {/* Soft shadow grounding the city */}
        <ellipse cx="510" cy="640" rx="400" ry="96" fill="#3a6b7a" opacity="0.12" />

        {/* Layered city blocks (isometric diamonds) for depth */}
        <polygon points="500,120 760,250 500,380 240,250" fill="url(#sc-block)" opacity="0.9" />
        <polygon points="500,300 820,460 500,620 180,460" fill="url(#sc-plaza)" />

        {/* Road network with lane markings */}
        {(
          [
            [POS.hub, POS.skyline],
            [POS.hub, POS.park],
            [POS.skyline, POS.park],
          ] as const
        ).map(([a, b], i) => (
          <g key={`road-${i}`}>
            <path
              d={road(a, b)}
              fill="none"
              stroke="#6b7280"
              strokeWidth="30"
              strokeLinecap="round"
            />
            <path
              d={road(a, b)}
              fill="none"
              stroke="#9aa3af"
              strokeWidth="24"
              strokeLinecap="round"
            />
            {/* Animated light-up navigation dashes */}
            <motion.path
              d={road(a, b)}
              fill="none"
              stroke="#fde047"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="2 26"
              animate={{ strokeDashoffset: [0, -56] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            />
          </g>
        ))}

        {/* Crosswalk near the central plaza */}
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={`crosswalk-${i}`}
            x={vx(POS.hub.x) - 30 + i * 16}
            y={vy(POS.hub.y) + 46}
            width="9"
            height="26"
            rx="2"
            fill="#ffffff"
            opacity="0.85"
          />
        ))}
      </svg>

      {/* ════════════════════════════════════════════════════════════════════
          STREET-LEVEL CITY LIFE (in front of ground, behind landmarks)
          ════════════════════════════════════════════════════════════════════ */}
      <TrafficCars />
      <DeliveryRobots />
      <CityCitizens />
      <SmartInfra />

      {/* ════════════════════════════════════════════════════════════════════
          LANDMARK ZONES — resolve real SubNodes by canonical store id
          ════════════════════════════════════════════════════════════════════ */}

      {/* CENTER · Tìm Đường Về Nhà — central plaza (most prominent) */}
      <CityLandmark
        region={region}
        nodeId="tptm-tim-duong"
        onNodeClick={onNodeClick}
        pos={POS.hub}
        size="lg"
        theme={hubTheme}
        decor={<PlazaDecor />}
      />

      {/* ZONE 1 · Đếm Toà Nhà — Skyline District */}
      <CityLandmark
        region={region}
        nodeId="tptm-dem-toa-nha"
        onNodeClick={onNodeClick}
        pos={POS.skyline}
        size="md"
        theme={skylineTheme}
        decor={<SkylineDecor />}
      />

      {/* ZONE 2 · Vòng Quay Săn Màu — Color Energy Park */}
      <CityLandmark
        region={region}
        nodeId="tptm-color-mix"
        onNodeClick={onNodeClick}
        pos={POS.park}
        size="md"
        theme={parkTheme}
        decor={<EnergyParkDecor />}
      />

      {/* ════════════════════════════════════════════════════════════════════
          FOREGROUND
          ════════════════════════════════════════════════════════════════════ */}
      <StreetTrees />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SHARED LANDMARK NODE
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

interface CityLandmarkProps {
  region: Region
  nodeId: string
  onNodeClick: (node: SubNode) => void
  pos: { x: number; y: number }
  size: 'lg' | 'md'
  theme: LandmarkTheme
  decor: ReactNode
}

function CityLandmark({
  region,
  nodeId,
  onNodeClick,
  pos,
  size,
  theme,
  decor,
}: CityLandmarkProps) {
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
      {decor}

      {done && <CelebrationBurst />}

      {/* Platform base */}
      <div
        className={`absolute left-1/2 top-[58%] -z-10 h-5 w-24 -translate-x-1/2 rounded-[50%] blur-[2px] ${theme.base}`}
      />

      {/* City-light glow aura */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size === 'lg' ? 150 : 120,
          height: size === 'lg' ? 150 : 120,
          background: `radial-gradient(circle, ${done ? 'rgba(250,204,21,0.55)' : theme.glow} 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Quest node button — forwards the REAL SubNode, unchanged */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        className={`pointer-events-auto relative z-10 grid ${btnSize} place-items-center rounded-3xl border-4 ${
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
            {/* Golden achievement flag */}
            <span className="pointer-events-none absolute -bottom-2 -left-2 select-none text-lg drop-shadow">
              🚩
            </span>
          </>
        )}
      </motion.button>

      {/* Title pill */}
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

/** Fireworks + celebration lights around a completed landmark. */
function CelebrationBurst() {
  const bits = ['🎆', '⭐', '✨', '🎇', '🎉', '🌟']
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

/* ── Landmark themes ─────────────────────────────────────────────── */

const hubTheme: LandmarkTheme = {
  border: 'border-sky-400',
  bg: 'bg-sky-100',
  hoverBg: 'hover:bg-sky-200',
  glow: 'rgba(56,189,248,0.5)',
  labelBorder: 'border-sky-300',
  labelBg: 'bg-sky-50/90',
  labelText: 'text-sky-700',
  base: 'bg-slate-900/20',
}

const skylineTheme: LandmarkTheme = {
  border: 'border-indigo-400',
  bg: 'bg-indigo-100',
  hoverBg: 'hover:bg-indigo-200',
  glow: 'rgba(129,140,248,0.5)',
  labelBorder: 'border-indigo-300',
  labelBg: 'bg-indigo-50/90',
  labelText: 'text-indigo-700',
  base: 'bg-indigo-900/20',
}

const parkTheme: LandmarkTheme = {
  border: 'border-fuchsia-400',
  bg: 'bg-fuchsia-100',
  hoverBg: 'hover:bg-fuchsia-200',
  glow: 'rgba(232,121,249,0.5)',
  labelBorder: 'border-fuchsia-300',
  labelBg: 'bg-fuchsia-50/90',
  labelText: 'text-fuchsia-700',
  base: 'bg-fuchsia-900/20',
}

/* ════════════════════════════════════════════════════════════════════
   PER-LANDMARK SCENERY
   ════════════════════════════════════════════════════════════════════ */

function PlazaDecor() {
  return (
    <>
      {/* Smart street signs with moving arrows */}
      <motion.div
        className="absolute -left-16 -top-12 select-none text-3xl"
        animate={{ x: [-2, 4, -2] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🪧
      </motion.div>
      <motion.div
        className="absolute -right-16 -top-10 select-none text-2xl"
        animate={{ x: [2, -4, 2], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        ➡️
      </motion.div>
      {/* Fountain */}
      <motion.div
        className="absolute -bottom-7 -left-12 select-none text-3xl"
        animate={{ scale: [0.95, 1.06, 0.95], y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        ⛲
      </motion.div>
      {/* Robot guide */}
      <motion.div
        className="absolute -right-14 -top-2 select-none text-3xl"
        animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🤖
      </motion.div>
      {/* City map kiosk */}
      <motion.div
        className="absolute -bottom-6 -right-12 select-none text-2xl"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        🗺️
      </motion.div>
    </>
  )
}

function SkylineDecor() {
  return (
    <>
      {/* Colorful skyscrapers with lighting windows */}
      <motion.div
        className="absolute -left-16 -top-10 select-none text-4xl"
        animate={{ y: [-2, 2, -2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🏢
      </motion.div>
      <motion.div
        className="absolute -left-6 -top-16 select-none text-4xl"
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        🏬
      </motion.div>
      <motion.div
        className="absolute -right-14 -top-8 select-none text-3xl"
        animate={{ y: [2, -3, 2] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        🏗️
      </motion.div>
      {/* Observation tower + rooftop garden */}
      <motion.div
        className="absolute -bottom-7 -left-10 select-none text-2xl"
        animate={{ rotate: [-2, 2, -2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🗼
      </motion.div>
      <motion.div
        className="absolute -bottom-6 -right-8 select-none text-xl"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        🌿
      </motion.div>
    </>
  )
}

function EnergyParkDecor() {
  return (
    <>
      {/* Giant rotating Ferris wheel */}
      <motion.div
        className="absolute -right-16 -top-14 select-none text-5xl"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
      >
        🎡
      </motion.div>
      {/* Rainbow light tower + energy particles */}
      <motion.div
        className="absolute -left-14 -top-8 select-none text-3xl"
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🌈
      </motion.div>
      {/* Energy generators */}
      <motion.div
        className="absolute -bottom-7 -left-10 select-none text-3xl"
        animate={{ scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        ⚡
      </motion.div>
      <motion.div
        className="absolute -bottom-5 -right-8 select-none text-xl"
        animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        ✨
      </motion.div>
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SKY & STREET AMBIENCE
   ════════════════════════════════════════════════════════════════════ */

function DaySun() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute right-[12%] top-[9%] size-20 rounded-full"
      style={{ background: 'radial-gradient(circle, #fff3b0 0%, #ffd84d 55%, transparent 75%)' }}
      animate={{ opacity: [0.8, 1, 0.8], scale: [0.97, 1.05, 0.97] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function DriftingClouds() {
  const clouds = [
    { top: '10%', size: 'text-5xl', dur: 28, delay: 0 },
    { top: '18%', size: 'text-4xl', dur: 34, delay: 7 },
    { top: '6%', size: 'text-3xl', dur: 40, delay: 14 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {clouds.map((c, i) => (
        <motion.span
          key={`cloud-${i}`}
          className={`absolute select-none ${c.size} opacity-85`}
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

function AdBlimp() {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute top-[14%] select-none text-4xl"
      style={{ left: '-14%' }}
      animate={{ x: ['0%', '125vw'], y: [0, -8, 0] }}
      transition={{ duration: 44, repeat: Infinity, ease: 'linear' }}
    >
      🛸
    </motion.span>
  )
}

function FlyingDrones() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`drone-${i}`}
          className="absolute select-none text-lg"
          style={{ top: `${22 + i * 8}%`, left: `${20 + i * 22}%` }}
          animate={{ x: [0, 40, -20, 0], y: [0, -20, 10, 0] }}
          transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 1.3 }}
        >
          🚁
        </motion.span>
      ))}
    </div>
  )
}

function FlyingBirds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1].map((i) => (
        <motion.span
          key={`bird-${i}`}
          className="absolute select-none text-base"
          style={{ top: `${16 + i * 10}%`, left: '-10%' }}
          animate={{ x: ['0%', '120vw'], y: [0, -14, 0] }}
          transition={{ duration: 18 + i * 4, repeat: Infinity, ease: 'linear', delay: i * 6 }}
        >
          🐦
        </motion.span>
      ))}
    </div>
  )
}

function TrafficCars() {
  const cars = [
    { emoji: '🚗', top: '46%', dir: 1, dur: 9, delay: 0 },
    { emoji: '🚌', top: '58%', dir: -1, dur: 12, delay: 2 },
    { emoji: '🚕', top: '68%', dir: 1, dur: 8, delay: 4 },
    { emoji: '🚲', top: '40%', dir: -1, dur: 14, delay: 1 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {cars.map((c, i) => (
        <motion.span
          key={`car-${i}`}
          className="absolute select-none text-2xl"
          style={{ top: c.top, left: c.dir === 1 ? '-8%' : 'auto', right: c.dir === -1 ? '-8%' : 'auto' }}
          animate={{ x: c.dir === 1 ? ['0%', '118vw'] : ['0%', '-118vw'] }}
          transition={{ duration: c.dur, repeat: Infinity, ease: 'linear', delay: c.delay }}
        >
          <span style={{ display: 'inline-block', transform: c.dir === -1 ? 'scaleX(-1)' : undefined }}>
            {c.emoji}
          </span>
        </motion.span>
      ))}
    </div>
  )
}

function DeliveryRobots() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1].map((i) => (
        <motion.span
          key={`drobot-${i}`}
          className="absolute select-none text-lg"
          style={{ top: `${62 + i * 6}%`, left: `${30 + i * 30}%` }}
          animate={{ x: [0, 60, 0], y: [0, -3, 0] }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
        >
          📦
        </motion.span>
      ))}
    </div>
  )
}

function CityCitizens() {
  const people = ['🚶', '🧒', '🚶‍♀️']
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {people.map((p, i) => (
        <motion.span
          key={`person-${i}`}
          className="absolute select-none text-base"
          style={{ top: `${72 + (i % 2) * 5}%`, left: `${24 + i * 24}%` }}
          animate={{ x: [0, 26, 0] }}
          transition={{ duration: 7 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
        >
          {p}
        </motion.span>
      ))}
    </div>
  )
}

function SmartInfra() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Traffic light blinking */}
      <motion.span
        className="absolute select-none text-2xl"
        style={{ left: '40%', top: '60%' }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        🚦
      </motion.span>
      {/* Wind turbine */}
      <motion.span
        className="absolute select-none text-2xl"
        style={{ left: '12%', top: '52%' }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
      >
        🌬️
      </motion.span>
      {/* Solar / charging hints */}
      <motion.span
        className="absolute select-none text-xl"
        style={{ left: '86%', top: '50%' }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🔋
      </motion.span>
      {/* Digital billboard */}
      <motion.span
        className="absolute select-none text-xl"
        style={{ left: '60%', top: '38%' }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        📺
      </motion.span>
    </div>
  )
}

function StreetTrees() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[0, 1].map((i) => (
        <motion.span
          key={`tree-${i}`}
          className="absolute select-none text-4xl"
          style={{ left: i === 0 ? '7%' : '90%', top: i === 0 ? '42%' : '38%' }}
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
        >
          🌳
        </motion.span>
      ))}
    </div>
  )
}

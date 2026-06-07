import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Region, SubNode } from '@/types'
import { springBouncy, staggerItem } from '@/utils/motion'

/**
 * ScienceMountainMap — V2 "WOW" floating science mountain for "Núi Khoa Học"
 *
 * A science mountain adrift in space where gravity is upside-down and every
 * invention floats — Super Mario Galaxy × Monument Valley × Pixar Soul, viewed
 * at a soft isometric angle. A giant observatory tower ("Tháp Khoa Học Lumi")
 * anchors the centre; three quest landmarks orbit it, joined by cosmic energy
 * paths (orbit rings, light bridges, teleport pads) instead of straight lines.
 *
 *  - Tháp Khoa Học Lumi     (centre) — observatory + telescope + orbit rings (decorative hub)
 *  - Hình Khối Không Gian   (low-l)  — Floating Geometry Lab: cube, sphere, pyramid
 *  - Hành Trình Sao Băng    (top-r)  — Meteor Observatory: telescope + shooting stars
 *  - Pha Ánh Sáng Vũ Trụ    (low-r)  — Crystal Light Canyon: giant prisms + refracted light
 *
 * When all quests are complete the mountain is "revived": a science aurora,
 * lit-up planets, a giant atom around the tower, meteors and a champion banner.
 *
 * VISUAL ONLY. Quest data/IDs/unlock/progression/click-handlers/routes are
 * untouched — each landmark resolves its real `SubNode` from the store by its
 * canonical id (`nkh-*`) and forwards taps to `onNodeClick(node)`.
 */

interface ScienceMountainMapProps {
  region: Region
  onNodeClick: (node: SubNode) => void
}

/* Landmark anchors in percent — cosmetic only. The tower is decorative; the
   three quests orbit it. Used for absolute zones and SVG path endpoints
   (converted to the 1000×750 viewBox). */
const POS = {
  tower: { x: 50, y: 50 }, // decorative observatory hub
  geometry: { x: 20, y: 60 }, // floating geometry lab
  meteor: { x: 74, y: 24 }, // meteor observatory (top, most eye-catching)
  canyon: { x: 76, y: 73 }, // crystal light canyon
} as const

const VB_W = 1000
const VB_H = 750
const vx = (pct: number) => (pct / 100) * VB_W
const vy = (pct: number) => (pct / 100) * VB_H

function lightBridge(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ax = vx(a.x)
  const ay = vy(a.y)
  const bx = vx(b.x)
  const by = vy(b.y)
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2 - 26
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`
}

export function ScienceMountainMap({ region, onNodeClick }: ScienceMountainMapProps) {
  const allDone =
    region.subNodes.length > 0 && region.subNodes.every((n) => n.isCompleted)
  // First not-yet-done node reads as "current" (gold). Cosmetic only — does not
  // gate access or change click behaviour.
  const currentId = region.subNodes.find((n) => !n.isCompleted)?.id ?? null

  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-4 border-indigo-400 shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(70% 55% at 22% 18%, rgba(129,140,248,0.45) 0%, transparent 60%),
          radial-gradient(60% 50% at 82% 78%, rgba(56,189,248,0.35) 0%, transparent 60%),
          radial-gradient(90% 70% at 50% 45%, rgba(167,139,250,0.25) 0%, transparent 70%),
          linear-gradient(180deg, #2a1d5e 0%, #3b2b7a 45%, #243b73 100%)
        `,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          BACKGROUND DEPTH — starfield, nebulae, far planets
          ════════════════════════════════════════════════════════════════════ */}
      <Starfield />
      <Nebulae />
      <FarPlanets />
      <ShootingStars />

      {/* ════════════════════════════════════════════════════════════════════
          MOUNTAIN + COSMIC ENERGY PATHS
          ════════════════════════════════════════════════════════════════════ */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sm-mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b7bd8" />
            <stop offset="55%" stopColor="#6d5cc0" />
            <stop offset="100%" stopColor="#4a3a96" />
          </linearGradient>
          <linearGradient id="sm-mtn-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="sm-path" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
        </defs>

        {/* Floating mountain shadow / energy base */}
        <ellipse cx="500" cy="640" rx="360" ry="80" fill="#1b1147" opacity="0.5" />

        {/* Inverted-gravity floating peak (apex pointing down for surreal feel) */}
        <path d="M 500 640 L 300 380 Q 360 330 500 330 Q 640 330 700 380 Z" fill="url(#sm-mtn)" />
        <path d="M 500 330 Q 420 300 360 360 Q 440 340 500 360 Q 560 340 640 360 Q 580 300 500 330 Z" fill="url(#sm-mtn-top)" opacity="0.9" />

        {/* Smaller floating rock islands */}
        <ellipse cx="230" cy="470" rx="70" ry="28" fill="url(#sm-mtn)" opacity="0.85" />
        <ellipse cx="780" cy="300" rx="60" ry="24" fill="url(#sm-mtn)" opacity="0.85" />
        <ellipse cx="800" cy="560" rx="66" ry="26" fill="url(#sm-mtn)" opacity="0.85" />

        {/* Cosmic energy paths between the tower and each landmark */}
        {(
          [
            [POS.tower, POS.geometry],
            [POS.tower, POS.meteor],
            [POS.tower, POS.canyon],
          ] as const
        ).map(([a, b], i) => (
          <g key={`bridge-${i}`}>
            <path d={lightBridge(a, b)} fill="none" stroke="url(#sm-path)" strokeWidth="14" strokeLinecap="round" opacity="0.5" />
            <motion.path
              d={lightBridge(a, b)}
              fill="none"
              stroke="#e0f2fe"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="2 22"
              animate={{ strokeDashoffset: [0, -48] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </g>
        ))}
      </svg>

      {/* Teleport pads at each path midpoint */}
      <TeleportPads />

      {/* ════════════════════════════════════════════════════════════════════
          MIDGROUND — drifting orbit rings & crystals
          ════════════════════════════════════════════════════════════════════ */}
      <OrbitRingsBg />

      {/* ════════════════════════════════════════════════════════════════════
          LIVING SCIENCE — atoms, planets, particles, formulas
          ════════════════════════════════════════════════════════════════════ */}
      <SpinningAtoms />
      <FloatingFormulas />
      <EnergyParticles />

      {/* ════════════════════════════════════════════════════════════════════
          CENTRE — THÁP KHOA HỌC LUMI (decorative observatory hub)
          ════════════════════════════════════════════════════════════════════ */}
      <LumiTower />

      {/* ════════════════════════════════════════════════════════════════════
          QUEST LANDMARKS — resolve real SubNodes by canonical store id
          ════════════════════════════════════════════════════════════════════ */}
      <ScienceLandmark
        region={region}
        nodeId="nkh-hinh-khoi-khong-gian"
        onNodeClick={onNodeClick}
        currentId={currentId}
        pos={POS.geometry}
        theme={geometryTheme}
        decor={<GeometryLabDecor />}
      />
      <ScienceLandmark
        region={region}
        nodeId="nkh-vu-tru"
        onNodeClick={onNodeClick}
        currentId={currentId}
        pos={POS.meteor}
        theme={meteorTheme}
        decor={<MeteorObservatoryDecor />}
      />
      <ScienceLandmark
        region={region}
        nodeId="nkh-color-mix"
        onNodeClick={onNodeClick}
        currentId={currentId}
        pos={POS.canyon}
        theme={canyonTheme}
        decor={<LightCanyonDecor />}
      />

      {/* ════════════════════════════════════════════════════════════════════
          FOREGROUND — near glowing particles for parallax depth
          ════════════════════════════════════════════════════════════════════ */}
      <ForegroundParticles />

      {/* 100% completion celebration (derived from quest data) */}
      {allDone && <CompletionCelebration />}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   CENTRE — THÁP KHOA HỌC LUMI (decorative, non-interactive)
   ════════════════════════════════════════════════════════════════════ */

function LumiTower() {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${POS.tower.x}%`, top: `${POS.tower.y}%` }}
    >
      {/* Energy halo */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-52 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.5) 0%, transparent 70%)' }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.94, 1.07, 0.94] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rotating orbit rings around the tower */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{
            width: 120 + i * 36,
            height: 56 + i * 16,
            borderColor: ['rgba(125,211,252,0.7)', 'rgba(196,181,253,0.7)', 'rgba(110,231,183,0.6)'][i],
            transform: `rotate(${i * 30}deg)`,
          }}
          animate={{ rotate: [i * 30, i * 30 + 360] }}
          transition={{ duration: 14 + i * 4, repeat: Infinity, ease: 'linear' }}
        >
          <span
            className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-cyan-200"
            style={{ boxShadow: '0 0 8px 3px rgba(125,211,252,0.9)' }}
          />
        </motion.div>
      ))}

      {/* Light beaming from the tower top */}
      <motion.div
        className="absolute left-1/2 -top-16 h-16 w-6 -translate-x-1/2 rounded-full"
        style={{ background: 'linear-gradient(to top, rgba(253,224,71,0.8), transparent)' }}
        animate={{ opacity: [0.4, 0.9, 0.4], scaleY: [0.85, 1.15, 0.85] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating math formulas */}
      {['E=mc²', 'πr²', '∑', '√'].map((f, i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <motion.span
            key={`formula-${i}`}
            className="absolute left-1/2 top-1/2 select-none font-display text-xs font-bold text-cyan-100/90"
            animate={{
              x: [Math.cos(a) * 64, Math.cos(a + 2) * 64],
              y: [Math.sin(a) * 42, Math.sin(a + 2) * 42],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          >
            {f}
          </motion.span>
        )
      })}

      {/* The tower itself */}
      <div className="relative grid place-items-center">
        <span className="select-none text-7xl drop-shadow-[0_0_14px_rgba(125,211,252,0.8)]">🔭</span>
        <motion.span
          className="absolute -top-9 select-none text-3xl"
          style={{ filter: 'drop-shadow(0 0 10px rgba(253,224,71,0.9))' }}
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          🔬
        </motion.span>
      </div>

      {/* Tower label */}
      <motion.div
        className="absolute left-1/2 top-[92px] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-cyan-300/70 bg-indigo-950/60 px-4 py-1 text-center font-display text-xs font-bold text-cyan-100 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Tháp Khoa Học Lumi
        <div className="mt-0.5 text-[10px] text-cyan-200/80">⭐ HUB</div>
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
  glow: string
  labelBorder: string
  labelBg: string
  labelText: string
}

interface ScienceLandmarkProps {
  region: Region
  nodeId: string
  onNodeClick: (node: SubNode) => void
  currentId: string | null
  pos: { x: number; y: number }
  theme: LandmarkTheme
  decor: ReactNode
}

function ScienceLandmark({
  region,
  nodeId,
  onNodeClick,
  currentId,
  pos,
  theme,
  decor,
}: ScienceLandmarkProps) {
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

      {/* Glow aura: completed → green, current → gold, else theme tint */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${
            done
              ? 'rgba(74,222,128,0.55)'
              : isCurrent
                ? 'rgba(253,224,71,0.6)'
                : theme.glow
          } 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Quest button — forwards the REAL SubNode, unchanged */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        className={`pointer-events-auto relative z-10 grid size-16 place-items-center rounded-2xl border-4 shadow-pop transition-colors ${
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
        {/* Science achievement badge on completion */}
        {done && (
          <span className="pointer-events-none absolute -bottom-2 -left-2 select-none text-lg drop-shadow">⚛️</span>
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

/* ── Landmark themes (cosmic palette) ────────────────────────────── */

const geometryTheme: LandmarkTheme = {
  border: 'border-cyan-400',
  bg: 'bg-cyan-100',
  hoverBg: 'hover:bg-cyan-200',
  glow: 'rgba(34,211,238,0.5)',
  labelBorder: 'border-cyan-300/70',
  labelBg: 'bg-indigo-950/60',
  labelText: 'text-cyan-100',
}

const meteorTheme: LandmarkTheme = {
  border: 'border-violet-400',
  bg: 'bg-violet-100',
  hoverBg: 'hover:bg-violet-200',
  glow: 'rgba(167,139,250,0.55)',
  labelBorder: 'border-violet-300/70',
  labelBg: 'bg-indigo-950/60',
  labelText: 'text-violet-100',
}

const canyonTheme: LandmarkTheme = {
  border: 'border-fuchsia-400',
  bg: 'bg-fuchsia-100',
  hoverBg: 'hover:bg-fuchsia-200',
  glow: 'rgba(232,121,249,0.55)',
  labelBorder: 'border-fuchsia-300/70',
  labelBg: 'bg-indigo-950/60',
  labelText: 'text-fuchsia-100',
}

/* ════════════════════════════════════════════════════════════════════
   PER-LANDMARK SCENERY
   ════════════════════════════════════════════════════════════════════ */

function GeometryLabDecor() {
  // Floating, slowly-rotating, color-shifting solids
  const solids = ['🧊', '🔵', '🔺', '🔷', '💠']
  return (
    <>
      {solids.map((s, i) => {
        const a = (i / solids.length) * Math.PI * 2
        return (
          <motion.span
            key={`solid-${i}`}
            className="absolute left-1/2 top-1/2 select-none text-2xl"
            style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.8))' }}
            animate={{
              x: [Math.cos(a) * 44, Math.cos(a + 2) * 44],
              y: [Math.sin(a) * 30 - 28, Math.sin(a + 2) * 30 - 28],
              rotate: [0, 360],
            }}
            transition={{ duration: 12 + i, repeat: Infinity, ease: 'linear', delay: i * 0.4 }}
          >
            {s}
          </motion.span>
        )
      })}
      <motion.span
        className="absolute -left-10 top-2 select-none text-base text-cyan-100/90 font-display font-bold"
        animate={{ opacity: [0.4, 1, 0.4], y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        📐
      </motion.span>
    </>
  )
}

function MeteorObservatoryDecor() {
  return (
    <>
      {/* Telescope */}
      <motion.span
        className="absolute -left-12 -top-10 select-none text-4xl"
        animate={{ rotate: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🔭
      </motion.span>
      {/* Planet cluster */}
      <motion.span
        className="absolute -right-12 -top-8 select-none text-3xl"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        🪐
      </motion.span>
      {/* A streak of shooting stars across the sky above this zone */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`zmeteor-${i}`}
          className="absolute -top-14 select-none text-xl"
          style={{ left: `${-40 + i * 30}px` }}
          animate={{ x: [0, 70], y: [0, 40], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeIn', delay: i * 0.6 }}
        >
          💫
        </motion.span>
      ))}
      {/* Sparkling meteor tail */}
      <motion.span
        className="absolute -bottom-4 -right-6 select-none text-base"
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        ✨
      </motion.span>
    </>
  )
}

function LightCanyonDecor() {
  return (
    <>
      {/* Giant prism crystal that refracts light */}
      <motion.span
        className="absolute left-1/2 -top-12 -translate-x-1/2 select-none text-5xl"
        style={{ filter: 'drop-shadow(0 0 12px rgba(232,121,249,0.8))' }}
        animate={{ rotate: [-6, 6, -6], scale: [0.97, 1.04, 0.97] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🔻
      </motion.span>
      {/* Refracted rainbow */}
      <motion.span
        className="absolute -right-12 -top-6 select-none text-4xl"
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        🌈
      </motion.span>
      {/* Light beam passing through, color-shifting */}
      <motion.div
        className="absolute -left-12 -top-2 h-1.5 w-16 rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, #fde047, #f472b6, transparent)' }}
        animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
      {/* Sparkle reflections */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`refl-${i}`}
          className="absolute select-none text-xs"
          style={{ left: `${-18 + i * 18}px`, top: `${10 + (i % 2) * 8}px` }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.6, 1.1, 0.6] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        >
          💎
        </motion.span>
      ))}
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   DEPTH, MARKERS & AMBIENCE
   ════════════════════════════════════════════════════════════════════ */

function Starfield() {
  const stars = [
    { l: 10, t: 12 }, { l: 22, t: 30 }, { l: 35, t: 8 }, { l: 48, t: 22 },
    { l: 60, t: 12 }, { l: 72, t: 34 }, { l: 86, t: 16 }, { l: 92, t: 40 },
    { l: 14, t: 50 }, { l: 30, t: 70 }, { l: 54, t: 84 }, { l: 68, t: 60 },
    { l: 82, t: 80 }, { l: 6, t: 76 }, { l: 44, t: 54 }, { l: 96, t: 64 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {stars.map((s, i) => (
        <motion.span
          key={`star-${i}`}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.l}%`, top: `${s.t}%`, width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2, boxShadow: '0 0 4px 1px rgba(255,255,255,0.8)' }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2 + (i % 4), repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

function Nebulae() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[
        { left: '8%', top: '10%', c: 'rgba(167,139,250,0.4)', s: 200 },
        { left: '70%', top: '60%', c: 'rgba(56,189,248,0.35)', s: 240 },
        { left: '50%', top: '24%', c: 'rgba(232,121,249,0.28)', s: 180 },
      ].map((n, i) => (
        <motion.div
          key={`neb-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{ left: n.left, top: n.top, width: n.s, height: n.s, background: n.c }}
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.08, 0.95] }}
          transition={{ duration: 10 + i * 3, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
        />
      ))}
    </div>
  )
}

function FarPlanets() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[
        { e: '🪐', left: '12%', top: '70%', s: 'text-3xl', dur: 28 },
        { e: '🌍', left: '88%', top: '14%', s: 'text-2xl', dur: 34 },
        { e: '🌑', left: '60%', top: '8%', s: 'text-xl', dur: 40 },
      ].map((p, i) => (
        <motion.span
          key={`planet-${i}`}
          className={`absolute select-none ${p.s} opacity-80`}
          style={{ left: p.left, top: p.top }}
          animate={{ y: [0, -10, 0], rotate: [0, 360] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: 'linear', delay: i }}
        >
          {p.e}
        </motion.span>
      ))}
    </div>
  )
}

function ShootingStars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`shoot-${i}`}
          className="absolute select-none text-xl"
          style={{ left: `${10 + i * 28}%`, top: `${-4 + i * 4}%` }}
          animate={{ x: [0, 220], y: [0, 140], opacity: [0, 1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeIn', delay: i * 2.5 + 1 }}
        >
          ☄️
        </motion.span>
      ))}
    </div>
  )
}

function TeleportPads() {
  const mids = [POS.geometry, POS.meteor, POS.canyon].map((p) => ({
    x: (POS.tower.x + p.x) / 2,
    y: (POS.tower.y + p.y) / 2,
  }))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {mids.map((m, i) => (
        <motion.div
          key={`pad-${i}`}
          className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300/70"
          style={{ left: `${m.x}%`, top: `${m.y}%`, boxShadow: '0 0 10px rgba(125,211,252,0.7)' }}
          animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
    </div>
  )
}

function OrbitRingsBg() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[
        { left: '18%', top: '44%', w: 90, h: 40 },
        { left: '82%', top: '40%', w: 80, h: 34 },
      ].map((r, i) => (
        <motion.div
          key={`obg-${i}`}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/40"
          style={{ left: r.left, top: r.top, width: r.w, height: r.h }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20 + i * 6, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

function SpinningAtoms() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[
        { left: '30%', top: '24%' },
        { left: '64%', top: '46%' },
        { left: '40%', top: '68%' },
      ].map((p, i) => (
        <motion.span
          key={`atom-${i}`}
          className="absolute select-none text-xl opacity-80"
          style={{ left: p.left, top: p.top }}
          animate={{ rotate: [0, 360], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
        >
          ⚛️
        </motion.span>
      ))}
    </div>
  )
}

function FloatingFormulas() {
  const formulas = [
    { f: 'a²+b²=c²', left: '14%', top: '36%' },
    { f: 'F=ma', left: '78%', top: '54%' },
    { f: 'v=λf', left: '56%', top: '76%' },
    { f: '∞', left: '88%', top: '30%' },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {formulas.map((p, i) => (
        <motion.span
          key={`ff-${i}`}
          className="absolute select-none font-display text-xs font-bold text-cyan-100/70"
          style={{ left: p.left, top: p.top }}
          animate={{ y: [0, -14, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
        >
          {p.f}
        </motion.span>
      ))}
    </div>
  )
}

function EnergyParticles() {
  const pts = [
    { left: '24%', top: '50%' }, { left: '50%', top: '34%' }, { left: '70%', top: '62%' },
    { left: '38%', top: '44%' }, { left: '60%', top: '20%' }, { left: '84%', top: '48%' },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {pts.map((p, i) => (
        <motion.span
          key={`energy-${i}`}
          className="absolute size-1.5 rounded-full bg-cyan-200"
          style={{ left: p.left, top: p.top, boxShadow: '0 0 6px 2px rgba(125,211,252,0.9)' }}
          animate={{ opacity: [0, 1, 0], y: [-12, 12], scale: [0.6, 1, 0.6] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
        />
      ))}
    </div>
  )
}

function ForegroundParticles() {
  const pts = [
    { left: '6%', top: '86%', s: 4 },
    { left: '40%', top: '92%', s: 5 },
    { left: '72%', top: '88%', s: 4 },
    { left: '92%', top: '82%', s: 5 },
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30">
      {pts.map((p, i) => (
        <motion.span
          key={`fg-${i}`}
          className="absolute rounded-full bg-white"
          style={{ left: p.left, top: p.top, width: p.s, height: p.s, boxShadow: '0 0 8px 3px rgba(196,181,253,0.9)' }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -10, 0] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   100% COMPLETION CELEBRATION (derived from quest completion data)
   ════════════════════════════════════════════════════════════════════ */

function CompletionCelebration() {
  const meteors = ['☄️', '💫', '🌟', '✨', '⭐']
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40">
      {/* Map-wide revival glow */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(70% 60% at 50% 45%, rgba(125,211,252,0.3) 0%, transparent 70%)' }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Science aurora across the top */}
      <motion.div
        className="absolute inset-x-0 top-0 h-28"
        style={{ background: 'linear-gradient(180deg, rgba(74,222,128,0.4), rgba(56,189,248,0.25), transparent)' }}
        animate={{ opacity: [0.4, 0.8, 0.4], filter: ['hue-rotate(0deg)', 'hue-rotate(40deg)', 'hue-rotate(0deg)'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Giant atom orbiting the tower */}
      <motion.span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-8xl opacity-40"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      >
        ⚛️
      </motion.span>

      {/* Meteors firing across the screen */}
      {meteors.map((m, i) => (
        <motion.span
          key={`cm-${i}`}
          className="absolute select-none text-2xl"
          style={{ left: `${8 + i * 18}%`, top: `${10 + (i % 2) * 14}%` }}
          animate={{ x: [0, 120], y: [0, 70], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeIn', delay: i * 0.4 }}
        >
          {m}
        </motion.span>
      ))}

      {/* Champion banner */}
      <motion.div
        className="absolute left-1/2 top-[40%] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-cyan-300 bg-gradient-to-r from-indigo-200 to-cyan-200 px-6 py-2 text-center font-display text-base font-extrabold text-indigo-800 shadow-pop"
        initial={{ scale: 0.6, opacity: 0, y: 8 }}
        animate={{ scale: [0.95, 1.05, 0.95], opacity: 1, y: 0 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🏆 Nhà Khoa Học Nhí Thiên Tài
      </motion.div>
    </div>
  )
}

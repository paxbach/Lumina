import { useId, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

/**
 * WorldScene — cinematic panoramic SVG of Lumina's floating-island world.
 *
 * Composition (back → front):
 *   1. Sky gradient                  (peach → pink → lavender → powder blue)
 *   2. Sun + 8 god-rays + lens flare (upper-right)
 *   3. Distant fog bands             (horizontal blurred whites)
 *   4. Atmospheric sparkles          (twinkling ✦ in upper sky)
 *   5. Constellation paths           (golden ribbons + dashed misty)
 *   6. 5 themed islands              (3D disc shape + biome decorations)
 *   7. Locked "coming soon" island   (muted, half-fogged)
 *   8. Cloud bank                    (large drifting white ellipses)
 *
 * Styling target: Studio Ghibli × Pixar — soft, painterly, magical,
 * child-friendly. ViewBox 1600×900 (16:9 tablet landscape) for crisp
 * vector scaling at any container size.
 */

export type IslandBiome =
  | 'forest'
  | 'city'
  | 'lantern'
  | 'crystal'
  | 'village'

export interface IslandSpec {
  id: string
  biome: IslandBiome
  cx: number      // viewBox units
  cy: number
  rx: number
  ry: number
  /** Top surface color — lit by the sun. */
  topColor: string
  /** Underside / soil color — in shadow. */
  bottomColor: string
  /** Bright rim along the top edge. */
  rimColor: string
}

export interface ConnectionSpec {
  from: string
  to: string
  /** Signed curvature in viewBox units. */
  curvature: number
}

interface WorldSceneProps {
  islands: IslandSpec[]
  connections: ConnectionSpec[]
  className?: string
}

const VIEW_W = 1600
const VIEW_H = 900

// Sun position — upper-right
const SUN = { cx: 1380, cy: 170, r: 70 }

export function WorldScene({ islands, connections, className }: WorldSceneProps) {
  const id = useId()
  const lookup = useMemo(() => {
    const m: Record<string, IslandSpec> = {}
    for (const i of islands) m[i.id] = i
    return m
  }, [islands])

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn('block size-full', className)}
    >
      <defs>
        {/* ─── Sky gradient ────────────────────────────────────── */}
        <linearGradient id={`${id}-sky`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#FFE7C2" />
          <stop offset="32%"  stopColor="#F8C9E4" />
          <stop offset="62%"  stopColor="#C8B6F0" />
          <stop offset="100%" stopColor="#DBEAF5" />
        </linearGradient>

        {/* ─── Sun glow ────────────────────────────────────────── */}
        <radialGradient id={`${id}-sun-glow`}>
          <stop offset="0%"  stopColor="#FFF6D2" stopOpacity="1" />
          <stop offset="35%" stopColor="#FFE9A8" stopOpacity="0.85" />
          <stop offset="65%" stopColor="#FFE9A8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${id}-sun-core`}>
          <stop offset="0%" stopColor="#FFFCEB" />
          <stop offset="60%" stopColor="#FFE9A8" />
          <stop offset="100%" stopColor="#FFD06A" />
        </radialGradient>

        {/* ─── God-ray wedge gradient (top transparent, bottom warm) ── */}
        <linearGradient id={`${id}-ray`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%"   stopColor="#FFE9A8" stopOpacity="0.55" />
          <stop offset="60%"  stopColor="#FFE9A8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
        </linearGradient>

        {/* ─── Golden ribbon gradient for constellation paths ──── */}
        <linearGradient id={`${id}-ribbon`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#FFE9A8" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="#FFD06A" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFB872" stopOpacity="0.9" />
        </linearGradient>

        {/* ─── Cloud blur filter ───────────────────────────────── */}
        <filter id={`${id}-cloud-blur`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>

        {/* ─── Soft glow filter (smaller — for path halo) ──────── */}
        <filter id={`${id}-glow-sm`} x="-30%" y="-200%" width="160%" height="500%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>

        {/* ─── Wide ribbon halo filter ─────────────────────────── */}
        <filter id={`${id}-ribbon-halo`} x="-30%" y="-300%" width="160%" height="700%">
          <feGaussianBlur stdDeviation="6" />
        </filter>

        {/* ─── Island shadow underneath (soft drop) ────────────── */}
        <filter id={`${id}-island-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
          <feOffset dy="6" />
          <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ─── Per-island gradients ────────────────────────────── */}
        {islands.map((i) => (
          <linearGradient key={`g-${i.id}`} id={`${id}-island-${i.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={i.topColor} />
            <stop offset="55%"  stopColor={i.topColor} />
            <stop offset="100%" stopColor={i.bottomColor} />
          </linearGradient>
        ))}
        <linearGradient id={`${id}-island-locked`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"  stopColor="#A8AECC" />
          <stop offset="100%" stopColor="#4F5266" />
        </linearGradient>
      </defs>

      {/* ════ 1. Sky ════════════════════════════════════════════ */}
      <rect width={VIEW_W} height={VIEW_H} fill={`url(#${id}-sky)`} />

      {/* ════ 2. Sun + god rays + lens flare ════════════════════ */}
      <Sun id={id} />

      {/* ════ 3. Distant fog bands ══════════════════════════════ */}
      <FogBands id={id} />

      {/* ════ 4. Atmospheric sparkles in upper sky ══════════════ */}
      <SkySparkles />

      {/* ════ 5. Golden constellation paths between islands ════ */}
      <g>
        {connections.map((c, i) => {
          const from = lookup[c.from]
          const to = lookup[c.to]
          if (!from || !to) return null
          return (
            <ConstellationPath
              key={`p-${i}`}
              from={{ x: from.cx, y: from.cy - from.ry * 0.3 }}
              to={{ x: to.cx, y: to.cy - to.ry * 0.3 }}
              curvature={c.curvature}
              delay={0.4 + i * 0.15}
              ribbonId={`${id}-ribbon`}
              haloFilter={`${id}-ribbon-halo`}
            />
          )
        })}
        {/* Dashed misty path → locked island */}
        <DashedMistyPath
          from={{ x: 1220, y: 595 }}
          to={{ x: 1480, y: 480 }}
        />
      </g>

      {/* ════ 6. Islands ════════════════════════════════════════ */}
      <g>
        {islands.map((i) => (
          <Island
            key={i.id}
            spec={i}
            gradientId={`${id}-island-${i.id}`}
            shadowFilter={`${id}-island-shadow`}
          />
        ))}
      </g>

      {/* ════ 7. Locked "coming soon" island (far right) ═══════ */}
      <LockedIsland
        cx={1480}
        cy={480}
        rx={130}
        ry={50}
        gradientId={`${id}-island-locked`}
        shadowFilter={`${id}-island-shadow`}
        cloudFilter={`${id}-cloud-blur`}
      />

      {/* ════ 8. Cloud bank at bottom ═══════════════════════════ */}
      <CloudBank cloudFilter={`${id}-cloud-blur`} />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Sky elements
   ═══════════════════════════════════════════════════════════════════ */

function Sun({ id }: { id: string }) {
  return (
    <g>
      {/* God rays — 8 rotating wedges, very subtle */}
      <motion.g
        style={{ transformOrigin: `${SUN.cx}px ${SUN.cy}px` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * 360
          return (
            <path
              key={i}
              d={`M ${SUN.cx} ${SUN.cy} m -34 0 L ${SUN.cx - 14} ${SUN.cy - 540} L ${SUN.cx + 14} ${SUN.cy - 540} L ${SUN.cx} ${SUN.cy} m 34 0 Z`}
              fill={`url(#${id}-ray)`}
              opacity={0.55}
              transform={`rotate(${angle} ${SUN.cx} ${SUN.cy})`}
            />
          )
        })}
      </motion.g>

      {/* Sun glow halo */}
      <circle cx={SUN.cx} cy={SUN.cy} r={210} fill={`url(#${id}-sun-glow)`} />
      <motion.circle
        cx={SUN.cx}
        cy={SUN.cy}
        r={130}
        fill={`url(#${id}-sun-glow)`}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Sun core */}
      <circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill={`url(#${id}-sun-core)`} />
      <circle cx={SUN.cx - 18} cy={SUN.cy - 22} r={18} fill="#FFFCEB" opacity={0.55} />

      {/* Lens flare — 3 small bokeh dots along the diagonal toward bottom-left */}
      <circle cx={1180} cy={290} r={18} fill="#FFE9A8" opacity={0.22} />
      <circle cx={980}  cy={400} r={10} fill="#F8C9E4" opacity={0.35} />
      <circle cx={780}  cy={510} r={6}  fill="#FFE9A8" opacity={0.4} />
    </g>
  )
}

function FogBands({ id }: { id: string }) {
  // Horizontal blurred white ellipses for distant fog
  return (
    <g filter={`url(#${id}-cloud-blur)`} opacity={0.45}>
      <ellipse cx={400} cy={400} rx={320} ry={18} fill="white" />
      <ellipse cx={1100} cy={420} rx={380} ry={20} fill="white" />
      <ellipse cx={800} cy={520} rx={420} ry={16} fill="white" opacity={0.55} />
    </g>
  )
}

function SkySparkles() {
  // Stable random twinkles in the upper half of the sky
  const sparks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: 50 + Math.random() * 1500,
        y: 30 + Math.random() * 380,
        size: 4 + Math.random() * 5,
        delay: Math.random() * 3,
        duration: 1.6 + Math.random() * 2.2,
        // bias colour
        color:
          i % 3 === 0 ? '#FFE9A8' : i % 3 === 1 ? '#FFFFFF' : '#FFD2DE',
      })),
    [],
  )
  return (
    <g>
      {sparks.map((s, i) => (
        <motion.circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.size * 0.5}
          fill={s.color}
          style={{ filter: `drop-shadow(0 0 ${s.size}px ${s.color})` }}
          animate={{ opacity: [0.1, 0.9, 0.1], scale: [0.6, 1.1, 0.6] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Constellation paths — golden ribbons + dashed misty
   ═══════════════════════════════════════════════════════════════════ */

interface PathProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  curvature: number
  delay: number
  ribbonId: string
  haloFilter: string
}

function ConstellationPath({ from, to, curvature, delay, ribbonId, haloFilter }: PathProps) {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const cx = mx + (-dy / len) * curvature
  const cy = my + (dx / len) * curvature
  const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`

  return (
    <g>
      {/* Wide warm halo — soft "ribbon of light" feel */}
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${ribbonId})`}
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.35}
        filter={`url(#${haloFilter})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0.25, 0.42, 0.25] }}
        transition={{
          pathLength: { duration: 1.4, delay, ease: 'easeOut' },
          opacity: {
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: delay + 1,
          },
        }}
      />

      {/* Solid ribbon center */}
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${ribbonId})`}
        strokeWidth={3.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay, ease: 'easeOut' }}
        style={{
          filter: 'drop-shadow(0 0 4px #FFD06A) drop-shadow(0 0 10px #FFE9A8)',
        }}
      />

      {/* Traveling sparkle dots along the ribbon */}
      <motion.path
        d={d}
        fill="none"
        stroke="#FFFCEB"
        strokeWidth={3}
        strokeDasharray="1 22"
        strokeLinecap="round"
        opacity={0.95}
        initial={{ pathLength: 0, strokeDashoffset: 0 }}
        animate={{ pathLength: 1, strokeDashoffset: [0, -23] }}
        transition={{
          pathLength: { duration: 1.2, delay, ease: 'easeOut' },
          strokeDashoffset: {
            duration: 2.2,
            repeat: Infinity,
            ease: 'linear',
            delay: delay + 0.8,
          },
        }}
        style={{ filter: 'drop-shadow(0 0 6px #FFE9A8)' }}
      />
    </g>
  )
}

function DashedMistyPath({
  from,
  to,
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
}) {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2 - 30
  const d = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`
  return (
    <path
      d={d}
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={3}
      strokeOpacity={0.55}
      strokeDasharray="6 10"
      strokeLinecap="round"
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Islands — 3D disc shape + biome decorations
   ═══════════════════════════════════════════════════════════════════ */

interface IslandProps {
  spec: IslandSpec
  gradientId: string
  shadowFilter: string
}

function Island({ spec, gradientId, shadowFilter }: IslandProps) {
  const { cx, cy, rx, ry, biome, topColor, bottomColor, rimColor } = spec
  // Soft float — each island bobs on its own slow phase
  const phase = (cx * 0.013) % (Math.PI * 2)
  return (
    <motion.g
      animate={{ y: [Math.sin(phase) * 4, -Math.sin(phase) * 4, Math.sin(phase) * 4] }}
      transition={{ duration: 5 + (cx % 7) * 0.3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <g filter={`url(#${shadowFilter})`}>
        {/* Soft cast shadow on the cloud bank */}
        <ellipse cx={cx + 6} cy={cy + ry * 1.3} rx={rx * 0.85} ry={ry * 0.18} fill="#000" opacity={0.13} />

        {/* Underside / dirt body — teardrop shape */}
        <path
          d={`
            M ${cx - rx} ${cy}
            Q ${cx} ${cy + ry * 1.9} ${cx + rx} ${cy}
            Z
          `}
          fill={bottomColor}
        />
        {/* Side highlight on the underside (bottom inset) */}
        <path
          d={`
            M ${cx - rx * 0.92} ${cy + ry * 0.4}
            Q ${cx} ${cy + ry * 1.7} ${cx + rx * 0.92} ${cy + ry * 0.4}
          `}
          fill="none"
          stroke={bottomColor}
          strokeOpacity={0.4}
          strokeWidth={2}
        />

        {/* Top surface — lit, with vertical gradient */}
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry * 0.55} fill={`url(#${gradientId})`} />

        {/* Rim of light along the top */}
        <ellipse
          cx={cx}
          cy={cy - 2}
          rx={rx * 0.985}
          ry={ry * 0.5}
          fill="none"
          stroke={rimColor}
          strokeWidth={2}
          strokeOpacity={0.85}
          style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}
        />
      </g>

      {/* Biome decorations sit on top of the island surface */}
      <g transform={`translate(${cx}, ${cy - ry * 0.4})`}>
        <BiomeDecoration
          biome={biome}
          rx={rx}
          ry={ry}
          topColor={topColor}
          bottomColor={bottomColor}
        />
      </g>
    </motion.g>
  )
}

function LockedIsland({
  cx,
  cy,
  rx,
  ry,
  gradientId,
  shadowFilter,
  cloudFilter,
}: {
  cx: number
  cy: number
  rx: number
  ry: number
  gradientId: string
  shadowFilter: string
  cloudFilter: string
}) {
  return (
    <g opacity={0.85}>
      <g filter={`url(#${shadowFilter})`}>
        <path
          d={`M ${cx - rx} ${cy} Q ${cx} ${cy + ry * 1.8} ${cx + rx} ${cy} Z`}
          fill="#4F5266"
        />
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry * 0.55} fill={`url(#${gradientId})`} />
      </g>

      {/* Lock symbol */}
      <g transform={`translate(${cx}, ${cy - 10})`}>
        <rect x={-14} y={-2} width={28} height={22} rx={4} fill="#E0E0E8" stroke="#4F5266" strokeWidth={2} />
        <path
          d="M -8 -2 V -10 a 8 8 0 0 1 16 0 V -2"
          fill="none"
          stroke="#4F5266"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={0} cy={9} r={2.5} fill="#4F5266" />
      </g>

      {/* Heavy fog overlay — half-hides the island */}
      <g filter={`url(#${cloudFilter})`} opacity={0.65}>
        <ellipse cx={cx} cy={cy + 30} rx={rx * 1.4} ry={ry * 1.2} fill="white" />
        <ellipse cx={cx - 30} cy={cy + 10} rx={rx * 1.1} ry={ry * 0.9} fill="white" opacity={0.75} />
      </g>
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Biome decorations
   ═══════════════════════════════════════════════════════════════════ */

interface BiomeDecorationProps {
  biome: IslandBiome
  rx: number
  ry: number
  topColor: string
  bottomColor: string
}

type DecoProps = Omit<BiomeDecorationProps, 'biome'>

function BiomeDecoration({ biome, ...rest }: BiomeDecorationProps) {
  switch (biome) {
    case 'forest':  return <ForestDeco {...rest} />
    case 'city':    return <CityDeco {...rest} />
    case 'lantern': return <LanternDeco {...rest} />
    case 'crystal': return <CrystalDeco {...rest} />
    case 'village': return <VillageDeco {...rest} />
  }
}

/* ─── Forest: trees + glowing mushrooms + butterfly ─────────── */

function ForestDeco({ rx, bottomColor }: DecoProps) {
  const trees = [
    { x: -rx * 0.55, y: -14, size: 22 },
    { x: -rx * 0.18, y: -22, size: 28 },
    { x:  rx * 0.20, y: -18, size: 24 },
    { x:  rx * 0.58, y: -12, size: 20 },
  ]
  return (
    <g>
      {trees.map((t, i) => (
        <g key={i} transform={`translate(${t.x}, ${t.y})`}>
          <rect x={-3} y={0} width={6} height={t.size * 0.55} fill="#5A3C28" rx={2} />
          <circle cx={0} cy={-t.size * 0.25} r={t.size * 0.85} fill="#3F8C5A" opacity={0.95} />
          <circle cx={-t.size * 0.3} cy={-t.size * 0.5} r={t.size * 0.6} fill="#5BA975" opacity={0.85} />
          <circle cx={t.size * 0.32} cy={-t.size * 0.4} r={t.size * 0.55} fill="#74C28D" opacity={0.85} />
          {/* tiny rim highlight on top */}
          <circle cx={-t.size * 0.15} cy={-t.size * 0.7} r={t.size * 0.25} fill="#C5F0CE" opacity={0.6} />
        </g>
      ))}
      {/* Glowing mushrooms */}
      <Mushroom x={-rx * 0.85} y={-4} />
      <Mushroom x={rx * 0.78} y={-2} flip />
      {/* Butterfly */}
      <g transform={`translate(${rx * 0.05}, ${-58})`}>
        <ellipse cx={-5} cy={0} rx={5} ry={3.5} fill="#F8C9E4" />
        <ellipse cx={5}  cy={0} rx={5} ry={3.5} fill="#F8C9E4" />
        <ellipse cx={-5} cy={2} rx={3.5} ry={2.5} fill="#C8B6F0" />
        <ellipse cx={5}  cy={2} rx={3.5} ry={2.5} fill="#C8B6F0" />
        <line x1={0} y1={-2} x2={0} y2={3} stroke="#4F5266" strokeWidth={0.8} />
      </g>
      {/* Ground texture: a few darker dots */}
      {[-0.7, -0.3, 0.1, 0.5, 0.85].map((p, i) => (
        <circle key={i} cx={rx * p} cy={4} r={1.5} fill={bottomColor} opacity={0.35} />
      ))}
    </g>
  )
}

function Mushroom({ x, y, flip }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${flip ? -1 : 1}, 1)`}>
      <rect x={-2} y={-2} width={4} height={8} fill="#FFF6E8" rx={1} />
      <ellipse cx={0} cy={-3} rx={7} ry={5} fill="#E74C3C" style={{ filter: 'drop-shadow(0 0 4px #FFD06A)' }} />
      <circle cx={-2} cy={-4} r={1.2} fill="#FFFCEB" opacity={0.85} />
      <circle cx={3} cy={-2} r={0.8} fill="#FFFCEB" opacity={0.7} />
    </g>
  )
}

/* ─── Puzzle City: tiny rooftops + kite + lightbulbs ──────── */

function CityDeco({ rx }: DecoProps) {
  const buildings = [
    { x: -rx * 0.55, h: 28, color: '#5DB8DC' },
    { x: -rx * 0.22, h: 42, color: '#7AC8E6' },
    { x:  rx * 0.10, h: 34, color: '#A6DDF0' },
    { x:  rx * 0.42, h: 26, color: '#5DB8DC' },
    { x:  rx * 0.70, h: 36, color: '#88D2EE' },
  ]
  return (
    <g>
      {buildings.map((b, i) => (
        <g key={i} transform={`translate(${b.x}, 0)`}>
          <rect x={-11} y={-b.h} width={22} height={b.h} fill={b.color} rx={2} />
          {/* roof triangle */}
          <path d={`M -13 -${b.h} L 0 -${b.h + 10} L 13 -${b.h} Z`} fill="#2C6F92" />
          {/* tiny windows */}
          {Array.from({ length: Math.floor((b.h - 8) / 7) }, (_, j) => (
            <g key={j}>
              <rect x={-7} y={-b.h + 6 + j * 7} width={3.5} height={3.5} fill="#FFE9A8" />
              <rect x={3}  y={-b.h + 6 + j * 7} width={3.5} height={3.5} fill="#FFE9A8" />
            </g>
          ))}
          {/* rim highlight on the lit side */}
          <rect x={-11} y={-b.h} width={2} height={b.h} fill="white" opacity={0.4} />
        </g>
      ))}
      {/* Floating kite */}
      <g transform={`translate(${rx * 0.1}, -68)`}>
        <path d="M 0 -8 L 8 0 L 0 10 L -8 0 Z" fill="#F8C9E4" stroke="#DB7A98" strokeWidth={1.2} />
        <line x1={0} y1={10} x2={3} y2={26} stroke="#DB7A98" strokeWidth={1} />
        <line x1={0} y1={10} x2={-3} y2={26} stroke="#DB7A98" strokeWidth={1} />
      </g>
      {/* Floating lightbulbs */}
      {[-rx * 0.6, rx * 0.7].map((bx, i) => (
        <g key={i} transform={`translate(${bx}, -52)`}>
          <circle cx={0} cy={0} r={5} fill="#FFE9A8" style={{ filter: 'drop-shadow(0 0 6px #FFE9A8)' }} />
          <rect x={-2} y={4} width={4} height={3} fill="#999" />
        </g>
      ))}
    </g>
  )
}

/* ─── Lantern: lanterns + palm tree + rice terraces ────────── */

function LanternDeco({ rx }: DecoProps) {
  return (
    <g>
      {/* Rice terraces — stair-step curved bands */}
      {[0, 1, 2].map((step) => (
        <path
          key={step}
          d={`
            M ${-rx + 10 + step * 8} ${4 + step * 3}
            Q 0 ${-step * 2 - 2} ${rx - 10 - step * 8} ${4 + step * 3}
          `}
          fill="none"
          stroke="#C8843C"
          strokeWidth={3}
          strokeOpacity={0.55}
          strokeLinecap="round"
        />
      ))}

      {/* Palm tree */}
      <g transform={`translate(${rx * 0.55}, -8)`}>
        <path d="M 0 0 Q 1 -10 0 -28" stroke="#7A4A22" strokeWidth={3} fill="none" strokeLinecap="round" />
        {/* fronds */}
        {[-50, -30, -10, 10, 30, 50].map((angle, i) => (
          <path
            key={i}
            d="M 0 0 Q 8 -4 18 -3"
            stroke="#6BB55A"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            transform={`translate(0, -28) rotate(${angle})`}
          />
        ))}
        <circle cx={0} cy={-26} r={3} fill="#FFD494" />
      </g>

      {/* Hanging lanterns — Hội An style */}
      {[
        { x: -rx * 0.45, hue: '#FF8A3C' },
        { x: -rx * 0.12, hue: '#FFD494' },
        { x:  rx * 0.18, hue: '#E47948' },
      ].map((l, i) => (
        <g key={i} transform={`translate(${l.x}, -40)`}>
          {/* hanging string */}
          <line x1={0} y1={-25} x2={0} y2={-6} stroke="#5A3C28" strokeWidth={0.6} />
          {/* lantern body — oval with vertical ribs */}
          <ellipse cx={0} cy={2} rx={8} ry={11} fill={l.hue} style={{ filter: 'drop-shadow(0 0 8px #FFE9A8)' }} />
          <line x1={-7} y1={2} x2={7} y2={2} stroke="#5A3C28" strokeWidth={0.5} opacity={0.5} />
          {/* top + bottom caps */}
          <rect x={-5} y={-10} width={10} height={2} fill="#5A3C28" />
          <rect x={-5} y={12} width={10} height={2} fill="#5A3C28" />
          {/* tassel */}
          <line x1={0} y1={14} x2={0} y2={20} stroke="#E47948" strokeWidth={1} />
        </g>
      ))}
    </g>
  )
}

/* ─── Crystal Mountain: spires + observatory + shooting stars ── */

function CrystalDeco({ rx }: DecoProps) {
  const spires = [
    { x: -rx * 0.5, h: 38, w: 14 },
    { x: -rx * 0.18, h: 56, w: 18 },
    { x:  rx * 0.18, h: 70, w: 22 },
    { x:  rx * 0.5,  h: 44, w: 16 },
  ]
  return (
    <g>
      {spires.map((s, i) => (
        <g key={i} transform={`translate(${s.x}, 0)`}>
          {/* Crystal — two triangles for a 3D faceted look */}
          <path
            d={`M 0 ${-s.h} L ${-s.w / 2} 0 L ${s.w / 2} 0 Z`}
            fill="#7A65C8"
            opacity={0.95}
          />
          <path
            d={`M 0 ${-s.h} L 0 0 L ${s.w / 2} 0 Z`}
            fill="#A88FE8"
            opacity={0.85}
          />
          <path
            d={`M 0 ${-s.h} L 0 0 L ${-s.w / 2} 0 Z`}
            fill="#C5B0FF"
            opacity={0.55}
          />
          {/* tip highlight */}
          <circle cx={0} cy={-s.h + 4} r={2} fill="#E0D5FF" style={{ filter: 'drop-shadow(0 0 4px #E0D5FF)' }} />
        </g>
      ))}

      {/* Observatory — base + dome */}
      <g transform="translate(0, -6)">
        <rect x={-12} y={-22} width={24} height={22} fill="#5E4DA0" />
        <path d="M -14 -22 A 14 14 0 0 1 14 -22 Z" fill="#7A65C8" />
        <rect x={-2} y={-8} width={4} height={8} fill="#FFE9A8" />
        {/* dome detail */}
        <circle cx={0} cy={-22} r={3} fill="#E0D5FF" opacity={0.7} />
      </g>

      {/* Shooting stars above */}
      {[{ x: -rx * 0.3, y: -94 }, { x: rx * 0.4, y: -82 }].map((st, i) => (
        <g key={i} transform={`translate(${st.x}, ${st.y})`}>
          <path d="M 0 0 L -22 -6" stroke="#FFE9A8" strokeWidth={1.5} strokeOpacity={0.7} strokeLinecap="round" />
          <circle cx={0} cy={0} r={2.5} fill="#FFFCEB" style={{ filter: 'drop-shadow(0 0 4px #FFE9A8)' }} />
        </g>
      ))}
    </g>
  )
}

/* ─── Family Village: cozy houses + memory tree + lanterns ───── */

function VillageDeco({ rx }: DecoProps) {
  const houses = [
    { x: -rx * 0.55, color: '#FFD2DE', roof: '#DB7A98' },
    { x: -rx * 0.18, color: '#FFE7C2', roof: '#E47948' },
    { x:  rx * 0.42, color: '#FFD2DE', roof: '#DB7A98' },
    { x:  rx * 0.72, color: '#FFE9A8', roof: '#E47948' },
  ]
  return (
    <g>
      {houses.map((h, i) => (
        <g key={i} transform={`translate(${h.x}, 0)`}>
          {/* body */}
          <rect x={-12} y={-16} width={24} height={18} fill={h.color} rx={1} />
          {/* roof */}
          <path d="M -14 -16 L 0 -28 L 14 -16 Z" fill={h.roof} />
          {/* door */}
          <rect x={-3} y={-8} width={6} height={10} fill="#5A3C28" rx={1} />
          {/* window glow */}
          <rect x={4} y={-12} width={5} height={5} fill="#FFE9A8" style={{ filter: 'drop-shadow(0 0 4px #FFE9A8)' }} />
          {/* chimney */}
          <rect x={5} y={-22} width={4} height={6} fill={h.roof} />
          {/* rim highlight */}
          <rect x={-12} y={-16} width={2} height={18} fill="white" opacity={0.4} />
        </g>
      ))}

      {/* Memory tree — large central tree */}
      <g transform={`translate(${rx * 0.12}, -2)`}>
        <rect x={-4} y={0} width={8} height={28} fill="#5A3C28" rx={2} />
        <circle cx={0} cy={-8} r={28} fill="#74C28D" />
        <circle cx={-14} cy={-18} r={20} fill="#5BA975" opacity={0.85} />
        <circle cx={14}  cy={-16} r={22} fill="#88D6A1" opacity={0.85} />
        <circle cx={0} cy={-30} r={16} fill="#A6E5BB" opacity={0.85} />
        {/* fairy lights on the tree */}
        {[-12, -6, 6, 12, 0].map((dx, i) => (
          <circle
            key={i}
            cx={dx}
            cy={-15 + (i % 2) * 8}
            r={1.5}
            fill="#FFE9A8"
            style={{ filter: 'drop-shadow(0 0 4px #FFE9A8)' }}
          />
        ))}
        {/* small heart at top */}
        <text x={0} y={-50} textAnchor="middle" fontSize={12}>💖</text>
      </g>

      {/* Floating glow lanterns */}
      {[-rx * 0.7, rx * 0.85].map((lx, i) => (
        <circle
          key={i}
          cx={lx}
          cy={-44}
          r={3}
          fill="#FFD494"
          style={{ filter: 'drop-shadow(0 0 6px #FFE9A8)' }}
        />
      ))}
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Cloud bank — bottom third of the scene
   ═══════════════════════════════════════════════════════════════════ */

function CloudBank({ cloudFilter }: { cloudFilter: string }) {
  // Stable random cloud positions per mount
  const clouds = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        cx: 120 + i * 230 + Math.random() * 60,
        cy: 770 + Math.random() * 70,
        rx: 240 + Math.random() * 120,
        ry: 40 + Math.random() * 18,
        opacity: 0.65 + Math.random() * 0.3,
        driftDelay: i * 1.5,
        driftDuration: 18 + Math.random() * 12,
      })),
    [],
  )

  return (
    <g filter={`url(#${cloudFilter})`}>
      {clouds.map((c, i) => (
        <motion.ellipse
          key={i}
          cx={c.cx}
          cy={c.cy}
          rx={c.rx}
          ry={c.ry}
          fill="white"
          opacity={c.opacity}
          animate={{ cx: [c.cx, c.cx + 30, c.cx] }}
          transition={{
            duration: c.driftDuration,
            delay: c.driftDelay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* deeper cloud strip at the very bottom */}
      <ellipse cx={800} cy={880} rx={1100} ry={70} fill="white" opacity={0.9} />
    </g>
  )
}

import { useId, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PastelTone } from '@/types'

/**
 * WorldAmbience — cinematic Ghibli/Disney-style ambient layers that ride
 * on top of WorldMapPage's vertical "saga" stage. Everything here is
 * absolutely positioned in % of the stage container so layout scales 1:1
 * with the existing JourneyIsland markers.
 *
 * Layer order (back → front), all rendered by the page in this sequence:
 *   1. <TreeOfLight>        — top focal anchor (source of the journey light)
 *   2. <AirshipFleet>       — silhouette airships drifting horizontally
 *   3. <BalloonDrift>       — hot-air balloons bobbing gently
 *   4. <BiomeScene>         — per-island flora/fauna/structure decorations
 *   5. <Wanderer>           — child + Lumi silhouette mid-journey
 *   6. <ForegroundCloud>    — soft white cloud at the very bottom
 *
 * Why a separate module? WorldMapPage is already 700+ LOC of interactive
 * logic. Visual richness lives here so the page stays a thin composition
 * layer. All components are pure — no store reads, no router calls.
 */

/* ════════════════════════════════════════════════════════════════════
   Shared positioning props
   ════════════════════════════════════════════════════════════════════ */

interface StagePos {
  /** % of stage width.  */ x: number
  /** % of stage height. */ y: number
}

/* ════════════════════════════════════════════════════════════════════
   SkyIsland — Disney/Ghibli floating island base
   ────────────────────────────────────────────────────────────────────
   Replaces the flat disc marker. Composition (top→bottom):
     1. Grass top dome    — tone-tinted, lit from above
     2. Cliff body        — dark earthy gradient (#7C5A3A → #3A2418)
     3. Dangling roots    — tiny golden roots glow on a slow pulse
     4. Side waterfall    — optional, cascades off one cliff face
   Tone drives the grass colour so each region keeps its identity even
   after the disc → island upgrade. SVG ids are uniqued per instance via
   useId() so two islands rendered side-by-side don't clobber gradients.
   ════════════════════════════════════════════════════════════════════ */

/** Per-tone grass top + cliff rim colours. Keys match PastelTone. */
const ISLAND_TONE: Record<
  PastelTone,
  { top: string; mid: string; bottom: string; rim: string; waterfall: 'warm' | 'cool' }
> = {
  peach:    { top: '#FFE2D2', mid: '#FFB89A', bottom: '#E47948', rim: '#FFD4A8', waterfall: 'warm' },
  mint:     { top: '#B8E8C5', mid: '#5BAE73', bottom: '#2F7A4A', rim: '#8AD89B', waterfall: 'cool' },
  butter:   { top: '#FFE7C2', mid: '#FFC678', bottom: '#E47948', rim: '#FFD494', waterfall: 'warm' },
  lavender: { top: '#DDD0FF', mid: '#9C82E6', bottom: '#5E4DA0', rim: '#C5B0FF', waterfall: 'cool' },
  sky:      { top: '#D2EBF7', mid: '#7BC8DC', bottom: '#3F6886', rim: '#A0DCF1', waterfall: 'cool' },
}

interface SkyIslandProps {
  tone: PastelTone
  /** Pixel width of the rendered SVG. Height auto-derives. */
  size: number
  /** Adds a small waterfall trailing off the side. */
  waterfall?: boolean
}

export function SkyIsland({ tone, size, waterfall = true }: SkyIslandProps) {
  // useId → SVG-safe slug; collisions between sibling SkyIslands would
  // pollute the gradient defs otherwise (every disc would share one fill).
  const uid = useId().replace(/[:]/g, '')
  const cliffId = `cliff-${uid}`
  const grassId = `grass-${uid}`
  const wfId    = `wf-${uid}`

  const palette = ISLAND_TONE[tone]
  // viewBox is symmetric vertically around the grass surface (y=0) so the
  // SVG's visual centre coincides with the grass. JourneyIsland anchors
  // the marker on stop.y → grass lands on stop.y → glowing path connects
  // exactly to where the kid sees the island sit. The 360-tall box has
  // ~180 above the grass (sky breathing room) and ~180 below for the
  // cliff (extends to y=200, slightly overflows — overflow-visible keeps
  // the lip visible).
  const w = size
  const h = size * (360 / 280)

  return (
    <svg
      aria-hidden
      viewBox="-140 -180 280 360"
      width={w}
      height={h}
      className="block overflow-visible"
    >
      <defs>
        <linearGradient id={cliffId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#7C5A3A" />
          <stop offset="100%" stopColor="#3A2418" />
        </linearGradient>
        <linearGradient id={grassId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={palette.top} />
          <stop offset="60%"  stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.bottom} />
        </linearGradient>
        <linearGradient id={wfId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={palette.waterfall === 'cool' ? '#DDF0FC' : '#FFE7C2'} stopOpacity="0" />
          <stop offset="40%"  stopColor={palette.waterfall === 'cool' ? '#DDF0FC' : '#FFE7C2'} stopOpacity="0.7" />
          <stop offset="100%" stopColor={palette.waterfall === 'cool' ? '#6FE7DD' : '#FFB36B'} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* ── Cliff body — pear-shaped bottom that tapers downward ── */}
      <path
        d="
          M -130,0
          Q -120,80 -80,140
          Q -40,180 0,200
          Q 40,180 80,140
          Q 120,80 130,0
          Z
        "
        fill={`url(#${cliffId})`}
      />
      {/* Cliff rim highlight — sun catches the top edge. */}
      <path
        d="M -130,0 Q -50,-10 0,-2 Q 50,-10 130,0"
        stroke={palette.rim}
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />

      {/* ── Dangling glowing roots — slow pulse, staggered delays ── */}
      {[-90, -55, -20, 20, 55, 90].map((rx, i) => (
        <motion.path
          key={i}
          d={`M ${rx} 30 Q ${rx - 5} 100 ${rx + 7} 180`}
          stroke="#FFE48A"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          animate={{ opacity: [0.25, 0.75, 0.25] }}
          transition={{
            duration: 3 + i * 0.3,
            delay: i * 0.25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* ── Grass top dome — sits at the cliff lip, tone-tinted ── */}
      <ellipse cx="0" cy="0" rx="130" ry="22" fill={palette.bottom} opacity="0.9" />
      <ellipse cx="0" cy="-6" rx="124" ry="20" fill={`url(#${grassId})`} />
      {/* Grass-top highlight rim — a thinner bright crescent on the very lip. */}
      <path
        d="M -110 -10 Q -50 -22 50 -20 Q 100 -16 110 -10"
        stroke={palette.top}
        strokeWidth="2.5"
        fill="none"
        opacity="0.7"
        strokeLinecap="round"
      />

      {/* ── Waterfall — pours off the right cliff face ── */}
      {waterfall && (
        <g transform="translate(95, 8)">
          <rect x="-9" y="0" width="18" height="140" rx="9" fill={`url(#${wfId})`} opacity="0.85" />
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.rect
              key={i}
              x={-7 + i * 4.5}
              y="0"
              width="1.5"
              height="40"
              fill="white"
              opacity="0.7"
              animate={{ y: [-30, 140] }}
              transition={{
                duration: 1.6,
                delay: i * 0.18,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
          {/* Mist pool at the bottom of the fall. */}
          <motion.ellipse
            cx="0" cy="138" rx="14" ry="3.5" fill="white" opacity="0.55"
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>
      )}
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════════════
   TreeOfLight — central focal point at the top of the journey
   ────────────────────────────────────────────────────────────────────
   "Cây Ánh Sáng" — the kid descends FROM this tree through the world.
   Big halo + glowing canopy + dangling memory lanterns + light motes.
   Lives in the top ~10% of the stage; markers/path render below it.
   ════════════════════════════════════════════════════════════════════ */

export function TreeOfLight({ x = 50, y = 4, size = 160 }: Partial<StagePos> & { size?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
    >
      <svg
        viewBox="-200 -200 400 400"
        width={size}
        height={size}
        className="overflow-visible"
      >
        <defs>
          <radialGradient id="tol-canopy" cx="50%" cy="50%" r="55%">
            <stop offset="0%"  stopColor="#FFFBE5" />
            <stop offset="35%" stopColor="#FFE48A" />
            <stop offset="80%" stopColor="#F5C76A" />
            <stop offset="100%" stopColor="#E47948" stopOpacity="0.85" />
          </radialGradient>
          <radialGradient id="tol-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#FFE48A" stopOpacity="0.8" />
            <stop offset="55%" stopColor="#FFB36B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFB36B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* outer halo bloom */}
        <motion.circle
          r="180" fill="url(#tol-halo)"
          animate={{ r: [170, 195, 170], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* trunk */}
        <path d="M -22 50 Q -28 -10 -8 -90 Q 14 -10 22 50 Z" fill="#3A2418" />
        <path d="M -16 42 Q -22 -6 -6 -80" stroke="#5C3E22" strokeWidth="2.5" fill="none" />

        {/* canopy clusters */}
        <ellipse cx="0"   cy="-140" rx="150" ry="100" fill="url(#tol-canopy)" />
        <ellipse cx="-70" cy="-160" rx="95"  ry="70"  fill="url(#tol-canopy)" opacity="0.92" />
        <ellipse cx="70"  cy="-160" rx="95"  ry="70"  fill="url(#tol-canopy)" opacity="0.92" />
        <ellipse cx="-20" cy="-200" rx="62"  ry="44"  fill="#FFF1B8" opacity="0.9" />

        {/* core highlight pulse */}
        <motion.circle
          cx="0" cy="-160" r="60" fill="#FFFBE5" opacity="0.6"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* hanging memory lanterns */}
        {[-90, -50, 0, 50, 90].map((lx, i) => (
          <g key={i} transform={`translate(${lx}, -80)`}>
            <line x1="0" y1="0" x2="0" y2="30" stroke="rgba(255,235,180,0.55)" strokeWidth="1" />
            <ellipse cx="0" cy="38" rx="6" ry="8" fill="#FFC678" />
            <motion.circle
              cx="0" cy="38" r="16" fill="#FFB36B" opacity="0.5"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3 + i * 0.2, delay: i * 0.3, repeat: Infinity }}
              style={{ mixBlendMode: 'screen' }}
            />
          </g>
        ))}

        {/* floating light motes around canopy */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2
          const r = 170 + (i % 4) * 18
          const cx = Math.cos(a) * r
          const cy = Math.sin(a) * r * 0.6 - 140
          return (
            <motion.circle
              key={i}
              cx={cx} cy={cy} r={2 + (i % 3) * 0.6}
              fill="#FFF1B8"
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.6, 1.3, 0.6] }}
              transition={{ duration: 3 + (i % 4), delay: i * 0.15, repeat: Infinity }}
              style={{ filter: 'drop-shadow(0 0 4px #FFE48A)' }}
            />
          )
        })}

        {/* label badge */}
        <g transform="translate(0, 130)">
          <rect x="-78" y="0" width="156" height="30" rx="15" fill="rgba(31, 27, 58, 0.85)" />
          <text
            x="0" y="20" textAnchor="middle"
            fontFamily="Quicksand, serif" fontWeight="900"
            fill="#FFE48A" fontSize="14" letterSpacing="2"
          >
            CÂY ÁNH SÁNG
          </text>
        </g>
      </svg>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   AirshipFleet — silhouette airships drifting across the sky
   ════════════════════════════════════════════════════════════════════ */

interface AirshipSpec {
  yPct: number
  duration: number
  delay: number
  tone: 'warm' | 'cool' | 'rose'
  reverse?: boolean
  scale: number
}

const AIRSHIPS: AirshipSpec[] = [
  { yPct: 18, duration: 60, delay: 0,   tone: 'cool', scale: 0.9 },
  { yPct: 39, duration: 75, delay: 8,   tone: 'warm', reverse: true, scale: 1.05 },
  { yPct: 62, duration: 70, delay: 22,  tone: 'rose', scale: 0.85 },
]

export function AirshipFleet() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {AIRSHIPS.map((spec, i) => (
        <Airship key={i} {...spec} />
      ))}
    </div>
  )
}

function Airship({ yPct, duration, delay, tone, reverse, scale }: AirshipSpec) {
  const body = tone === 'warm' ? '#FFB36B' : tone === 'rose' ? '#F7B5C4' : '#5FB4D8'
  const detail = tone === 'warm' ? '#F5894F' : tone === 'rose' ? '#DB7A98' : '#2C6F92'
  return (
    <motion.div
      className="absolute"
      style={{ top: `${yPct}%`, scale }}
      initial={{ x: reverse ? '110%' : '-15%' }}
      animate={{ x: reverse ? '-15%' : '110%' }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
    >
      <svg width="120" height="60" viewBox="-70 -30 140 60" className="overflow-visible">
        {/* balloon */}
        <ellipse cx="0" cy="-8" rx="48" ry="22" fill={body} />
        <path d="M -48 -8 Q 0 4 48 -8" fill={detail} opacity="0.5" />
        {/* stripes */}
        <path d="M -28 -25 Q -28 -8 -28 8"  stroke={detail} strokeWidth="1.2" fill="none" />
        <path d="M 0 -28 L 0 10"             stroke={detail} strokeWidth="1.2" fill="none" />
        <path d="M 28 -25 Q 28 -8 28 8"      stroke={detail} strokeWidth="1.2" fill="none" />
        {/* gondola */}
        <rect x="-16" y="12" width="32" height="11" rx="2.5" fill="#9D6E45" />
        {/* ropes */}
        <line x1="-15" y1="12" x2="-24" y2="-4" stroke="#3A2418" strokeWidth="0.8" />
        <line x1="15"  y1="12" x2="24"  y2="-4" stroke="#3A2418" strokeWidth="0.8" />
        {/* windows — glowing pulse */}
        {[-8, 0, 8].map((wx, i) => (
          <motion.circle
            key={i}
            cx={wx} cy={17.5} r="1.8"
            fill="#FFE48A"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
        {/* tail flag */}
        <path d="M 48 -8 L 64 -5 L 56 0 Z" fill={detail} />
      </svg>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   BalloonDrift — hot-air balloons bobbing in place
   ════════════════════════════════════════════════════════════════════ */

interface BalloonSpec {
  xPct: number
  yPct: number
  delay: number
  color: 'rose' | 'butter'
  scale: number
}

const BALLOONS: BalloonSpec[] = [
  { xPct: 14, yPct: 27, delay: 0,   color: 'rose',   scale: 0.85 },
  { xPct: 88, yPct: 56, delay: 1.6, color: 'butter', scale: 0.95 },
]

export function BalloonDrift() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {BALLOONS.map((spec, i) => (
        <Balloon key={i} {...spec} />
      ))}
    </div>
  )
}

function Balloon({ xPct, yPct, delay, color, scale }: BalloonSpec) {
  const main = color === 'rose' ? '#F08FA8' : '#FFC678'
  const shade = color === 'rose' ? '#DB7A98' : '#F5894F'
  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${xPct}%`, top: `${yPct}%`, scale }}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 6, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg width="72" height="100" viewBox="-36 -50 72 100" className="overflow-visible">
        <ellipse cx="0" cy="-8" rx="26" ry="32" fill={main} />
        <path d="M -26 -8 Q 0 8 26 -8" fill={shade} opacity="0.45" />
        <path d="M -14 -36 Q -14 -8 -14 12" stroke="#FFE48A" strokeWidth="2.5" fill="none" />
        <path d="M 14 -36 Q 14 -8 14 12"   stroke="#FFE48A" strokeWidth="2.5" fill="none" />
        <line x1="-10" y1="28" x2="-8" y2="38" stroke="#3A2418" strokeWidth="1" />
        <line x1="10"  y1="28" x2="8"  y2="38" stroke="#3A2418" strokeWidth="1" />
        <rect x="-9" y="38" width="18" height="9" fill="#9D6E45" rx="2" />
      </svg>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   DriftingClouds — fluffy 3D-ish cloud puffs scattered across the stage
   ────────────────────────────────────────────────────────────────────
   Sit at z-[3] so they overlap the island silhouettes' edges (Disney
   "kingdom rising through the clouds" feel) but stay behind the marker
   labels (z-10). Each drifts horizontally on its own slow loop so the
   stage never feels static.
   ════════════════════════════════════════════════════════════════════ */

interface CloudSpec {
  x: number
  y: number
  size: number
  duration: number
  delay: number
  opacity: number
}

const CLOUD_SPECS: CloudSpec[] = [
  { x: 12, y: 16, size: 100, duration: 65, delay: 0,  opacity: 0.75 },
  { x: 82, y: 24, size: 120, duration: 80, delay: 6,  opacity: 0.7  },
  { x: 10, y: 41, size: 110, duration: 70, delay: 14, opacity: 0.8  },
  { x: 86, y: 54, size: 140, duration: 90, delay: 3,  opacity: 0.65 },
  { x: 14, y: 72, size: 105, duration: 75, delay: 20, opacity: 0.75 },
  { x: 80, y: 81, size: 130, duration: 95, delay: 10, opacity: 0.7  },
]

export function DriftingClouds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[3]">
      {CLOUD_SPECS.map((c, i) => (
        <motion.div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: c.size,
            height: c.size * 0.42,
            opacity: c.opacity,
          }}
          // Slow horizontal drift — direction alternates per index so
          // adjacent clouds don't all crawl the same way (more organic).
          animate={{ x: i % 2 === 0 ? ['-12%', '14%', '-12%'] : ['14%', '-12%', '14%'] }}
          transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <CloudPuff />
        </motion.div>
      ))}
    </div>
  )
}

function CloudPuff() {
  return (
    <svg
      viewBox="-50 -20 100 40"
      className="block size-full overflow-visible"
      style={{ filter: 'blur(1px)' }}
    >
      {/* Layered ellipses give a fluffy 3D cumulus silhouette. */}
      <ellipse cx="-30" cy="3"  rx="22" ry="9"  fill="white" opacity="0.72" />
      <ellipse cx="0"   cy="-2" rx="30" ry="12" fill="white" opacity="0.92" />
      <ellipse cx="28"  cy="4"  rx="24" ry="10" fill="white" opacity="0.78" />
      <ellipse cx="10"  cy="-9" rx="16" ry="7"  fill="white" opacity="0.65" />
      <ellipse cx="-15" cy="-7" rx="12" ry="6"  fill="white" opacity="0.55" />
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════════════
   PathFireflies — glowing motes that trail the JourneyPath waypoints
   ────────────────────────────────────────────────────────────────────
   Samples 3 points along each segment between consecutive stops and
   drops a soft butter-glow firefly there with a slight perpendicular
   jitter so they hover NEAR the river rather than on it (the path
   stays clean and the motes read as "guiding the way" twinkles).

   Pass `sample(i, t)` to follow an exact curve (e.g. the cubic bezier
   used by JourneyPath) instead of the straight-line shortcut between
   stops — that's the difference between motes that visibly track the
   river and motes that drift off into the cliffs at curve maxima.

   Sits at z-[12] — above the JourneyPath (z-10) so the twinkles stay
   visible on top of the glowing thread, but BELOW the island cliffs
   (z-20) so the islands cleanly occlude any mote whose perpendicular
   jitter happens to land it behind a silhouette.
   ════════════════════════════════════════════════════════════════════ */

export function PathFireflies({
  stops,
  sample,
}: {
  stops: { x: number; y: number }[]
  /** Optional curve sampler. (i, t) → point on segment i at param t∈[0,1]. */
  sample?: (segmentIndex: number, t: number) => { x: number; y: number }
}) {
  const motes = useMemo(() => {
    const arr: { x: number; y: number; size: number; delay: number; dur: number }[] = []
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i]
      const b = stops[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      // Perpendicular unit vector for jitter so motes hover NEAR the
      // path rather than on top of it (path stays clean and visible).
      const len = Math.hypot(dx, dy) || 1
      const px = -dy / len
      const py = dx / len
      for (let k = 1; k <= 3; k++) {
        const t = k / 4 // 0.25, 0.5, 0.75 — three motes per segment
        // Prefer the supplied curve sampler so the mote lands on the
        // actual bezier; fall back to straight-line lerp when callers
        // don't pass one (keeps the prop optional + back-compat).
        const onPath = sample
          ? sample(i, t)
          : { x: a.x + dx * t, y: a.y + dy * t }
        const jitter = (Math.random() - 0.5) * 4 // ±2% perpendicular
        arr.push({
          x: onPath.x + px * jitter,
          y: onPath.y + py * jitter,
          size: 5 + Math.random() * 5,
          delay: Math.random() * 2.4,
          dur: 1.8 + Math.random() * 1.6,
        })
      }
    }
    return arr
  }, [stops, sample])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[12]">
      {motes.map((m, i) => (
        <motion.span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: m.size,
            height: m.size,
            background:
              'radial-gradient(circle, rgba(255, 251, 229, 1) 0%, rgba(255, 200, 100, 0.6) 50%, transparent 80%)',
            filter: 'drop-shadow(0 0 6px var(--color-butter-glow))',
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.5, 1.3, 0.5] }}
          transition={{ duration: m.dur, delay: m.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ForegroundCloud — soft drifting cloud at the very bottom
   ════════════════════════════════════════════════════════════════════ */

export function ForegroundCloud({ yPct = 97 }: { yPct?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-0"
      style={{ top: `${yPct}%` }}
    >
      <svg
        viewBox="0 0 800 80"
        preserveAspectRatio="none"
        className="block h-20 w-full"
        style={{ filter: 'blur(2px)' }}
      >
        <ellipse cx="60"  cy="50" rx="100" ry="20" fill="white" opacity="0.7" />
        <ellipse cx="260" cy="40" rx="140" ry="22" fill="white" opacity="0.8" />
        <ellipse cx="520" cy="48" rx="160" ry="24" fill="white" opacity="0.85" />
        <ellipse cx="740" cy="42" rx="120" ry="20" fill="white" opacity="0.75" />
      </svg>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Wanderer — child + Lumi silhouette walking the saga
   ────────────────────────────────────────────────────────────────────
   Sits between two stops on the curve, with a gentle backlight rim so
   they read against the warm sky. Animates a soft idle bob so the pair
   feels alive without distracting from the islands.
   ════════════════════════════════════════════════════════════════════ */

export function Wanderer({ x, y, size = 80 }: StagePos & { size?: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="-60 -60 120 120" width={size} height={size} className="overflow-visible">
        {/* backlight rim */}
        <motion.ellipse
          cx="0" cy="0" rx="34" ry="44" fill="#FFE48A" opacity="0.35"
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 3.5, repeat: Infinity }}
          style={{ mixBlendMode: 'screen' }}
        />

        {/* backpack */}
        <ellipse cx="-13" cy="7" rx="14" ry="16" fill="#5BAE73" />
        {/* legs */}
        <rect x="-9" y="14" width="7" height="22" rx="3" fill="#2C5680" />
        <rect x="2"  y="14" width="7" height="22" rx="3" fill="#2C5680" />
        <ellipse cx="-5" cy="38" rx="6" ry="3" fill="#3A2418" />
        <ellipse cx="6"  cy="38" rx="6" ry="3" fill="#3A2418" />
        {/* body */}
        <path d="M -13 -10 Q 0 -14 13 -10 L 15 14 L -15 14 Z" fill="#E47948" />
        {/* head */}
        <circle cx="0" cy="-22" r="11" fill="#F2D6B8" />
        <path d="M -10 -24 Q -12 -36 0 -36 Q 12 -36 10 -24 Q 8 -30 0 -30 Q -8 -30 -10 -24 Z" fill="#5C3E22" />
        <circle cx="-3" cy="-22" r="1.3" fill="#1F1B3A" />
        <circle cx="3"  cy="-22" r="1.3" fill="#1F1B3A" />
        <path d="M -2 -17 Q 0 -15 2 -17" stroke="#3A2418" strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* Lumi floating beside */}
        <motion.g
          transform="translate(36, -28)"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.4 }}
        >
          <motion.circle
            r="20" fill="#FFE48A" opacity="0.45"
            animate={{ opacity: [0.3, 0.55, 0.3], r: [18, 22, 18] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ mixBlendMode: 'screen' }}
          />
          <circle r="12" fill="#FFE48A" />
          <circle cx="-3" cy="-2" r="1.3" fill="#1F1B3A" />
          <circle cx="3"  cy="-2" r="1.3" fill="#1F1B3A" />
          <path d="M -2 3 Q 0 5 2 3" stroke="#1F1B3A" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </motion.g>
      </svg>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   BiomeScene — per-region ambient decorations behind each island disc
   ────────────────────────────────────────────────────────────────────
   Renders flora / fauna / structures themed to each region. Anchored to
   the JOURNEY_STOPS position the page already computed, with offsets so
   the decorations "peek around" the disc rather than sit underneath it.
   ════════════════════════════════════════════════════════════════════ */

export type BiomeKind =
  | 'enchanted-forest'
  | 'smart-city'
  | 'culture-island'
  | 'science-mountain'
  | 'family-kingdom'

const REGION_BIOME: Record<string, BiomeKind> = {
  'rung-ky-dieu':         'enchanted-forest',
  'thanh-pho-thong-minh': 'smart-city',
  'dao-van-hoa':          'culture-island',
  'nui-khoa-hoc':         'science-mountain',
  'vuong-quoc-gia-dinh':  'family-kingdom',
}

/**
 * Page-level wrapper — positions a biome scene at an absolute stage spot.
 * Retained for callers that still want ambient scenery decoupled from a
 * marker (e.g. background hints, isolated decorations). The cliff-island
 * markers now embed <BiomeDecorations> directly so decorations stack
 * naturally between cliff and emoji.
 */
export function BiomeScene({
  regionId,
  x,
  y,
  hero = false,
}: {
  regionId: string
  x: number
  y: number
  hero?: boolean
}) {
  const biome = REGION_BIOME[regionId]
  if (!biome) return null

  const w = hero ? 280 : 200
  const h = hero ? 200 : 160

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-[1] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%`, width: w, height: h }}
    >
      <BiomeDecorations biome={biome} width={w} height={h} />
    </div>
  )
}

/**
 * Just the inner SVG — meant to be slotted INSIDE a JourneyIsland marker,
 * sitting on the cliff's grass top so trees/houses/lanterns appear as
 * actual structures on the island (not floating ghosts behind it).
 */
export function BiomeDecorations({
  biome,
  width,
  height,
}: {
  biome: BiomeKind
  width: number
  height: number
}) {
  return (
    <svg
      viewBox="-150 -120 300 240"
      width={width}
      height={height}
      className="overflow-visible"
    >
      {biome === 'enchanted-forest'  && <ForestDecor />}
      {biome === 'smart-city'        && <CityDecor />}
      {biome === 'culture-island'    && <CultureDecor />}
      {biome === 'science-mountain'  && <ScienceDecor />}
      {biome === 'family-kingdom'    && <FamilyDecor />}
    </svg>
  )
}

/** Public lookup so callers can resolve a region id → biome kind. */
export function biomeFor(regionId: string): BiomeKind | null {
  return REGION_BIOME[regionId] ?? null
}

/* ════════════════════════════════════════════════════════════════════
   Per-region Disney dioramas
   ────────────────────────────────────────────────────────────────────
   Each Decor renders into the BiomeDecorations SVG (viewBox 300×240
   centred on grass y=0). Decorations sit at y ∈ [-80, 10] so they're
   above the cliff lip (grass band) and overflow nicely up into the sky
   without colliding with the path waypoint at y=0.
   ════════════════════════════════════════════════════════════════════ */

/* ── 🌳 Enchanted Forest ─────────────────────────────────────────────
   Layered giant trees, glowing cyan mushrooms, animated bunny, deer,
   butterflies, fireflies. Deep lush greens with bioluminescent accents. */

function ForestDecor() {
  return (
    <g>
      {/* Back layer — tall ancient tree, deep shadow green. */}
      <g transform="translate(-110, -10)">
        <rect x="-6" y="0" width="12" height="38" fill="#2A1810" rx="2" />
        <ellipse cx="0"   cy="-30" rx="32" ry="46" fill="#1F4A2E" />
        <ellipse cx="-12" cy="-50" rx="22" ry="28" fill="#2F6043" />
        <ellipse cx="14"  cy="-50" rx="22" ry="26" fill="#3D7A52" />
        <ellipse cx="-6"  cy="-72" rx="18" ry="22" fill="#5B9968" />
      </g>

      {/* Middle layer — medium tree, fuller canopy. */}
      <g transform="translate(95, -2)">
        <rect x="-5" y="0" width="10" height="30" fill="#3A2418" rx="2" />
        <ellipse cx="0"  cy="-22" rx="26" ry="34" fill="#2F6043" />
        <ellipse cx="-8" cy="-38" rx="18" ry="22" fill="#5B9968" />
        <ellipse cx="10" cy="-40" rx="16" ry="20" fill="#82C896" />
      </g>

      {/* Glowing cyan mushrooms — sit on grass, bioluminescent halo. */}
      {[
        { x: -65, h: 12, capR: 10, cap: '#67E0D2' },
        { x: -78, h:  8, capR:  7, cap: '#9CEDDE' },
        { x:  62, h: 14, capR: 11, cap: '#67E0D2' },
      ].map((m, i) => (
        <g key={i} transform={`translate(${m.x}, 8)`}>
          <motion.circle
            r={m.capR * 2.6}
            fill="#67E0D2"
            opacity="0.32"
            animate={{ opacity: [0.18, 0.45, 0.18], r: [m.capR * 2.3, m.capR * 2.8, m.capR * 2.3] }}
            transition={{ duration: 2.8 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ mixBlendMode: 'screen' }}
          />
          <rect x={-m.capR * 0.25} y={-m.h} width={m.capR * 0.5} height={m.h} rx={m.capR * 0.2} fill="#F5EBD5" />
          <ellipse cx="0" cy={-m.h} rx={m.capR} ry={m.capR * 0.6} fill={m.cap} />
          <circle cx={-m.capR * 0.3} cy={-m.h - 1} r={m.capR * 0.16} fill="white" opacity="0.85" />
          <circle cx={m.capR * 0.35} cy={-m.h + 1} r={m.capR * 0.13} fill="white" opacity="0.8" />
        </g>
      ))}

      {/* Bunny silhouette hopping on grass (right). */}
      <motion.g
        transform="translate(38, 6)"
        animate={{ y: [0, -3, 0], x: [0, 4, 0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* body */}
        <ellipse cx="0" cy="0" rx="7" ry="5" fill="#F5EBD5" />
        {/* head */}
        <circle cx="6" cy="-3" r="3.5" fill="#F5EBD5" />
        {/* ears */}
        <ellipse cx="6" cy="-9" rx="1.4" ry="4" fill="#F5EBD5" />
        <ellipse cx="8" cy="-9" rx="1.2" ry="3.5" fill="#F5EBD5" />
        {/* eye + tail */}
        <circle cx="7" cy="-3" r="0.6" fill="#1F1B3A" />
        <circle cx="-6" cy="-1" r="1.6" fill="white" />
      </motion.g>

      {/* Deer silhouette grazing on the far left. */}
      <g transform="translate(-50, 7)">
        <ellipse cx="0" cy="0" rx="10" ry="5" fill="#5C3E22" opacity="0.9" />
        <circle cx="-8" cy="-4" r="3.5" fill="#5C3E22" opacity="0.9" />
        <path d="M -10 -8 L -12 -14" stroke="#5C3E22" strokeWidth="1" opacity="0.9" />
        <path d="M  -6 -8 L  -4 -14" stroke="#5C3E22" strokeWidth="1" opacity="0.9" />
        <line x1="-3" y1="4" x2="-3" y2="9" stroke="#5C3E22" strokeWidth="1.2" opacity="0.9" />
        <line x1="3"  y1="4" x2="3"  y2="9" stroke="#5C3E22" strokeWidth="1.2" opacity="0.9" />
      </g>

      {/* Butterflies + glowing fireflies in the sky above. */}
      {[
        { x: -40, y: -45, delay: 0,   color: '#F7B5C4' },
        { x:  30, y: -60, delay: 0.6, color: '#F7B5C4' },
      ].map((b, i) => (
        <motion.g
          key={`bf-${i}`}
          transform={`translate(${b.x}, ${b.y})`}
          animate={{ y: [b.y, b.y - 6, b.y + 4, b.y] }}
          transition={{ duration: 4 + i, delay: b.delay, repeat: Infinity }}
        >
          <ellipse cx="-3" cy="0" rx="3" ry="2.4" fill={b.color} />
          <ellipse cx="3"  cy="0" rx="3" ry="2.4" fill={b.color} />
          <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#3A2418" strokeWidth="0.6" />
        </motion.g>
      ))}
      {[
        { x: -85, y: -65 },
        { x:  10, y: -80 },
        { x:  78, y: -55 },
      ].map((f, i) => (
        <motion.circle
          key={`fly-${i}`}
          cx={f.x} cy={f.y} r="1.6"
          fill="#FFFBE5"
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1.2, 0.6] }}
          transition={{ duration: 1.8 + i * 0.3, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 0 4px #FFE48A)' }}
        />
      ))}
    </g>
  )
}

/* ── 🏙️ Smart City ────────────────────────────────────────────────────
   Futuristic curved skyscrapers, glowing monorail with marching dashes,
   spinning wind turbines, holographic screens. Neon cyan + yellow. */

function CityDecor() {
  return (
    <g>
      {/* Glowing monorail track — curves above the city, marching dashes
          read as "trains of light" flowing through the city. */}
      <g>
        <path
          d="M -130 -28 Q -40 -50 50 -32 Q 110 -22 130 -36"
          stroke="#67E0D2"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.45"
          style={{ filter: 'drop-shadow(0 0 4px #67E0D2)' }}
        />
        <motion.path
          d="M -130 -28 Q -40 -50 50 -32 Q 110 -22 130 -36"
          stroke="#FFFBE5"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="3 8"
          opacity="0.85"
          animate={{ strokeDashoffset: [0, -22] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />
      </g>

      {/* Tall curved skyscraper, left — pastel orange with neon top crown. */}
      <g transform="translate(-90, 6)">
        <path
          d="M -16 0 Q -18 -40 -12 -78 Q 0 -86 12 -78 Q 18 -40 16 0 Z"
          fill="#FFD4A8"
        />
        <rect x="-12" y="-86" width="24" height="6" rx="3" fill="#F49E5A" />
        {/* monorail station ring */}
        <rect x="-14" y="-32" width="28" height="3" fill="#67E0D2" opacity="0.7" />
        {/* windows: pulsing */}
        {[0, 1, 2, 3, 4].map((j) => (
          <motion.rect
            key={j}
            x="-7" y={-66 + j * 12} width="14" height="6"
            fill="#FFE48A" rx="1"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 3 + j * 0.3, delay: j * 0.15, repeat: Infinity }}
          />
        ))}
        {/* antenna with blinking light */}
        <line x1="0" y1="-86" x2="0" y2="-98" stroke="#3A2418" strokeWidth="1.4" />
        <motion.circle
          cx="0" cy="-100" r="2.5" fill="#67E0D2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ filter: 'drop-shadow(0 0 4px #67E0D2)' }}
        />
      </g>

      {/* Mid curved tower with glass facade. */}
      <g transform="translate(-15, 4)">
        <path
          d="M -14 0 Q -16 -30 -10 -60 Q 0 -68 10 -60 Q 16 -30 14 0 Z"
          fill="#C8B8F0"
        />
        <path d="M -10 -56 Q 0 -64 10 -56 L 10 -8 Q 0 -4 -10 -8 Z" fill="#E4DAFF" opacity="0.45" />
        {[0, 1, 2, 3].map((j) => (
          <motion.rect
            key={j}
            x="-6" y={-50 + j * 12} width="12" height="6"
            fill="#FFE48A" rx="1"
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 3 + j * 0.3, delay: j * 0.2, repeat: Infinity }}
          />
        ))}
      </g>

      {/* Curved skyscraper, right — pink rose, taller. */}
      <g transform="translate(75, 4)">
        <path
          d="M -15 0 Q -17 -42 -11 -82 Q 0 -90 11 -82 Q 17 -42 15 0 Z"
          fill="#FFB7CB"
        />
        <rect x="-11" y="-90" width="22" height="5" rx="2.5" fill="#F08FA8" />
        {[0, 1, 2, 3, 4].map((j) => (
          <motion.rect
            key={j}
            x="-7" y={-72 + j * 13} width="14" height="6"
            fill="#FFE48A" rx="1"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 3 + j * 0.4, delay: j * 0.18, repeat: Infinity }}
          />
        ))}
      </g>

      {/* Wind turbines spinning on the city skyline. */}
      {[
        { x: -130, y: -50, scale: 0.9 },
        { x:  120, y: -56, scale: 1   },
      ].map((t, i) => (
        <g key={`tb-${i}`} transform={`translate(${t.x}, ${t.y}) scale(${t.scale})`}>
          <line x1="0" y1="0" x2="0" y2="36" stroke="#C8B8F0" strokeWidth="2.4" strokeLinecap="round" />
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 6 + i * 1.5, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '0px 0px' }}
          >
            {[0, 120, 240].map((deg) => (
              <ellipse
                key={deg}
                cx="0" cy="-12" rx="2" ry="11"
                fill="#FFFBE5"
                transform={`rotate(${deg})`}
              />
            ))}
            <circle r="2" fill="#9C82E6" />
          </motion.g>
        </g>
      ))}

      {/* Floating holographic screens. */}
      {[
        { x: -65, y: -75, w: 18, h: 12 },
        { x:  45, y: -82, w: 16, h: 11 },
      ].map((h, i) => (
        <motion.g
          key={`holo-${i}`}
          transform={`translate(${h.x}, ${h.y})`}
          animate={{ y: [h.y, h.y - 3, h.y] }}
          transition={{ duration: 3 + i * 0.5, delay: i * 0.4, repeat: Infinity }}
        >
          <rect x={-h.w / 2} y={-h.h / 2} width={h.w} height={h.h} rx="1.5"
                fill="#67E0D2" opacity="0.25" />
          <rect x={-h.w / 2} y={-h.h / 2} width={h.w} height={h.h} rx="1.5"
                fill="none" stroke="#67E0D2" strokeWidth="0.8" opacity="0.9" />
          <line x1={-h.w / 2 + 2} y1={-h.h / 2 + 3} x2={h.w / 2 - 2} y2={-h.h / 2 + 3} stroke="#FFFBE5" strokeWidth="0.6" opacity="0.7" />
          <line x1={-h.w / 2 + 2} y1={-h.h / 2 + 6} x2={h.w / 2 - 6} y2={-h.h / 2 + 6} stroke="#FFFBE5" strokeWidth="0.6" opacity="0.5" />
        </motion.g>
      ))}
    </g>
  )
}

/* ── 🏝️ Culture Island ────────────────────────────────────────────────
   3-tier pagoda with curved roofs, row of swinging Hội An lanterns,
   wooden boat drifting on rippling water. Festive reds, golds, lanterns. */

function CultureDecor() {
  const lanterns = [-95, -65, -38, -10, 16, 44, 74, 100]
  return (
    <g>
      {/* Row of swinging lanterns strung across the sky. */}
      <line x1="-115" y1="-78" x2="115" y2="-78" stroke="rgba(255,235,180,0.55)" strokeWidth="0.6" />
      {lanterns.map((lx, i) => {
        const c = ['#FF6B5C', '#FFB36B', '#F5894F', '#FFE48A', '#FF6B5C', '#FFB36B', '#F5894F', '#FFE48A'][i]
        return (
          <motion.g
            key={i}
            // Anchor the swing at the rope top — gently rocking ±6°.
            animate={{ rotate: [-6, 6, -6] }}
            transition={{ duration: 3.2 + i * 0.18, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${lx}px -78px` }}
          >
            <line x1={lx} y1="-78" x2={lx} y2="-62" stroke="rgba(255,235,180,0.55)" strokeWidth="0.6" />
            <ellipse cx={lx} cy="-55" rx="6" ry="9" fill={c} />
            <ellipse cx={lx - 2} cy="-58" rx="2" ry="4" fill="rgba(255,255,255,0.4)" />
            <line x1={lx} y1="-46" x2={lx} y2="-43" stroke="#3A2418" strokeWidth="0.8" />
            <motion.circle
              cx={lx} cy="-55" r="14" fill={c} opacity="0.45"
              animate={{ opacity: [0.28, 0.6, 0.28] }}
              transition={{ duration: 3 + i * 0.2, delay: i * 0.2, repeat: Infinity }}
              style={{ mixBlendMode: 'screen' }}
            />
          </motion.g>
        )
      })}

      {/* 3-tier pagoda with sweeping curved roofs (Vietnamese chùa style). */}
      <g transform="translate(35, -8)">
        {/* base body */}
        <rect x="-20" y="-26" width="40" height="26" fill="#C5874C" rx="2" />
        <rect x="-22" y="-30" width="44" height="5" fill="#8B3A2F" />
        {/* lowest roof — curved sweep */}
        <path d="M -28 -26 Q -22 -36 0 -38 Q 22 -36 28 -26 Q 16 -32 0 -32 Q -16 -32 -28 -26 Z" fill="#8B3A2F" />
        {/* mid body */}
        <rect x="-15" y="-50" width="30" height="14" fill="#C5874C" />
        <path d="M -22 -50 Q -16 -58 0 -60 Q 16 -58 22 -50 Q 12 -54 0 -54 Q -12 -54 -22 -50 Z" fill="#A04738" />
        {/* top body */}
        <rect x="-9" y="-70" width="18" height="10" fill="#C5874C" />
        <path d="M -14 -70 Q -10 -76 0 -78 Q 10 -76 14 -70 Q 6 -73 0 -73 Q -6 -73 -14 -70 Z" fill="#A04738" />
        {/* spire on very top */}
        <line x1="0" y1="-78" x2="0" y2="-86" stroke="#3A2418" strokeWidth="1.2" />
        <circle cx="0" cy="-87" r="2" fill="#FFE48A" />
        {/* door + windows glowing */}
        <rect x="-5" y="-18" width="10" height="18" fill="#3A2418" rx="1" />
        <motion.rect
          x="-15" y="-18" width="8" height="8" fill="#FFE48A" rx="1"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.rect
          x="7" y="-18" width="8" height="8" fill="#FFE48A" rx="1"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, delay: 0.5, repeat: Infinity }}
        />
      </g>

      {/* Wooden boat on rippling water (left). */}
      <g transform="translate(-80, 4)">
        {/* water plane */}
        <ellipse cx="0" cy="5" rx="44" ry="6" fill="#7BC8DC" opacity="0.85" />
        <ellipse cx="0" cy="3" rx="38" ry="4.5" fill="#A8E0EC" />
        {/* ripple rings — animated outward */}
        {[0, 0.8].map((d, i) => (
          <motion.ellipse
            key={i}
            cx="0" cy="3" rx="10" ry="2.5"
            fill="none" stroke="#FFFBE5" strokeWidth="0.6" opacity="0.55"
            animate={{ rx: [10, 30], opacity: [0.6, 0] }}
            transition={{ duration: 3, delay: d, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
        {/* boat hull */}
        <motion.g
          animate={{ y: [0, -1.2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M -12 0 Q 0 6 12 0 L 10 4 L -10 4 Z" fill="#5C3E22" />
          <line x1="0" y1="-14" x2="0" y2="0" stroke="#5C3E22" strokeWidth="1.2" />
          <path d="M 0 -14 L 9 -6 L 0 -6 Z" fill="#FFE48A" />
          {/* warm lantern hung on boat tip */}
          <circle cx="-10" cy="-3" r="1.6" fill="#FFB36B" />
        </motion.g>
      </g>

      {/* Small áo dài silhouette walking the deck. */}
      <g transform="translate(80, 4)">
        <circle cx="0" cy="-12" r="3" fill="#241F3E" />
        <path d="M -4 -8 L 4 -8 L 3.5 2 L -3.5 2 Z" fill="#FCD2DF" />
        <line x1="-1.5" y1="0" x2="-1.5" y2="6" stroke="#241F3E" strokeWidth="1" />
        <line x1="1.5"  y1="0" x2="1.5"  y2="6" stroke="#241F3E" strokeWidth="1" />
      </g>
    </g>
  )
}

/* ── 🗻 Science Mountain ──────────────────────────────────────────────
   Snow-capped purple peaks, futuristic observatory dome + telescope,
   floating magnetic crystals, starry aura, comet streaking. */

function ScienceDecor() {
  return (
    <g>
      {/* Starry aura behind the mountain — tiny twinkling stars in sky. */}
      {[
        { x: -100, y: -75 }, { x: -60, y: -90 }, { x: -20, y: -82 },
        { x:  35, y: -85 }, { x:  80, y: -78 }, { x: 110, y: -88 },
        { x: -85, y: -55 }, { x:  60, y: -52 }, { x: 100, y: -60 },
      ].map((s, i) => (
        <motion.circle
          key={`star-${i}`}
          cx={s.x} cy={s.y} r={1 + (i % 2) * 0.6}
          fill="#FFFBE5"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2 + (i % 3) * 0.5, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 0 3px #C5B0FF)' }}
        />
      ))}

      {/* Snow-capped purple mountain peaks behind. */}
      <g>
        {/* Mountain body */}
        <path
          d="M -120 8 L -75 -50 L -45 -20 L -10 -70 L 25 -28 L 60 -60 L 95 -22 L 120 8 Z"
          fill="#5E4DA0"
        />
        {/* Snow caps — each peak tip painted white. */}
        <path d="M -82 -42 L -75 -50 L -68 -42 L -73 -38 Z" fill="#F2EBFF" />
        <path d="M -17 -62 L -10 -70 L -3 -62 L -8 -58 Z" fill="#F2EBFF" />
        <path d="M  53 -52 L  60 -60 L  67 -52 L  62 -48 Z" fill="#F2EBFF" />
        {/* Subtle highlight ridge on peaks */}
        <path d="M -75 -50 Q -60 -36 -45 -20" stroke="#C5B0FF" strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M -10 -70 Q  5 -50 25 -28" stroke="#C5B0FF" strokeWidth="1" fill="none" opacity="0.6" />
      </g>

      {/* Observatory dome on the tallest peak (-10, -70). */}
      <g transform="translate(-10, -76)">
        <rect x="-12" y="-2" width="24" height="9" fill="#9C82E6" rx="2" />
        <path d="M -14 -2 Q 0 -18 14 -2 Z" fill="#E4DAFF" />
        <rect x="-1" y="-12" width="2" height="6" fill="#FFE48A" />
        {/* Telescope poking out of dome */}
        <g transform="translate(6, -10) rotate(-30)">
          <rect x="-1.5" y="-12" width="3" height="14" fill="#3D2E68" rx="0.8" />
          <circle cx="0" cy="-14" r="3" fill="#FFE48A" />
        </g>
      </g>

      {/* Floating magnetic crystals — slow bob + rotate. */}
      {[
        { x: -100, y: -10, s: 13, c: '#C5B0FF' },
        { x:  100, y: -18, s: 15, c: '#9C82E6' },
        { x: -55,  y: -20, s: 10, c: '#E4DAFF' },
        { x:  55,  y: -32, s: 11, c: '#C5B0FF' },
      ].map((s, i) => (
        <motion.g
          key={`xt-${i}`}
          animate={{ y: [0, -6, 0], rotate: [0, 8, -4, 0] }}
          transition={{ duration: 4 + i, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${s.x}px ${s.y}px` }}
        >
          {/* glow halo */}
          <motion.circle
            cx={s.x} cy={s.y} r={s.s * 1.4} fill={s.c} opacity="0.3"
            animate={{ opacity: [0.18, 0.45, 0.18] }}
            transition={{ duration: 2.6, delay: i * 0.3, repeat: Infinity }}
            style={{ mixBlendMode: 'screen' }}
          />
          {/* crystal shape (octahedron-ish) */}
          <polygon
            points={`${s.x},${s.y - s.s} ${s.x + s.s * 0.55},${s.y} ${s.x},${s.y + s.s} ${s.x - s.s * 0.55},${s.y}`}
            fill={s.c}
            opacity="0.95"
          />
          {/* sparkle highlight */}
          <line x1={s.x - 1} y1={s.y - s.s * 0.4} x2={s.x + 1} y2={s.y - s.s * 0.7}
                stroke="white" strokeWidth="0.6" opacity="0.85" />
        </motion.g>
      ))}

      {/* Comet streaking across the sky. */}
      <motion.g
        animate={{ x: [-140, 160], y: [10, -110], opacity: [0, 1, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeOut' }}
      >
        <circle cx="0" cy="0" r="2.4" fill="#FFFBE5" style={{ filter: 'drop-shadow(0 0 4px #FFE48A)' }} />
        <path d="M -2 0 L -22 6 L -22 -6 Z" fill="#FFE48A" opacity="0.7" />
      </motion.g>
    </g>
  )
}

/* ── 💖 Family Kingdom (climax) ───────────────────────────────────────
   Cozy cottage with chimney smoke, MASSIVE Tree of Life with HEART
   leaves, brightest warm aura, drifting memory lanterns, cherry petals. */

function FamilyDecor() {
  // Petals seeded once so they don't reshuffle every render.
  const petals = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: -130 + i * 24,
        delay: (i * 0.5) % 4,
        duration: 9 + (i % 4),
      })),
    [],
  )

  // Heart-leaf cluster around the Tree of Life. Pre-computed once.
  const hearts = useMemo(() => {
    const positions: { x: number; y: number; s: number; color: string }[] = []
    const ring = (count: number, rx: number, ry: number, cy: number, palette: string[]) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2
        positions.push({
          x: Math.cos(a) * rx,
          y: cy + Math.sin(a) * ry,
          s: 6 + (i % 3) * 1.4,
          color: palette[i % palette.length],
        })
      }
    }
    ring(10, 38, 22, -32, ['#F08FA8', '#FF6B5C', '#FFB36B'])
    ring(8,  26, 16, -42, ['#FFB36B', '#FFE48A', '#F08FA8'])
    ring(6,  16, 10, -50, ['#FFE48A', '#F08FA8'])
    return positions
  }, [])

  return (
    <g>
      {/* Brightest warm aura — the hero halo, larger and more saturated. */}
      <motion.ellipse
        cx="0" cy="-30" rx="170" ry="100" fill="#FFB36B" opacity="0.35"
        animate={{ opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 5, repeat: Infinity }}
        style={{ mixBlendMode: 'screen' }}
      />
      <motion.ellipse
        cx="0" cy="-35" rx="100" ry="60" fill="#FFE48A" opacity="0.4"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, delay: 0.5, repeat: Infinity }}
        style={{ mixBlendMode: 'screen' }}
      />

      {/* MASSIVE Tree of Life — central focal point. */}
      <g transform="translate(0, -8)">
        {/* trunk + root flare */}
        <path d="M -10 8 Q -16 -20 -6 -60 Q 6 -20 10 8 Z" fill="#3A2418" />
        <path d="M -7 6 Q -12 -16 -4 -52" stroke="#5C3E22" strokeWidth="1.6" fill="none" />
        {/* heart-shaped leaves clustered in a tree-canopy ring */}
        {hearts.map((h, i) => (
          <motion.g
            key={`heart-${i}`}
            transform={`translate(${h.x}, ${h.y})`}
            animate={{ y: [h.y, h.y - 2, h.y] }}
            transition={{ duration: 3 + (i % 3) * 0.3, delay: (i * 0.1) % 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Two overlapping circles + downward triangle = heart silhouette. */}
            <path
              d={`M 0 ${-h.s * 0.2} C ${-h.s * 0.6} ${-h.s * 0.9}, ${-h.s} 0, 0 ${h.s * 0.7} C ${h.s} 0, ${h.s * 0.6} ${-h.s * 0.9}, 0 ${-h.s * 0.2} Z`}
              fill={h.color}
              opacity="0.95"
            />
          </motion.g>
        ))}
        {/* canopy core highlight */}
        <motion.circle
          cx="0" cy="-40" r="14" fill="#FFFBE5" opacity="0.55"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </g>

      {/* Cozy cottage on the left edge of the village. */}
      <g transform="translate(-95, 10)">
        {/* warm window halo */}
        <motion.circle
          cx="0" cy="-15" r="32" fill="#FFC678" opacity="0.4"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ mixBlendMode: 'screen' }}
        />
        {/* body */}
        <rect x="-22" y="-30" width="44" height="30" fill="#FFE7C2" rx="2" />
        {/* sweeping pink roof */}
        <polygon points="-28,-30 0,-50 28,-30" fill="#DB7A98" />
        <polygon points="-28,-30 28,-30 22,-26 -22,-26" fill="#8B3A2F" />
        {/* door */}
        <rect x="-5" y="-16" width="10" height="16" fill="#3A2418" rx="1" />
        <circle cx="3" cy="-8" r="0.8" fill="#FFE48A" />
        {/* glowing windows */}
        <motion.rect
          x="-16" y="-22" width="8" height="8" fill="#FFE48A" rx="1"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.rect
          x="8" y="-22" width="8" height="8" fill="#FFE48A" rx="1"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, delay: 0.6, repeat: Infinity }}
        />
        {/* chimney */}
        <rect x="10" y="-46" width="6" height="14" fill="#8B3A2F" />
        <rect x="9"  y="-47" width="8" height="2"  fill="#3A2418" />
        {/* curling smoke — three puffs rising on stagger */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={`smoke-${i}`}
            cx="13" cy="-48" r="3"
            fill="rgba(255,255,255,0.7)"
            animate={{
              cy: [-48, -76 - i * 4],
              cx: [13, 13 + Math.sin(i) * 6],
              r: [2, 5],
              opacity: [0.7, 0],
            }}
            transition={{ duration: 4, delay: i * 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
      </g>

      {/* Smaller companion cottage on the right. */}
      <g transform="translate(85, 14)">
        <motion.circle
          cx="0" cy="-12" r="24" fill="#FFC678" opacity="0.35"
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 3.5, delay: 0.3, repeat: Infinity }}
          style={{ mixBlendMode: 'screen' }}
        />
        <rect x="-16" y="-22" width="32" height="22" fill="#FFD2DE" rx="2" />
        <polygon points="-20,-22 0,-36 20,-22" fill="#A04738" />
        <rect x="-3" y="-12" width="6" height="12" fill="#3A2418" rx="1" />
        <motion.rect
          x="-12" y="-17" width="6" height="6" fill="#FFE48A" rx="1"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.rect
          x="6" y="-17" width="6" height="6" fill="#FFE48A" rx="1"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, delay: 0.4, repeat: Infinity }}
        />
      </g>

      {/* Floating memory lanterns drifting up. */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -110 + i * 44
        return (
          <motion.g
            key={`mem-${i}`}
            transform={`translate(${x}, -65)`}
            animate={{ y: [0, -25, 0], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 7 + (i % 3), delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx="0" cy="0" rx="4" ry="6" fill="#FFC678" />
            <circle cx="0" cy="0" r="11" fill="#FFB36B" opacity="0.45" style={{ mixBlendMode: 'screen' }} />
            <line x1="0" y1="6" x2="0" y2="11" stroke="#3A2418" strokeWidth="0.5" />
          </motion.g>
        )
      })}

      {/* Cherry-blossom petals falling. */}
      {petals.map((p, i) => (
        <motion.path
          key={i}
          d={`M ${p.x} -100 Q ${p.x + 4} -95 ${p.x} -90 Q ${p.x - 4} -95 ${p.x} -100 Z`}
          fill="#FBD0E0"
          animate={{ y: [0, 200], opacity: [0.7, 0], rotate: [0, 180] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </g>
  )
}

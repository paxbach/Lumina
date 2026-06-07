import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { FloatingLeaves } from '@/components/map/FloatingLeaves'
import { ScienceMountainMap } from '@/components/map/ScienceMountainMap'
import { EnchantedForestMap } from '@/components/map/EnchantedForestMap'
import {
  AirshipFleet,
  BalloonDrift,
  BiomeDecorations,
  DriftingClouds,
  ForegroundCloud,
  PathFireflies,
  SkyIsland,
  Wanderer,
  biomeFor,
} from '@/components/map/WorldAmbience'
import { CUSTOM_NODE_ICONS } from '@/components/map/CustomNodeIcons'
import { Confetti } from '@/components/quest/Confetti'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import {
  easeCozy,
  springBouncy,
  springSoft,
  staggerItem,
} from '@/utils/motion'
import type { PastelTone, Region, SubNode } from '@/types'

/* ════════════════════════════════════════════════════════════════════
   Motion variants — cinematic camera-zoom feel
   ════════════════════════════════════════════════════════════════════ */

/**
 * World-map "camera dive": on exit, scale up the whole map (origin at the
 * clicked region) so it reads as the camera plunging down into the land,
 * then fades. On re-entry from a sub-map, it gently springs back in.
 */
const worldMapPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  enter: {
    opacity: 1,
    scale: 1,
    transition: { ...springSoft, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    scale: 2.6, // bigger zoom — feels like the camera is landing
    transition: { duration: 0.62, ease: [0.55, 0, 0.85, 0] }, // strong ease-in
  },
}

/**
 * Sub-map "settles onto the ground": pops in slightly oversized then springs
 * to natural size. Exits by shrinking — feels like the camera lifting back up.
 */
const subMapPanelVariants: Variants = {
  initial: { opacity: 0, scale: 1.1 },
  enter: {
    opacity: 1,
    scale: 1,
    transition: { ...springBouncy, delay: 0.1 },
  },
  exit: {
    opacity: 0,
    scale: 0.86,
    transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
  },
}

const subNodesStaggerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.35 } },
}

/* ════════════════════════════════════════════════════════════════════
   Vertical Saga Map — island positions + path topology
   ────────────────────────────────────────────────────────────────────
   Mobile-first vertical scroll surface (Duolingo-style). Coordinates are
   percentages of the stage's width and height so the zigzag holds at
   any viewport size. JOURNEY_ORDER is the narrative reading order —
   the bezier path connects islands in this exact sequence, top to
   bottom, so the kid follows a single continuous "Ánh sáng" stream.
   ════════════════════════════════════════════════════════════════════ */

interface JourneyStop {
  regionId: string
  /** Centre of the island disc, % of stage width. */
  x: number
  /** Centre of the island disc, % of stage height. */
  y: number
  /** Disc size in px. Family Kingdom is bumped to read as the climax. */
  size: 'standard' | 'hero'
}

const JOURNEY_STOPS: JourneyStop[] = [
  // 1 — Enchanted Forest, top-left
  { regionId: 'rung-ky-dieu',         x: 22, y:  9,  size: 'standard' },
  // 2 — Science Mountain, mid-top right
  { regionId: 'nui-khoa-hoc',         x: 78, y: 29,  size: 'standard' },
  // 3 — Smart City, middle left
  { regionId: 'thanh-pho-thong-minh', x: 22, y: 49,  size: 'standard' },
  // 4 — Culture Island, mid-bottom right
  { regionId: 'dao-van-hoa',          x: 78, y: 69,  size: 'standard' },
  // 5 — Family Kingdom, absolute bottom-center, larger
  { regionId: 'vuong-quoc-gia-dinh',  x: 50, y: 89,  size: 'hero'     },
]

/* ── Bezier helpers ───────────────────────────────────────────────────
   The journey path connects island grass-surface centres with cubic
   beziers tuned for a "horizontal departure → diagonal drop → horizontal
   arrival" shape. This is the key trick that stops the path visually
   slicing through cliff bodies: by leaving each island almost
   horizontally (parallel to the grass top), the curve clears the cliff
   silhouette outward before it starts descending toward the next stop.

   Two helpers are exposed so other layers (PathFireflies, future
   travellers) can sample the SAME curve the SVG paints — keeps motes
   and dots glued to the actual line, not a straight-line approximation.
   ──────────────────────────────────────────────────────────────────── */

interface Point {
  x: number
  y: number
}

/**
 * Control-point recipe for a single a → b segment.
 *  • horizPull pushes c1/c2 from each endpoint TOWARD the other along
 *    the x-axis (capped at 22% stage width so distant stops don't blow
 *    out into a hairpin).
 *  • vertPull keeps c1/c2 near their endpoint's y so the path exits
 *    and re-enters almost horizontally — only the middle stretch
 *    does the heavy lifting on the vertical move.
 */
function journeyControlPoints(a: Point, b: Point): { c1: Point; c2: Point } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dirX = Math.sign(dx) || 1
  const horizPull = Math.min(22, Math.abs(dx) * 0.42) * dirX
  const vertPull  = dy * 0.18
  return {
    c1: { x: a.x + horizPull, y: a.y + vertPull },
    c2: { x: b.x - horizPull, y: b.y - vertPull },
  }
}

/** Standard cubic-bezier interpolation. t in [0, 1]. */
function pointOnCubicBezier(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const u = 1 - t
  const uu = u * u
  const tt = t * t
  return {
    x: uu * u * a.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + tt * t * b.x,
    y: uu * u * a.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + tt * t * b.y,
  }
}

function buildJourneyPath(stops: JourneyStop[]): string {
  if (stops.length === 0) return ''
  const head = `M ${stops[0].x} ${stops[0].y}`
  const segments: string[] = [head]
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]
    const b = stops[i]
    const { c1, c2 } = journeyControlPoints(a, b)
    segments.push(`C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`)
  }
  return segments.join(' ')
}

const JOURNEY_PATH_D = buildJourneyPath(JOURNEY_STOPS)

/**
 * Sample point on the journey path at segment index `i` and parameter
 * `t` ∈ [0, 1]. Module-scope so the reference is stable — passing it
 * into PathFireflies' useMemo deps doesn't force re-sampling on every
 * parent re-render.
 */
const sampleJourneyPath = (i: number, t: number): Point => {
  const a = JOURNEY_STOPS[i]
  const b = JOURNEY_STOPS[i + 1]
  const { c1, c2 } = journeyControlPoints(a, b)
  return pointOnCubicBezier(a, c1, c2, b, t)
}

const ZOOM_ORIGINS: Record<string, { x: number; y: number }> = Object.fromEntries(
  JOURNEY_STOPS.map((s) => [s.regionId, { x: s.x, y: s.y }]),
)

/* ════════════════════════════════════════════════════════════════════
   Static visual config per region
   ════════════════════════════════════════════════════════════════════ */

interface RegionVisual {
  emoji: string
  tone: PastelTone
  /** Tailwind classes for the world-map marker circle. */
  markerBg: string
  /** Tailwind border class for the marker. */
  border: string
  /** Tailwind class for the glow halo behind the marker. */
  glow: string
  /** CSS gradient string used for the sub-map canvas background. */
  canvasBg: string
}

const REGION_VISUALS: Record<string, RegionVisual> = {
  'rung-ky-dieu': {
    // Rừng Kỳ Diệu — multi-sensory forest diorama. Soft sage canopy
    // wash over a butter/peach forest-floor horizon, lit by a sunlit
    // glade radial. Matches the original v8 palette so the SVG path
    // and biome decorations sit on the same colour bed they did
    // before the v9 safari detour.
    emoji: '🌳',
    tone: 'mint',
    markerBg: 'bg-sage-100',
    border: 'border-sage-400',
    glow: 'bg-sage-300',
    canvasBg: `
      radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,0.55) 0%, transparent 70%),
      linear-gradient(160deg, var(--color-sage-50) 0%, var(--color-butter-50) 55%, var(--color-peach-50) 100%)
    `,
  },
  'thanh-pho-thong-minh': {
    emoji: '🏙️',
    tone: 'lavender',
    markerBg: 'bg-lavender-100',
    border: 'border-lavender-400',
    glow: 'bg-lavender-300',
    canvasBg: `
      radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,0.55) 0%, transparent 70%),
      linear-gradient(160deg, var(--color-lavender-50) 0%, var(--color-sky-50) 100%)
    `,
  },
  'dao-van-hoa': {
    emoji: '🏝️',
    tone: 'butter',
    markerBg: 'bg-butter-100',
    border: 'border-butter-400',
    glow: 'bg-butter-300',
    canvasBg: `
      radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,0.55) 0%, transparent 70%),
      linear-gradient(160deg, var(--color-butter-50) 0%, var(--color-peach-50) 100%)
    `,
  },
  'nui-khoa-hoc': {
    emoji: '🗻',
    tone: 'sky',
    markerBg: 'bg-sky-100',
    border: 'border-sky-400',
    glow: 'bg-sky-300',
    canvasBg: `
      radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,0.55) 0%, transparent 70%),
      linear-gradient(160deg, var(--color-sky-50) 0%, var(--color-lavender-50) 100%)
    `,
  },
  'vuong-quoc-gia-dinh': {
    emoji: '💖',
    tone: 'peach',
    markerBg: 'bg-peach-100',
    border: 'border-peach-400',
    glow: 'bg-peach-300',
    canvasBg: `
      radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,0.55) 0%, transparent 70%),
      linear-gradient(160deg, var(--color-peach-50) 0%, var(--color-cream-100) 100%)
    `,
  },
}

const FALLBACK_VISUAL: RegionVisual = {
  emoji: '✨',
  tone: 'peach',
  markerBg: 'bg-cream-100',
  border: 'border-cream-200',
  glow: 'bg-cream-200',
  canvasBg: 'linear-gradient(160deg, var(--color-cream-50), var(--color-peach-50))',
}

const SUBNODE_EMOJI: Record<SubNode['type'], string> = {
  quest: '📜',
  lesson: '📚',
  minigame: '🎮',
}

const SUBNODE_LABEL: Record<SubNode['type'], string> = {
  quest: 'Nhiệm vụ',
  lesson: 'Bài học',
  minigame: 'Mini-game',
}

const NODE_TYPE_RING: Record<SubNode['type'], string> = {
  quest:    'border-peach-300 bg-peach-50/95',
  lesson:   'border-lavender-300 bg-lavender-50/95',
  minigame: 'border-sage-300 bg-sage-50/95',
}

/* ════════════════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════════════════ */

export default function WorldMapPage() {
  const regions = useAppStore((s) => s.regions)
  const lastCompletedRegion = useAppStore((s) => s.lastCompletedRegion)
  const clearLastCompletedRegion = useAppStore(
    (s) => s.clearLastCompletedRegion,
  )

  // ═══════════════════════════════════════════════════════════════════
  // URL is the single source of truth for "which sub-map is open".
  //
  // Why not useState: a sub-map mission page (ForestGamePage, QuestDetail,
  // …) navigates to /game/forest/<id>?region=<id>, which unmounts this
  // component. When the kid comes back via navigate('/map?region=<id>')
  // or the browser back button, local useState would have been wiped — so
  // they'd land on the world view instead of the sub-map they were in.
  // Anchoring on `?region=` makes the back/forward navigation lossless
  // and lets deep-links open straight into a sub-map.
  // ═══════════════════════════════════════════════════════════════════
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRegionId = searchParams.get('region')

  // Anchor for the camera-zoom transform — defaults to centre, gets updated
  // when the player taps a region so the zoom dives at the clicked land.
  // Purely UI state, no need to round-trip through the URL.
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 40 })

  const selectedRegion =
    selectedRegionId != null
      ? regions.find((r) => r.id === selectedRegionId) ?? null
      : null

  const masteredRegion =
    lastCompletedRegion != null
      ? regions.find((r) => r.id === lastCompletedRegion) ?? null
      : null

  const handleSelectRegion = (id: string) => {
    const pos = ZOOM_ORIGINS[id]
    if (pos) setZoomOrigin(pos)
    // `replace: false` (default) pushes a new history entry so the
    // browser back button pops sub-map → world view naturally.
    setSearchParams({ region: id })
  }

  const handleBackToWorld = () => {
    // Clearing the query brings us back to the world view; same history
    // semantics as the island click, just in reverse.
    setSearchParams({})
  }

  const transformOriginStyle = {
    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
  } as const

  return (
    <PageLayout
      // `full` releases the inner max-w-6xl + px padding so WorldMapView
      // can stretch edge-to-edge via the screen-width breakout trick.
      // Submap view (RegionSubMapView) sets its own max-width internally.
      maxWidth="full"
      // World map renders its own floating glass header panel; drop the
      // sticky PageLayout header here so the two don't double-stack.
      // Submap view keeps the standard header for context + back nav.
      header={
        selectedRegion ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-500">
              Bản đồ chi tiết
            </p>
            <h1 className="text-2xl font-display font-bold text-cocoa-900">
              {selectedRegion.name}
            </h1>
          </div>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        {selectedRegion ? (
          <motion.div
            key="submap"
            variants={subMapPanelVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            style={transformOriginStyle}
          >
            <RegionSubMapView
              region={selectedRegion}
              onBack={handleBackToWorld}
            />
          </motion.div>
        ) : (
          <motion.div
            key="world"
            variants={worldMapPanelVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            style={transformOriginStyle}
          >
            <WorldMapView regions={regions} onSelect={handleSelectRegion} />
          </motion.div>
        )}
      </AnimatePresence>

      <RegionMasteredOverlay
        region={masteredRegion}
        onDismiss={clearLastCompletedRegion}
      />
    </PageLayout>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Vertical Saga Map — mobile-first scrolling journey
   ────────────────────────────────────────────────────────────────────
   Replaces the horizontal panoramic WorldScene. The stage is a tall
   (~140vh) vertical canvas with a morning-to-twilight sky gradient,
   5 floating islands placed in a zigzag, and a glowing bezier path
   that meanders between them in narrative order. Reads like a
   classic mobile journey map (Duolingo / Pokémon).
   ════════════════════════════════════════════════════════════════════ */

interface WorldMapViewProps {
  regions: Region[]
  onSelect: (id: string) => void
}

const TONE_GLOW_COLOR: Record<PastelTone, string> = {
  peach:    'var(--color-peach-glow)',
  mint:     'var(--color-sage-glow)',
  butter:   'var(--color-butter-glow)',
  lavender: 'var(--color-lavender-glow)',
  sky:      'var(--color-sky-glow)',
}

function WorldMapView({ regions, onSelect }: WorldMapViewProps) {
  // Refs registry — each JourneyIsland marker calls registerIslandRef(id, el)
  // on mount so the auto-focus effect can scrollIntoView the right one.
  const islandRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const registerIslandRef = (id: string, el: HTMLButtonElement | null) => {
    islandRefs.current[id] = el
  }

  // Smart auto-focus on mount: scroll the kid to the highest-priority
  // unlocked region that still has work to do, so they don't land on a
  // blank stretch of sky. Falls back to the very first stop if everything
  // is either locked or already completed.
  useEffect(() => {
    let targetId: string | null = null
    for (const stop of JOURNEY_STOPS) {
      const r = regions.find((x) => x.id === stop.regionId)
      if (!r) continue
      if (r.status === 'unlocked' && r.subNodes.some((n) => !n.isCompleted)) {
        targetId = stop.regionId
        break
      }
    }
    if (!targetId) targetId = JOURNEY_STOPS[0]?.regionId ?? null
    if (!targetId) return
    const el = islandRefs.current[targetId]
    if (!el) return
    // RAF so layout has settled (motion variants + stagger reveal first).
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    // Only run on mount — kid scrolls freely after the first focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      // ═══ FULL-BLEED BREAKOUT ═══
      // AppShell wraps the page in `max-w-[1024px] mx-auto` and PageLayout
      // adds `px-5 py-6` on main. To escape BOTH and stretch edge-to-edge
      // we use the classic full-bleed trick:
      //   width: 100vw
      //   position: relative; left: 50%
      //   margin-left/right: -50vw
      // Math: parent-center − 50vw lands on viewport-left regardless of
      // how narrow the parent column is, so the gradient and ambient
      // layers reach the very edge of the device screen.
      //
      // `z-10` keeps the AppShell bottom nav (z-30) and the floating
      // glass header (z-30) visibly on top.
      className="relative left-1/2 right-1/2 z-10 -mx-[50vw] w-screen min-h-screen overflow-x-hidden overflow-y-auto scroll-smooth pb-40"
      style={{
        // Soft cream → pink → butter wash. Lighter than the old dramatic
        // twilight so the rich dioramas / Tree of Light pop more.
        background:
          'linear-gradient(to bottom, #fdf2e9 0%, rgba(251, 207, 232, 0.4) 50%, rgba(254, 240, 138, 0.3) 100%)',
      }}
    >
      {/* ═══ FLOATING GLASS HEADER ═══
          Title + subtitle in one panel, pinned to the viewport top with
          frosted glass so the world scrolls visibly behind it. Replaces
          the standard PageLayout sticky header for the world view. */}
      <div className="pointer-events-none fixed left-1/2 top-4 z-30 w-[92%] max-w-xl -translate-x-1/2">
        <div
          className="pointer-events-auto rounded-2xl border border-amber-100 bg-white/75 p-4 text-center shadow-lg backdrop-blur-md"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sage-500">
            Living World Map
          </p>
          <h1 className="mt-0.5 font-display text-xl font-bold text-cocoa-900">
            5 vùng đất kỳ diệu
          </h1>
          <p className="mt-1 text-xs text-cocoa-700/80">
            Cuộn xuống để theo dòng <strong>Ánh sáng vàng</strong> chảy qua
            năm vùng đất kỳ diệu — chạm vào hòn đảo bất kỳ để hạ cánh!
          </p>
        </div>
      </div>

      {/* ═══ AMBIENT SKY LAYERS — full-bleed, drift edge to edge ═══
          AirshipFleet / BalloonDrift / DriftingClouds / ForegroundCloud
          are absolute inset-0 internally, so they fill THIS wrapper —
          which is now the full viewport width. Result: airships and
          balloons fly across the whole screen, not a narrow card. */}
      <AirshipFleet />
      <BalloonDrift />
      <DriftingClouds />
      <ForegroundCloud yPct={94} />

      {/* ═══ SAGA COLUMN — narrower, comfortable path width ═══
          Background is full-bleed but the islands themselves stay in a
          centred max-w-md / md:max-w-lg column so the zigzag path is
          reachable on both phones and tablets. The path SVG inside is
          % based and preserveAspectRatio=none, so it stretches cleanly
          with this column at any breakpoint.

          `mt-40` (10rem ≈ 160px) drops the column below the floating
          glass header (max ~150px tall incl. `top-4` offset + p-4 +
          3-line subtitle). Without this clearance the Enchanted Forest
          island (top of the saga at y=9%) lands directly behind the
          header on initial load — fixes the overlap bug. */}
      <div className="relative mx-auto mt-40 h-[160vh] w-full max-w-md md:max-w-lg">
        {/* Wanderer (child + Lumi) walking the saga — placed midway
            between Smart City (49%) and Culture Island (69%) on the
            curve, slightly off-axis to feel like they're on the path. */}
        <Wanderer x={50} y={59} size={84} />

        {/* Glowing bezier "Dòng Ánh sáng" weaving between the islands.
            preserveAspectRatio=none so the path stretches with the
            saga column — corners stay aligned to island disc centres. */}
        <JourneyPath />

        {/* Fireflies guiding the way — pulsing motes scattered along the
            bezier so the path always reads as ALIVE. Passing the
            `sample` callback so motes follow the actual curve, not the
            straight-line shortcut between stops. */}
        <PathFireflies stops={JOURNEY_STOPS} sample={sampleJourneyPath} />

        {/* Docking lights — small pulsing motes anchored to each
            island's grass-surface centre where the river touches down.
            Rendered at z-[21] (above the cliff at z-20) so the visual
            link between path and island reads explicitly — the river
            doesn't just disappear into the silhouette, it arrives. */}
        <JourneyDockingLights />

        {/* Drifting leaves — ambient layer above the path, below labels. */}
        <FloatingLeaves count={10} />

        {/* Tree of Light hidden per request — opens the top of the
            canvas so the floating glass header sits over an unobstructed
            sky. Re-enable by uncommenting:
              <TreeOfLight x={50} y={5} size={150} />
        */}

        {/* Bottom-of-stage label — closes the journey with a moon motif. */}
        <SagaFooter />

        {/* Five floating islands. Locked regions render a non-interactive
            pill so the kid still sees the shape of the journey but can't
            dive in yet. */}
        {JOURNEY_STOPS.map((stop, i) => {
          const region = regions.find((r) => r.id === stop.regionId)
          if (!region) return null
          if (region.status === 'locked') {
            return (
              <LockedJourneyStop
                key={stop.regionId}
                label={region.name}
                stop={stop}
              />
            )
          }
          return (
            <JourneyIsland
              key={stop.regionId}
              region={region}
              stop={stop}
              index={i}
              onSelect={onSelect}
              registerRef={registerIslandRef}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── Glowing bezier path ──────────────────────────────────────────── */

function JourneyPath() {
  return (
    <svg
      aria-hidden
      // ═══════════════════════════════════════════════════════════════
      // z-10 keeps the path ABOVE the gradient sky background but
      // BELOW the JourneyIsland markers (z-20). Earlier we tried z-[11]
      // (above the cliffs) so the path "weaves through" every island,
      // but in practice the cream dashed traveller line cut bright
      // white slashes across the cliff bodies in screenshots — it
      // read as a visual bug, not a feature. With the path at z-10
      // the glowing halo (drop-shadow + SVG bloom filter) extends far
      // enough past the path edge that the river still feels
      // continuous: even where the cliff hides the stroke itself, the
      // golden bloom peeks out around the island's silhouette. Pointer
      // events stay off so taps still land on the cliff buttons.
      // ═══════════════════════════════════════════════════════════════
      className="pointer-events-none absolute inset-0 z-10 size-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="journey-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFE08A" />
          <stop offset="55%"  stopColor="#FFB48E" />
          <stop offset="100%" stopColor="#C5A0FF" />
        </linearGradient>

        {/* ── Gold bloom filter ──────────────────────────────────────
            Pure SVG glow. Two stacked gaussian blurs (small + large)
            give the stroke a soft inner halo AND a wider outer bloom
            without us needing two extra <path> layers. The SourceGraphic
            is merged back on top so the line itself stays crisp while
            the bloom bleeds outward — exactly the bioluminescent
            "Dòng Ánh sáng vàng" the brief asks for. Bounds are bumped
            to 140%/140% so the bloom is not clipped at the filter box.
            ─────────────────────────────────────────────────────────── */}
        <filter
          id="gold-glow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blurSmall" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="5"   result="blurLarge" />
          <feMerge>
            <feMergeNode in="blurLarge" />
            <feMergeNode in="blurSmall" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Layer 1 — ultra-wide bioluminescent halo, very low opacity. Gives
          the path an almost aura-like presence in the sky and is wide
          enough to seep around the cliff silhouettes even when the
          stroke itself is hidden behind an island. */}
      <motion.path
        d={JOURNEY_PATH_D}
        fill="none"
        stroke="url(#journey-gradient)"
        strokeWidth="6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        filter="url(#gold-glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.4 }}
        transition={{ duration: 2, ease: easeCozy }}
      />

      {/* Layer 2 — mid-weight solid line, the visible "thread of light". */}
      <motion.path
        d={JOURNEY_PATH_D}
        fill="none"
        stroke="url(#journey-gradient)"
        strokeWidth="2.8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        filter="url(#gold-glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.75 }}
        transition={{ duration: 1.8, ease: easeCozy }}
      />

      {/* Layer 3 — amber dashed "current" marching DOWNWARD so the kid's
          eye is pulled Forest (top) → Family Kingdom (bottom). Recoloured
          from cream to amber-400 (#FBBF24) so it reads as flowing light,
          not a stray white line bisecting the islands. The infinite
          strokeDashoffset animation simulates light physically rushing
          along the river. */}
      <motion.path
        d={JOURNEY_PATH_D}
        fill="none"
        stroke="#FBBF24"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 5"
        vectorEffect="non-scaling-stroke"
        filter="url(#gold-glow)"
        opacity={0.9}
        animate={{ strokeDashoffset: [0, -28] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  )
}

/* ── Docking lights ──────────────────────────────────────────────────
   One small pulsing mote per island, anchored to the grass-surface
   centre (stop.x, stop.y) where the bezier path docks. Rendered as
   plain absolutely-positioned spans at z-[21] so they sit IN FRONT of
   the cliff bodies (z-20) — this is the visual handshake that makes
   the river feel like it's actually touching down on each island,
   not floating behind the silhouette.
   ──────────────────────────────────────────────────────────────────── */

function JourneyDockingLights() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[21]"
    >
      {JOURNEY_STOPS.map((stop, i) => (
        <motion.span
          key={stop.regionId}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${stop.x}%`,
            top: `${stop.y}%`,
            width: 18,
            height: 18,
            background:
              'radial-gradient(circle, rgba(255,251,229,1) 0%, rgba(251,191,36,0.85) 38%, rgba(251,191,36,0) 78%)',
            filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.9))',
          }}
          // Staggered pulse so the docks twinkle in sequence — gives the
          // path a subtle "energy flowing through the chain" feel.
          animate={{
            opacity: [0.55, 1, 0.55],
            scale: [0.9, 1.2, 0.9],
          }}
          transition={{
            duration: 2.4,
            delay: i * 0.35,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ── Stage footer (header replaced by <TreeOfLight>) ──────────────── */

function SagaFooter() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-0 flex flex-col items-center gap-1 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-200">
        Hoàng hôn yên bình
      </p>
      <motion.span
        aria-hidden
        className="select-none text-3xl"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 0 14px rgba(200, 180, 255, 0.85))' }}
      >
        🌙
      </motion.span>
    </div>
  )
}

/* ── Single journey island ────────────────────────────────────────── */

interface JourneyIslandProps {
  region: Region
  stop: JourneyStop
  index: number
  onSelect: (id: string) => void
  /**
   * Callback fired with the marker's DOM node so the page can register
   * it for auto-focus scrollIntoView. Receives `null` on unmount.
   */
  registerRef?: (id: string, el: HTMLButtonElement | null) => void
}

function JourneyIsland({
  region,
  stop,
  index,
  onSelect,
  registerRef,
}: JourneyIslandProps) {
  const visual = REGION_VISUALS[region.id] ?? FALLBACK_VISUAL
  const isCompleted = region.status === 'completed'
  const doneCount = region.subNodes.filter((n) => n.isCompleted).length
  const glow = TONE_GLOW_COLOR[visual.tone]
  const isHero = stop.size === 'hero'
  // Cliff island visual — wider than the old flat disc so the cliff has
  // room to taper. Hero (Family Kingdom) bumped ~30% to read as climax.
  const islandSize = isHero ? 220 : 170

  return (
    <motion.button
      ref={(el) => registerRef?.(region.id, el)}
      type="button"
      onClick={() => onSelect(region.id)}
      variants={staggerItem}
      initial={{ opacity: 0, y: 24, scale: 0.85 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ scale: 1.06, y: -4 }}
      whileTap={{ scale: 0.95 }}
      transition={{ ...springBouncy, delay: 0.18 + index * 0.08 }}
      style={{
        left: `${stop.x}%`,
        top: `${stop.y}%`,
        width: islandSize,
      }}
      // No flex-col any more — children are absolute-positioned so the
      // pills cluster sticks to a fixed offset under the cliff regardless
      // of how tall the SkyIsland SVG ends up at the current resolution.
      className={cn(
        // z-20 sits the cliff in FRONT of the golden journey path (z-10)
        // so the island reads as a solid landmass the river flows behind,
        // not a sticker the path slashes across.
        'group absolute z-20 -translate-x-1/2 -translate-y-1/2',
        'cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-lavender-300',
      )}
      aria-label={`Mở ${region.name}`}
    >
      {/* Ambient halo behind the island, centered on the grass surface
          (= marker visual centre = stop.y, the same waypoint the glowing
          path connects to). */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{
          width: islandSize * 1.6,
          height: islandSize * 1.3,
          background: glow,
          opacity: isHero ? 0.55 : 0.4,
        }}
        animate={{
          opacity: isHero ? [0.4, 0.7, 0.4] : [0.28, 0.55, 0.28],
          scale: [0.9, 1.05, 0.9],
        }}
        transition={{
          duration: isHero ? 2.6 : 3.4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.25,
        }}
      />

      {/* The floating island itself — bobs slowly. Now that SkyIsland's
          viewBox is symmetric around the grass (y=0 = visual centre),
          all anchors below use top-1/2 cleanly. */}
      <motion.span
        aria-hidden
        className="relative block"
        animate={{ y: [0, -5, 0] }}
        transition={{
          duration: isHero ? 3.2 : 3.8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.2,
        }}
      >
        <SkyIsland tone={visual.tone} size={islandSize} />

        {/* Biome decorations — sit on the grass surface (= SVG centre). */}
        {(() => {
          const biome = biomeFor(region.id)
          if (!biome) return null
          const decW = islandSize * 1.05
          const decH = islandSize * 0.85
          return (
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: decW, height: decH }}
            >
              <BiomeDecorations biome={biome} width={decW} height={decH} />
            </span>
          )
        })()}

        {/* Badges anchor — invisible sized box at the grass centre so the
            completion check (top-right) and hero crown (above) have a
            stable reference. The themed emoji (🌳/🗻/🏙️/🏝️/💖) used to
            live here too but it duplicated what the diorama already
            shows (trees, mountains, …), so it was removed. */}
        {(isCompleted || isHero) && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: islandSize * 0.35, height: islandSize * 0.35 }}
          >
            {isCompleted && (
              <span
                className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-2 border-sage-500 bg-sage-300 text-white shadow-soft"
              >
                <Check className="size-4" />
              </span>
            )}

            {isHero && (
              <span
                className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-peach-400 bg-peach-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-peach-500 shadow-soft"
              >
                ★ Trái tim Lumina
              </span>
            )}
          </span>
        )}
      </motion.span>

      {/* Pills cluster — anchored to the ISLAND CENTRE via absolute
          positioning. `top: 75%` puts it just past the cliff bottom of
          the bobbing SkyIsland; the % is relative to the marker so it
          rescales cleanly with islandSize and across resolutions. The
          cluster is pointer-events-auto-via-default so taps on the pill
          still trigger the button (no e.stopPropagation needed). */}
      <span
        className="pointer-events-none absolute left-1/2 top-[78%] flex -translate-x-1/2 flex-col items-center gap-1"
      >
        <span
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 bg-cream-50/95 px-3 py-1 font-display text-xs font-bold text-cocoa-800 shadow-pop backdrop-blur sm:text-sm',
            visual.border,
          )}
          style={{
            boxShadow: `0 0 10px ${glow}, var(--shadow-soft)`,
          }}
        >
          {region.name}
        </span>

        <span className="whitespace-nowrap rounded-full bg-cream-50/85 px-2 py-0.5 text-[10px] font-bold tabular-nums text-cocoa-700/80 shadow-soft backdrop-blur">
          {doneCount}/{region.subNodes.length} điểm
        </span>
      </span>
    </motion.button>
  )
}

/**
 * Rendered for any region whose `status === 'locked'` in the store. No
 * onClick — the player can see the shape of the journey but can't dive
 * in until something unlocks it.
 */
function LockedJourneyStop({
  label,
  stop,
}: {
  label: string
  stop: JourneyStop
}) {
  const islandSize = stop.size === 'hero' ? 180 : 140
  return (
    <div
      role="img"
      aria-label={`${label} (đang khoá)`}
      style={{ left: `${stop.x}%`, top: `${stop.y}%`, width: islandSize }}
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
    >
      {/* Same floating cliff, desaturated so the kid feels "land is
          here, but not yet". */}
      <span
        aria-hidden
        className="relative block opacity-60"
        style={{ filter: 'grayscale(0.6)' }}
      >
        <SkyIsland tone="lavender" size={islandSize} waterfall={false} />
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
          style={{ fontSize: islandSize * 0.32 }}
        >
          🔒
        </span>
      </span>
      {/* Pills anchored to island centre — same rescaling rule as the
          interactive JourneyIsland so locked + unlocked markers line up. */}
      <span className="absolute left-1/2 top-[78%] flex -translate-x-1/2 flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-cocoa-700/30 bg-cream-50/85 px-2.5 py-0.5 font-display text-[10px] font-bold text-cocoa-700/70 shadow-soft backdrop-blur">
          {label}
        </span>
        <span className="whitespace-nowrap rounded-full bg-cream-50/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cocoa-700/60 shadow-soft">
          Sắp ra mắt
        </span>
      </span>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Region Sub-Map view  (unchanged — kept from the previous implementation)
   ════════════════════════════════════════════════════════════════════ */

interface RegionSubMapViewProps {
  region: Region
  onBack: () => void
}

function RegionSubMapView({ region, onBack }: RegionSubMapViewProps) {
  const navigate = useNavigate()
  const visual = REGION_VISUALS[region.id] ?? FALLBACK_VISUAL

  const handleNodeClick = (node: SubNode) => {
    const params = new URLSearchParams({
      region: region.id,
      node: node.id,
    }).toString()

    // Explicit route override wins over the type-based default. Region-
    // specific game families (e.g. Rừng Kỳ Diệu's `/game/forest/*`) opt
    // in via this field without forcing a new `SubNode['type']` value.
    if (node.routePath) {
      navigate(`${node.routePath}?${params}`)
      return
    }

    switch (node.type) {
      case 'quest':
        navigate(`/quests/${node.targetId}?${params}`)
        break
      case 'lesson':
        navigate(`/lessons/${node.targetId}?${params}`)
        break
      case 'minigame':
        navigate(`/games/${node.targetId}?${params}`)
        break
    }
  }

  const doneCount = region.subNodes.filter((n) => n.isCompleted).length

  // Special 3D map for Enchanted Forest
  if (region.id === 'rung-ky-dieu') {
    return (
      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <motion.button
            type="button"
            onClick={onBack}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={springSoft}
            className="inline-flex items-center gap-2 rounded-full border-2 border-cream-200 bg-cream-50/95 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
          >
            <ArrowLeft className="size-4" />
            Quay lại bản đồ chính
          </motion.button>

          <span className="rounded-full border-2 border-cream-200 bg-cream-50/80 px-3 py-1.5 text-xs font-bold tabular-nums text-cocoa-700/80 shadow-soft">
            {doneCount}/{region.subNodes.length} điểm
          </span>
        </div>

        <header className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-sage-500">
            🌳 Rừng Kỳ Diệu — Safari Adventure Map
          </p>
          <p className="mt-1 max-w-2xl text-sm text-cocoa-700">
            {region.description}
          </p>
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springSoft, mass: 0.7, delay: 0.05 }}
        >
          <EnchantedForestMap region={region} onNodeClick={handleNodeClick} />
        </motion.div>

        <p className="mx-auto mt-5 max-w-xl text-center text-xs text-cocoa-700/70">
          Khám phá năm khu vực của Rừng Kỳ Diệu và hoàn thành các nhiệm vụ để làm sáng cây thần kỳ! ✨
        </p>
      </section>
    )
  }

  // Special 3D map for Science Mountain
  if (region.id === 'nui-khoa-hoc') {
    return (
      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <motion.button
            type="button"
            onClick={onBack}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={springSoft}
            className="inline-flex items-center gap-2 rounded-full border-2 border-cream-200 bg-cream-50/95 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
          >
            <ArrowLeft className="size-4" />
            Quay lại bản đồ chính
          </motion.button>

          <span className="rounded-full border-2 border-cream-200 bg-cream-50/80 px-3 py-1.5 text-xs font-bold tabular-nums text-cocoa-700/80 shadow-soft">
            {doneCount}/{region.subNodes.length} điểm
          </span>
        </div>

        <header className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-500">
            🗻 Núi Khoa Học — 3D Adventure Map
          </p>
          <p className="mt-1 max-w-2xl text-sm text-cocoa-700">
            {region.description}
          </p>
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springSoft, mass: 0.7, delay: 0.05 }}
        >
          <ScienceMountainMap region={region} onNodeClick={handleNodeClick} />
        </motion.div>

        <p className="mx-auto mt-5 max-w-xl text-center text-xs text-cocoa-700/70">
          Khám phá ba vùng chủ đề trên Núi Khoa Học và hoàn thành các nhiệm vụ để làm sáng toàn bộ đỉnh núi! ✨
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={springSoft}
          className="inline-flex items-center gap-2 rounded-full border-2 border-cream-200 bg-cream-50/95 px-4 py-2 font-display text-sm font-bold text-cocoa-800 shadow-soft hover:bg-cream-100"
        >
          <ArrowLeft className="size-4" />
          Quay lại bản đồ chính
        </motion.button>

        <span className="rounded-full border-2 border-cream-200 bg-cream-50/80 px-3 py-1.5 text-xs font-bold text-cocoa-700/80 shadow-soft">
          {doneCount}/{region.subNodes.length} điểm
        </span>
      </div>

      <header className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-lavender-500">
          {region.subMapEyebrow ?? `Sub-map · ${region.name}`}
        </p>
        <p className="mt-1 max-w-2xl text-sm text-cocoa-700">
          {region.description}
        </p>
      </header>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...springSoft, mass: 0.7, delay: 0.05 }}
        className={cn(
          'relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-4 shadow-pop',
          visual.border,
        )}
        style={{ backgroundImage: visual.canvasBg }}
      >
        <FloatingLeaves count={14} />

        <svg
          className="pointer-events-none absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {region.subNodes.slice(0, -1).map((n, i) => {
            const next = region.subNodes[i + 1]
            return (
              <motion.line
                key={n.id}
                x1={n.coordinates.x}
                y1={n.coordinates.y}
                x2={next.coordinates.x}
                y2={next.coordinates.y}
                stroke="var(--color-cocoa-700)"
                strokeOpacity="0.3"
                strokeWidth="0.6"
                strokeDasharray="1.4 1.6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  delay: 0.2 + i * 0.1,
                  duration: 0.7,
                  ease: easeCozy,
                }}
              />
            )
          })}
        </svg>

        <motion.div
          className="absolute inset-0"
          variants={subNodesStaggerVariants}
          initial="hidden"
          animate="show"
        >
          {region.subNodes.map((n) => (
            <SubNodeMarker
              key={n.id}
              node={n}
              onClick={() => handleNodeClick(n)}
            />
          ))}
        </motion.div>
      </motion.div>

      <p className="mx-auto mt-5 max-w-xl text-center text-xs text-cocoa-700/70">
        Chạm vào một điểm trên bản đồ để bắt đầu hoạt động. Điểm đã đi qua sẽ
        sáng lên ánh xanh.
      </p>
    </section>
  )
}

interface SubNodeMarkerProps {
  node: SubNode
  onClick: () => void
}

function SubNodeMarker({ node, onClick }: SubNodeMarkerProps) {
  // Resolve a registered custom illustration (e.g. the "lion-safari"
  // badge for Thám Hiểm Safari). When present we drop the standard
  // ring + emoji and let the SVG own the full circle — these icons
  // are designed with their own frame and visual weight.
  const CustomIcon = node.iconKey ? CUSTOM_NODE_ICONS[node.iconKey] : null
  const isHero = !!CustomIcon

  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={staggerItem}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={springBouncy}
      aria-label={`${SUBNODE_LABEL[node.type]}: ${node.label}`}
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
      style={{
        left: `${node.coordinates.x}%`,
        top: `${node.coordinates.y}%`,
      }}
    >
      <span
        className={cn(
          'relative grid place-items-center rounded-full shadow-pop transition-colors',
          // Hero (custom-icon) markers are bumped to size-20 so the
          // illustrated badge reads as the centerpiece of the sub-map,
          // and the ring is dropped because the SVG already carries
          // its own frame.
          isHero
            ? 'size-20'
            : cn(
                'size-14 border-4 text-2xl',
                node.isCompleted
                  ? 'border-sage-400 bg-sage-100'
                  : NODE_TYPE_RING[node.type],
              ),
        )}
      >
        {CustomIcon ? (
          <CustomIcon className="size-full" aria-hidden />
        ) : (
          <span aria-hidden>{node.emoji ?? SUBNODE_EMOJI[node.type]}</span>
        )}

        {node.isCompleted && (
          <span
            aria-hidden
            className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border-2 border-sage-500 bg-sage-300 text-white shadow-soft"
          >
            <Check className="size-3.5" />
          </span>
        )}
      </span>
      <span
        className={cn(
          'rounded-full border-2 border-cream-200 bg-cream-50/90 px-2.5 py-0.5 font-bold text-cocoa-800 shadow-soft backdrop-blur',
          // Hero markers get a slightly larger label with letter-
          // spacing so an all-caps title like "THÁM HIỂM SAFARI" reads
          // as a poster headline under the illustrated badge.
          isHero
            ? 'mt-0.5 px-3 py-1 text-[11px] tracking-[0.15em]'
            : 'text-[10px]',
        )}
      >
        {node.label}
      </span>
    </motion.button>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Celebration overlay — fires when a region is 100% completed (unchanged)
   ════════════════════════════════════════════════════════════════════ */

interface RegionMasteredOverlayProps {
  region: Region | null
  onDismiss: () => void
}

function RegionMasteredOverlay({
  region,
  onDismiss,
}: RegionMasteredOverlayProps) {
  return (
    <AnimatePresence>
      {region && (
        <motion.div
          key="mastered"
          role="dialog"
          aria-modal="true"
          aria-label={`${region.name} đã hoàn thành`}
          className="fixed inset-0 z-50 grid place-items-center bg-cocoa-900/45 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <Confetti trigger={region.id} count={42} className="z-0" />

          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.6, y: 24, opacity: 0, rotate: -3 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={springBouncy}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[2.25rem] border-4 border-butter-300 bg-cream-50 p-7 text-center shadow-pop"
            style={{
              backgroundImage: `
                radial-gradient(60% 70% at 50% 0%, var(--color-butter-100) 0%, transparent 70%),
                radial-gradient(60% 70% at 50% 110%, var(--color-peach-100) 0%, transparent 70%),
                linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-cream-100) 100%)
              `,
            }}
          >
            <motion.span
              aria-hidden
              className="block select-none text-7xl"
              animate={{
                scale: [1, 1.15, 1],
                rotate: [-6, 6, -6],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              🌟
            </motion.span>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-butter-300 bg-butter-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-butter-500 shadow-soft">
              <Sparkles className="size-3.5 fill-butter-400 stroke-butter-500" />
              Vùng đất đã chinh phục
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold leading-snug text-cocoa-900">
              Chúc mừng Nhà Thám Hiểm!
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-cocoa-700">
              Vùng Đất{' '}
              <span className="font-display font-bold text-lavender-500">
                {region.name}
              </span>{' '}
              đã tràn ngập Ánh Sáng Tri Thức! Hãy tiếp tục hành trình nhé! 🌟
            </p>

            <motion.button
              type="button"
              onClick={onDismiss}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={springBouncy}
              className="mt-6 inline-flex items-center gap-2 rounded-full border-4 border-lavender-300 bg-lavender-400 px-6 py-2.5 font-display text-sm font-bold text-white shadow-pop"
            >
              Tiếp tục phiêu lưu
              <Sparkles className="size-4" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


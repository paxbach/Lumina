import type { ComponentType, SVGProps } from 'react'

/* ════════════════════════════════════════════════════════════════════
   Custom node icons — registry of richer illustrated SVG badges for
   sub-map nodes whose `SubNode.iconKey` is set. Anything not registered
   here falls back to the node's `emoji` (or its type default) in
   `SubNodeMarker`.
   ════════════════════════════════════════════════════════════════════ */

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

/** Build the "fluffy mane" outline as a polygon with alternating
 *  outer / inner radii so the silhouette reads as fur tufts. Computed
 *  once at module load — values never change. */
function buildManePoints(): string {
  const tufts = 14
  const cx = 50
  const cy = 50
  const outerR = 48
  const innerR = 41
  const points: string[] = []
  for (let i = 0; i < tufts * 2; i++) {
    const angle = (i * Math.PI) / tufts - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return points.join(' ')
}

const MANE_POINTS = buildManePoints()

/** Six camera-aperture blades around a centre iris, rotated 60° apart. */
const APERTURE_BLADES = [0, 60, 120, 180, 240, 300]

/**
 * Lion's head with a stylized camera-lens aperture overlay — the
 * centerpiece marker for the "Thám Hiểm Safari" zoo photo mission.
 *
 * Composition (viewBox 100×100):
 *   • Fluffy 14-tuft mane outline with warm radial gradient
 *     (yellow → orange → red → maroon) and two teal accent swirls.
 *   • Inner butter-cream face with stylized eyes, nose, mouth.
 *   • Camera aperture badge anchored below the chin so the icon
 *     instantly reads as "wildlife photo mission".
 */
function LionSafariIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Thám hiểm safari — chụp ảnh sư tử"
      {...props}
    >
      <defs>
        <radialGradient id="lion-mane-grad" cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="#fde047" />
          <stop offset="35%"  stopColor="#f97316" />
          <stop offset="72%"  stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id="lion-face-grad" cx="50%" cy="45%" r="55%">
          <stop offset="0%"   stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fcd34d" />
        </radialGradient>
        <linearGradient id="lion-teal-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>

      {/* Mane silhouette — 14-tuft polygon stroked with darker brown
          for definition. */}
      <polygon
        points={MANE_POINTS}
        fill="url(#lion-mane-grad)"
        stroke="#7c2d12"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />

      {/* Teal accent swirls — flowing brush strokes over the warm mane
          for the "painted fire" look from the reference. */}
      <path
        d="M 12 32 Q 22 28 30 36 T 48 30"
        fill="none"
        stroke="url(#lion-teal-grad)"
        strokeWidth={3.5}
        strokeLinecap="round"
        opacity={0.65}
      />
      <path
        d="M 60 26 Q 72 30 84 22"
        fill="none"
        stroke="url(#lion-teal-grad)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.6}
      />
      <path
        d="M 18 72 Q 26 80 38 78"
        fill="none"
        stroke="url(#lion-teal-grad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.55}
      />

      {/* Inner face disc */}
      <circle
        cx={50}
        cy={49}
        r={22}
        fill="url(#lion-face-grad)"
        stroke="#92400e"
        strokeWidth={0.8}
      />

      {/* Brow tufts — small triangles above the eyes for character. */}
      <path
        d="M 38 38 L 42 34 L 44 40 Z"
        fill="#92400e"
      />
      <path
        d="M 62 38 L 58 34 L 56 40 Z"
        fill="#92400e"
      />

      {/* Eyes — almond shape with white reflection highlight. */}
      <ellipse cx={42} cy={45} rx={3} ry={3.6} fill="#1f2937" />
      <ellipse cx={58} cy={45} rx={3} ry={3.6} fill="#1f2937" />
      <circle cx={43} cy={43.5} r={0.95} fill="#ffffff" />
      <circle cx={59} cy={43.5} r={0.95} fill="#ffffff" />

      {/* Nose — small dark triangle, with a vertical philtrum line. */}
      <path
        d="M 46.5 52 L 53.5 52 L 50 56 Z"
        fill="#1f2937"
      />
      <path
        d="M 50 56 L 50 60"
        stroke="#1f2937"
        strokeWidth={0.9}
        strokeLinecap="round"
      />

      {/* Mouth — subtle smile under the nose. */}
      <path
        d="M 46 61 Q 50 64 54 61"
        fill="none"
        stroke="#1f2937"
        strokeWidth={0.9}
        strokeLinecap="round"
      />

      {/* Whisker dots — three on each cheek for cuteness. */}
      <g fill="#92400e" opacity={0.6}>
        <circle cx={40} cy={56} r={0.5} />
        <circle cx={40} cy={59} r={0.5} />
        <circle cx={42} cy={62} r={0.5} />
        <circle cx={60} cy={56} r={0.5} />
        <circle cx={60} cy={59} r={0.5} />
        <circle cx={58} cy={62} r={0.5} />
      </g>

      {/* Camera aperture badge — anchored just below the chin so the
          icon telegraphs "wildlife PHOTO mission" instantly. Group
          translated so the inner blade math stays centred at (0,0). */}
      <g transform="translate(50 79)">
        {/* Outer ring — dark body + butter highlight stroke. */}
        <circle
          r={10.5}
          fill="#0f172a"
          stroke="#fde047"
          strokeWidth={1.5}
        />
        {/* Iris blades — six triangles fanned around the centre, each
            rotated 60°. Gives the recognisable aperture-iris look. */}
        <g fill="#1e293b" stroke="#475569" strokeWidth={0.4} strokeLinejoin="round">
          {APERTURE_BLADES.map((angle) => (
            <polygon
              key={angle}
              points="0,-7.5 6.2,3 -6.2,3"
              transform={`rotate(${angle})`}
            />
          ))}
        </g>
        {/* Central iris dot — red, like a recording light. */}
        <circle r={2.6} fill="#dc2626" stroke="#7f1d1d" strokeWidth={0.5} />
        {/* Tiny lens reflection */}
        <circle cx={-0.8} cy={-1} r={0.9} fill="#fef2f2" opacity={0.85} />
      </g>
    </svg>
  )
}

/**
 * Registry of custom icons by `SubNode.iconKey`. To add a new badge:
 * build the SVG component, then add a `key → component` entry here —
 * `SubNodeMarker` will automatically prefer it over the emoji.
 */
export const CUSTOM_NODE_ICONS: Record<string, IconComponent> = {
  'lion-safari': LionSafariIcon,
}

import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export interface MapPin {
  id: string
  label: string
  emoji: string
  x: number // %
  y: number // %
  tone: 'peach' | 'mint' | 'butter' | 'lavender'
  pulsing?: boolean
}

interface MiniMapProps {
  /** Starting pin (you-are-here). */
  start: MapPin
  /** Destination pin (quest target). */
  target: MapPin
  /** Mock distance label, e.g. "5 phút đi bộ". */
  distance?: string
  className?: string
}

const TONE_BG: Record<MapPin['tone'], string> = {
  peach:    'bg-peach-400 border-peach-500',
  mint:     'bg-mint-400 border-mint-500',
  butter:   'bg-butter-400 border-butter-500',
  lavender: 'bg-lavender-400 border-lavender-500',
}

const SCENERY = [
  { glyph: '🌲', x: 10, y: 30, size: 26 },
  { glyph: '🌳', x: 38, y: 18, size: 28 },
  { glyph: '🌲', x: 70, y: 32, size: 24 },
  { glyph: '🌳', x: 90, y: 50, size: 26 },
  { glyph: '🌲', x: 25, y: 78, size: 24 },
  { glyph: '🌳', x: 60, y: 72, size: 26 },
  { glyph: '🍄', x: 48, y: 55, size: 18 },
  { glyph: '🌸', x: 80, y: 80, size: 18 },
  { glyph: '🌼', x: 15, y: 58, size: 18 },
]

export function MiniMap({ start, target, distance, className }: MiniMapProps) {
  return (
    <div
      className={cn(
        'relative aspect-[2/1] w-full overflow-hidden rounded-3xl border-4 border-mint-200 shadow-soft',
        className,
      )}
      role="img"
      aria-label={`Bản đồ từ ${start.label} đến ${target.label}`}
      style={{
        backgroundImage: `
          radial-gradient(50% 80% at 20% 100%, var(--color-mint-200) 0%, transparent 70%),
          radial-gradient(50% 80% at 80% 0%, var(--color-butter-100) 0%, transparent 70%),
          linear-gradient(160deg, var(--color-mint-50) 0%, var(--color-cream-50) 100%)
        `,
      }}
    >
      {/* Scenery — non-interactive */}
      {SCENERY.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute select-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            fontSize: s.size,
            transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 3px 2px rgba(60,40,20,0.16))',
          }}
          animate={{ y: [0, -2, 0] }}
          transition={{
            duration: 3 + (i % 3) * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {s.glyph}
        </motion.span>
      ))}

      {/* Dotted path */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <motion.path
          d={`M ${start.x / 2} ${start.y / 2} Q ${(start.x + target.x) / 4} ${(Math.min(start.y, target.y) - 10) / 2}, ${target.x / 2} ${target.y / 2}`}
          fill="none"
          stroke="var(--color-cocoa-700)"
          strokeOpacity="0.35"
          strokeWidth="0.6"
          strokeDasharray="1.4 1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>

      {/* Distance pill */}
      {distance && (
        <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border-2 border-cream-200 bg-cream-50/95 px-3 py-1 font-display text-xs font-bold text-cocoa-800 shadow-soft backdrop-blur">
          🧭 {distance}
        </span>
      )}

      {/* Start pin */}
      <PinMarker pin={start} subtle />
      {/* Target pin */}
      <PinMarker pin={target} />
    </div>
  )
}

function PinMarker({ pin, subtle }: { pin: MapPin; subtle?: boolean }) {
  return (
    <div
      className="absolute"
      style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}
    >
      {/* Pulsing halo for target pin */}
      {pin.pulsing && (
        <motion.span
          aria-hidden
          className={cn('absolute left-1/2 top-2 size-12 -translate-x-1/2 rounded-full', TONE_BG[pin.tone])}
          style={{ opacity: 0.4, filter: 'blur(6px)' }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <motion.span
        animate={subtle ? undefined : { y: [0, -4, 0] }}
        transition={subtle ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className={cn(
          'relative grid size-12 place-items-center rounded-full border-4 shadow-pop',
          TONE_BG[pin.tone],
        )}
      >
        <span className="text-xl leading-none" aria-hidden>
          {pin.emoji}
        </span>
      </motion.span>

      <span className="mt-1 block whitespace-nowrap rounded-full border-2 border-cream-200 bg-cream-50/95 px-2.5 py-0.5 text-center font-display text-[11px] font-bold text-cocoa-800 shadow-soft">
        {pin.label}
      </span>
    </div>
  )
}

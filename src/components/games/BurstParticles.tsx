import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

type Tone = 'peach' | 'mint' | 'butter' | 'lavender' | 'sky' | 'mixed'

interface BurstParticlesProps {
  /** Re-mount/restart by changing this key. */
  trigger: number | string
  /** Center origin within parent — % of width/height. Defaults to 50/50. */
  x?: number
  y?: number
  count?: number
  tone?: Tone
  radius?: number // px outward distance
  className?: string
}

const TONE_GLYPHS: Record<Tone, string[]> = {
  peach:    ['✦', '✧', '★'],
  mint:     ['✦', '🍃', '✧'],
  butter:   ['✨', '★', '✦'],
  lavender: ['✨', '✦', '💫'],
  sky:      ['✦', '❄', '✧'],
  mixed:    ['✨', '★', '✦', '🌸', '🍃', '💫'],
}

const TONE_COLOR: Record<Tone, string> = {
  peach:    'text-peach-400',
  mint:     'text-mint-400',
  butter:   'text-butter-400',
  lavender: 'text-lavender-400',
  sky:      'text-sky-cozy-300',
  mixed:    '',
}

interface Particle {
  id: number
  angle: number   // radians
  distance: number
  size: number
  delay: number
  duration: number
  glyph: string
  rotate: number
}

function build(count: number, radius: number, tone: Tone): Particle[] {
  const glyphs = TONE_GLYPHS[tone]
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * Math.PI * 2 + Math.random() * 0.4,
    distance: radius * (0.6 + Math.random() * 0.7),
    size: 14 + Math.random() * 12,
    delay: Math.random() * 0.06,
    duration: 0.55 + Math.random() * 0.4,
    glyph: glyphs[i % glyphs.length],
    rotate: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 240),
  }))
}

/**
 * Radial particle burst — sparkles fly outward from origin point and fade.
 * Mount inside a relative parent. Pointer-events disabled.
 *
 * Re-trigger by passing a changing `trigger` prop (a counter or timestamp).
 */
export function BurstParticles({
  trigger,
  x = 50,
  y = 50,
  count = 14,
  tone = 'butter',
  radius = 90,
  className,
}: BurstParticlesProps) {
  const particles = useMemo(
    () => build(count, radius, tone),
    [count, radius, tone, trigger],
  )

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-visible',
        className,
      )}
    >
      <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
        {particles.map((p) => {
          const dx = Math.cos(p.angle) * p.distance
          const dy = Math.sin(p.angle) * p.distance
          return (
            <motion.span
              key={`${trigger}-${p.id}`}
              className={cn(
                'absolute left-0 top-0 select-none leading-none',
                TONE_COLOR[tone],
              )}
              style={{
                fontSize: p.size,
                filter: 'drop-shadow(0 0 6px currentColor)',
              }}
              initial={{ x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 }}
              animate={{
                x: dx,
                y: dy,
                scale: [0.2, 1.2, 0.6],
                opacity: [0, 1, 0],
                rotate: p.rotate,
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeOut',
                times: [0, 0.4, 1],
              }}
            >
              {p.glyph}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}

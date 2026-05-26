import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import type { NPC } from '@/data/npcs'
import type { PastelTone } from '@/types'

interface NPCAvatarProps {
  npc: NPC
  size?: number
  /** Show the name + role badge under the portrait. */
  showLabel?: boolean
  /** Animate the portrait with a friendly bobble. */
  animated?: boolean
  className?: string
}

const FRAME_BG: Record<PastelTone, string> = {
  peach:    'bg-peach-100',
  mint:     'bg-sage-100',
  butter:   'bg-butter-100',
  lavender: 'bg-lavender-100',
  sky:      'bg-sky-100',
}

const FRAME_BORDER: Record<PastelTone, string> = {
  peach:    'border-peach-400',
  mint:     'border-sage-400',
  butter:   'border-butter-400',
  lavender: 'border-lavender-400',
  sky:      'border-sky-400',
}

const RING_AURA: Record<PastelTone, string> = {
  peach:    'bg-peach-200',
  mint:     'bg-sage-200',
  butter:   'bg-butter-200',
  lavender: 'bg-lavender-200',
  sky:      'bg-sky-200',
}

const TONE_PILL: Record<PastelTone, string> = {
  peach:    'border-peach-300 bg-peach-50 text-peach-500',
  mint:     'border-sage-300 bg-sage-50 text-sage-500',
  butter:   'border-butter-300 bg-butter-50 text-cocoa-800',
  lavender: 'border-lavender-300 bg-lavender-50 text-lavender-500',
  sky:      'border-sky-300 bg-sky-50 text-cocoa-800',
}

const TONE_GLOW: Record<PastelTone, string> = {
  peach:    'var(--color-peach-glow)',
  mint:     'var(--color-sage-glow)',
  butter:   'var(--color-butter-glow)',
  lavender: 'var(--color-lavender-glow)',
  sky:      'var(--color-sky-glow)',
}

/**
 * Framed portrait of an NPC — like an illustrated character from a
 * picture book. Soft halo behind, thick pastel ring around, big emoji
 * inside that gently bobbles.
 */
export function NPCAvatar({
  npc,
  size = 96,
  showLabel = false,
  animated = true,
  className,
}: NPCAvatarProps) {
  const emojiPx = size * 0.55

  return (
    <div className={cn('relative flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Soft pulsing halo */}
        <motion.span
          aria-hidden
          className={cn(
            'absolute inset-0 -z-10 rounded-full blur-md opacity-50',
            RING_AURA[npc.tone],
          )}
          animate={
            animated
              ? { scale: [1, 1.08, 1], opacity: [0.4, 0.65, 0.4] }
              : undefined
          }
          transition={{
            duration: 3.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Frame circle */}
        <div
          className={cn(
            'relative grid size-full place-items-center rounded-full border-[5px] shadow-pop',
            FRAME_BG[npc.tone],
            FRAME_BORDER[npc.tone],
          )}
          style={{
            // Tone-coloured radiant halo — marks NPC as a "Glowing Companion"
            boxShadow: `0 0 16px 2px ${TONE_GLOW[npc.tone]}, var(--shadow-pop)`,
          }}
        >
          <motion.span
            aria-hidden
            className="select-none leading-none"
            style={{
              fontSize: emojiPx,
              filter: `drop-shadow(0 0 4px ${TONE_GLOW[npc.tone]})`,
            }}
            animate={
              animated
                ? { y: [0, -3, 0], rotate: [-3, 3, -3] }
                : undefined
            }
            transition={{
              y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {npc.emoji}
          </motion.span>

          {/* Sparkle accents on the frame — mark NPC as "Glowing Companion".
              Three small twinkles at irregular positions, each on its own
              phase so the frame seems to "twinkle alive". */}
          {animated && (
            <>
              <FrameSparkle x={-6} y={20} delay={0} size={10} tone={npc.tone} />
              <FrameSparkle x={-2} y={80} delay={0.9} size={8} tone={npc.tone} />
              <FrameSparkle x={102} y={50} delay={1.6} size={9} tone={npc.tone} />
            </>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="flex flex-col items-center gap-1 text-center">
          <span
            className={cn(
              'rounded-full border-2 px-3 py-0.5 font-display text-xs font-bold shadow-soft',
              TONE_PILL[npc.tone],
            )}
          >
            {npc.name}
          </span>
          <span className="text-[10px] font-semibold italic text-cocoa-700/70">
            {npc.role}
          </span>
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* Sparkle accent on the avatar frame — tone-coloured ✦ that  */
/* twinkles like a small lamp on the NPC's clothing.          */
/* ────────────────────────────────────────────────────────── */

function FrameSparkle({
  x,
  y,
  delay,
  size,
  tone,
}: {
  x: number
  y: number
  delay: number
  size: number
  tone: PastelTone
}) {
  return (
    <motion.span
      aria-hidden
      className="absolute select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        fontSize: size,
        color: TONE_GLOW[tone],
        filter: `drop-shadow(0 0 4px ${TONE_GLOW[tone]})`,
      }}
      animate={{
        scale: [0.5, 1.2, 0.5],
        opacity: [0.4, 1, 0.4],
        rotate: [0, 30, 0],
      }}
      transition={{
        duration: 1.8,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      ✦
    </motion.span>
  )
}

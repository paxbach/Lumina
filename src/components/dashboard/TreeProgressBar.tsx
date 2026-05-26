import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface TreeProgressBarProps {
  value: number // 0..1
  className?: string
}

/**
 * Tree-shaped progress bar — foliage "grows" from bottom up as value increases.
 *
 *   - Background tree: faded outline (always visible)
 *   - Foreground tree: gradient mint→butter "glowing sap" canopy, revealed
 *     bottom-up via clipPath
 *   - SVG drop-shadow filter casts a sage glow around the lit portion so the
 *     fill reads as bioluminescent liquid, not paint.
 */
export function TreeProgressBar({ value, className }: TreeProgressBarProps) {
  const id = useId()
  const v = Math.max(0, Math.min(1, value))
  const pct = Math.round(v * 100)
  const revealY = 100 - v * 100

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <svg
        viewBox="0 0 100 110"
        className="h-40 w-32 overflow-visible"
        role="img"
        aria-label={`Tiến độ hồi sinh rừng ${pct}%`}
      >
        <defs>
          {/* Foliage shape used twice — outline + filled */}
          <g id={`${id}-foliage`}>
            <circle cx="50" cy="42" r="26" />
            <circle cx="30" cy="52" r="20" />
            <circle cx="70" cy="52" r="20" />
            <circle cx="40" cy="32" r="18" />
            <circle cx="60" cy="32" r="18" />
          </g>

          {/* "Glowing sap" gradient — mint base with butter heart + peach blossom */}
          <radialGradient id={`${id}-sap`} cx="50%" cy="65%" r="65%">
            <stop offset="0%"  stopColor="var(--color-butter-glow)" />
            <stop offset="40%" stopColor="var(--color-sage-400)" />
            <stop offset="100%" stopColor="var(--color-sage-500)" />
          </radialGradient>

          {/* Glow filter on the lit foliage — bioluminescent halo */}
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Animated rectangular clip — reveals foliage from bottom up */}
          <clipPath id={`${id}-growth`} clipPathUnits="userSpaceOnUse">
            <motion.rect
              x="-10"
              width="120"
              initial={false}
              animate={{ y: revealY, height: 100 - revealY + 10 }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </clipPath>
        </defs>

        {/* Trunk */}
        <rect
          x="44"
          y="70"
          width="12"
          height="30"
          rx="3"
          fill="var(--color-cocoa-700)"
          opacity="0.55"
        />

        {/* Sprout when nearly empty */}
        {v < 0.05 && (
          <motion.text
            x="50"
            y="78"
            textAnchor="middle"
            fontSize="14"
            initial={{ opacity: 0, y: 82 }}
            animate={{ opacity: 1, y: 78 }}
          >
            🌱
          </motion.text>
        )}

        {/* Faded outline foliage — silhouette */}
        <use
          href={`#${id}-foliage`}
          fill="var(--color-sage-100)"
          stroke="var(--color-sage-300)"
          strokeWidth="1.5"
          opacity="0.55"
        />

        {/* Filled "glowing sap" foliage — clipped by growth, with bioluminescent halo */}
        <g clipPath={`url(#${id}-growth)`} filter={`url(#${id}-glow)`}>
          <use
            href={`#${id}-foliage`}
            fill={`url(#${id}-sap)`}
            stroke="var(--color-sage-500)"
            strokeWidth="1.2"
          />
          {/* Inner highlight stripe — "light skimming the top of the sap" */}
          <motion.ellipse
            cx="50"
            cy="34"
            rx="22"
            ry="4"
            fill="var(--color-butter-glow)"
            opacity={0.55}
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>

        {/* Cherry blossoms when nearly done — glow them too */}
        {v > 0.7 && (
          <g style={{ filter: 'drop-shadow(0 0 3px var(--color-peach-glow))' }}>
            <motion.circle
              cx="38"
              cy="40"
              r="3"
              fill="var(--color-peach-400)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
            />
            <motion.circle
              cx="62"
              cy="36"
              r="3"
              fill="var(--color-peach-400)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            />
            <motion.circle
              cx="55"
              cy="52"
              r="3"
              fill="var(--color-butter-400)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            />
          </g>
        )}
      </svg>

      <div className="text-center">
        <p
          className="font-display text-2xl font-bold tabular-nums text-sage-500"
          style={{
            textShadow: '0 0 14px var(--color-sage-glow)',
          }}
        >
          {pct}%
        </p>
        <p className="text-xs font-semibold text-cocoa-700/80">
          Hồi sinh Rừng Kỳ Diệu
        </p>
      </div>
    </div>
  )
}

import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export interface RadarSkill {
  label: string
  /** 0..100 */
  value: number
}

interface SkillRadarProps {
  skills: RadarSkill[]
  size?: number
  className?: string
}

/**
 * Custom SVG radar chart (no chart library).
 * - 3 concentric grid polygons at 33% / 66% / 100%
 * - One axis per skill
 * - Data polygon filled with a lavender→peach gradient
 * - Pure SVG; scales with `size` prop
 */
export function SkillRadar({ skills, size = 280, className }: SkillRadarProps) {
  const id = useId()
  const center = size / 2
  const radius = size / 2 - 44 // leave room for labels
  const n = skills.length
  const gridLevels = [0.33, 0.66, 1]

  const point = (idx: number, factor: number) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2 // start at top
    return {
      x: center + Math.cos(angle) * radius * factor,
      y: center + Math.sin(angle) * radius * factor,
    }
  }

  const dataPoints = skills.map((s, i) => point(i, Math.max(0, Math.min(1, s.value / 100))))
  const dataPath = dataPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ') + ' Z'

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn('block', className)}
      role="img"
      aria-label="Biểu đồ kỹ năng"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-lavender-400)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-peach-400)" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* Grid polygons */}
      {gridLevels.map((level) => {
        const pts = skills.map((_, i) => point(i, level))
        const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
        return (
          <polygon
            key={level}
            points={poly}
            fill="none"
            stroke="var(--color-cocoa-700)"
            strokeOpacity={level === 1 ? 0.18 : 0.1}
            strokeWidth={1}
            strokeDasharray={level === 1 ? '0' : '3 4'}
          />
        )
      })}

      {/* Axes */}
      {skills.map((_, i) => {
        const p = point(i, 1)
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="var(--color-cocoa-700)"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        )
      })}

      {/* Data polygon */}
      <motion.path
        d={dataPath}
        fill={`url(#${id}-fill)`}
        stroke="var(--color-lavender-500)"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.85, transformOrigin: `${center}px ${center}px` }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
      />

      {/* Vertices */}
      {dataPoints.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4.5}
          fill="var(--color-cream-50)"
          stroke="var(--color-lavender-500)"
          strokeWidth={2.5}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 240, damping: 20 }}
        />
      ))}

      {/* Labels */}
      {skills.map((s, i) => {
        const p = point(i, 1.16)
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        const cos = Math.cos(angle)
        // Anchor based on horizontal position; clamp top/bottom centered.
        const anchor =
          Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={13}
            fontWeight={600}
            fill="var(--color-cocoa-800)"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {s.label}
          </text>
        )
      })}
    </svg>
  )
}

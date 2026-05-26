import { useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ColorSliderProps {
  label: string
  /** Pure color hex/rgb for the track gradient & thumb fill. */
  color: string
  emoji?: string
  /** 0..100. */
  value: number
  onChange: (next: number) => void
  /** Fires when value crosses an integer "tick" — for placeholder sound effect. */
  onTick?: () => void
}

/**
 * Chunky, kid-friendly color slider.
 * - Pointer-event based for touch + mouse + pen uniformity.
 * - Track gradient goes from dark → pure color so the value reads as "brightness".
 * - Thumb is huge for small fingers (44px touch target).
 */
export function ColorSlider({
  label,
  color,
  emoji,
  value,
  onChange,
  onTick,
}: ColorSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const lastTickRef = useRef(value)

  const updateFromClient = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const next = Math.round(pct * 100)
    if (next !== value) {
      onChange(next)
      // Soft tick every ~10% increment, not on every pixel
      if (onTick && Math.abs(next - lastTickRef.current) >= 10) {
        lastTickRef.current = next
        onTick()
      }
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromClient(e.clientX)
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    updateFromClient(e.clientX)
  }
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-display text-base font-semibold text-cocoa-900">
          {emoji && <span className="text-xl" aria-hidden>{emoji}</span>}
          {label}
        </span>
        <span className="rounded-full border-2 border-cream-200 bg-cream-50 px-2.5 py-0.5 font-display text-sm font-bold tabular-nums text-cocoa-800">
          {value}%
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onChange(Math.max(0, value - 5))
          else if (e.key === 'ArrowRight') onChange(Math.min(100, value + 5))
        }}
        className="relative h-12 cursor-pointer touch-none select-none"
      >
        {/* Track */}
        <div
          className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 rounded-full border-2 border-cream-200 shadow-inset-soft"
          style={{
            background: `linear-gradient(90deg, #2c2230 0%, ${color} 100%)`,
          }}
        />
        {/* Thumb */}
        <motion.div
          aria-hidden
          className={cn(
            'absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center',
            'rounded-full border-[5px] border-cream-50 shadow-pop',
          )}
          style={{ left: `${value}%`, background: color }}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        >
          <span
            className="block size-2 rounded-full bg-cream-50/80"
            aria-hidden
          />
        </motion.div>
      </div>
    </div>
  )
}

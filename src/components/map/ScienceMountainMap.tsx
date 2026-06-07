import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { Region, SubNode } from '@/types'
import { springBouncy, staggerItem } from '@/utils/motion'

/**
 * ScienceMountainMap — 3D Adventure-style visualization for "Núi Khoa Học"
 *
 * Renders a magical 3D science mountain with 3 themed zones:
 * - Geometry Valley (top-left): cubes, pyramids, shapes
 * - Meteor Observatory (top-right): telescopes, meteors, stars
 * - Cosmic Light Peak (bottom): prisms, light beams, crystals
 */

interface ScienceMountainMapProps {
  region: Region
  onNodeClick: (node: SubNode) => void
}

export function ScienceMountainMap({ region, onNodeClick }: ScienceMountainMapProps) {
  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-4 border-sky-400 shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,0.55) 0%, transparent 70%),
          linear-gradient(160deg, var(--color-sky-50) 0%, var(--color-lavender-50) 100%)
        `,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          AMBIENT LAYERS
          ════════════════════════════════════════════════════════════════════ */}

      {/* Drifting clouds background */}
      <DriftingClouds />

      {/* Twinkling stars */}
      <TwinklingStars />

      {/* Flying creatures */}
      <FlyingButterflies />
      <FlyingBirds />

      {/* ════════════════════════════════════════════════════════════════════
          MAIN MOUNTAIN STRUCTURE
          ════════════════════════════════════════════════════════════════════ */}

      {/* Mountain silhouette (SVG) */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 1000 750"
        preserveAspectRatio="none"
      >
        {/* Main mountain peak */}
        <defs>
          <linearGradient id="mountain-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0E7FF" />
            <stop offset="50%" stopColor="#C7D2FE" />
            <stop offset="100%" stopColor="#A5B4FC" />
          </linearGradient>
          <linearGradient id="mountain-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0E7FF" opacity="0" />
            <stop offset="60%" stopColor="#6366F1" opacity="0.15" />
          </linearGradient>
        </defs>

        {/* Left slope (Geometry Valley) */}
        <motion.path
          d="M 0 750 L 350 200 L 500 400 L 0 750 Z"
          fill="url(#mountain-gradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Right slope (Meteor Observatory) */}
        <motion.path
          d="M 500 400 L 650 200 L 1000 750 L 500 400 Z"
          fill="url(#mountain-gradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        />

        {/* Mountain shadow for depth */}
        <motion.path
          d="M 0 750 L 350 200 L 650 200 L 1000 750 Z"
          fill="url(#mountain-shadow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Snow cap at peak */}
        <motion.circle
          cx="500"
          cy="180"
          r="90"
          fill="#FFFFFF"
          opacity="0.8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
        />

        {/* Glowing peak effect */}
        <motion.circle
          cx="500"
          cy="180"
          r="120"
          fill="none"
          stroke="#FBBF24"
          strokeWidth="2"
          opacity="0"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </svg>

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 1: GEOMETRY VALLEY (Top-Left)
          ════════════════════════════════════════════════════════════════════ */}

      <GeometryValley region={region} onNodeClick={onNodeClick} />

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 2: METEOR OBSERVATORY (Top-Right)
          ════════════════════════════════════════════════════════════════════ */}

      <MeteorObservatory region={region} onNodeClick={onNodeClick} />

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 3: COSMIC LIGHT PEAK (Bottom)
          ════════════════════════════════════════════════════════════════════ */}

      <CosmicLightPeak region={region} onNodeClick={onNodeClick} />

      {/* Floating sparkles */}
      <FloatingSparkles />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ENVIRONMENT COMPONENTS
   ════════════════════════════════════════════════════════════════════ */

function DriftingClouds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`cloud-${i}`}
          className="absolute rounded-full bg-white/40 blur-2xl"
          style={{
            width: 120 + i * 40,
            height: 50 + i * 15,
            left: `${i * 25}%`,
            top: `${10 + i * 15}%`,
          }}
          animate={{
            x: [0, 100, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15 + i * 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

function TwinklingStars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={`star-${i}`}
          className="absolute rounded-full bg-yellow-300"
          style={{
            width: 3 + Math.random() * 4,
            height: 3 + Math.random() * 4,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 40}%`,
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  )
}

function FlyingButterflies() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <motion.span
          key={`butterfly-${i}`}
          className="absolute select-none text-2xl"
          style={{
            left: `${20 + i * 30}%`,
            top: `${30 + i * 20}%`,
          }}
          animate={{
            x: [0, 80, 0],
            y: [0, -60, 0],
            rotate: [0, 15, 0],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i,
          }}
        >
          🦋
        </motion.span>
      ))}
    </div>
  )
}

function FlyingBirds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(2)].map((_, i) => (
        <motion.span
          key={`bird-${i}`}
          className="absolute select-none text-3xl"
          style={{
            right: `${10 + i * 20}%`,
            top: `${15 + i * 25}%`,
          }}
          animate={{
            x: [-100, 200],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 12 + i * 2,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 6,
          }}
        >
          🕊️
        </motion.span>
      ))}
    </div>
  )
}

function FloatingSparkles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={`sparkle-${i}`}
          className="absolute select-none text-lg"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
            y: [0, -30],
          }}
          transition={{
            duration: 2.5 + Math.random() * 1.5,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        >
          ✨
        </motion.span>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ZONE 1: GEOMETRY VALLEY
   ════════════════════════════════════════════════════════════════════ */

function GeometryValley({ region, onNodeClick }: ScienceMountainMapProps) {
  const node = region.subNodes.find((n) => n.id === 'nkh-hinh-khoi-khong-gian')
  if (!node) return null

  return (
    <div className="pointer-events-none absolute left-[20%] top-[28%] z-20">
      {/* Floating shapes background */}
      <motion.div
        className="absolute -left-12 -top-8 select-none text-5xl"
        animate={{ y: [-10, 10], rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity }}
      >
        🔷
      </motion.div>

      <motion.div
        className="absolute -right-8 -top-4 select-none text-4xl"
        animate={{ y: [10, -10], rotate: [360, 0] }}
        transition={{ duration: 10, repeat: Infinity, delay: 0.5 }}
      >
        🟦
      </motion.div>

      <motion.div
        className="absolute -bottom-8 left-4 select-none text-4xl"
        animate={{ y: [-5, 15], scale: [0.9, 1.1] }}
        transition={{ duration: 7, repeat: Infinity, delay: 1 }}
      >
        ⬜
      </motion.div>

      {/* Geometry playground playground label */}
      <motion.span
        className="absolute left-1/2 top-1/2 select-none text-center font-display text-base font-bold text-sky-600"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <p>🔧</p>
        <p className="text-xs mt-1">Thung lũy<br/>Hình Học</p>
      </motion.span>

      {/* Quest node button */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        className="pointer-events-auto relative z-10 grid size-16 place-items-center rounded-full border-4 border-sky-400 bg-sky-100 shadow-pop transition-all hover:bg-sky-200"
        aria-label={`${node.label}`}
      >
        <span className="text-3xl">{node.emoji}</span>

        {node.isCompleted && (
          <span className="pointer-events-none absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-sage-500 bg-sage-300 text-white shadow-soft">
            <Check className="size-3.5" />
          </span>
        )}
      </motion.button>

      {/* Label */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-sky-300 bg-sky-50/90 px-3 py-1 text-center font-display text-xs font-bold text-sky-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div>{node.label}</div>
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ZONE 2: METEOR OBSERVATORY
   ════════════════════════════════════════════════════════════════════ */

function MeteorObservatory({ region, onNodeClick }: ScienceMountainMapProps) {
  const node = region.subNodes.find((n) => n.id === 'nkh-vu-tru')
  if (!node) return null

  return (
    <div className="pointer-events-none absolute right-[18%] top-[25%] z-20">
      {/* Floating meteors */}
      <motion.div
        className="absolute -right-10 -top-6 select-none text-5xl"
        animate={{ y: [-15, 15], x: [0, 20] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        🌠
      </motion.div>

      <motion.div
        className="absolute -left-8 top-8 select-none text-3xl"
        animate={{ y: [5, -20], x: [-10, 5] }}
        transition={{ duration: 7, repeat: Infinity, delay: 0.8 }}
      >
        ⭐
      </motion.div>

      {/* Telescope tower label */}
      <motion.span
        className="absolute left-1/2 top-1/2 select-none text-center font-display text-base font-bold text-lavender-600"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <p>🔭</p>
        <p className="text-xs mt-1">Đài<br/>Thiên Văn</p>
      </motion.span>

      {/* Quest node button */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        className="pointer-events-auto relative z-10 grid size-16 place-items-center rounded-full border-4 border-lavender-400 bg-lavender-100 shadow-pop transition-all hover:bg-lavender-200"
        aria-label={`${node.label}`}
      >
        <span className="text-3xl">{node.emoji}</span>

        {node.isCompleted && (
          <span className="pointer-events-none absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-sage-500 bg-sage-300 text-white shadow-soft">
            <Check className="size-3.5" />
          </span>
        )}
      </motion.button>

      {/* Label */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-lavender-300 bg-lavender-50/90 px-3 py-1 text-center font-display text-xs font-bold text-lavender-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div>{node.label}</div>
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ZONE 3: COSMIC LIGHT PEAK
   ════════════════════════════════════════════════════════════════════ */

function CosmicLightPeak({ region, onNodeClick }: ScienceMountainMapProps) {
  const node = region.subNodes.find((n) => n.id === 'nkh-color-mix')
  if (!node) return null

  return (
    <div className="pointer-events-none absolute bottom-[12%] left-1/2 z-20 -translate-x-1/2">
      {/* Light beam effects */}
      <motion.div
        className="absolute -left-20 -top-10 select-none text-5xl"
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        🌈
      </motion.div>

      <motion.div
        className="absolute -right-16 -top-6 select-none text-4xl"
        animate={{ opacity: [0.3, 0.8, 0.3], rotate: [0, 180, 360] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        💎
      </motion.div>

      <motion.div
        className="absolute -bottom-8 -left-12 select-none text-4xl"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
      >
        ✨
      </motion.div>

      {/* Crystal cave label */}
      <motion.span
        className="absolute left-1/2 top-1/2 select-none text-center font-display text-base font-bold text-amber-600"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <p>💡</p>
        <p className="text-xs mt-1">Đỉnh<br/>Ánh Sáng</p>
      </motion.span>

      {/* Quest node button */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -8 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        className="pointer-events-auto relative z-10 grid size-16 place-items-center rounded-full border-4 border-amber-400 bg-amber-100 shadow-pop transition-all hover:bg-amber-200"
        aria-label={`${node.label}`}
      >
        <span className="text-3xl">{node.emoji}</span>

        {node.isCompleted && (
          <span className="pointer-events-none absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-sage-500 bg-sage-300 text-white shadow-soft">
            <Check className="size-3.5" />
          </span>
        )}
      </motion.button>

      {/* Label */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-amber-300 bg-amber-50/90 px-3 py-1 text-center font-display text-xs font-bold text-amber-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div>{node.label}</div>
      </motion.div>
    </div>
  )
}

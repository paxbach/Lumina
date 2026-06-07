import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { Region, SubNode } from '@/types'
import { springBouncy, staggerItem } from '@/utils/motion'

/**
 * EnchantedForestMap — 3D Fantasy Forest adventure world for "Rừng Kỳ Diệu"
 *
 * A living magical forest with 5 themed zones:
 * - Wisdom Tree Grove (top-left): ancient tree, glowing books, fireflies
 * - Rainbow Waterfall (top-right): multi-colored cascade, water sparkles
 * - Safari Hub (center): giant treehouse, central adventure point
 * - Leaf Workshop (bottom-left): crafting station, butterflies, flowers
 * - Firefly Cave (bottom-right): glowing cavern, bioluminescent magic
 */

interface EnchantedForestMapProps {
  region: Region
  onNodeClick: (node: SubNode) => void
}

export function EnchantedForestMap({ region, onNodeClick }: EnchantedForestMapProps) {
  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-4 border-sage-400 shadow-pop"
      style={{
        backgroundImage: `
          radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 70%),
          linear-gradient(135deg, var(--color-sage-50) 0%, var(--color-mint-50) 50%, var(--color-butter-50) 100%)
        `,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          AMBIENT LAYERS - Make the forest feel alive
          ════════════════════════════════════════════════════════════════════ */}

      {/* Sky background with clouds */}
      <ForestSky />

      {/* Background forest depth layer */}
      <BackgroundForest />

      {/* Flying birds */}
      <FlyingBirds />

      {/* Butterflies everywhere */}
      <FloatingButterflies />

      {/* Falling leaves */}
      <FallingLeaves />

      {/* Floating particles and sparkles */}
      <FloatingParticles />

      {/* ════════════════════════════════════════════════════════════════════
          TERRAIN AND PATHS
          ════════════════════════════════════════════════════════════════════ */}

      {/* Main grass terrain */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 1000 750"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="grass-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9DD4B0" />
            <stop offset="50%" stopColor="#7FBE9F" />
            <stop offset="100%" stopColor="#5FA877" />
          </linearGradient>
          <linearGradient id="path-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4B5A0" opacity="0.6" />
            <stop offset="100%" stopColor="#B8956A" opacity="0.8" />
          </linearGradient>
        </defs>

        {/* Main forest ground */}
        <motion.rect
          x="0"
          y="600"
          width="1000"
          height="150"
          fill="url(#grass-gradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Forest paths connecting zones (curved) */}
        {/* Path from Wisdom Tree to Safari */}
        <motion.path
          d="M 220 280 Q 320 320, 450 400"
          stroke="url(#path-gradient)"
          strokeWidth="35"
          fill="none"
          opacity="0.5"
          initial={{ strokeDashoffset: 1000 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.5 }}
        />

        {/* Path from Waterfall to Safari */}
        <motion.path
          d="M 780 240 Q 650 300, 500 400"
          stroke="url(#path-gradient)"
          strokeWidth="35"
          fill="none"
          opacity="0.5"
          initial={{ strokeDashoffset: 1000 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.5, delay: 0.1 }}
        />

        {/* Path from Safari to Leaf Workshop */}
        <motion.path
          d="M 450 500 Q 350 600, 240 780"
          stroke="url(#path-gradient)"
          strokeWidth="35"
          fill="none"
          opacity="0.5"
          initial={{ strokeDashoffset: 1000 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        />

        {/* Path from Safari to Firefly Cave */}
        <motion.path
          d="M 520 500 Q 650 600, 800 760"
          stroke="url(#path-gradient)"
          strokeWidth="35"
          fill="none"
          opacity="0.5"
          initial={{ strokeDashoffset: 1000 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        />

        {/* Decorative stepping stones on paths */}
        {[...Array(12)].map((_, i) => (
          <motion.circle
            key={`stone-${i}`}
            cx={250 + i * 40}
            cy={350 + Math.sin(i * 0.5) * 80}
            r="12"
            fill="#B8956A"
            opacity="0.4"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 3 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </svg>

      {/* ════════════════════════════════════════════════════════════════════
          CENTRAL HUB - SAFARI TREEHOUSE
          ════════════════════════════════════════════════════════════════════ */}

      <SafariTreehouse region={region} onNodeClick={onNodeClick} />

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 1: WISDOM TREE GROVE
          ════════════════════════════════════════════════════════════════════ */}

      <WisdomTreeZone region={region} onNodeClick={onNodeClick} />

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 2: RAINBOW WATERFALL
          ════════════════════════════════════════════════════════════════════ */}

      <RainbowWaterfallZone region={region} onNodeClick={onNodeClick} />

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 3: FIREFLY CAVE
          ════════════════════════════════════════════════════════════════════ */}

      <FireflyCaveZone region={region} onNodeClick={onNodeClick} />

      {/* ════════════════════════════════════════════════════════════════════
          ZONE 4: LEAF WORKSHOP
          ════════════════════════════════════════════════════════════════════ */}

      <LeafWorkshopZone region={region} onNodeClick={onNodeClick} />

      {/* Foreground foliage - adds depth */}
      <ForegroundFoliage />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   AMBIENT ENVIRONMENT COMPONENTS
   ════════════════════════════════════════════════════════════════════ */

function ForestSky() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background: `
          radial-gradient(100% 100% at 50% 0%,
            rgba(135, 206, 250, 0.3) 0%,
            rgba(200, 180, 255, 0.2) 50%,
            transparent 100%)
        `,
      }}
    >
      {/* Floating clouds */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`cloud-${i}`}
          className="absolute rounded-full bg-white/30 blur-2xl"
          style={{
            width: 120 + i * 40,
            height: 50 + i * 15,
            left: `${i * 25}%`,
            top: `${5 + i * 8}%`,
          }}
          animate={{
            x: [0, 60, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 20 + i * 4,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

function BackgroundForest() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
      {/* Distant forest silhouette */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`tree-${i}`}
          className="absolute"
          style={{
            left: `${i * 12.5}%`,
            top: '35%',
            width: '100px',
            height: '150px',
            background: 'linear-gradient(to top, #2d5016, #3d6820)',
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          }}
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{
            duration: 6 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function FlyingBirds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <motion.span
          key={`bird-${i}`}
          className="absolute select-none text-3xl"
          style={{
            left: `${10 + i * 30}%`,
            top: `${15 + i * 10}%`,
          }}
          animate={{
            x: [0, 200],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 15 + i * 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 5,
          }}
        >
          🕊️
        </motion.span>
      ))}
    </div>
  )
}

function FloatingButterflies() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={`butterfly-${i}`}
          className="absolute select-none text-2xl"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 80}%`,
          }}
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -80, 40, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 12 + Math.random() * 8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 3,
          }}
        >
          🦋
        </motion.span>
      ))}
    </div>
  )
}

function FallingLeaves() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(10)].map((_, i) => (
        <motion.span
          key={`leaf-${i}`}
          className="absolute select-none text-xl"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
          }}
          animate={{
            y: [0, 800],
            x: [0, Math.sin(i) * 80],
            rotate: [0, 360 * 3],
            opacity: [1, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 6,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 2,
          }}
        >
          🍂
        </motion.span>
      ))}
    </div>
  )
}

function FloatingParticles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={`particle-${i}`}
          className="absolute select-none text-lg"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
            y: [-20, 20],
          }}
          transition={{
            duration: 2.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 4,
          }}
        >
          ✨
        </motion.span>
      ))}
    </div>
  )
}

function ForegroundFoliage() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-40 h-32 bg-gradient-to-t from-sage-700/30 to-transparent"
      style={{
        clipPath: 'polygon(0 100%, 5% 70%, 15% 85%, 25% 65%, 35% 80%, 50% 60%, 65% 75%, 75% 70%, 85% 80%, 95% 65%, 100% 100%)',
      }}
    />
  )
}

/* ════════════════════════════════════════════════════════════════════
   CENTRAL HUB - SAFARI TREEHOUSE
   ════════════════════════════════════════════════════════════════════ */

function SafariTreehouse({ region, onNodeClick }: EnchantedForestMapProps) {
  const node = region.subNodes.find((n) => n.id === 'rkd-forest-zoo-safari')
  if (!node) return null

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
      {/* Treehouse trunk */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ scaleY: [0.98, 1.02, 0.98] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <div
          className="w-24 h-40 rounded-b-3xl"
          style={{
            background: 'linear-gradient(90deg, #6B4423 0%, #8B5A3C 50%, #6B4423 100%)',
            boxShadow: 'inset -4px 0 10px rgba(0,0,0,0.3)',
          }}
        />
      </motion.div>

      {/* Treehouse canopy */}
      <motion.div
        className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 select-none text-7xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🏠
      </motion.div>

      {/* Campfire */}
      <motion.span
        className="absolute left-1/2 -bottom-4 -translate-x-1/2 select-none text-5xl"
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🔥
      </motion.span>

      {/* Adventure flags */}
      <motion.span
        className="absolute -left-16 -top-8 select-none text-4xl"
        animate={{ rotate: [0, 10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        🚩
      </motion.span>

      <motion.span
        className="absolute -right-16 -top-8 select-none text-4xl"
        animate={{ rotate: [0, -10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
      >
        🚩
      </motion.span>

      {/* Central quest button */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.2, y: -12 }}
        whileTap={{ scale: 0.88 }}
        transition={springBouncy}
        className="pointer-events-auto relative z-10 grid size-24 place-items-center rounded-full border-4 border-peach-400 bg-peach-100 shadow-pop transition-all hover:bg-peach-200"
        aria-label={`${node.label}`}
      >
        <span className="text-5xl">{node.emoji}</span>

        {node.isCompleted && (
          <span className="pointer-events-none absolute -right-3 -top-3 grid size-8 place-items-center rounded-full border-2 border-sage-500 bg-sage-300 text-white shadow-soft">
            <Check className="size-4" />
          </span>
        )}
      </motion.button>

      {/* Label */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-32 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-peach-300 bg-peach-50/90 px-4 py-1.5 text-center font-display text-xs font-bold text-peach-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div>{node.label}</div>
        <div className="text-[10px] text-peach-600 mt-0.5">⭐ HUB</div>
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ZONE 1: WISDOM TREE GROVE (Top-Left)
   ════════════════════════════════════════════════════════════════════ */

function WisdomTreeZone({ region, onNodeClick }: EnchantedForestMapProps) {
  const node = region.subNodes.find((n) => n.id === 'rkd-forest-leaf-scanner')
  if (!node) return null

  return (
    <div className="pointer-events-none absolute left-[15%] top-[20%] z-20">
      {/* Floating leaves around tree */}
      {[...Array(3)].map((_, i) => (
        <motion.span
          key={`leaf-${i}`}
          className="absolute select-none text-3xl"
          style={{
            left: `${-40 + i * 40}px`,
            top: `${-40 + i * 40}px`,
          }}
          animate={{
            y: [0, 20, 0],
            x: [0, 10, 0],
            rotate: [i * 30, i * 30 + 360],
          }}
          transition={{
            duration: 6 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.2,
          }}
        >
          🍃
        </motion.span>
      ))}

      {/* Glowing books */}
      <motion.span
        className="absolute -right-12 -top-8 select-none text-4xl"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        📚
      </motion.span>

      {/* Tree */}
      <motion.div
        className="relative select-none text-6xl text-center"
        animate={{ scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 3.5, repeat: Infinity }}
      >
        🌳
      </motion.div>

      {/* Quest button */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -6 }}
        whileTap={{ scale: 0.9 }}
        transition={springBouncy}
        className="pointer-events-auto relative z-10 grid size-16 place-items-center rounded-full border-4 border-mint-400 bg-mint-100 shadow-pop transition-all hover:bg-mint-200 mt-4"
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
        className="pointer-events-none absolute left-1/2 -bottom-10 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-mint-300 bg-mint-50/90 px-2.5 py-0.5 text-center font-display text-[10px] font-bold text-mint-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {node.label}
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ZONE 2: RAINBOW WATERFALL (Top-Right)
   ════════════════════════════════════════════════════════════════════ */

function RainbowWaterfallZone({ region, onNodeClick }: EnchantedForestMapProps) {
  const node = region.subNodes.find((n) => n.id === 'rkd-forest-color-picker')
  if (!node) return null

  return (
    <div className="pointer-events-none absolute right-[12%] top-[18%] z-20">
      {/* Rainbow arc */}
      <motion.span
        className="absolute -left-8 -top-8 select-none text-7xl"
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🌈
      </motion.span>

      {/* Water droplets */}
      {[...Array(4)].map((_, i) => (
        <motion.span
          key={`drop-${i}`}
          className="absolute select-none text-2xl"
          style={{
            left: `${i * 20}px`,
            top: `${40 + i * 15}px`,
          }}
          animate={{
            y: [0, 40, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.5 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        >
          💧
        </motion.span>
      ))}

      {/* Waterfall */}
      <motion.div
        className="relative select-none text-6xl text-center"
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        💦
      </motion.div>

      {/* Quest button */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -6 }}
        whileTap={{ scale: 0.9 }}
        transition={springBouncy}
        className="pointer-events-auto relative z-10 grid size-16 place-items-center rounded-full border-4 border-sky-400 bg-sky-100 shadow-pop transition-all hover:bg-sky-200 mt-4"
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
        className="pointer-events-none absolute left-1/2 -bottom-10 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-sky-300 bg-sky-50/90 px-2.5 py-0.5 text-center font-display text-[10px] font-bold text-sky-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {node.label}
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ZONE 3: FIREFLY CAVE (Bottom-Right)
   ════════════════════════════════════════════════════════════════════ */

function FireflyCaveZone({ region, onNodeClick }: EnchantedForestMapProps) {
  const node = region.subNodes.find((n) => n.id === 'rkd-forest-light-detector')
  if (!node) return null

  return (
    <div className="pointer-events-none absolute right-[8%] bottom-[12%] z-20">
      {/* Glowing crystals */}
      <motion.span
        className="absolute -left-12 -top-8 select-none text-5xl"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        💎
      </motion.span>

      {/* Fireflies dancing */}
      {[...Array(5)].map((_, i) => (
        <motion.span
          key={`firefly-${i}`}
          className="absolute select-none text-2xl"
          style={{
            left: `${Math.random() * 60}px`,
            top: `${Math.random() * 60}px`,
          }}
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.4,
          }}
        >
          🟡
        </motion.span>
      ))}

      {/* Cave opening */}
      <motion.div
        className="relative select-none text-6xl text-center"
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        🕳️
      </motion.div>

      {/* Quest button */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -6 }}
        whileTap={{ scale: 0.9 }}
        transition={springBouncy}
        className="pointer-events-auto relative z-10 grid size-16 place-items-center rounded-full border-4 border-amber-400 bg-amber-100 shadow-pop transition-all hover:bg-amber-200 mt-4"
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
        className="pointer-events-none absolute left-1/2 -top-12 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-amber-300 bg-amber-50/90 px-2.5 py-0.5 text-center font-display text-[10px] font-bold text-amber-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        {node.label}
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ZONE 4: LEAF WORKSHOP (Bottom-Left)
   ════════════════════════════════════════════════════════════════════ */

function LeafWorkshopZone({ region, onNodeClick }: EnchantedForestMapProps) {
  const node = region.subNodes.find((n) => n.id === 'rkd-forest-shape-match')
  if (!node) return null

  return (
    <div className="pointer-events-none absolute left-[12%] bottom-[10%] z-20">
      {/* Flowers */}
      <motion.span
        className="absolute -top-12 -left-8 select-none text-4xl"
        animate={{ rotate: [0, 10, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🌻
      </motion.span>

      <motion.span
        className="absolute -top-8 -right-6 select-none text-4xl"
        animate={{ rotate: [0, -15, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
      >
        🌸
      </motion.span>

      {/* Floating leaves for crafting */}
      {[...Array(3)].map((_, i) => (
        <motion.span
          key={`craft-leaf-${i}`}
          className="absolute select-none text-3xl"
          style={{
            left: `${-20 + i * 30}px`,
            top: `${20 + i * 20}px`,
          }}
          animate={{
            y: [0, -15, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 2.5 + i * 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        >
          🍂
        </motion.span>
      ))}

      {/* Crafting table */}
      <motion.div
        className="relative select-none text-6xl text-center"
        animate={{ scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        🛠️
      </motion.div>

      {/* Quest button */}
      <motion.button
        type="button"
        onClick={() => onNodeClick(node)}
        variants={staggerItem}
        whileHover={{ scale: 1.15, y: -6 }}
        whileTap={{ scale: 0.9 }}
        transition={springBouncy}
        className="pointer-events-auto relative z-10 grid size-16 place-items-center rounded-full border-4 border-butter-400 bg-butter-100 shadow-pop transition-all hover:bg-butter-200 mt-4"
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
        className="pointer-events-none absolute left-1/2 -top-12 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-butter-300 bg-butter-50/90 px-2.5 py-0.5 text-center font-display text-[10px] font-bold text-butter-700 shadow-soft backdrop-blur"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        {node.label}
      </motion.div>
    </div>
  )
}

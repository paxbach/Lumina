import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  type PanInfo,
} from 'framer-motion'
import { Check, RotateCcw } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { BurstParticles } from '@/components/games/BurstParticles'
import { LumiCoach } from '@/components/games/LumiCoach'
import { springSoft } from '@/utils/motion'
import type { PastelTone } from '@/types'

interface LeafMatchGameProps {
  onComplete?: () => void
}

interface Pair {
  id: string
  treeEmoji: string
  treeLabel: string
  leafEmoji: string
  tone: PastelTone
}

const PAIRS: Pair[] = [
  { id: 'maple',  treeEmoji: '🌳', treeLabel: 'Cây Phong', leafEmoji: '🍁', tone: 'peach' },
  { id: 'pine',   treeEmoji: '🌲', treeLabel: 'Cây Thông', leafEmoji: '🌰', tone: 'butter' },
  { id: 'palm',   treeEmoji: '🌴', treeLabel: 'Cây Dừa',   leafEmoji: '🥥', tone: 'mint' },
  { id: 'bamboo', treeEmoji: '🎋', treeLabel: 'Cây Tre',   leafEmoji: '🎍', tone: 'lavender' },
]

const COACH = {
  start: 'Kéo từng chiếc lá tới đúng cây của nó nhé! 🍃',
  good:  'Đúng rồi! Lumi vui quá! ✨',
  bad:   'Hihi, thử lại nha — Lumi tin bé làm được!',
  win:   'Tuyệt vời! Cả khu rừng đầy lá rồi! 🎉',
}

const TREE_TONES: Record<PastelTone, string> = {
  peach:    'border-peach-300 bg-peach-100',
  mint:     'border-mint-300 bg-mint-100',
  butter:   'border-butter-300 bg-butter-100',
  lavender: 'border-lavender-300 bg-lavender-100',
  sky:      'border-sky-cozy-300 bg-sky-cozy-100',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function LeafMatchGame({ onComplete }: LeafMatchGameProps) {
  const { play } = useSound()
  const [leafOrder, setLeafOrder] = useState<Pair[]>(() => shuffle(PAIRS))
  const [placed, setPlaced] = useState<Set<string>>(() => new Set())
  const [shakingId, setShakingId] = useState<string | null>(null)
  const [burst, setBurst] = useState<{ id: string; key: number } | null>(null)
  const [coach, setCoach] = useState(COACH.start)

  const treeRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // Tinh thể chỉ được trao lần đầu hoàn thành trong session này.
  // Reset khi component unmount, không reset khi bấm "Chơi lại".
  const claimedRef = useRef(false)
  const won = placed.size === PAIRS.length

  const handleDragEnd = (
    pair: Pair,
    _e: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo,
  ) => {
    if (placed.has(pair.id)) return

    const point = info.point
    const hitId = Object.entries(treeRefs.current).find(([, el]) => {
      if (!el) return false
      const r = el.getBoundingClientRect()
      return (
        point.x >= r.left &&
        point.x <= r.right &&
        point.y >= r.top &&
        point.y <= r.bottom
      )
    })?.[0]

    if (hitId === pair.id) {
      play('correct')
      const next = new Set(placed)
      next.add(pair.id)
      setPlaced(next)
      setBurst({ id: pair.id, key: Date.now() })
      if (next.size === PAIRS.length) {
        setCoach(COACH.win)
        // Slight delay so 'correct' isn't drowned out.
        window.setTimeout(() => play('win'), 220)
        if (!claimedRef.current) {
          claimedRef.current = true
          onComplete?.()
        }
      } else {
        setCoach(COACH.good)
      }
    } else if (hitId) {
      play('wrong')
      setCoach(COACH.bad)
      setShakingId(hitId)
      window.setTimeout(() => setShakingId(null), 500)
    }
    // Dropped on empty space — Framer auto snaps back.
  }

  const handleReset = () => {
    play('tap')
    setPlaced(new Set())
    setLeafOrder(shuffle(PAIRS))
    setCoach(COACH.start)
    setBurst(null)
  }

  return (
    <div className="space-y-6">
      <LumiCoach message={coach} size={100} />

      {/* Leaf tray */}
      <div>
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-cocoa-700/80">
          Lá rơi trong rừng — kéo lá xuống cây nhé
        </p>
        <div className="relative grid min-h-[140px] grid-cols-4 items-center justify-items-center gap-3 rounded-3xl border-4 border-dashed border-cream-200 bg-cream-50/70 px-3 py-5">
          {leafOrder.map((pair) => (
            <LeafChip
              key={pair.id}
              pair={pair}
              placed={placed.has(pair.id)}
              onDragEnd={(e, info) => handleDragEnd(pair, e, info)}
              onTap={() => play('tap')}
            />
          ))}
        </div>
      </div>

      {/* Tree drop zones */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PAIRS.map((pair) => (
          <TreeSlot
            key={pair.id}
            pair={pair}
            placed={placed.has(pair.id)}
            shaking={shakingId === pair.id}
            burstKey={burst?.id === pair.id ? burst.key : null}
            registerRef={(el) => {
              treeRefs.current[pair.id] = el
            }}
            toneClass={TREE_TONES[pair.tone]}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-cocoa-700/80">
          Đã ghép:{' '}
          <strong className="tabular-nums text-cocoa-900">
            {placed.size}/{PAIRS.length}
          </strong>
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-1.5 text-sm font-semibold text-cocoa-700 shadow-soft hover:bg-cream-100"
        >
          <RotateCcw className="size-4" />
          Chơi lại
        </button>
      </div>

      {/* Win overlay */}
      <AnimatePresence>
        {won && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-40 grid place-items-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.6, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="pointer-events-auto rounded-3xl border-4 border-butter-300 bg-cream-50/95 px-7 py-5 text-center shadow-pop backdrop-blur"
            >
              <p className="text-5xl" aria-hidden>🎉</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-cocoa-900">
                Cả khu rừng đầy lá rồi!
              </h3>
              <p className="mt-1 text-sm text-cocoa-700">Bé là một bạn nhỏ tuyệt vời!</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 rounded-full border-2 border-butter-500 bg-butter-400 px-5 py-2 font-display text-sm font-bold text-cocoa-900 shadow-soft"
              >
                Chơi lại
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */

interface LeafChipProps {
  pair: Pair
  placed: boolean
  onDragEnd: (e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => void
  onTap: () => void
}

function LeafChip({ pair, placed, onDragEnd, onTap }: LeafChipProps) {
  if (placed) {
    return <div className="invisible size-20" aria-hidden />
  }
  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragElastic={0.5}
      dragMomentum={false}
      onTapStart={onTap}
      onDragEnd={onDragEnd}
      whileDrag={{
        scale: 1.25,
        rotate: 0,
        zIndex: 50,
        boxShadow: '0 18px 30px -10px rgba(140,100,240,0.4)',
      }}
      whileHover={{ scale: 1.08 }}
      animate={{ rotate: [-3, 3, -3] }}
      transition={{ rotate: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' } }}
      className="relative z-10 grid size-20 cursor-grab touch-none select-none place-items-center rounded-full border-4 border-cream-200 bg-cream-50 text-5xl shadow-soft active:cursor-grabbing"
      style={{
        filter:
          pair.id === 'maple'
            ? 'hue-rotate(-10deg) saturate(1.4) drop-shadow(0 4px 3px rgba(160,40,20,0.25))'
            : 'drop-shadow(0 4px 3px rgba(60,40,20,0.18))',
      }}
    >
      <span aria-hidden>{pair.leafEmoji}</span>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────── */

interface TreeSlotProps {
  pair: Pair
  placed: boolean
  shaking: boolean
  burstKey: number | null
  toneClass: string
  registerRef: (el: HTMLDivElement | null) => void
}

function TreeSlot({
  pair,
  placed,
  shaking,
  burstKey,
  toneClass,
  registerRef,
}: TreeSlotProps) {
  const controls = useAnimationControls()

  useEffect(() => {
    if (shaking) {
      controls.start({
        x: [0, -10, 10, -8, 8, 0],
        transition: { duration: 0.45 },
      })
    }
  }, [shaking, controls])

  return (
    <motion.div
      ref={registerRef}
      animate={controls}
      className={cn(
        'relative flex aspect-square flex-col items-center justify-center gap-1 rounded-3xl border-4 p-3',
        placed ? 'border-mint-400 bg-mint-100 shadow-pop' : `${toneClass} shadow-soft`,
      )}
    >
      {burstKey != null && (
        <BurstParticles
          key={burstKey}
          trigger={burstKey}
          tone={pair.tone}
          count={14}
          radius={80}
        />
      )}

      <motion.span
        aria-hidden
        className="text-5xl leading-none"
        animate={placed ? { scale: [1, 1.18, 1] } : { y: [0, -3, 0] }}
        transition={
          placed
            ? { duration: 0.6 }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {pair.treeEmoji}
      </motion.span>

      <p className="text-center font-display text-xs font-bold text-cocoa-800">
        {pair.treeLabel}
      </p>

      <AnimatePresence>
        {placed && (
          <motion.div
            key="check"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={springSoft}
            className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full border-2 border-mint-500 bg-mint-300 text-white shadow-soft"
          >
            <Check className="size-4" />
          </motion.div>
        )}

        {placed && (
          <motion.span
            key="leaf-on-tree"
            initial={{ scale: 0, y: -24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={springSoft}
            aria-hidden
            className="absolute -top-3 right-3 select-none text-3xl"
            style={{
              filter:
                pair.id === 'maple'
                  ? 'hue-rotate(-10deg) saturate(1.4) drop-shadow(0 3px 2px rgba(160,40,20,0.25))'
                  : 'drop-shadow(0 3px 2px rgba(60,40,20,0.18))',
            }}
          >
            {pair.leafEmoji}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

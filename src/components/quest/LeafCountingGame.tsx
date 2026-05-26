import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { springSoft } from '@/utils/motion'

interface LeafCountingGameProps {
  onComplete: () => void
}

type Kind = 'red' | 'orange' | 'yellow' | 'green'

interface Leaf {
  id: number
  kind: Kind
  glyph: string
  x: number // % of board
  y: number
  size: number
  tilt: number
}

const TARGET_KIND: Kind = 'red'
const TARGET_COUNT = 5

const KIND_GLYPHS: Record<Kind, string> = {
  red:    '🍁',
  orange: '🍂',
  yellow: '🍂', // brown-ish; pair with peach tint via hue
  green:  '🍃',
}

/** Build a board with N red leaves + distractors, scattered with non-overlapping-ish positions. */
function buildBoard(): Leaf[] {
  const cells: Leaf[] = []
  const kinds: Kind[] = [
    'red', 'red', 'red', 'red', 'red',
    'orange', 'orange', 'orange',
    'yellow', 'yellow',
    'green', 'green', 'green',
  ]
  // Shuffle
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[kinds[i], kinds[j]] = [kinds[j], kinds[i]]
  }

  // Use a 5x3 jittered grid for predictable layout
  const cols = 5
  const rows = 3
  kinds.forEach((kind, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    cells.push({
      id: i,
      kind,
      glyph: KIND_GLYPHS[kind],
      x: ((c + 0.5) / cols) * 100 + (Math.random() - 0.5) * 6,
      y: ((r + 0.5) / rows) * 100 + (Math.random() - 0.5) * 8,
      size: 36 + Math.random() * 10,
      tilt: (Math.random() - 0.5) * 30,
    })
  })
  return cells
}

export function LeafCountingGame({ onComplete }: LeafCountingGameProps) {
  const [board, setBoard] = useState<Leaf[]>(() => buildBoard())
  const [found, setFound] = useState<Set<number>>(() => new Set())
  const [wrongTaps, setWrongTaps] = useState(0)
  const boardShake = useAnimationControls()

  const foundCount = found.size
  const isDone = foundCount >= TARGET_COUNT

  const handleTap = (leaf: Leaf) => {
    if (isDone) return
    if (found.has(leaf.id)) return

    if (leaf.kind === TARGET_KIND) {
      const next = new Set(found)
      next.add(leaf.id)
      setFound(next)
    } else {
      setWrongTaps((n) => n + 1)
      boardShake.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.4 },
      })
    }
  }

  const handleReset = () => {
    setBoard(buildBoard())
    setFound(new Set())
    setWrongTaps(0)
  }

  // Filter the leaves of target kind for the counter UI
  const totalTarget = useMemo(
    () => board.filter((l) => l.kind === TARGET_KIND).length,
    [board],
  )

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-peach-500">
            Mini-game
          </p>
          <h3 className="font-display text-xl font-bold text-cocoa-900">
            Đếm lá đỏ trong rừng
          </h3>
        </div>
        <div className="rounded-full border-2 border-peach-300 bg-peach-100 px-4 py-1.5 shadow-soft">
          <span className="font-display text-base font-bold tabular-nums text-cocoa-900">
            {foundCount}
            <span className="text-cocoa-700/70"> / {Math.min(TARGET_COUNT, totalTarget)}</span>
          </span>
          <span className="ml-1 text-xs font-semibold text-cocoa-700"> lá đỏ</span>
        </div>
      </div>

      {/* Board */}
      <motion.div
        animate={boardShake}
        className="relative aspect-[5/3] w-full overflow-hidden rounded-3xl border-4 border-mint-200 shadow-soft"
        style={{
          backgroundImage: `
            radial-gradient(40% 60% at 20% 30%, var(--color-mint-100) 0%, transparent 70%),
            radial-gradient(40% 60% at 80% 70%, var(--color-butter-100) 0%, transparent 70%),
            linear-gradient(180deg, var(--color-mint-50) 0%, var(--color-cream-50) 100%)
          `,
        }}
      >
        {board.map((leaf) => {
          const wasFound = found.has(leaf.id)
          const isTarget = leaf.kind === TARGET_KIND
          return (
            <motion.button
              key={leaf.id}
              type="button"
              onClick={() => handleTap(leaf)}
              aria-label={isTarget ? 'Lá đỏ' : 'Lá khác'}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none rounded-full p-2',
                'outline-none focus-visible:ring-4 focus-visible:ring-lavender-300',
              )}
              style={{
                left: `${leaf.x}%`,
                top: `${leaf.y}%`,
                fontSize: leaf.size,
                filter:
                  leaf.kind === 'red'
                    ? 'hue-rotate(-10deg) saturate(1.4) drop-shadow(0 4px 3px rgba(160,40,20,0.3))'
                    : leaf.kind === 'yellow'
                      ? 'hue-rotate(40deg) saturate(1.3) drop-shadow(0 4px 3px rgba(60,40,20,0.18))'
                      : leaf.kind === 'green'
                        ? 'drop-shadow(0 4px 3px rgba(60,40,20,0.18))'
                        : 'drop-shadow(0 4px 3px rgba(60,40,20,0.18))',
              }}
              animate={
                wasFound
                  ? { rotate: leaf.tilt, scale: 1.15, opacity: 0.45 }
                  : { rotate: [leaf.tilt - 3, leaf.tilt + 3, leaf.tilt - 3] }
              }
              transition={
                wasFound
                  ? springSoft
                  : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
              }
              whileTap={wasFound ? undefined : { scale: 0.85 }}
              whileHover={wasFound ? undefined : { scale: 1.15 }}
            >
              <span aria-hidden>{leaf.glyph}</span>

              {/* Found checkmark */}
              <AnimatePresence>
                {wasFound && (
                  <motion.span
                    aria-hidden
                    className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-2 border-mint-500 bg-mint-300 text-white shadow-soft"
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={springSoft}
                  >
                    <Check className="size-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}

        {/* Win overlay */}
        <AnimatePresence>
          {isDone && (
            <motion.div
              className="absolute inset-0 grid place-items-center bg-cream-50/85 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.6, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="rounded-3xl border-4 border-peach-200 bg-cream-50 px-7 py-5 text-center shadow-pop"
              >
                <p className="text-5xl" aria-hidden>🎉</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-cocoa-900">
                  Tuyệt vời!
                </h3>
                <p className="mt-1 text-sm text-cocoa-700">
                  Bé đã tìm hết lá đỏ trong rừng!
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-cocoa-700/80">
          {wrongTaps > 0
            ? `Sai ${wrongTaps} lần — không sao, thử tiếp nhé!`
            : 'Chạm vào những chiếc lá màu đỏ 🍁'}
        </p>
        {isDone ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onComplete}
            className="rounded-full border-2 border-mint-500 bg-mint-400 px-5 py-2 font-display font-semibold text-white shadow-pop"
          >
            Hoàn thành →
          </motion.button>
        ) : (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-1.5 text-sm font-semibold text-cocoa-700 shadow-soft"
          >
            Chơi lại
          </button>
        )}
      </div>
    </div>
  )
}

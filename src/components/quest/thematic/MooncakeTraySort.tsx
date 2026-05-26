import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { springBouncy } from '@/utils/motion'

interface MooncakeTraySortProps {
  onComplete: () => void
}

/**
 * "Lễ Hội Ánh Sáng" — sort items into the Mid-Autumn tray.
 *
 * Palette has 8 items: 4 belong on a traditional mâm cỗ Trung Thu, 4 are
 * playful distractors (pizza, burger, sushi, cupcake). Tap a correct item
 * → it flies to a tray slot. Tap a distractor → quick shake + soft 'wrong'
 * cue, item stays in the palette. Win = all 4 correct items on the tray.
 */

interface PaletteItem {
  id: string
  glyph: string
  label: string
  belongs: boolean
}

const PALETTE: PaletteItem[] = [
  { id: 'pomelo',     glyph: '🍊', label: 'Bưởi vàng',  belongs: true },
  { id: 'mooncake',   glyph: '🥮', label: 'Bánh nướng', belongs: true },
  { id: 'lantern',    glyph: '🏮', label: 'Đèn lồng',   belongs: true },
  { id: 'persimmon',  glyph: '🍑', label: 'Hồng đỏ',    belongs: true },
  { id: 'pizza',      glyph: '🍕', label: 'Pizza',      belongs: false },
  { id: 'burger',     glyph: '🍔', label: 'Burger',     belongs: false },
  { id: 'sushi',      glyph: '🍣', label: 'Sushi',      belongs: false },
  { id: 'cupcake',    glyph: '🧁', label: 'Cupcake',    belongs: false },
]

const TARGET_COUNT = PALETTE.filter((p) => p.belongs).length

export function MooncakeTraySort({ onComplete }: MooncakeTraySortProps) {
  const { play } = useSound()
  const [tray, setTray] = useState<string[]>([])
  const [wrongs, setWrongs] = useState(0)
  const trayShake = useAnimationControls()

  const items = PALETTE.filter((p) => !tray.includes(p.id))
  const isDone = tray.length >= TARGET_COUNT

  const handlePick = (item: PaletteItem) => {
    if (isDone) return
    if (item.belongs) {
      play('correct')
      setTray((t) => [...t, item.id])
    } else {
      play('wrong')
      setWrongs((w) => w + 1)
      trayShake.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.35 },
      })
    }
  }

  useEffect(() => {
    if (!isDone) return
    const t = window.setTimeout(onComplete, 1300)
    return () => window.clearTimeout(t)
  }, [isDone, onComplete])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-butter-500">
            Chuẩn bị lễ hội
          </p>
          <h3 className="font-display text-xl font-bold text-cocoa-900">
            Sắp Mâm Cỗ Trung Thu
          </h3>
        </div>
        <span className="rounded-full border-2 border-butter-300 bg-butter-100 px-3 py-1.5 text-xs font-bold text-butter-500 shadow-soft">
          {tray.length}/{TARGET_COUNT} món
        </span>
      </div>

      {/* Tray */}
      <motion.div
        animate={trayShake}
        className="relative rounded-[2rem] border-4 border-butter-300 p-5 shadow-pop"
        style={{
          backgroundImage: `
            radial-gradient(60% 60% at 50% 0%, var(--color-butter-100) 0%, transparent 70%),
            radial-gradient(60% 60% at 50% 100%, var(--color-peach-100) 0%, transparent 70%),
            linear-gradient(180deg, var(--color-butter-50) 0%, var(--color-cream-50) 100%)
          `,
        }}
      >
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-butter-500">
          🌕 Mâm cỗ Trung Thu 🌕
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: TARGET_COUNT }).map((_, i) => {
            const itemId = tray[i]
            const item = PALETTE.find((p) => p.id === itemId)
            return (
              <div
                key={i}
                className={cn(
                  'grid aspect-square place-items-center rounded-2xl border-2 border-dashed text-3xl',
                  item
                    ? 'border-butter-400 bg-cream-50 shadow-soft'
                    : 'border-butter-300/60 bg-cream-50/40',
                )}
              >
                <AnimatePresence mode="wait">
                  {item && (
                    <motion.span
                      key={item.id}
                      initial={{ scale: 0, rotate: -30, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={springBouncy}
                      aria-label={item.label}
                    >
                      {item.glyph}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={springBouncy}
              className="absolute inset-0 grid place-items-center rounded-[2rem] bg-cream-50/90 backdrop-blur-sm"
            >
              <div className="text-center">
                <span className="text-5xl" aria-hidden>
                  🌕
                </span>
                <h4 className="mt-2 font-display text-xl font-bold text-cocoa-900">
                  Trăng sáng rồi!
                </h4>
                <p className="mt-1 text-sm text-cocoa-700">
                  Chú Cuội mỉm cười từ cung trăng.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-mint-200 px-3 py-1 text-xs font-bold text-mint-500">
                  <Check className="size-3.5" /> Hoàn thành{' '}
                  <Sparkles className="size-3.5" />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Palette */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-butter-500">
          Trong bếp của mẹ
        </p>
        <p className="font-display text-sm font-semibold text-cocoa-900">
          Chạm vào món <em>truyền thống</em> của Trung Thu nhé
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {items.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => handlePick(item)}
              whileTap={{ scale: 0.92 }}
              whileHover={{ y: -3, scale: 1.05 }}
              transition={springBouncy}
              className="rounded-2xl border-2 border-cream-200 bg-cream-50 p-2 shadow-soft hover:bg-butter-50"
            >
              <span className="block text-3xl" aria-hidden>
                {item.glyph}
              </span>
              <span className="mt-0.5 block text-[10px] font-bold text-cocoa-700">
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      <p className="text-xs text-cocoa-700/70">
        {wrongs > 0
          ? `Sai ${wrongs} lần — không sao, Trung Thu chỉ có vài món thôi!`
          : 'Mâm cỗ truyền thống có bưởi, hồng, bánh nướng và đèn lồng. 🏮'}
      </p>
    </div>
  )
}

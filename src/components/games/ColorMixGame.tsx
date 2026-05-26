import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lightbulb, RotateCcw, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSound } from '@/hooks/useSound'
import { BurstParticles } from '@/components/games/BurstParticles'
import { ColorSlider } from '@/components/games/ColorSlider'
import { LumiCoach } from '@/components/games/LumiCoach'

interface ColorMixGameProps {
  onComplete?: () => void
}

interface RGB {
  r: number // 0..100
  g: number
  b: number
}

interface Level {
  id: string
  name: string
  target: RGB
  /** Kid-friendly explanation shown after match. */
  explain: string
  /** Coach prompt while solving. */
  prompt: string
}

const LEVELS: Level[] = [
  {
    id: 'yellow',
    name: 'Vàng',
    target: { r: 100, g: 100, b: 0 },
    prompt: 'Hãy tạo màu Vàng! Lumi mách: thử kéo đèn ĐỎ và XANH LÁ lên cao.',
    explain: 'Đèn ĐỎ + đèn XANH LÁ = Vàng. Ánh sáng pha trộn rất khác với màu vẽ đó!',
  },
  {
    id: 'magenta',
    name: 'Hồng Tím',
    target: { r: 100, g: 0, b: 100 },
    prompt: 'Bây giờ tạo Hồng Tím nhé! Thử đèn ĐỎ và XANH DƯƠNG.',
    explain: 'Đèn ĐỎ + đèn XANH DƯƠNG = Hồng Tím rực rỡ!',
  },
  {
    id: 'cyan',
    name: 'Xanh Ngọc',
    target: { r: 0, g: 100, b: 100 },
    prompt: 'Lần này là Xanh Ngọc — màu của biển! XANH LÁ + XANH DƯƠNG nha.',
    explain: 'XANH LÁ + XANH DƯƠNG = Xanh Ngọc — trông như nước biển!',
  },
  {
    id: 'white',
    name: 'Ánh Sáng Trắng',
    target: { r: 100, g: 100, b: 100 },
    prompt: 'Thử thách cuối: bật cả 3 đèn lên thật sáng để tạo ánh sáng TRẮNG!',
    explain: 'Cả 3 đèn ĐỎ + XANH LÁ + XANH DƯƠNG bật cùng nhau = Ánh sáng TRẮNG! Đó là cách mặt trời chiếu sáng đấy.',
  },
]

const TOLERANCE = 22 // per channel (%)

function isMatch(v: RGB, t: RGB): boolean {
  return (
    Math.abs(v.r - t.r) <= TOLERANCE &&
    Math.abs(v.g - t.g) <= TOLERANCE &&
    Math.abs(v.b - t.b) <= TOLERANCE
  )
}

function toCss({ r, g, b }: RGB): string {
  // Map 0..100 → 0..255
  const k = 2.55
  return `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`
}

export function ColorMixGame({ onComplete }: ColorMixGameProps) {
  const { play } = useSound()

  const [levelIdx, setLevelIdx] = useState(0)
  const [mix, setMix] = useState<RGB>({ r: 30, g: 30, b: 30 })
  const [matchedKey, setMatchedKey] = useState<number | null>(null)
  const [allDone, setAllDone] = useState(false)
  const [showHint, setShowHint] = useState(false)

  // Tinh thể chỉ được trao lần đầu hoàn thành cả 4 màu trong session này.
  // Reset khi component unmount, không reset khi bấm "Chơi lại".
  const claimedRef = useRef(false)

  const level = LEVELS[levelIdx]
  const matched = isMatch(mix, level.target)

  // When the player hits a match, lock the level briefly then advance.
  useEffect(() => {
    if (!matched || matchedKey != null || allDone) return
    play('correct')
    const key = Date.now()
    setMatchedKey(key)
    window.setTimeout(() => play('win'), 240)

    const advanceId = window.setTimeout(() => {
      if (levelIdx + 1 < LEVELS.length) {
        setLevelIdx((i) => i + 1)
        setMix({ r: 30, g: 30, b: 30 })
        setMatchedKey(null)
        setShowHint(false)
      } else {
        setAllDone(true)
        if (!claimedRef.current) {
          claimedRef.current = true
          onComplete?.()
        }
      }
    }, 2200)
    return () => window.clearTimeout(advanceId)
  }, [matched, matchedKey, allDone, levelIdx, onComplete, play])

  const coachMessage = matched
    ? level.explain
    : showHint
      ? `Mục tiêu là màu ${level.name}. ${level.prompt}`
      : `Hãy tạo màu ${level.name} bằng 3 thanh đèn nhé! 🎨`

  const handleReset = () => {
    play('tap')
    setLevelIdx(0)
    setMix({ r: 30, g: 30, b: 30 })
    setMatchedKey(null)
    setShowHint(false)
    setAllDone(false)
  }

  return (
    <div className="space-y-6">
      {/* Coach */}
      <LumiCoach message={coachMessage} size={100} />

      {/* Level progress dots */}
      <div className="flex items-center justify-center gap-2" aria-label="Tiến trình các bàn chơi">
        {LEVELS.map((lv, i) => (
          <span
            key={lv.id}
            className={cn(
              'h-2.5 rounded-full transition-all',
              i === levelIdx
                ? 'w-8 bg-lavender-400'
                : i < levelIdx
                  ? 'w-2.5 bg-mint-400'
                  : 'w-2.5 bg-cream-200',
            )}
            aria-current={i === levelIdx ? 'step' : undefined}
          />
        ))}
      </div>

      {/* Target vs Mix */}
      <div className="relative grid grid-cols-2 items-center justify-items-center gap-4 rounded-3xl border-4 border-lavender-200 bg-cream-50/70 p-6 shadow-soft">
        <ColorOrb label="Mục tiêu" name={level.name} color={toCss(level.target)} pulsing />
        <ColorOrb
          label="Đèn của bé"
          name={matched ? '✓ Khớp rồi!' : '...'}
          color={toCss(mix)}
          highlight={matched}
        />

        {matchedKey != null && (
          <BurstParticles
            key={matchedKey}
            trigger={matchedKey}
            tone="lavender"
            count={20}
            radius={140}
          />
        )}
      </div>

      {/* Sliders */}
      <div
        className={cn(
          'space-y-5 rounded-3xl border-2 border-cream-200 bg-cream-50/80 p-5 shadow-soft transition-opacity',
          matched && 'pointer-events-none opacity-70',
        )}
      >
        <ColorSlider
          label="Đèn Đỏ"
          emoji="🔴"
          color="#ff3344"
          value={mix.r}
          onChange={(r) => setMix((m) => ({ ...m, r }))}
          onTick={() => play('tick')}
        />
        <ColorSlider
          label="Đèn Xanh Lá"
          emoji="🟢"
          color="#22cc66"
          value={mix.g}
          onChange={(g) => setMix((m) => ({ ...m, g }))}
          onTick={() => play('tick')}
        />
        <ColorSlider
          label="Đèn Xanh Dương"
          emoji="🔵"
          color="#3377ff"
          value={mix.b}
          onChange={(b) => setMix((m) => ({ ...m, b }))}
          onTick={() => play('tick')}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setShowHint((h) => !h)
            play('pop')
          }}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-butter-300 bg-butter-100 px-4 py-1.5 text-sm font-semibold text-cocoa-800 shadow-soft hover:bg-butter-200"
        >
          <Lightbulb className="size-4 fill-butter-400 stroke-butter-500" />
          {showHint ? 'Ẩn gợi ý' : 'Gợi ý'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-1.5 text-sm font-semibold text-cocoa-700 shadow-soft hover:bg-cream-100"
        >
          <RotateCcw className="size-4" />
          Bắt đầu lại
        </button>
      </div>

      {/* Final win overlay */}
      <AnimatePresence>
        {allDone && (
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
              className="pointer-events-auto rounded-3xl border-4 border-lavender-300 bg-cream-50/95 px-7 py-6 text-center shadow-pop backdrop-blur"
            >
              <p className="text-5xl" aria-hidden>🌈</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-cocoa-900">
                Bé là Phù Thủy Ánh Sáng!
              </h3>
              <p className="mt-1 max-w-xs text-sm text-cocoa-700">
                Bé đã tạo ra cả 4 loại ánh sáng — Vàng, Hồng Tím, Xanh Ngọc, và Trắng.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-butter-300 bg-butter-100 px-4 py-1.5 text-sm font-bold text-cocoa-800">
                <Sparkles className="size-4 fill-butter-400 stroke-butter-500" />
                Phần thưởng: +5 💎
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="ml-2 mt-4 rounded-full border-2 border-lavender-500 bg-lavender-400 px-5 py-2 font-display text-sm font-bold text-white shadow-soft"
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

interface ColorOrbProps {
  label: string
  name: string
  color: string
  pulsing?: boolean
  highlight?: boolean
}

function ColorOrb({ label, name, color, pulsing, highlight }: ColorOrbProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-cocoa-700/80">
        {label}
      </p>
      <motion.div
        className={cn(
          'relative grid size-28 place-items-center rounded-full border-4 border-cream-50 shadow-pop sm:size-32',
          highlight && 'ring-4 ring-mint-300',
        )}
        style={{
          backgroundColor: color,
          boxShadow: `0 0 30px 6px ${color}`,
        }}
        animate={pulsing ? { scale: [1, 1.05, 1] } : highlight ? { scale: [1, 1.12, 1] } : undefined}
        transition={
          pulsing
            ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.45 }
        }
      >
        {/* Inner highlight for glossy look */}
        <span
          aria-hidden
          className="absolute left-3 top-3 size-6 rounded-full bg-cream-50/40 blur-sm"
        />
      </motion.div>
      <p className="font-display text-base font-semibold text-cocoa-900">{name}</p>
    </div>
  )
}

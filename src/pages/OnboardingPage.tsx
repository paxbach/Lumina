import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Rocket, Sparkles } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/utils/cn'
import { springBouncy, springSoft } from '@/utils/motion'

/* ════════════════════════════════════════════════════════════════════
   OnboardingPage — first-launch greeting & profile creator
   ────────────────────────────────────────────────────────────────────
   Renders BEFORE the AppShell mounts (no bottom nav, no header). The
   router guard in AppRouter pins the kid here until they submit a
   nickname + avatar; on submit we hand control to `<UserProvider>` via
   `setUser()` and navigate to '/' so the main app takes over.

   Visual goals:
     • Calm pastel gradient — matches the Lumina world map's
       cream/peach/butter palette so the transition into the app feels
       continuous, not jarring.
     • Big tap targets, large rounded input — built for small fingers
       on a tablet.
     • Submit button stays disabled until BOTH name and avatar are
       provided; tooltip copy explains why so the kid isn't confused.
   ════════════════════════════════════════════════════════════════════ */

interface AvatarOption {
  glyph: string
  label: string
}

const AVATAR_OPTIONS: AvatarOption[] = [
  { glyph: '🐻', label: 'Gấu nhỏ' },
  { glyph: '🐰', label: 'Thỏ con' },
  { glyph: '🐯', label: 'Hổ vàng' },
  { glyph: '🦊', label: 'Cáo lửa' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { setUser } = useUser()

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  // Touched flag drives the inline name validation hint — we don't
  // want to scream "tên trống!" the moment the page mounts.
  const [touched, setTouched] = useState(false)

  const trimmedName = name.trim()
  const nameInvalid = touched && trimmedName.length === 0
  const canSubmit = trimmedName.length > 0 && avatar !== null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit || avatar === null) return
    setUser({
      name: trimmedName,
      avatar,
      gems: 0,
    })
    // `replace` so the back button doesn't pop the user back to the
    // onboarding page after they've already created an account.
    navigate('/', { replace: true })
  }

  return (
    <main
      className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-10"
      style={{
        background:
          'linear-gradient(165deg, var(--color-cream-50) 0%, var(--color-peach-100) 45%, var(--color-butter-100) 100%)',
      }}
    >
      {/* Ambient floaters — purely decorative; pointer-events-none so
          they never block taps on the form below. */}
      <FloatingDecor />

      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springBouncy}
        className="relative z-10 w-full max-w-md rounded-[2.5rem] border-4 border-cream-200 bg-cream-50/95 p-7 shadow-pop backdrop-blur-md sm:p-9"
      >
        {/* Sparkle eyebrow */}
        <div className="flex items-center justify-center gap-1.5 rounded-full border-2 border-butter-300 bg-butter-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-butter-500 shadow-soft mx-auto w-max">
          <Sparkles className="size-3.5 fill-butter-400 stroke-butter-500" />
          Đảo Lumina
        </div>

        <h1 className="mt-4 text-center font-display text-2xl font-bold leading-snug text-cocoa-900 sm:text-3xl">
          Chào mừng đến với Đảo Lumina!
          <br />
          <span className="text-lavender-500">Bé tên là gì nhỉ?</span> ✨
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5" noValidate>
          {/* ── Name input ─────────────────────────────────────────── */}
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-cocoa-700/70">
              Tên của bé
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              autoFocus
              maxLength={24}
              placeholder="Ví dụ: Su Su"
              aria-invalid={nameInvalid}
              aria-describedby={nameInvalid ? 'name-error' : undefined}
              className={cn(
                'w-full rounded-2xl border-[3px] bg-cream-50 px-5 py-3.5 font-display text-lg font-semibold text-cocoa-900 shadow-inset-soft transition-colors',
                'placeholder:font-normal placeholder:text-cocoa-700/40',
                'focus-visible:outline-none focus-visible:ring-4',
                nameInvalid
                  ? 'border-peach-400 focus-visible:ring-peach-200'
                  : 'border-lavender-200 focus-visible:border-lavender-400 focus-visible:ring-lavender-200',
              )}
            />
            <AnimatePresence>
              {nameInvalid && (
                <motion.p
                  id="name-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1.5 text-xs font-semibold text-peach-500"
                >
                  Bé ơi, nhập tên của mình nhé!
                </motion.p>
              )}
            </AnimatePresence>
          </label>

          {/* ── Avatar picker ──────────────────────────────────────── */}
          <fieldset>
            <legend className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-cocoa-700/70">
              Chọn bạn đồng hành
            </legend>
            <div
              role="radiogroup"
              aria-label="Chọn avatar"
              className="grid grid-cols-4 gap-3"
            >
              {AVATAR_OPTIONS.map((opt) => {
                const selected = avatar === opt.glyph
                return (
                  <motion.button
                    key={opt.glyph}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={opt.label}
                    onClick={() => setAvatar(opt.glyph)}
                    whileHover={{ y: -3, scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    transition={springSoft}
                    className={cn(
                      'group relative grid aspect-square place-items-center rounded-3xl border-[3px] text-4xl shadow-soft transition-colors sm:text-5xl',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200',
                      selected
                        ? 'border-lavender-400 bg-lavender-100 shadow-pop'
                        : 'border-cream-200 bg-cream-50 hover:bg-cream-100',
                    )}
                  >
                    <span aria-hidden>{opt.glyph}</span>
                    {selected && (
                      <motion.span
                        layoutId="avatar-ring"
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-3xl border-[3px] border-lavender-500"
                        transition={springBouncy}
                        style={{
                          boxShadow:
                            '0 0 0 4px rgba(197, 160, 255, 0.35), 0 0 18px rgba(197, 160, 255, 0.55)',
                        }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </fieldset>

          {/* ── Submit ─────────────────────────────────────────────── */}
          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileHover={canSubmit ? { y: -2, scale: 1.02 } : undefined}
            whileTap={canSubmit ? { scale: 0.97 } : undefined}
            transition={springBouncy}
            className={cn(
              'mt-2 inline-flex items-center justify-center gap-2 rounded-full border-[3px] px-6 py-3.5 font-display text-base font-bold shadow-pop transition-colors',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-butter-300',
              canSubmit
                ? 'border-butter-500 bg-gradient-to-br from-butter-400 to-peach-400 text-white hover:from-butter-500'
                : 'cursor-not-allowed border-cream-200 bg-cream-100 text-cocoa-700/40',
            )}
          >
            <Rocket className="size-5" />
            Bắt đầu phiêu lưu 🚀
          </motion.button>

          {!canSubmit && (
            <p className="text-center text-[11px] font-medium text-cocoa-700/70">
              {trimmedName.length === 0
                ? 'Nhập tên và chọn bạn đồng hành để bắt đầu nhé!'
                : 'Chọn một bạn đồng hành để tiếp tục.'}
            </p>
          )}
        </form>
      </motion.section>
    </main>
  )
}

/* ── Ambient pastel floaters ─────────────────────────────────────────
   Three slow-drifting orbs softly bobbing in the background. Not part
   of the form interaction — purely sets the "Lumina world" mood.
   ──────────────────────────────────────────────────────────────────── */

function FloatingDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[
        { left: '8%',  top: '12%', size: 140, tint: 'var(--color-lavender-glow)' },
        { right: '6%', top: '20%', size: 110, tint: 'var(--color-peach-glow)' },
        { left: '14%', bottom: '14%', size: 160, tint: 'var(--color-butter-glow)' },
      ].map((o, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            ...('right' in o ? { right: o.right } : { left: o.left }),
            ...('bottom' in o ? { bottom: o.bottom } : { top: o.top }),
            width: o.size,
            height: o.size,
            background: o.tint,
            opacity: 0.55,
          }}
          animate={{
            y: [0, -14, 0],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 6 + i * 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  )
}

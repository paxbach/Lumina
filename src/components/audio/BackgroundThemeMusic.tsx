import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'

/* ════════════════════════════════════════════════════════════════════
   BackgroundThemeMusic
   ────────────────────────────────────────────────────────────────────
   Global ambient theme song for the Lumina universe. Designed to:

     • Live ONCE in `AppShell` so the audio element survives every
       route transition — the music keeps playing as the kid drills
       into a sub-map, opens a game, or browses the diary.
     • Respect browser autoplay policies — first user interaction
       (click / touch / keydown anywhere on the document) triggers
       `audio.play()`. If the user never interacts, nothing fires.
     • Show a glass amber toggle pill in the top-right corner with
       a sleek mute/unmute swap + floating music-note particles when
       playing, matching the warm pastel aesthetic of the rest of
       the prototype.
     • Degrade gracefully when the asset is missing (no console-error
       wall, no broken UI — the button just hides).
   ════════════════════════════════════════════════════════════════════ */

const THEME_SRC = '/audio/lumina-theme.mp3'
const THEME_VOLUME = 0.25

/** Logger gated on Vite's dev flag so production stays quiet. */
function devLog(...args: unknown[]) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[BgMusic]', ...args)
  }
}

export function BackgroundThemeMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // `isPlaying` is the INTENDED state (what the user wants). The
  // actual playback may lag behind until autoplay unlocks via the
  // first interaction — `hasStarted` reflects whether audio is
  // genuinely outputting sound right now.
  const [isPlaying, setIsPlaying] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [hasError, setHasError] = useState(false)

  /* ── Audio element lifecycle ───────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return

    const audio = new Audio(THEME_SRC)
    audio.loop = true
    audio.volume = THEME_VOLUME
    audio.preload = 'auto'
    audioRef.current = audio

    const handlePlay = () => {
      setHasStarted(true)
      setHasError(false)
      devLog('audio play event')
    }
    const handlePause = () => {
      devLog('audio pause event')
    }
    const handleError = (e: Event) => {
      setHasError(true)
      devLog('audio error', e)
    }
    // Browsers emit `canplaythrough` when enough is buffered. Mostly
    // for dev telemetry — we don't gate playback on it.
    const handleCanPlay = () => devLog('canplaythrough — buffered')

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplaythrough', handleCanPlay)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplaythrough', handleCanPlay)
      audio.pause()
      // Releasing `src` lets the browser GC the media resource and
      // avoids the "AbortError: Play interrupted by pause" warning
      // on hot-reload in dev.
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
      devLog('audio teardown')
    }
  }, [])

  /* ── First-interaction autoplay unlock ─────────────────────────── */
  useEffect(() => {
    // Only attempt unlock while we're INTENDING to play but haven't
    // managed to start yet. Once `hasStarted` flips true, future
    // play/pause flows through `handleToggle` which already runs in
    // a user-gesture context.
    if (!isPlaying || hasStarted) return

    const tryPlay = () => {
      const audio = audioRef.current
      if (!audio) return
      const promise = audio.play()
      if (!promise) return
      promise
        .then(() => {
          setHasStarted(true)
          devLog('autoplay unlocked via interaction')
        })
        .catch((err) => {
          // Browser still blocked it (rare after a real gesture).
          // The listener stays armed so the next click can retry.
          devLog('play promise rejected', err)
        })
    }

    // `pointerdown` catches mouse + touch + pen with a single listener.
    // `keydown` for accessibility — keyboard users count as a gesture.
    document.addEventListener('pointerdown', tryPlay)
    document.addEventListener('keydown', tryPlay)

    return () => {
      document.removeEventListener('pointerdown', tryPlay)
      document.removeEventListener('keydown', tryPlay)
    }
  }, [isPlaying, hasStarted])

  /* ── Toggle handler — direct play/pause from a user gesture ───── */
  const handleToggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      devLog('user muted')
      return
    }

    // Going from muted → playing. Already inside a click gesture, so
    // play() should resolve unless the asset itself is broken.
    audio
      .play()
      .then(() => {
        setIsPlaying(true)
        setHasStarted(true)
        devLog('user unmuted')
      })
      .catch((err) => {
        setHasError(true)
        devLog('user-triggered play failed', err)
      })
  }, [isPlaying])

  // Hide the toggle entirely if the asset can't be loaded — keeps the
  // UI clean rather than leaving a button that does nothing.
  if (hasError) return null

  const liveAndPlaying = isPlaying && hasStarted

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      aria-label={isPlaying ? 'Tắt nhạc nền Lumina' : 'Bật nhạc nền Lumina'}
      aria-pressed={isPlaying}
      initial={{ opacity: 0, y: -8, scale: 0.85 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: liveAndPlaying
          ? [
              '0 0 0 0 rgba(245, 158, 11, 0.45)',
              '0 0 0 14px rgba(245, 158, 11, 0)',
            ]
          : '0 8px 16px -8px rgba(120, 70, 30, 0.35)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        opacity: { duration: 0.4 },
        y: { type: 'spring', stiffness: 240, damping: 22 },
        scale: { type: 'spring', stiffness: 320, damping: 22 },
        boxShadow: liveAndPlaying
          ? { duration: 1.8, repeat: Infinity, ease: 'easeOut' }
          : { duration: 0.3 },
      }}
      className="fixed right-4 top-4 z-50 grid size-11 place-items-center rounded-full border border-amber-200 bg-white/80 text-amber-500 backdrop-blur-md shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 sm:right-6 sm:top-6 sm:size-12"
    >
      <AnimatePresence mode="wait" initial={false}>
        {liveAndPlaying ? (
          <motion.span
            key="playing"
            initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0, rotate: 20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
          >
            <motion.span
              // Subtle pulsing volume icon so the button reads as
              // "currently playing" at a glance.
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="block"
            >
              <Volume2 className="size-5" strokeWidth={2.4} />
            </motion.span>
          </motion.span>
        ) : (
          <motion.span
            key="muted"
            initial={{ scale: 0.6, opacity: 0, rotate: 20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0, rotate: -20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
            className="text-cocoa-700/70"
          >
            <VolumeX className="size-5" strokeWidth={2.4} />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Floating music-note particles — drift upward + fade out while
          playing. Pointer-events off so they never block the click. */}
      <AnimatePresence>
        {liveAndPlaying && <FloatingNotes key="notes" />}
      </AnimatePresence>
    </motion.button>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Floating music-note particles
   ════════════════════════════════════════════════════════════════════ */

interface NoteSeed {
  glyph: string
  /** Horizontal anchor as % of button width. */
  x: number
  /** Per-particle delay so the trail feels organic, not a stutter. */
  delay: number
  /** Cycle duration in seconds. */
  duration: number
}

const NOTE_SEEDS: NoteSeed[] = [
  { glyph: '🎵', x: 20, delay: 0,    duration: 2.4 },
  { glyph: '✨', x: 55, delay: 0.7,  duration: 2.6 },
  { glyph: '🎵', x: 80, delay: 1.4,  duration: 2.2 },
]

function FloatingNotes() {
  return (
    <>
      {NOTE_SEEDS.map((n, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute select-none text-[11px] leading-none"
          style={{ left: `${n.x}%`, top: '0%' }}
          initial={{ y: 0, opacity: 0, scale: 0.6 }}
          animate={{
            y: [-2, -22, -38],
            opacity: [0, 1, 0],
            scale: [0.6, 1, 0.8],
          }}
          transition={{
            duration: n.duration,
            delay: n.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        >
          {n.glyph}
        </motion.span>
      ))}
    </>
  )
}

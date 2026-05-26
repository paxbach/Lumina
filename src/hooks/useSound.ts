import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

export type SoundKey =
  | 'tap'
  | 'tick'
  | 'pop'
  | 'correct'
  | 'wrong'
  | 'win'

interface ToneSpec {
  /** Sequence of notes (Hz). Multiple notes play in order, slightly staggered. */
  freqs: number[]
  /** Per-note duration (seconds). */
  duration: number
  /** Waveform. */
  type?: OscillatorType
  /** Per-note stagger (seconds). Defaults to 0.08. */
  stagger?: number
  /** Peak gain (0..1). Defaults to 0.12. */
  gain?: number
}

const SOUNDS: Record<SoundKey, ToneSpec> = {
  tap:     { freqs: [880],                       duration: 0.06, type: 'sine',     gain: 0.10 },
  tick:    { freqs: [660, 880],                  duration: 0.07, type: 'triangle', gain: 0.08 },
  pop:     { freqs: [1240],                      duration: 0.05, type: 'triangle', gain: 0.10 },
  correct: { freqs: [523, 659, 784],             duration: 0.18, type: 'sine',     gain: 0.14 },
  wrong:   { freqs: [220, 165],                  duration: 0.22, type: 'sine',     gain: 0.10, stagger: 0.12 },
  win:     { freqs: [523, 659, 784, 1046, 1318], duration: 0.16, type: 'sine',     gain: 0.16, stagger: 0.10 },
}

/**
 * Lightweight Web Audio synth — placeholder tones for prototyping.
 * Real audio files can replace this later without touching call sites.
 * Respects the global mute toggle from useAppStore.
 */
export function useSound() {
  const enabled = useAppStore((s) => s.soundEnabled)
  const ctxRef = useRef<AudioContext | null>(null)

  // Lazy-init AudioContext on first user-triggered play (autoplay-policy-safe).
  const getCtx = (): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (ctxRef.current) return ctxRef.current
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    ctxRef.current = new Ctor()
    return ctxRef.current
  }

  const play = useCallback(
    (key: SoundKey) => {
      if (!enabled) return
      const ctx = getCtx()
      if (!ctx) return

      // Resume if browser suspended it (Safari/Chrome autoplay rules).
      if (ctx.state === 'suspended') {
        void ctx.resume()
      }

      const spec = SOUNDS[key]
      const stagger = spec.stagger ?? 0.08
      const peak = spec.gain ?? 0.12

      spec.freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = spec.type ?? 'sine'
        osc.frequency.value = freq
        osc.connect(gain).connect(ctx.destination)

        const start = ctx.currentTime + i * stagger
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(peak, start + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration)

        osc.start(start)
        osc.stop(start + spec.duration + 0.04)
      })
    },
    [enabled],
  )

  // Close the AudioContext on unmount of the component tree (best-effort).
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current
      if (ctx && ctx.state !== 'closed') {
        void ctx.close()
        ctxRef.current = null
      }
    }
  }, [])

  return { play, enabled }
}

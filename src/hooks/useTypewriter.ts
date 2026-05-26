import { useCallback, useEffect, useRef, useState } from 'react'

interface TypewriterOptions {
  /** Milliseconds per character. Default 32ms (~31 cps — comfortable for kids). */
  speed?: number
  /** Extra pause on `.`, `!`, `?`. Default 4× speed. */
  sentencePause?: number
  /** Extra pause on `,`, `;`, `—`, `…`. Default 2× speed. */
  commaPause?: number
  /** Delay before typing begins (ms). */
  startDelay?: number
}

interface UseTypewriterResult {
  /** Currently visible substring of `text`. */
  displayed: string
  /** True once the full text has been revealed. */
  isDone: boolean
  /** Skip the animation — reveals all remaining text instantly. */
  skip: () => void
  /** Reset and replay the typing animation from the start. */
  replay: () => void
}

/**
 * Reveal `text` character-by-character with natural pauses on punctuation.
 *
 *   const { displayed, isDone, skip } = useTypewriter(message)
 *   <p onClick={skip}>{displayed}{!isDone && <Caret />}</p>
 *
 * Punctuation pacing makes the speech feel like a person reading aloud —
 * a tiny breath after commas, a deeper pause after sentences.
 */
export function useTypewriter(
  text: string,
  opts: TypewriterOptions = {},
): UseTypewriterResult {
  const {
    speed = 32,
    sentencePause = speed * 4,
    commaPause = speed * 2,
    startDelay = 0,
  } = opts

  const [displayed, setDisplayed] = useState('')
  const [isDone, setIsDone] = useState(text.length === 0)
  const [replayKey, setReplayKey] = useState(0)
  const timerRef = useRef<number | null>(null)

  // Skip + replay need stable refs to the latest text & options.
  const textRef = useRef(text)
  textRef.current = text

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    clearTimer()
    setDisplayed('')
    setIsDone(text.length === 0)
    if (text.length === 0) return

    let i = 0

    const tick = () => {
      i++
      const slice = text.slice(0, i)
      setDisplayed(slice)

      if (i >= text.length) {
        setIsDone(true)
        timerRef.current = null
        return
      }

      // Pace based on the character we JUST revealed.
      const last = text.charAt(i - 1)
      let nextDelay = speed
      if (last === '.' || last === '!' || last === '?') nextDelay = sentencePause
      else if (last === ',' || last === ';' || last === '—' || last === '…') {
        nextDelay = commaPause
      }
      timerRef.current = window.setTimeout(tick, nextDelay)
    }

    timerRef.current = window.setTimeout(tick, startDelay)

    return clearTimer
  }, [text, speed, sentencePause, commaPause, startDelay, replayKey])

  const skip = useCallback(() => {
    clearTimer()
    setDisplayed(textRef.current)
    setIsDone(true)
  }, [])

  const replay = useCallback(() => {
    setReplayKey((k) => k + 1)
  }, [])

  return { displayed, isDone, skip, replay }
}

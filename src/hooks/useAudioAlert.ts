import { useCallback, useRef } from 'react'

export function useAudioAlert() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    return ctxRef.current
  }, [])

  const beep = useCallback((ctx: AudioContext, startTime: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.5, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.start(startTime)
    osc.stop(startTime + duration)
  }, [])

  const playAlert = useCallback(() => {
    try {
      const ctx = getCtx()
      const t = ctx.currentTime
      beep(ctx, t, 880, 0.15)
      beep(ctx, t + 0.2, 1100, 0.15)
      beep(ctx, t + 0.4, 880, 0.3)
    } catch {
      // AudioContext not available
    }
  }, [getCtx, beep])

  const playStartAlert = useCallback(() => {
    try {
      const ctx = getCtx()
      const t = ctx.currentTime
      beep(ctx, t, 660, 0.12)
      beep(ctx, t + 0.18, 990, 0.18)
    } catch {
      // AudioContext not available
    }
  }, [getCtx, beep])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    speechSynthesis.speak(u)
  }, [])

  return { playAlert, playStartAlert, speak }
}

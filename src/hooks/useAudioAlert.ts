import { useCallback, useRef } from 'react'

export function useAudioAlert() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    return ctxRef.current
  }, [])

  const playAlert = useCallback(() => {
    try {
      const ctx = getCtx()
      const beep = (startTime: number, freq: number, duration: number) => {
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
      }
      const t = ctx.currentTime
      beep(t, 880, 0.15)
      beep(t + 0.2, 1100, 0.15)
      beep(t + 0.4, 880, 0.3)
    } catch {
      // AudioContext not available
    }
  }, [getCtx])

  return { playAlert }
}

import { useState } from 'react'
import { useTimerStore } from '../../store/timerStore'
import { useTranslation } from '../../hooks/useTranslation'
import { CircularTimer } from './CircularTimer'
import { Button } from '../shared/Button'

const PRESET_SECONDS = [180, 300, 600, 900, 1500, 3000]

export function CountdownTimer() {
  const { status, remaining, total, start, pause, reset, setCountdown } = useTimerStore()
  const { t } = useTranslation()
  const [customMin, setCustomMin] = useState('')
  const [customSec, setCustomSec] = useState('')

  const presets = PRESET_SECONDS.map((s) => ({
    seconds: s,
    label: `${s / 60}${t.minUnit}`,
  }))

  const handleCustom = () => {
    const m = parseInt(customMin || '0', 10)
    const s = parseInt(customSec || '0', 10)
    const total = m * 60 + s
    if (total > 0) {
      setCountdown(total)
      setCustomMin('')
      setCustomSec('')
    }
  }

  const isIdle = status === 'idle' || status === 'finished'

  return (
    <div className="flex flex-col items-center h-full overflow-y-auto px-5 py-4 gap-5">
      {/* Circular Timer */}
      <CircularTimer
        remaining={remaining}
        total={total}
        label={status === 'finished' ? t.done : undefined}
      />

      {/* Action Buttons */}
      <div className="flex gap-3 w-full max-w-xs">
        {isIdle ? (
          <Button size="lg" onClick={start} disabled={remaining === 0} className="flex-1">
            {t.start}
          </Button>
        ) : status === 'running' ? (
          <Button size="lg" variant="secondary" onClick={pause} className="flex-1">
            {t.pause}
          </Button>
        ) : (
          <Button size="lg" onClick={start} className="flex-1">
            {t.resume}
          </Button>
        )}
        <Button size="lg" variant="secondary" onClick={reset} className="flex-1">
          {t.reset}
        </Button>
      </div>

      {/* Presets & Input — only when idle */}
      {isIdle && (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {/* Presets card */}
          <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-headline font-bold text-sm text-on-surface">Presets</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => setCountdown(p.seconds)}
                  className={`py-3 rounded-xl text-sm font-headline font-medium transition-all active:scale-95 ${
                    total === p.seconds && remaining === p.seconds
                      ? 'bg-primary-fixed text-on-primary-fixed-variant font-bold'
                      : 'bg-surface-container-lowest text-on-surface'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Entry card */}
          <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-3">
            <span className="font-headline font-bold text-sm text-on-surface">{t.enterMinutes}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-surface-container-highest rounded-xl p-3 text-center">
                <span className="block text-[9px] uppercase tracking-widest text-outline mb-1">MM</span>
                <input
                  type="number"
                  min="0"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
                  placeholder="00"
                  className="w-full bg-transparent text-center font-headline font-bold text-xl text-on-surface outline-none border-none p-0"
                />
              </div>
              <span className="font-bold text-outline text-xl">:</span>
              <div className="flex-1 bg-surface-container-highest rounded-xl p-3 text-center">
                <span className="block text-[9px] uppercase tracking-widest text-outline mb-1">SS</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customSec}
                  onChange={(e) => setCustomSec(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
                  placeholder="00"
                  className="w-full bg-transparent text-center font-headline font-bold text-xl text-on-surface outline-none border-none p-0"
                />
              </div>
              <Button size="sm" onClick={handleCustom}>
                {t.set}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

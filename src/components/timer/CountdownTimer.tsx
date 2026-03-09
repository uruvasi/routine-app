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

  const presets = PRESET_SECONDS.map((s) => ({
    seconds: s,
    label: `${s / 60}${t.minUnit}`,
  }))

  const handleCustom = () => {
    const m = parseInt(customMin, 10)
    if (m > 0) {
      setCountdown(m * 60)
      setCustomMin('')
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <CircularTimer
        remaining={remaining}
        total={total}
        label={status === 'finished' ? t.done : undefined}
      />

      <div className="flex gap-3">
        {status === 'idle' || status === 'finished' ? (
          <Button size="lg" onClick={start} disabled={remaining === 0}>
            {t.start}
          </Button>
        ) : status === 'running' ? (
          <Button size="lg" variant="secondary" onClick={pause}>
            {t.pause}
          </Button>
        ) : (
          <Button size="lg" onClick={start}>
            {t.resume}
          </Button>
        )}
        <Button size="lg" variant="secondary" onClick={reset}>
          {t.reset}
        </Button>
      </div>

      {(status === 'idle' || status === 'finished') && (
        <>
          <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
            {presets.map((p) => (
              <Button
                key={p.seconds}
                variant="secondary"
                size="sm"
                onClick={() => setCountdown(p.seconds)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 w-full max-w-xs">
            <input
              type="number"
              min="1"
              placeholder={t.enterMinutes}
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm"
            />
            <Button size="sm" onClick={handleCustom}>
              {t.set}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

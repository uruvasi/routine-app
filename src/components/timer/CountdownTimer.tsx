import { useState } from 'react'
import { useTimerStore } from '../../store/timerStore'
import { CircularTimer } from './CircularTimer'
import { Button } from '../shared/Button'

const PRESETS = [
  { label: '3分',  seconds: 180 },
  { label: '5分',  seconds: 300 },
  { label: '10分', seconds: 600 },
  { label: '15分', seconds: 900 },
  { label: '25分', seconds: 1500 },
  { label: '50分', seconds: 3000 },
]

export function CountdownTimer() {
  const { status, remaining, total, start, pause, reset, setCountdown } = useTimerStore()
  const [customMin, setCustomMin] = useState('')

  const handlePreset = (s: number) => {
    setCountdown(s)
  }

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
        label={status === 'finished' ? '完了!' : undefined}
      />

      <div className="flex gap-3">
        {status === 'idle' || status === 'finished' ? (
          <Button size="lg" onClick={start} disabled={remaining === 0}>
            スタート
          </Button>
        ) : status === 'running' ? (
          <Button size="lg" variant="secondary" onClick={pause}>
            一時停止
          </Button>
        ) : (
          <Button size="lg" onClick={start}>
            再開
          </Button>
        )}
        <Button size="lg" variant="secondary" onClick={reset}>
          リセット
        </Button>
      </div>

      {(status === 'idle' || status === 'finished') && (
        <>
          <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
            {PRESETS.map((p) => (
              <Button
                key={p.seconds}
                variant="secondary"
                size="sm"
                onClick={() => handlePreset(p.seconds)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 w-full max-w-xs">
            <input
              type="number"
              min="1"
              placeholder="分数を入力"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm"
            />
            <Button size="sm" onClick={handleCustom}>
              セット
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

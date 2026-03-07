import { useState } from 'react'
import { useTimerStore } from '../../store/timerStore'
import { CircularTimer } from './CircularTimer'
import { Button } from '../shared/Button'

export function PomodoroTimer() {
  const {
    status, remaining, total,
    pomodoroPhase, pomodoroCount,
    pomodoroWorkDuration, pomodoroBreakDuration,
    start, pause, reset, setPomodoroSettings,
  } = useTimerStore()

  const [editing, setEditing] = useState(false)
  const [workMin, setWorkMin] = useState(String(pomodoroWorkDuration / 60))
  const [breakMin, setBreakMin] = useState(String(pomodoroBreakDuration / 60))

  const color = pomodoroPhase === 'work' ? '#6366f1' : '#10b981'
  const phaseLabel = pomodoroPhase === 'work' ? '作業' : '休憩'

  const saveSettings = () => {
    const w = parseInt(workMin, 10)
    const b = parseInt(breakMin, 10)
    if (w > 0 && b > 0) {
      setPomodoroSettings(w * 60, b * 60)
      setEditing(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <CircularTimer
        remaining={remaining}
        total={total}
        color={color}
        label={phaseLabel}
        sublabel={`${pomodoroCount} セット完了`}
      />

      <div className="flex gap-3">
        {status === 'idle' || status === 'finished' ? (
          <Button size="lg" onClick={start}>スタート</Button>
        ) : status === 'running' ? (
          <Button size="lg" variant="secondary" onClick={pause}>一時停止</Button>
        ) : (
          <Button size="lg" onClick={start}>再開</Button>
        )}
        <Button size="lg" variant="secondary" onClick={reset}>リセット</Button>
      </div>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-indigo-500 dark:text-indigo-400"
        >
          作業 {pomodoroWorkDuration / 60}分 / 休憩 {pomodoroBreakDuration / 60}分 (変更)
        </button>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 w-16">作業</label>
            <input
              type="number"
              min="1"
              value={workMin}
              onChange={(e) => setWorkMin(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
            <span className="text-sm text-gray-500">分</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 w-16">休憩</label>
            <input
              type="number"
              min="1"
              value={breakMin}
              onChange={(e) => setBreakMin(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
            <span className="text-sm text-gray-500">分</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveSettings} className="flex-1">保存</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)} className="flex-1">キャンセル</Button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useTimerStore } from '../../store/timerStore'
import { useTimer } from '../../hooks/useTimer'
import { useWakeLock } from '../../hooks/useWakeLock'
import { CountdownTimer } from './CountdownTimer'
import { PomodoroTimer } from './PomodoroTimer'
import { IntervalTimer } from './IntervalTimer'
import { RoutineTimer } from './RoutineTimer'
import type { TimerMode } from '../../types'

const MODES: { id: TimerMode; label: string }[] = [
  { id: 'countdown', label: 'カウントダウン' },
  { id: 'pomodoro', label: 'ポモドーロ' },
  { id: 'interval', label: 'インターバル' },
  { id: 'routine', label: 'ルーティン' },
]

export function TimerScreen() {
  const { mode, status, setMode } = useTimerStore()
  useTimer()
  useWakeLock(status === 'running')

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 pt-2">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${
                mode === m.id
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {mode === 'countdown' && <CountdownTimer />}
        {mode === 'pomodoro' && <PomodoroTimer />}
        {mode === 'interval' && <IntervalTimer />}
        {mode === 'routine' && <RoutineTimer />}
      </div>
    </div>
  )
}

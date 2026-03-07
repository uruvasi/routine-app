import { useTimerStore } from '../../store/timerStore'
import { useRoutineStore } from '../../store/routineStore'
import { CircularTimer } from './CircularTimer'
import { Button } from '../shared/Button'

export function RoutineTimer() {
  const {
    status, remaining, total,
    activeRoutineId, currentTaskIndex,
    start, pause, reset,
    setActiveRoutine,
  } = useTimerStore()
  const routines = useRoutineStore((s) => s.routines)

  const activeRoutine = routines.find((r) => r.id === activeRoutineId)
  const currentTask = activeRoutine?.tasks[currentTaskIndex]

  const handleSelectRoutine = (routineId: string) => {
    const routine = routines.find((r) => r.id === routineId)
    if (routine && routine.tasks.length > 0) {
      setActiveRoutine(routineId, routine.tasks[0].duration)
    }
  }

  if (!activeRoutine || activeRoutine.tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">ルーティンを選択してください</p>
        {routines.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            「ルーティン」タブでルーティンを作成してください
          </p>
        ) : (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {routines.map((r) => (
              <Button
                key={r.id}
                variant="secondary"
                onClick={() => handleSelectRoutine(r.id)}
                className="w-full text-left"
              >
                {r.name} ({r.tasks.length}タスク)
              </Button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const totalTasks = activeRoutine.tasks.length

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <CircularTimer
        remaining={remaining}
        total={total}
        label={currentTask?.name}
        sublabel={`${currentTaskIndex + 1} / ${totalTasks}`}
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

      <button
        onClick={() => useTimerStore.setState({ activeRoutineId: null, status: 'idle' })}
        className="text-sm text-indigo-500 dark:text-indigo-400"
      >
        ルーティン変更
      </button>

      <div className="w-full max-w-xs flex flex-col gap-1">
        {activeRoutine.tasks.map((task, i) => (
          <div
            key={task.id}
            className={`flex justify-between items-center px-3 py-2 rounded-xl text-sm ${
              i === currentTaskIndex
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                : i < currentTaskIndex
                ? 'text-gray-300 dark:text-gray-600 line-through'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span>{task.name}</span>
            <span className="text-xs">{formatDuration(task.duration)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0 && s > 0) return `${m}分${s}秒`
  if (m > 0) return `${m}分`
  return `${s}秒`
}

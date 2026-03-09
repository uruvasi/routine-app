import { useTimerStore } from '../../store/timerStore'
import { useRoutineStore } from '../../store/routineStore'
import { useAudioAlert } from '../../hooks/useAudioAlert'
import { useTranslation } from '../../hooks/useTranslation'
import { CircularTimer } from './CircularTimer'
import { Button } from '../shared/Button'

interface Props {
  onEdit: () => void
}

export function RoutineTimer({ onEdit }: Props) {
  const {
    status, remaining, total,
    activeRoutineId, currentTaskIndex,
    start, pause, reset,
    setActiveRoutine, jumpToTask,
  } = useTimerStore()
  const routines = useRoutineStore((s) => s.routines)
  const { playStartAlert, speak } = useAudioAlert()
  const { t } = useTranslation()

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
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t.selectRoutine}</p>
        {routines.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            {t.noRoutinesYet}
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
                {r.name} ({t.taskCountLabel(r.tasks.length, '').split(' · ')[0]})
              </Button>
            ))}
          </div>
        )}
        <button
          onClick={onEdit}
          className="text-sm text-indigo-500 dark:text-indigo-400"
        >
          {t.editRoutines}
        </button>
      </div>
    )
  }

  const totalTasks = activeRoutine.tasks.length

  const handlePrev = () => {
    if (currentTaskIndex > 0) {
      const prevTask = activeRoutine.tasks[currentTaskIndex - 1]
      jumpToTask(currentTaskIndex - 1, prevTask.duration)
      if (status === 'running') {
        playStartAlert()
        speak(t.speakTaskStart(prevTask.name))
      }
    }
  }

  const handleNext = () => {
    if (currentTaskIndex < totalTasks - 1) {
      const nextTask = activeRoutine.tasks[currentTaskIndex + 1]
      jumpToTask(currentTaskIndex + 1, nextTask.duration)
      if (status === 'running') {
        playStartAlert()
        speak(t.speakTaskStart(nextTask.name))
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <CircularTimer
        remaining={remaining}
        total={total}
        label={currentTask?.name}
        sublabel={`${currentTaskIndex + 1} / ${totalTasks}`}
      />

      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={handlePrev} disabled={currentTaskIndex === 0}>◀</Button>
        {status === 'idle' || status === 'finished' ? (
          <Button size="lg" onClick={start}>{t.start}</Button>
        ) : status === 'running' ? (
          <Button size="lg" variant="secondary" onClick={pause}>{t.pause}</Button>
        ) : (
          <Button size="lg" onClick={start}>{t.resume}</Button>
        )}
        <Button size="lg" variant="secondary" onClick={reset}>{t.reset}</Button>
        <Button variant="secondary" onClick={handleNext} disabled={currentTaskIndex === totalTasks - 1}>▶</Button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => useTimerStore.setState({ activeRoutineId: null, status: 'idle' })}
          className="text-sm text-indigo-500 dark:text-indigo-400"
        >
          {t.changeRoutine}
        </button>
        <button
          onClick={onEdit}
          className="text-sm text-indigo-500 dark:text-indigo-400"
        >
          {t.edit}
        </button>
      </div>

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
            <span className="text-xs">{formatDuration(task.duration, t.minUnit, t.secUnit)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDuration(seconds: number, minUnit: string, secUnit: string) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0 && s > 0) return `${m}${minUnit}${s}${secUnit}`
  if (m > 0) return `${m}${minUnit}`
  return `${s}${secUnit}`
}

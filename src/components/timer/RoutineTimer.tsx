import { useRef, useEffect } from 'react'
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

  const activeTaskRef = useRef<HTMLDivElement>(null)

  const activeRoutine = routines.find((r) => r.id === activeRoutineId)
  const currentTask = activeRoutine?.tasks[currentTaskIndex]

  useEffect(() => {
    activeTaskRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentTaskIndex])

  const handleSelectRoutine = (routineId: string) => {
    const routine = routines.find((r) => r.id === routineId)
    if (routine && routine.tasks.length > 0) {
      setActiveRoutine(routineId, routine.tasks[0].duration)
    }
  }

  if (!activeRoutine || activeRoutine.tasks.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto px-5 py-6 gap-4">
        <p className="text-on-surface-variant text-sm font-headline">{t.selectRoutine}</p>
        {routines.length === 0 ? (
          <p className="text-outline text-xs">{t.noRoutinesYet}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {routines.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectRoutine(r.id)}
                className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low active:scale-[0.98] transition-all text-left"
              >
                <div>
                  <p className="font-headline font-semibold text-on-surface">{r.name}</p>
                  <p className="text-xs text-outline mt-0.5">
                    {t.taskCountLabel(r.tasks.length, '').split(' · ')[0]}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-on-primary fill-current">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
        <button onClick={onEdit} className="text-sm text-primary font-headline font-medium mt-2">
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
    <div className="flex flex-col items-center h-full overflow-hidden px-5 py-4 gap-4">
      <div className="flex-shrink-0">
        <CircularTimer
          remaining={remaining}
          total={total}
          label={currentTask?.name}
          sublabel={`${currentTaskIndex + 1} / ${totalTasks}`}
        />
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 flex items-center gap-2 w-full max-w-xs">
        <button
          onClick={handlePrev}
          disabled={currentTaskIndex === 0}
          className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant disabled:opacity-30 active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>
        {status === 'idle' || status === 'finished' ? (
          <Button size="lg" onClick={start} className="flex-1">
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
        <Button size="lg" variant="secondary" onClick={reset}>
          {t.reset}
        </Button>
        <button
          onClick={handleNext}
          disabled={currentTaskIndex === totalTasks - 1}
          className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant disabled:opacity-30 active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM14 6h2v12h-2z" />
          </svg>
        </button>
      </div>

      <div className="flex-shrink-0 flex gap-4">
        <button
          onClick={() => useTimerStore.setState({ activeRoutineId: null, status: 'idle' })}
          className="text-sm text-primary font-headline font-medium"
        >
          {t.changeRoutine}
        </button>
        <button onClick={onEdit} className="text-sm text-primary font-headline font-medium">
          {t.edit}
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 min-h-0 w-full max-w-sm overflow-y-auto rounded-2xl pb-2">
        <div className="bg-surface-container-low rounded-2xl overflow-hidden">
        {activeRoutine.tasks.map((task, i) => (
          <div
            key={task.id}
            ref={i === currentTaskIndex ? activeTaskRef : null}
            className={`flex justify-between items-center px-4 py-3 ${
              i === currentTaskIndex
                ? 'bg-primary-fixed'
                : 'bg-transparent'
            }`}
          >
            <span
              className={`text-sm font-headline font-medium ${
                i === currentTaskIndex
                  ? 'text-on-primary-fixed-variant'
                  : i < currentTaskIndex
                  ? 'text-outline line-through'
                  : 'text-on-surface-variant'
              }`}
            >
              {task.name}
            </span>
            <span
              className={`text-xs ${
                i === currentTaskIndex ? 'text-on-primary-fixed-variant' : 'text-outline'
              }`}
            >
              {formatDuration(task.duration)}
            </span>
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

import { useTimerStore } from '../../store/timerStore'
import { useRoutineStore } from '../../store/routineStore'
import type { NavTab } from '../../types'

interface Props {
  onNavigate: (tab: NavTab) => void
}

function formatMmSs(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function NowPlayingBar({ onNavigate }: Props) {
  const { status, remaining, total, mode, activeRoutineId, currentTaskIndex, start, pause } =
    useTimerStore()
  const routines = useRoutineStore((s) => s.routines)

  if (status !== 'running' && status !== 'paused') return null

  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0
  const isRunning = status === 'running'

  const activeTab: NavTab = mode === 'routine' ? 'routine' : 'countdown'

  let label = 'Countdown'
  if (mode === 'routine') {
    const routine = routines.find((r) => r.id === activeRoutineId)
    const task = routine?.tasks[currentTaskIndex]
    label = task?.name ?? routine?.name ?? 'Routine'
  }

  return (
    <div
      className="flex-shrink-0 bg-surface-container-low overflow-hidden"
      style={{ boxShadow: '0 -2px 12px rgba(68,65,204,0.06)' }}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-surface-container-highest w-full">
        <div
          className="h-full bg-primary-container transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content row */}
      <div className="flex items-center px-4 py-2.5 gap-3">
        {/* Mode icon */}
        <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
          {mode === 'routine' ? (
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-on-primary-fixed-variant">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-on-primary-fixed-variant">
              <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.5-13H11v6l4.25 2.55.75-1.23-3.5-2.07V7z" />
            </svg>
          )}
        </div>

        {/* Label — tapping navigates to active tab */}
        <button
          className="flex-1 text-left min-w-0"
          onClick={() => onNavigate(activeTab)}
        >
          <p className="font-headline font-semibold text-sm text-on-surface truncate">{label}</p>
          <p className="text-xs text-outline font-headline">
            {isRunning ? 'Running' : 'Paused'} · tap to view
          </p>
        </button>

        {/* Remaining time */}
        <span className="font-headline font-bold text-base text-on-surface tabular-nums flex-shrink-0">
          {formatMmSs(remaining)}
        </span>

        {/* Play / Pause toggle */}
        <button
          onClick={isRunning ? pause : start}
          className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
          style={{ boxShadow: '0 4px 16px rgba(68,65,204,0.2)' }}
        >
          {isRunning ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-on-primary">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-on-primary">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

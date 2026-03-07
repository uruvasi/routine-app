import { useState } from 'react'
import { useTimerStore } from '../../store/timerStore'
import { CircularTimer } from './CircularTimer'
import { Button } from '../shared/Button'

const PHASE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function IntervalTimer() {
  const {
    status, remaining, total,
    intervalPhases, currentIntervalIndex,
    start, pause, reset,
    addIntervalPhase, updateIntervalPhase, deleteIntervalPhase,
  } = useTimerStore()

  const [editing, setEditing] = useState(false)
  const currentPhase = intervalPhases[currentIntervalIndex]
  const color = PHASE_COLORS[currentIntervalIndex % PHASE_COLORS.length]

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <CircularTimer
        remaining={remaining}
        total={total}
        color={color}
        label={currentPhase?.name}
        sublabel={`${currentIntervalIndex + 1} / ${intervalPhases.length}`}
      />

      <div className="flex gap-3">
        {status === 'idle' || status === 'finished' ? (
          <Button size="lg" onClick={start} disabled={intervalPhases.length === 0}>
            スタート
          </Button>
        ) : status === 'running' ? (
          <Button size="lg" variant="secondary" onClick={pause}>一時停止</Button>
        ) : (
          <Button size="lg" onClick={start}>再開</Button>
        )}
        <Button size="lg" variant="secondary" onClick={reset}>リセット</Button>
      </div>

      <button
        onClick={() => setEditing(!editing)}
        className="text-sm text-indigo-500 dark:text-indigo-400"
      >
        {editing ? '閉じる' : `フェーズ編集 (${intervalPhases.length}件)`}
      </button>

      {editing && (
        <div className="w-full max-w-xs flex flex-col gap-2">
          {intervalPhases.map((phase, i) => (
            <IntervalPhaseRow
              key={phase.id}
              name={phase.name}
              duration={phase.duration}
              color={PHASE_COLORS[i % PHASE_COLORS.length]}
              onSave={(n, d) => updateIntervalPhase(phase.id, n, d)}
              onDelete={() => deleteIntervalPhase(phase.id)}
            />
          ))}
          <Button size="sm" variant="secondary" onClick={addIntervalPhase}>
            + フェーズ追加
          </Button>
        </div>
      )}
    </div>
  )
}

function IntervalPhaseRow({
  name, duration, color, onSave, onDelete,
}: {
  name: string
  duration: number
  color: string
  onSave: (name: string, duration: number) => void
  onDelete: () => void
}) {
  const [n, setN] = useState(name)
  const [sec, setSec] = useState(String(duration))
  const [isDirty, setIsDirty] = useState(false)

  const save = () => {
    const d = parseInt(sec, 10)
    if (d > 0) {
      onSave(n, d)
      setIsDirty(false)
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <div className="w-2 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <input
        value={n}
        onChange={(e) => { setN(e.target.value); setIsDirty(true) }}
        onBlur={save}
        className="flex-1 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        placeholder="名前"
      />
      <input
        type="number"
        value={sec}
        onChange={(e) => { setSec(e.target.value); setIsDirty(true) }}
        onBlur={save}
        className="w-16 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center"
        placeholder="秒"
        min="1"
      />
      <span className="text-xs text-gray-400">秒</span>
      {isDirty && (
        <button onClick={save} className="text-xs text-indigo-500">保存</button>
      )}
      <button onClick={onDelete} className="text-gray-300 dark:text-gray-600 text-lg leading-none">×</button>
    </div>
  )
}

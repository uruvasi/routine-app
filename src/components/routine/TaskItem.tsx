import { useState } from 'react'
import type { Task } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'

interface Props {
  task: Task
  onUpdate: (name: string, duration: number) => void
  onDelete: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TaskItem({ task, onUpdate, onDelete, dragHandleProps }: Props) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(task.name)
  const [min, setMin] = useState(String(Math.floor(task.duration / 60)))
  const [sec, setSec] = useState(String(task.duration % 60))

  const save = () => {
    const m = parseInt(min, 10) || 0
    const s = parseInt(sec, 10) || 0
    const total = m * 60 + s
    if (total > 0 && name.trim()) {
      onUpdate(name.trim(), total)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-2xl bg-primary-fixed">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-on-primary-fixed-variant font-headline">
            Step Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-container-lowest rounded-xl px-3 py-2.5 text-sm font-headline text-on-surface outline-none mt-1"
            placeholder={t.taskNamePlaceholder}
            autoFocus
          />
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-on-primary-fixed-variant font-headline">
            Duration
          </span>
          <div className="flex gap-2 items-center mt-1">
            <input
              type="number"
              min="0"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="w-16 bg-surface-container-lowest rounded-lg px-2 py-2 text-sm font-headline text-center text-on-surface outline-none"
            />
            <span className="text-xs text-on-primary-fixed-variant">{t.minUnit}</span>
            <input
              type="number"
              min="0"
              max="59"
              value={sec}
              onChange={(e) => setSec(e.target.value)}
              className="w-16 bg-surface-container-lowest rounded-lg px-2 py-2 text-sm font-headline text-center text-on-surface outline-none"
            />
            <span className="text-xs text-on-primary-fixed-variant">{t.secUnit}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            className="flex-1 py-2 text-sm font-headline font-semibold bg-primary-container text-on-primary rounded-full"
          >
            {t.save}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-2 text-sm font-headline bg-surface-container-highest text-on-surface-variant rounded-full"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface-container-lowest">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-headline font-semibold text-on-surface truncate">{task.name}</p>
        <p className="text-xs text-outline mt-0.5">{formatDuration(task.duration)}</p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-primary font-headline font-medium px-2 py-1"
      >
        {t.edit}
      </button>
      <button
        onClick={onDelete}
        className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
      <div
        className="text-outline text-lg px-1 cursor-grab active:cursor-grabbing touch-none select-none"
        {...dragHandleProps}
      >
        ≡
      </div>
    </div>
  )
}

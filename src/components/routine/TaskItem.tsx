import { useState } from 'react'
import type { Task } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'

interface Props {
  task: Task
  onUpdate: (name: string, duration: number) => void
  onDelete: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

function formatDuration(seconds: number, minUnit: string, secUnit: string) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0 && s > 0) return `${m}${minUnit}${s}${secUnit}`
  if (m > 0) return `${m}${minUnit}`
  return `${s}${secUnit}`
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
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          placeholder={t.taskNamePlaceholder}
          autoFocus
        />
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="w-16 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-center"
          />
          <span className="text-sm text-gray-500">{t.minUnit}</span>
          <input
            type="number"
            min="0"
            max="59"
            value={sec}
            onChange={(e) => setSec(e.target.value)}
            className="w-16 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-center"
          />
          <span className="text-sm text-gray-500">{t.secUnit}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            className="flex-1 py-1.5 text-sm bg-indigo-500 text-white rounded-lg"
          >
            {t.save}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{task.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{formatDuration(task.duration, t.minUnit, t.secUnit)}</p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="text-gray-400 dark:text-gray-500 text-sm px-2 py-1"
      >
        {t.edit}
      </button>
      <button
        onClick={onDelete}
        className="text-gray-300 dark:text-gray-600 text-xl leading-none"
      >
        ×
      </button>
      <div
        className="text-gray-300 dark:text-gray-600 text-xl px-1 cursor-grab active:cursor-grabbing touch-none select-none"
        {...dragHandleProps}
      >
        ≡
      </div>
    </div>
  )
}

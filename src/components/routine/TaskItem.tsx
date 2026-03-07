import { useState } from 'react'
import type { Task } from '../../types'

interface Props {
  task: Task
  onUpdate: (name: string, duration: number) => void
  onDelete: () => void
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0 && s > 0) return `${m}分${s}秒`
  if (m > 0) return `${m}分`
  return `${s}秒`
}

export function TaskItem({ task, onUpdate, onDelete }: Props) {
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
          placeholder="タスク名"
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
          <span className="text-sm text-gray-500">分</span>
          <input
            type="number"
            min="0"
            max="59"
            value={sec}
            onChange={(e) => setSec(e.target.value)}
            className="w-16 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-center"
          />
          <span className="text-sm text-gray-500">秒</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            className="flex-1 py-1.5 text-sm bg-indigo-500 text-white rounded-lg"
          >
            保存
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
      <div className="w-1 h-8 rounded-full bg-indigo-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{task.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{formatDuration(task.duration)}</p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="text-gray-400 dark:text-gray-500 text-sm px-2 py-1"
      >
        編集
      </button>
      <button
        onClick={onDelete}
        className="text-gray-300 dark:text-gray-600 text-xl leading-none"
      >
        ×
      </button>
    </div>
  )
}

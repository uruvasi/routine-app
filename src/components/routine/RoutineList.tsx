import { useState } from 'react'
import { useRoutineStore } from '../../store/routineStore'
import { RoutineEditor } from './RoutineEditor'
import { Button } from '../shared/Button'

export function RoutineList() {
  const { routines, addRoutine } = useRoutineStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const selected = routines.find((r) => r.id === selectedId)

  if (selected) {
    return <RoutineEditor routine={selected} onBack={() => setSelectedId(null)} />
  }

  const handleAdd = () => {
    const n = newName.trim()
    if (n) {
      addRoutine(n)
      setNewName('')
      setAdding(false)
    }
  }

  const totalSeconds = (routineId: string) => {
    const r = routines.find((r) => r.id === routineId)
    return r ? r.tasks.reduce((sum, t) => sum + t.duration, 0) : 0
  }

  const formatTotal = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0 && s > 0) return `合計 ${m}分${s}秒`
    if (m > 0) return `合計 ${m}分`
    return `合計 ${s}秒`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">ルーティン</h2>
        <Button size="sm" onClick={() => setAdding(true)}>+ 新規</Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {adding && (
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ルーティン名"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') setAdding(false)
              }}
            />
            <Button size="sm" onClick={handleAdd}>作成</Button>
            <Button size="sm" variant="secondary" onClick={() => setAdding(false)}>×</Button>
          </div>
        )}

        {routines.length === 0 && !adding && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            ルーティンがありません
          </p>
        )}

        {routines.map((routine) => {
          const total = totalSeconds(routine.id)
          return (
            <div
              key={routine.id}
              onClick={() => setSelectedId(routine.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{routine.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {routine.tasks.length > 0
                    ? `${routine.tasks.length}タスク · ${formatTotal(total)}`
                    : 'タスクなし'}
                </p>
              </div>
              <span className="text-gray-300 dark:text-gray-600 text-lg">›</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

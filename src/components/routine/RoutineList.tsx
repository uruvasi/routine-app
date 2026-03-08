import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRoutineStore } from '../../store/routineStore'
import { RoutineEditor } from './RoutineEditor'
import { Button } from '../shared/Button'
import type { Routine } from '../../types'

interface Props {
  onNavigateToTimer: () => void
}

function SortableRoutineItem({
  routine,
  totalSeconds,
  formatTotal,
  onSelect,
}: {
  routine: Routine
  totalSeconds: number
  formatTotal: (s: number) => string
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routine.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
    >
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
        <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{routine.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {routine.tasks.length > 0
            ? `${routine.tasks.length}タスク · ${formatTotal(totalSeconds)}`
            : 'タスクなし'}
        </p>
      </div>
      <div
        className="text-gray-300 dark:text-gray-600 text-xl px-1 cursor-grab active:cursor-grabbing touch-none select-none"
        {...attributes}
        {...listeners}
      >
        ≡
      </div>
    </div>
  )
}

export function RoutineList({ onNavigateToTimer }: Props) {
  const { routines, addRoutine, reorderRoutines } = useRoutineStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const selected = routines.find((r) => r.id === selectedId)

  if (selected) {
    return (
      <RoutineEditor
        routine={selected}
        onBack={() => setSelectedId(null)}
        onStartTimer={onNavigateToTimer}
      />
    )
  }

  const handleAdd = () => {
    const n = newName.trim()
    if (n) {
      addRoutine(n)
      setNewName('')
      setAdding(false)
    }
  }

  const calcTotal = (routine: Routine) => routine.tasks.reduce((sum, t) => sum + t.duration, 0)

  const formatTotal = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0 && s > 0) return `合計 ${m}分${s}秒`
    if (m > 0) return `合計 ${m}分`
    return `合計 ${s}秒`
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = routines.findIndex((r) => r.id === active.id)
    const newIndex = routines.findIndex((r) => r.id === over.id)
    reorderRoutines(arrayMove(routines, oldIndex, newIndex))
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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={routines.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {routines.map((routine) => (
              <SortableRoutineItem
                key={routine.id}
                routine={routine}
                totalSeconds={calcTotal(routine)}
                formatTotal={formatTotal}
                onSelect={() => setSelectedId(routine.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

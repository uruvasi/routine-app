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
import { useTranslation } from '../../hooks/useTranslation'
import { RoutineEditor } from './RoutineEditor'
import type { Routine } from '../../types'

interface Props {
  onNavigateToTimer: () => void
}

function SortableRoutineItem({
  routine,
  totalSeconds,
  onSelect,
}: {
  routine: Routine
  totalSeconds: number
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routine.id,
  })
  const { t } = useTranslation()
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-surface-container-low active:scale-[0.98] transition-all"
    >
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
        <p className="font-headline font-semibold text-on-surface truncate">{routine.name}</p>
        <p className="text-xs text-outline mt-0.5">
          {routine.tasks.length > 0
            ? t.taskCountLabel(routine.tasks.length, t.totalTimeStr(m, s))
            : t.noTasks}
        </p>
      </div>
      <button
        onClick={onSelect}
        className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant flex-shrink-0"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
        </svg>
      </button>
      <div
        className="text-outline text-lg px-1 cursor-grab active:cursor-grabbing touch-none select-none flex-shrink-0"
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
  const { t } = useTranslation()
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

  const calcTotal = (routine: Routine) => routine.tasks.reduce((sum, task) => sum + task.duration, 0)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = routines.findIndex((r) => r.id === active.id)
    const newIndex = routines.findIndex((r) => r.id === over.id)
    reorderRoutines(arrayMove(routines, oldIndex, newIndex))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        <p className="text-xs uppercase tracking-widest text-outline font-headline mb-1">
          Your Library
        </p>
        <h2 className="font-headline font-bold text-2xl text-on-surface">{t.routinesTitle}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
        {adding && (
          <div className="flex gap-2 p-3 rounded-2xl bg-surface-container-low">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.routineNamePlaceholder}
              className="flex-1 bg-transparent text-sm font-headline text-on-surface outline-none placeholder:text-outline"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') setAdding(false)
              }}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary text-sm font-headline font-semibold"
            >
              {t.create}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant"
            >
              ×
            </button>
          </div>
        )}

        {routines.length === 0 && !adding && (
          <p className="text-sm text-outline text-center py-8 font-headline">
            {t.noRoutinesList}
          </p>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={routines.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {routines.map((routine) => (
              <SortableRoutineItem
                key={routine.id}
                routine={routine}
                totalSeconds={calcTotal(routine)}
                onSelect={() => setSelectedId(routine.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Create new routine button */}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-outline-variant text-on-surface-variant font-headline font-medium text-sm active:scale-[0.98] transition-all mt-1"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            {t.newRoutine}
          </button>
        )}
      </div>
    </div>
  )
}

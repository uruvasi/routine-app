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
import type { Routine, Task } from '../../types'
import { useRoutineStore } from '../../store/routineStore'
import { useTimerStore } from '../../store/timerStore'
import { useTranslation } from '../../hooks/useTranslation'
import { TaskItem } from './TaskItem'

interface Props {
  routine: Routine
  onBack: () => void
  onStartTimer: () => void
}

function SortableTaskItem({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task
  onUpdate: (name: string, duration: number) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function RoutineEditor({ routine, onBack, onStartTimer }: Props) {
  const { updateRoutine, deleteRoutine, addTask, updateTask, deleteTask, reorderTasks } = useRoutineStore()
  const { setActiveRoutine, start } = useTimerStore()
  const { t } = useTranslation()

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(routine.name)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskMin, setNewTaskMin] = useState('5')
  const [newTaskSec, setNewTaskSec] = useState('0')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const saveName = () => {
    if (name.trim()) {
      updateRoutine(routine.id, name.trim())
      setEditingName(false)
    }
  }

  const handleAddTask = () => {
    const n = newTaskName.trim()
    const m = parseInt(newTaskMin, 10) || 0
    const s = parseInt(newTaskSec, 10) || 0
    const total = m * 60 + s
    if (n && total > 0) {
      addTask(routine.id, n, total)
      setNewTaskName('')
      setNewTaskMin('5')
      setNewTaskSec('0')
    }
  }

  const handleStartTimer = () => {
    if (routine.tasks.length > 0) {
      setActiveRoutine(routine.id, routine.tasks[0].duration)
      start()
      onStartTimer()
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = routine.tasks.findIndex((t) => t.id === active.id)
    const newIndex = routine.tasks.findIndex((t) => t.id === over.id)
    reorderTasks(routine.id, arrayMove(routine.tasks, oldIndex, newIndex))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-primary font-headline font-medium text-sm mb-3"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
          </svg>
          {t.back}
        </button>
        <p className="text-xs uppercase tracking-widest text-outline font-headline mb-1">
          Edit Routine
        </p>
        {editingName ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            className="w-full font-headline font-bold text-2xl text-on-surface bg-transparent border-b-2 border-primary-container outline-none pb-1"
            autoFocus
          />
        ) : (
          <h2
            onClick={() => setEditingName(true)}
            className="font-headline font-bold text-2xl text-on-surface"
          >
            {routine.name}
          </h2>
        )}
      </div>

      {/* Steps count + delete */}
      <div className="px-5 pb-2 flex items-center justify-between flex-shrink-0">
        <span className="text-xs uppercase tracking-widest text-outline font-headline">
          Steps · {routine.tasks.length} {t.taskCountLabel(routine.tasks.length, '').split(' · ')[0].replace(/\d+/, '').trim() || 'items'}
        </span>
        <div className="flex items-center gap-3">
          {routine.tasks.length > 0 && (
            <button
              onClick={handleStartTimer}
              className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary text-xs font-headline font-semibold"
            >
              {t.run}
            </button>
          )}
          <button
            className="text-xs text-red-400 font-headline"
            onClick={() => {
              if (confirm(t.deleteRoutineConfirm(routine.name))) {
                deleteRoutine(routine.id)
                onBack()
              }
            }}
          >
            {t.deleteThisRoutine}
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-2">
        {routine.tasks.length === 0 && (
          <p className="text-sm text-outline text-center py-4 font-headline">
            {t.addTasksPrompt}
          </p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={routine.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {routine.tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onUpdate={(n, d) => updateTask(routine.id, task.id, n, d)}
                onDelete={() => deleteTask(routine.id, task.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add new step */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl border-2 border-dashed border-outline-variant mt-1">
          <span className="text-xs uppercase tracking-widest text-outline font-headline">
            {t.newTaskNamePlaceholder}
          </span>
          <input
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder={t.taskNamePlaceholder}
            className="w-full bg-surface-container-highest rounded-xl px-3 py-2.5 text-sm font-headline text-on-surface outline-none placeholder:text-outline"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 flex-1">
              <input
                type="number"
                min="0"
                value={newTaskMin}
                onChange={(e) => setNewTaskMin(e.target.value)}
                className="w-14 bg-surface-container-highest rounded-lg px-2 py-2 text-sm font-headline text-center text-on-surface outline-none"
              />
              <span className="text-xs text-outline">{t.minUnit}</span>
              <input
                type="number"
                min="0"
                max="59"
                value={newTaskSec}
                onChange={(e) => setNewTaskSec(e.target.value)}
                className="w-14 bg-surface-container-highest rounded-lg px-2 py-2 text-sm font-headline text-center text-on-surface outline-none"
              />
              <span className="text-xs text-outline">{t.secUnit}</span>
            </div>
            <button
              onClick={handleAddTask}
              className="px-4 py-2 rounded-full bg-primary-container text-on-primary text-sm font-headline font-semibold"
            >
              {t.add}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

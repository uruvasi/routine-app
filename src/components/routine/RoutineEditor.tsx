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
import { TaskItem } from './TaskItem'
import { Button } from '../shared/Button'

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
      <TaskItem task={task} onUpdate={onUpdate} onDelete={onDelete} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

export function RoutineEditor({ routine, onBack, onStartTimer }: Props) {
  const { updateRoutine, deleteRoutine, addTask, updateTask, deleteTask, reorderTasks } = useRoutineStore()
  const { setActiveRoutine, start } = useTimerStore()

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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="text-indigo-500 dark:text-indigo-400 text-sm">
          ← 戻る
        </button>
        {editingName ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            className="flex-1 text-lg font-semibold bg-transparent border-b border-indigo-400 outline-none"
            autoFocus
          />
        ) : (
          <h2
            onClick={() => setEditingName(true)}
            className="flex-1 text-lg font-semibold text-gray-800 dark:text-gray-100"
          >
            {routine.name}
          </h2>
        )}
        {routine.tasks.length > 0 && (
          <Button size="sm" onClick={handleStartTimer}>
            実行
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <button
          className="text-xs text-red-400 dark:text-red-500 text-right w-full pb-1"
          onClick={() => {
            if (confirm(`「${routine.name}」を削除しますか？`)) {
              deleteRoutine(routine.id)
              onBack()
            }
          }}
        >
          このルーティンを削除
        </button>
        {routine.tasks.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            タスクを追加してください
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
      </div>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
        <input
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          placeholder="新しいタスク名"
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            value={newTaskMin}
            onChange={(e) => setNewTaskMin(e.target.value)}
            className="w-14 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center"
          />
          <span className="text-sm text-gray-500">分</span>
          <input
            type="number"
            min="0"
            max="59"
            value={newTaskSec}
            onChange={(e) => setNewTaskSec(e.target.value)}
            className="w-14 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center"
          />
          <span className="text-sm text-gray-500">秒</span>
          <Button size="sm" onClick={handleAddTask} className="flex-1">
            追加
          </Button>
        </div>
      </div>
    </div>
  )
}

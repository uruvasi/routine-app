import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Routine, Task } from '../types'

interface RoutineStore {
  routines: Routine[]
  addRoutine: (name: string) => void
  updateRoutine: (id: string, name: string) => void
  deleteRoutine: (id: string) => void
  addTask: (routineId: string, name: string, duration: number) => void
  updateTask: (routineId: string, taskId: string, name: string, duration: number) => void
  deleteTask: (routineId: string, taskId: string) => void
  reorderTasks: (routineId: string, tasks: Task[]) => void
  importRoutines: (incoming: Routine[]) => void
}

const genId = () => Math.random().toString(36).slice(2, 10)

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set) => ({
      routines: [
        {
          id: genId(),
          name: '朝ルーティン',
          createdAt: Date.now(),
          tasks: [
            { id: genId(), name: '起床・水を飲む', duration: 60 },
            { id: genId(), name: 'ストレッチ', duration: 300 },
            { id: genId(), name: '朝食', duration: 600 },
          ],
        },
      ],

      addRoutine: (name) =>
        set((s) => ({
          routines: [
            ...s.routines,
            { id: genId(), name, tasks: [], createdAt: Date.now() },
          ],
        })),

      updateRoutine: (id, name) =>
        set((s) => ({
          routines: s.routines.map((r) => (r.id === id ? { ...r, name } : r)),
        })),

      deleteRoutine: (id) =>
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      addTask: (routineId, name, duration) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId
              ? { ...r, tasks: [...r.tasks, { id: genId(), name, duration }] }
              : r
          ),
        })),

      updateTask: (routineId, taskId, name, duration) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId
              ? {
                  ...r,
                  tasks: r.tasks.map((t) =>
                    t.id === taskId ? { ...t, name, duration } : t
                  ),
                }
              : r
          ),
        })),

      deleteTask: (routineId, taskId) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId
              ? { ...r, tasks: r.tasks.filter((t) => t.id !== taskId) }
              : r
          ),
        })),

      reorderTasks: (routineId, tasks) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId ? { ...r, tasks } : r
          ),
        })),

      importRoutines: (incoming) =>
        set((s) => ({ routines: [...s.routines, ...incoming] })),
    }),
    { name: 'routine-store' }
  )
)

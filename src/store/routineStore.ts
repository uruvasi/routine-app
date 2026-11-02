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
  reorderRoutines: (routines: Routine[]) => void
  importRoutines: (incoming: Routine[], replace?: boolean) => void
  localEdited: boolean
  replaceFromSync: (routines: Routine[], opts?: { markEdited?: boolean }) => void
  clearLocal: () => void
}

export const genId = (): string => crypto.randomUUID()

const SEED_NAME = '朝ルーティン'
const SEED_TASKS: [string, number][] = [
  ['起床・水を飲む', 60],
  ['ストレッチ', 300],
  ['朝食', 600],
]

/** True when routines are empty or exactly the untouched default seed. */
export function isSeedRoutines(routines: Routine[]): boolean {
  if (routines.length === 0) return true
  if (routines.length !== 1) return false
  const r = routines[0]
  return (
    r.name === SEED_NAME &&
    r.tasks.length === SEED_TASKS.length &&
    r.tasks.every((t, i) => t.name === SEED_TASKS[i][0] && t.duration === SEED_TASKS[i][1])
  )
}

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set) => ({
      routines: [
        {
          id: genId(),
          name: SEED_NAME,
          createdAt: Date.now(),
          tasks: SEED_TASKS.map(([name, duration]) => ({ id: genId(), name, duration })),
        },
      ],
      localEdited: false,

      addRoutine: (name) =>
        set((s) => ({
          localEdited: true,
          routines: [
            ...s.routines,
            { id: genId(), name, tasks: [], createdAt: Date.now() },
          ],
        })),

      updateRoutine: (id, name) =>
        set((s) => ({
          localEdited: true,
          routines: s.routines.map((r) => (r.id === id ? { ...r, name } : r)),
        })),

      deleteRoutine: (id) =>
        set((s) => ({ localEdited: true, routines: s.routines.filter((r) => r.id !== id) })),

      addTask: (routineId, name, duration) =>
        set((s) => ({
          localEdited: true,
          routines: s.routines.map((r) =>
            r.id === routineId
              ? { ...r, tasks: [...r.tasks, { id: genId(), name, duration }] }
              : r
          ),
        })),

      updateTask: (routineId, taskId, name, duration) =>
        set((s) => ({
          localEdited: true,
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
          localEdited: true,
          routines: s.routines.map((r) =>
            r.id === routineId
              ? { ...r, tasks: r.tasks.filter((t) => t.id !== taskId) }
              : r
          ),
        })),

      reorderTasks: (routineId, tasks) =>
        set((s) => ({
          localEdited: true,
          routines: s.routines.map((r) =>
            r.id === routineId ? { ...r, tasks } : r
          ),
        })),

      reorderRoutines: (routines) => set({ routines, localEdited: true }),

      importRoutines: (incoming, replace) =>
        set((s) => ({
          localEdited: true,
          routines: replace ? incoming : [...s.routines, ...incoming],
        })),

      replaceFromSync: (routines, opts) =>
        set((s) => ({ routines, localEdited: opts?.markEdited ? true : s.localEdited })),

      clearLocal: () => set({ routines: [], localEdited: false }),
    }),
    {
      name: 'routine-store',
      version: 1,
      partialize: (s) => ({ routines: s.routines, localEdited: s.localEdited }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as { routines?: Routine[]; localEdited?: boolean }
        if (version < 1) {
          const routines = p.routines ?? []
          return { routines, localEdited: !isSeedRoutines(routines) }
        }
        return p
      },
    }
  )
)

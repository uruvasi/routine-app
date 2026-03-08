import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimerState, TimerMode } from '../types'

interface TimerStore extends TimerState {
  setMode: (mode: TimerMode) => void
  setCountdown: (seconds: number) => void
  setActiveRoutine: (routineId: string, firstTaskDuration: number) => void
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
  finish: () => void
  jumpToTask: (index: number, duration: number) => void
}

const initialState: TimerState = {
  mode: 'countdown',
  status: 'idle',
  remaining: 5 * 60,
  total: 5 * 60,
  activeRoutineId: null,
  currentTaskIndex: 0,
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set) => ({
      ...initialState,

      setMode: (mode) => set({ mode, status: 'idle' }),

      setCountdown: (seconds) =>
        set({ mode: 'countdown', remaining: seconds, total: seconds, status: 'idle' }),

      setActiveRoutine: (routineId, firstTaskDuration) =>
        set({
          mode: 'routine',
          activeRoutineId: routineId,
          currentTaskIndex: 0,
          remaining: firstTaskDuration,
          total: firstTaskDuration,
          status: 'idle',
        }),

      start: () => set({ status: 'running' }),
      pause: () => set({ status: 'paused' }),

      reset: () =>
        set((s) => {
          if (s.mode === 'routine') {
            return { status: 'idle', currentTaskIndex: 0, remaining: s.total }
          }
          return { status: 'idle', remaining: s.total }
        }),

      tick: () => set((s) => ({ remaining: Math.max(0, s.remaining - 1) })),

      finish: () => set({ status: 'finished' }),

      jumpToTask: (index, duration) =>
        set({ currentTaskIndex: index, remaining: duration, total: duration }),
    }),
    {
      name: 'timer-store',
      partialize: (s) => ({
        mode: s.mode,
        remaining: s.remaining,
        total: s.total,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.mode !== 'countdown' && state.mode !== 'routine') {
          state.mode = 'countdown'
        }
      },
    }
  )
)

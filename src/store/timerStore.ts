import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimerState, TimerMode, PomodoroPhase, IntervalPhase } from '../types'

const genId = () => Math.random().toString(36).slice(2, 10)

const DEFAULT_POMODORO_WORK = 25 * 60
const DEFAULT_POMODORO_BREAK = 5 * 60

interface TimerStore extends TimerState {
  setMode: (mode: TimerMode) => void
  setCountdown: (seconds: number) => void
  setPomodoroSettings: (work: number, breakDur: number) => void
  setIntervalPhases: (phases: IntervalPhase[]) => void
  setActiveRoutine: (routineId: string, firstTaskDuration: number) => void
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
  nextPhase: (nextDuration: number, nextPhase?: PomodoroPhase) => void
  finish: () => void
  addIntervalPhase: () => void
  updateIntervalPhase: (id: string, name: string, duration: number) => void
  deleteIntervalPhase: (id: string) => void
}

const initialState: TimerState = {
  mode: 'countdown',
  status: 'idle',
  remaining: 5 * 60,
  total: 5 * 60,
  pomodoroPhase: 'work',
  pomodoroCount: 0,
  pomodoroWorkDuration: DEFAULT_POMODORO_WORK,
  pomodoroBreakDuration: DEFAULT_POMODORO_BREAK,
  intervalPhases: [
    { id: 'p1', name: 'フェーズ1', duration: 60 },
    { id: 'p2', name: 'フェーズ2', duration: 30 },
  ],
  currentIntervalIndex: 0,
  activeRoutineId: null,
  currentTaskIndex: 0,
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set) => ({
      ...initialState,

      setMode: (mode) =>
        set((s) => {
          if (mode === 'pomodoro') {
            return {
              mode,
              status: 'idle',
              remaining: s.pomodoroWorkDuration,
              total: s.pomodoroWorkDuration,
              pomodoroPhase: 'work',
              pomodoroCount: 0,
            }
          }
          if (mode === 'interval') {
            const first = s.intervalPhases[0]
            const dur = first ? first.duration : 60
            return {
              mode,
              status: 'idle',
              remaining: dur,
              total: dur,
              currentIntervalIndex: 0,
            }
          }
          return { mode, status: 'idle' }
        }),

      setCountdown: (seconds) =>
        set({ remaining: seconds, total: seconds, status: 'idle' }),

      setPomodoroSettings: (work, breakDur) =>
        set({
          pomodoroWorkDuration: work,
          pomodoroBreakDuration: breakDur,
          remaining: work,
          total: work,
          status: 'idle',
          pomodoroPhase: 'work',
          pomodoroCount: 0,
        }),

      setIntervalPhases: (phases) =>
        set((s) => {
          const first = phases[0]
          const dur = first ? first.duration : 60
          return {
            intervalPhases: phases,
            currentIntervalIndex: 0,
            remaining: s.status === 'idle' ? dur : s.remaining,
            total: s.status === 'idle' ? dur : s.total,
          }
        }),

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
          if (s.mode === 'pomodoro') {
            return {
              status: 'idle',
              remaining: s.pomodoroWorkDuration,
              total: s.pomodoroWorkDuration,
              pomodoroPhase: 'work',
              pomodoroCount: 0,
            }
          }
          if (s.mode === 'interval') {
            const first = s.intervalPhases[0]
            const dur = first ? first.duration : 60
            return {
              status: 'idle',
              remaining: dur,
              total: dur,
              currentIntervalIndex: 0,
            }
          }
          if (s.mode === 'routine') {
            return {
              status: 'idle',
              currentTaskIndex: 0,
              remaining: s.total,
            }
          }
          return { status: 'idle', remaining: s.total }
        }),

      tick: () => set((s) => ({ remaining: Math.max(0, s.remaining - 1) })),

      nextPhase: (nextDuration, nextPhase) =>
        set((s) => ({
          remaining: nextDuration,
          total: nextDuration,
          pomodoroPhase: nextPhase ?? s.pomodoroPhase,
          status: 'running',
        })),

      finish: () => set({ status: 'finished' }),

      addIntervalPhase: () =>
        set((s) => ({
          intervalPhases: [
            ...s.intervalPhases,
            { id: genId(), name: `フェーズ${s.intervalPhases.length + 1}`, duration: 60 },
          ],
        })),

      updateIntervalPhase: (id, name, duration) =>
        set((s) => ({
          intervalPhases: s.intervalPhases.map((p) =>
            p.id === id ? { ...p, name, duration } : p
          ),
        })),

      deleteIntervalPhase: (id) =>
        set((s) => ({
          intervalPhases: s.intervalPhases.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'timer-store',
      partialize: (s) => ({
        mode: s.mode,
        pomodoroWorkDuration: s.pomodoroWorkDuration,
        pomodoroBreakDuration: s.pomodoroBreakDuration,
        intervalPhases: s.intervalPhases,
        remaining: s.remaining,
        total: s.total,
      }),
    }
  )
)

export interface Task {
  id: string
  name: string
  duration: number // seconds
}

export interface Routine {
  id: string
  name: string
  tasks: Task[]
  createdAt: number
}

export type TimerMode = 'countdown' | 'routine'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  remaining: number // seconds
  total: number // seconds
  // Routine
  activeRoutineId: string | null
  currentTaskIndex: number
}

export type NavTab = 'countdown' | 'routine' | 'settings'

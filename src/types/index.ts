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

/** Cloud copy of a user's routines (server/routines.ts ⇄ src/sync). */
export interface Snapshot {
  revision: number
  routines: Routine[]
  updatedAt: number | null
  clearedAt: number | null
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

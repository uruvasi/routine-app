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

export type TimerMode = 'countdown' | 'pomodoro' | 'interval' | 'routine'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'
export type PomodoroPhase = 'work' | 'break'

export interface IntervalPhase {
  id: string
  name: string
  duration: number // seconds
}

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  remaining: number // seconds
  total: number // seconds
  // Pomodoro
  pomodoroPhase: PomodoroPhase
  pomodoroCount: number
  pomodoroWorkDuration: number // seconds
  pomodoroBreakDuration: number // seconds
  // Interval
  intervalPhases: IntervalPhase[]
  currentIntervalIndex: number
  // Routine
  activeRoutineId: string | null
  currentTaskIndex: number
}

export type NavTab = 'timer' | 'routine' | 'settings'

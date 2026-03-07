import { useEffect, useRef } from 'react'
import { useTimerStore } from '../store/timerStore'
import { useRoutineStore } from '../store/routineStore'
import { useAudioAlert } from './useAudioAlert'
import type { TimerStatus } from '../types'

export function useTimer() {
  const store = useTimerStore()
  const routines = useRoutineStore((s) => s.routines)
  const { playAlert, playStartAlert, speak } = useAudioAlert()
  const lastTickRef = useRef<number | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const prevStatusRef = useRef<TimerStatus>('idle')
  const oneMinSpokenRef = useRef(false)

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = store.status
    if (store.status === 'running' && prev === 'idle') {
      oneMinSpokenRef.current = false
      playStartAlert()
      if (store.mode === 'routine') {
        const state = useTimerStore.getState()
        const routine = routines.find((r) => r.id === state.activeRoutineId)
        const task = routine?.tasks[state.currentTaskIndex]
        if (task) speak(`${task.name}をはじめます`)
      }
      if (store.mode === 'countdown') {
        const min = store.total / 60
        speak(`${min}分のタイマーを始めます`)
      }
    }
  }, [store.status])

  useEffect(() => {
    if (store.status !== 'running') {
      lastTickRef.current = null
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      return
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastTickRef.current = null
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const tick = (now: number) => {
      if (store.status !== 'running') return

      if (lastTickRef.current === null) {
        lastTickRef.current = now
      }

      const elapsed = now - lastTickRef.current
      if (elapsed >= 1000) {
        const ticks = Math.floor(elapsed / 1000)
        lastTickRef.current = now - (elapsed % 1000)

        for (let i = 0; i < ticks; i++) {
          useTimerStore.getState().tick()
        }

        const current = useTimerStore.getState()
        if (current.remaining === 0) {
          handlePhaseEnd(current, routines, playAlert, playStartAlert, speak)
          return
        }
        if (current.mode === 'countdown' && current.remaining <= 60 && !oneMinSpokenRef.current) {
          oneMinSpokenRef.current = true
          speak('残り1分です')
        }
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [store.status, store.mode, store.currentIntervalIndex, store.currentTaskIndex, routines, playAlert, playStartAlert, speak])
}

function handlePhaseEnd(
  s: ReturnType<typeof useTimerStore.getState>,
  routines: ReturnType<typeof useRoutineStore.getState>['routines'],
  playAlert: () => void,
  playStartAlert: () => void,
  speak: (text: string) => void
) {
  playAlert()

  if (s.mode === 'pomodoro') {
    if (s.pomodoroPhase === 'work') {
      useTimerStore.getState().nextPhase(s.pomodoroBreakDuration, 'break')
      playStartAlert()
    } else {
      useTimerStore.getState().nextPhase(s.pomodoroWorkDuration, 'work')
      useTimerStore.setState((prev) => ({ pomodoroCount: prev.pomodoroCount + 1 }))
      playStartAlert()
    }
    return
  }

  if (s.mode === 'interval') {
    const nextIndex = s.currentIntervalIndex + 1
    if (nextIndex < s.intervalPhases.length) {
      const nextPhase = s.intervalPhases[nextIndex]
      useTimerStore.setState({
        currentIntervalIndex: nextIndex,
        remaining: nextPhase.duration,
        total: nextPhase.duration,
        status: 'running',
      })
      playStartAlert()
    } else {
      useTimerStore.getState().finish()
    }
    return
  }

  if (s.mode === 'routine' && s.activeRoutineId) {
    const routine = routines.find((r) => r.id === s.activeRoutineId)
    if (routine) {
      const nextIndex = s.currentTaskIndex + 1
      if (nextIndex < routine.tasks.length) {
        const nextTask = routine.tasks[nextIndex]
        useTimerStore.setState({
          currentTaskIndex: nextIndex,
          remaining: nextTask.duration,
          total: nextTask.duration,
          status: 'running',
        })
        playStartAlert()
        speak(`${nextTask.name}をはじめます`)
      } else {
        useTimerStore.getState().finish()
      }
    }
    return
  }

  if (s.mode === 'countdown') speak('完了しました')
  useTimerStore.getState().finish()
}

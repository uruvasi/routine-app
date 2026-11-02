import type { Routine } from '../types'

export const SEED_NAME = '朝ルーティン'
export const SEED_TASKS: [string, number][] = [
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

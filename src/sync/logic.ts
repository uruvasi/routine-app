import type { Routine, Snapshot } from '../types'
import { isSeedRoutines } from '../store/seed'

export type LocalState = {
  routines: Routine[]
  localEdited: boolean
  dirty: boolean
  /** null = this device has never synced */
  baseRevision: number | null
}

export type FetchDecision =
  | { kind: 'noop' }
  | { kind: 'adopt'; backup: boolean }
  | { kind: 'upload' }
  | { kind: 'push' }
  | { kind: 'ask-initial' }

export function decideOnFetch(local: LocalState, remote: Snapshot): FetchDecision {
  const backup = local.routines.length > 0
  if (local.baseRevision === null) {
    if (remote.routines.length === 0) return { kind: 'upload' }
    if (local.routines.length === 0 || !local.localEdited || isSeedRoutines(local.routines)) {
      return { kind: 'adopt', backup }
    }
    return { kind: 'ask-initial' }
  }
  if (local.dirty) return { kind: 'push' }
  if (remote.revision > local.baseRevision) return { kind: 'adopt', backup }
  return { kind: 'noop' }
}

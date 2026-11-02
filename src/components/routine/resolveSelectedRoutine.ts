import type { Routine } from '../../types'

/** The routine for an id, or null if it no longer exists (e.g. removed by a sync). */
export function resolveSelectedRoutine(routines: Routine[], id: string | null): Routine | null {
  if (!id) return null
  return routines.find((r) => r.id === id) ?? null
}

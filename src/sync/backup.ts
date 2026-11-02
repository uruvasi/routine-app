import type { Routine } from '../types'

export const BACKUP_PREFIX = 'routine-store-backup-'
const KEEP = 5

export function listBackups(): { key: string; at: number; count: number }[] {
  const out: { key: string; at: number; count: number }[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(BACKUP_PREFIX)) continue
    const at = Number(key.slice(BACKUP_PREFIX.length))
    if (!Number.isFinite(at)) continue
    let count = 0
    try {
      count = (JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]).length
    } catch {
      /* corrupted backup: still listed */
    }
    out.push({ key, at, count })
  }
  return out.sort((a, b) => b.at - a.at)
}

/** Stores a copy of routines before they are overwritten; keeps only the newest 5. */
export function saveBackup(routines: Routine[], now = Date.now()): string {
  const key = `${BACKUP_PREFIX}${now}`
  localStorage.setItem(key, JSON.stringify(routines))
  for (const old of listBackups().slice(KEEP)) localStorage.removeItem(old.key)
  return key
}

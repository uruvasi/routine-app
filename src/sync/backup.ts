import type { Routine } from '../types'

export const BACKUP_PREFIX = 'routine-store-backup-'
/** 'sync' = routine cloud adopts (short retention); 'keep' = conflict/clear choices (longer). */
export type BackupKind = 'sync' | 'keep'
const KEEP: Record<BackupKind, number> = { sync: 5, keep: 10 }
const KEEP_TAG = 'keep-'

export type BackupInfo = { key: string; at: number; count: number; kind: BackupKind }

function parse(key: string): { at: number; kind: BackupKind } | null {
  if (!key.startsWith(BACKUP_PREFIX)) return null
  let rest = key.slice(BACKUP_PREFIX.length)
  let kind: BackupKind = 'sync'
  if (rest.startsWith(KEEP_TAG)) {
    kind = 'keep'
    rest = rest.slice(KEEP_TAG.length)
  }
  const at = Number(rest)
  return Number.isFinite(at) && rest !== '' ? { at, kind } : null
}

export function readBackup(key: string): Routine[] | null {
  if (!parse(key)) return null
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null') as unknown
    return Array.isArray(v) ? (v as Routine[]) : null
  } catch {
    return null
  }
}

/** All backups, newest first. */
export function listBackups(): BackupInfo[] {
  const out: BackupInfo[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    const p = key ? parse(key) : null
    if (!key || !p) continue
    out.push({ key, ...p, count: readBackup(key)?.length ?? 0 })
  }
  return out.sort((a, b) => b.at - a.at)
}

/** Stores a copy of routines before they are overwritten, pruning old backups of the same kind. */
export function saveBackup(routines: Routine[], now = Date.now(), kind: BackupKind = 'sync'): string {
  const key = `${BACKUP_PREFIX}${kind === 'keep' ? KEEP_TAG : ''}${now}`
  localStorage.setItem(key, JSON.stringify(routines))
  for (const old of listBackups().filter((b) => b.kind === kind).slice(KEEP[kind])) {
    localStorage.removeItem(old.key)
  }
  return key
}

/** Reads a backup for restoring, first stashing the current routines so the restore is undoable. */
export function restoreBackup(key: string, current: Routine[], now = Date.now()): Routine[] | null {
  const routines = readBackup(key)
  if (!routines) return null
  if (current.length) saveBackup(current, now, 'keep')
  return routines
}

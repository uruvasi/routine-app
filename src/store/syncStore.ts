import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Snapshot } from '../types'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'needs-login'
export type SyncConflict = { kind: 'initial' | 'revision'; remote: Snapshot }

interface SyncStore {
  loggedIn: boolean
  hasUser: boolean
  loginAvailable: boolean
  /** null = this device has never synced */
  baseRevision: number | null
  dirty: boolean
  lastSyncedAt: number | null
  status: SyncStatus
  conflict: SyncConflict | null
  pendingRemote: Snapshot | null
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (): SyncStore => ({
      loggedIn: false,
      hasUser: false,
      loginAvailable: false,
      baseRevision: null,
      dirty: false,
      lastSyncedAt: null,
      status: 'idle',
      conflict: null,
      pendingRemote: null,
    }),
    {
      name: 'sync-store',
      partialize: (s) => ({
        baseRevision: s.baseRevision,
        dirty: s.dirty,
        lastSyncedAt: s.lastSyncedAt,
        loggedIn: s.loggedIn,
      }),
    },
  ),
)

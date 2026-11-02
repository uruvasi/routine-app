import * as realApi from './api'
import { OfflineError, UnauthorizedError, type SyncApi } from './api'
import { decideOnFetch } from './logic'
import { saveBackup } from './backup'
import { useRoutineStore } from '../store/routineStore'
import { useSyncStore } from '../store/syncStore'
import { useTimerStore } from '../store/timerStore'
import type { Routine, Snapshot } from '../types'

export const PUSH_DEBOUNCE_MS = 2000

type Deps = { api?: SyncApi; events?: EventTarget; doc?: { visibilityState: string } & EventTarget }

let api: SyncApi = realApi
let debounce: ReturnType<typeof setTimeout> | null = null
let inflight = false
let applyingRemote = false

const sync = () => useSyncStore.getState()
const setSync = useSyncStore.setState
const timerBusy = () => {
  const s = useTimerStore.getState().status
  return s === 'running' || s === 'paused'
}

function handleError(e: unknown) {
  if (e instanceof UnauthorizedError) setSync({ loggedIn: false, status: 'needs-login' })
  else if (e instanceof OfflineError) setSync({ status: 'offline' })
  else setSync({ status: 'error' })
}

function setRoutinesFromRemote(routines: Routine[]) {
  applyingRemote = true
  try {
    useRoutineStore.getState().replaceFromSync(routines, { markEdited: true })
  } finally {
    applyingRemote = false
  }
}

function applyRemote(remote: Snapshot, backup: boolean) {
  if (timerBusy()) {
    setSync({ pendingRemote: remote })
    return
  }
  if (backup) saveBackup(useRoutineStore.getState().routines)
  setRoutinesFromRemote(remote.routines)
  setSync({ baseRevision: remote.revision, dirty: false, pendingRemote: null, lastSyncedAt: Date.now(), status: 'idle' })
}

function schedulePush() {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    debounce = null
    void push()
  }, PUSH_DEBOUNCE_MS)
}

async function push(): Promise<void> {
  const s = sync()
  if (!s.loggedIn || s.conflict || inflight) return
  const routines = useRoutineStore.getState().routines
  inflight = true
  setSync({ status: 'syncing' })
  try {
    const res = await api.putRoutines(s.baseRevision ?? 0, routines)
    if ('conflict' in res) {
      setSync({ conflict: { kind: s.baseRevision === null ? 'initial' : 'revision', remote: res.conflict }, status: 'idle' })
      return
    }
    const stillSame = useRoutineStore.getState().routines === routines
    setSync({ baseRevision: res.revision, dirty: !stillSame, lastSyncedAt: Date.now(), status: 'idle' })
    if (!stillSame) schedulePush()
  } catch (e) {
    handleError(e)
  } finally {
    inflight = false
  }
}

/** Pulls the cloud copy and reconciles it with local state. */
export async function syncNow(): Promise<void> {
  if (!sync().loggedIn || sync().conflict) return
  setSync({ status: 'syncing' })
  try {
    const remote = await api.getRoutines()
    const r = useRoutineStore.getState()
    const s = sync()
    const decision = decideOnFetch(
      { routines: r.routines, localEdited: r.localEdited, dirty: s.dirty, baseRevision: s.baseRevision },
      remote,
    )
    switch (decision.kind) {
      case 'noop':
        setSync({ status: 'idle', lastSyncedAt: Date.now() })
        break
      case 'adopt':
        applyRemote(remote, decision.backup)
        if (sync().pendingRemote) setSync({ status: 'idle' })
        break
      case 'ask-initial':
        setSync({ conflict: { kind: 'initial', remote }, status: 'idle' })
        break
      case 'upload':
        setSync({ baseRevision: remote.revision })
        await push()
        break
      case 'push':
        await push()
        break
    }
  } catch (e) {
    handleError(e)
  }
}

async function refreshSession() {
  try {
    const info = await api.getSession()
    setSync({
      loggedIn: info.loggedIn,
      hasUser: info.hasUser,
      loginAvailable: info.loginAvailable,
      status: !info.loggedIn && sync().loggedIn ? 'needs-login' : sync().status,
    })
  } catch (e) {
    handleError(e)
    return false
  }
  return true
}

async function refreshAndSync() {
  if (await refreshSession()) await syncNow()
}

/** Called after a successful login/registration/recovery. */
export async function onLoggedIn(): Promise<void> {
  setSync({ loggedIn: true, hasUser: true, status: 'idle' })
  await syncNow()
}

export async function resolveConflict(choice: 'use-remote' | 'use-local'): Promise<void> {
  const c = sync().conflict
  if (!c) return
  if (choice === 'use-remote') {
    saveBackup(useRoutineStore.getState().routines)
    setSync({ conflict: null })
    applyRemote(c.remote, false)
  } else {
    saveBackup(c.remote.routines)
    setSync({ conflict: null, baseRevision: c.remote.revision, dirty: true })
    await push()
  }
}

export async function clearLocalData(): Promise<void> {
  const routines = useRoutineStore.getState().routines
  if (routines.length) saveBackup(routines)
  if (debounce) clearTimeout(debounce)
  debounce = null
  applyingRemote = true
  try {
    useRoutineStore.getState().clearLocal()
  } finally {
    applyingRemote = false
  }
  setSync({ baseRevision: null, dirty: false, conflict: null, pendingRemote: null, lastSyncedAt: null })
  if (sync().loggedIn) await syncNow()
}

export async function clearCloudData(): Promise<void> {
  const { revision } = await api.deleteRoutines()
  if (debounce) clearTimeout(debounce)
  debounce = null
  const routines = useRoutineStore.getState().routines
  if (routines.length) saveBackup(routines)
  setRoutinesFromRemote([])
  setSync({ baseRevision: revision, dirty: false, conflict: null, pendingRemote: null, lastSyncedAt: Date.now() })
}

export function startSyncEngine(deps: Deps = {}): () => void {
  api = deps.api ?? realApi
  const events = deps.events ?? (typeof window !== 'undefined' ? window : new EventTarget())
  const doc = deps.doc ?? (typeof document !== 'undefined' ? document : undefined)

  const unsubRoutines = useRoutineStore.subscribe((state, prev) => {
    if (state.routines === prev.routines || applyingRemote) return
    setSync({ dirty: true })
    if (sync().loggedIn) schedulePush()
  })
  const unsubTimer = useTimerStore.subscribe((state) => {
    const pending = sync().pendingRemote
    if (pending && state.status !== 'running' && state.status !== 'paused') applyRemote(pending, true)
  })
  const onOnline = () => void refreshAndSync()
  const onVisible = () => {
    if (doc?.visibilityState === 'visible') void refreshAndSync()
  }
  events.addEventListener('online', onOnline)
  doc?.addEventListener('visibilitychange', onVisible)

  void refreshAndSync()

  return () => {
    unsubRoutines()
    unsubTimer()
    events.removeEventListener('online', onOnline)
    doc?.removeEventListener('visibilitychange', onVisible)
    if (debounce) clearTimeout(debounce)
    debounce = null
    inflight = false
  }
}

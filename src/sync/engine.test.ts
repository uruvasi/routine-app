import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installLocalStorage } from '../test/localStorage'
installLocalStorage()
const { useRoutineStore } = await import('../store/routineStore')
const { useSyncStore } = await import('../store/syncStore')
const { useTimerStore } = await import('../store/timerStore')
const engine = await import('./engine')
const { UnauthorizedError, OfflineError } = await import('./api')
const { listBackups } = await import('./backup')
import type { Routine, Snapshot } from '../types'

const R = (name: string): Routine[] => [{ id: name, name, createdAt: 1, tasks: [] }]
const snap = (revision: number, routines: Routine[]): Snapshot => ({ revision, routines, updatedAt: 1, clearedAt: null })

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function fakeApi() {
  return {
    getSession: vi.fn(async () => ({ loggedIn: true, hasUser: true, loginAvailable: true })),
    getRoutines: vi.fn(async (): Promise<Snapshot> => snap(1, useRoutineStore.getState().routines)),
    putRoutines: vi.fn(
      async (base: number, routines: Routine[]): Promise<{ revision: number; updatedAt: number } | { conflict: Snapshot }> => ({
        revision: base + 1,
        updatedAt: routines.length,
      }),
    ),
    deleteRoutines: vi.fn(async () => ({ revision: 9 })),
  }
}

let api: ReturnType<typeof fakeApi>
let events: EventTarget
let stop: () => void

async function start(opts: { loggedIn?: boolean; baseRevision?: number | null } = {}) {
  useSyncStore.setState({
    loggedIn: opts.loggedIn ?? true,
    baseRevision: opts.baseRevision === undefined ? 1 : opts.baseRevision,
    dirty: false,
    conflict: null,
    pendingRemote: null,
    status: 'idle',
  })
  stop = engine.startSyncEngine({ api, events })
  await vi.advanceTimersByTimeAsync(0)
}

beforeEach(() => {
  installLocalStorage()
  vi.useFakeTimers()
  api = fakeApi()
  events = new EventTarget()
  useRoutineStore.setState({ routines: R('a'), localEdited: true })
  useTimerStore.setState({ status: 'idle' })
})
afterEach(() => {
  stop?.()
  vi.useRealTimers()
})

describe('push debounce', () => {
  it('PUTs once 2000ms after an edit, not at 1999ms', async () => {
    await start()
    useRoutineStore.getState().addRoutine('b')
    expect(useSyncStore.getState().dirty).toBe(true)
    await vi.advanceTimersByTimeAsync(1999)
    expect(api.putRoutines).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(api.putRoutines).toHaveBeenCalledTimes(1)
    expect(api.putRoutines.mock.calls[0][0]).toBe(1)
    expect(useSyncStore.getState().dirty).toBe(false)
    expect(useSyncStore.getState().baseRevision).toBe(2)
  })

  it('edit during an in-flight PUT keeps dirty and re-sends the latest routines', async () => {
    await start()
    const d = deferred<{ revision: number; updatedAt: number }>()
    api.putRoutines.mockImplementationOnce(() => d.promise)
    useRoutineStore.getState().addRoutine('b')
    await vi.advanceTimersByTimeAsync(2000)
    expect(api.putRoutines).toHaveBeenCalledTimes(1)
    useRoutineStore.getState().addRoutine('c')
    d.resolve({ revision: 2, updatedAt: 2 })
    await vi.advanceTimersByTimeAsync(0)
    expect(useSyncStore.getState().dirty).toBe(true)
    await vi.advanceTimersByTimeAsync(2000)
    expect(api.putRoutines).toHaveBeenCalledTimes(2)
    expect(api.putRoutines.mock.calls[1][0]).toBe(2)
    expect(api.putRoutines.mock.calls[1][1].map((r) => r.name)).toEqual(['a', 'b', 'c'])
    expect(useSyncStore.getState().dirty).toBe(false)
  })

  it('routines applied from the cloud (replaceFromSync) do not trigger a PUT', async () => {
    api.getRoutines.mockResolvedValueOnce(snap(5, R('z')))
    await start()
    expect(useRoutineStore.getState().routines).toEqual(R('z'))
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.putRoutines).not.toHaveBeenCalled()
    expect(useSyncStore.getState().dirty).toBe(false)
  })
})

describe('errors', () => {
  it('401 during PUT → needs-login, keeps dirty and data', async () => {
    await start()
    api.putRoutines.mockRejectedValueOnce(new UnauthorizedError())
    useRoutineStore.getState().addRoutine('b')
    await vi.advanceTimersByTimeAsync(2000)
    const s = useSyncStore.getState()
    expect(s.status).toBe('needs-login')
    expect(s.loggedIn).toBe(false)
    expect(s.dirty).toBe(true)
    expect(useRoutineStore.getState().routines.map((r) => r.name)).toEqual(['a', 'b'])
  })

  it('offline at start → status offline, no throw; online event retries and pushes dirty data', async () => {
    api.getSession.mockRejectedValueOnce(new OfflineError())
    useSyncStore.setState({ dirty: true })
    useRoutineStore.setState({ routines: R('local') })
    await start()
    useSyncStore.setState({ dirty: true })
    expect(useSyncStore.getState().status).toBe('offline')
    api.getRoutines.mockResolvedValueOnce(snap(1, R('a')))
    events.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(api.putRoutines).toHaveBeenCalledTimes(1)
    expect(api.putRoutines.mock.calls[0][1]).toEqual(R('local'))
  })

  it('does nothing when logged out', async () => {
    api.getSession.mockResolvedValueOnce({ loggedIn: false, hasUser: true, loginAvailable: true })
    await start({ loggedIn: false })
    useRoutineStore.getState().addRoutine('b')
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.getRoutines).not.toHaveBeenCalled()
    expect(api.putRoutines).not.toHaveBeenCalled()
  })
})

describe('fetch & conflicts', () => {
  it('adopts a newer remote on start', async () => {
    api.getRoutines.mockResolvedValueOnce(snap(5, R('remote')))
    await start()
    expect(useRoutineStore.getState().routines).toEqual(R('remote'))
    expect(useSyncStore.getState().baseRevision).toBe(5)
    expect(listBackups()).toHaveLength(1)
  })

  it('409 → revision conflict; use-remote applies remote and backs up local', async () => {
    await start()
    api.putRoutines.mockResolvedValueOnce({ conflict: snap(7, R('remote')) })
    useRoutineStore.getState().addRoutine('b')
    await vi.advanceTimersByTimeAsync(2000)
    expect(useSyncStore.getState().conflict?.kind).toBe('revision')
    const before = listBackups().length
    await engine.resolveConflict('use-remote')
    expect(useRoutineStore.getState().routines).toEqual(R('remote'))
    expect(listBackups().length).toBe(before + 1)
    expect(listBackups()[0].kind).toBe('keep')
    expect(useSyncStore.getState().conflict).toBeNull()
    expect(useSyncStore.getState().baseRevision).toBe(7)
  })

  it('use-local PUTs local with the remote revision as base', async () => {
    await start()
    api.putRoutines.mockResolvedValueOnce({ conflict: snap(7, R('remote')) })
    useRoutineStore.getState().addRoutine('b')
    await vi.advanceTimersByTimeAsync(2000)
    await engine.resolveConflict('use-local')
    const last = api.putRoutines.mock.calls.at(-1)!
    expect(last[0]).toBe(7)
    expect(last[1].map((r) => r.name)).toEqual(['a', 'b'])
    expect(useSyncStore.getState().baseRevision).toBe(8)
    expect(useSyncStore.getState().conflict).toBeNull()
  })

  it('first sync with edited local and cloud data → initial conflict', async () => {
    api.getRoutines.mockResolvedValueOnce(snap(3, R('remote')))
    await start({ baseRevision: null })
    expect(useSyncStore.getState().conflict?.kind).toBe('initial')
    expect(useRoutineStore.getState().routines).toEqual(R('a'))
  })

  it('first sync with empty cloud uploads local from base 0', async () => {
    api.getRoutines.mockResolvedValueOnce(snap(0, []))
    await start({ baseRevision: null })
    expect(api.putRoutines).toHaveBeenCalledWith(0, R('a'))
    expect(useSyncStore.getState().baseRevision).toBe(1)
  })
})

describe('timer hold', () => {
  it('defers adopting while a timer runs, applies when it stops', async () => {
    useTimerStore.setState({ status: 'running' })
    api.getRoutines.mockResolvedValueOnce(snap(5, R('remote')))
    await start()
    expect(useRoutineStore.getState().routines).toEqual(R('a'))
    expect(useSyncStore.getState().pendingRemote?.revision).toBe(5)
    useTimerStore.setState({ status: 'idle' })
    await vi.advanceTimersByTimeAsync(0)
    expect(useRoutineStore.getState().routines).toEqual(R('remote'))
    expect(useSyncStore.getState().pendingRemote).toBeNull()
  })
})

describe('clearing', () => {
  it('clearCloudData empties local and adopts the new revision', async () => {
    await start()
    await engine.clearCloudData()
    expect(api.deleteRoutines).toHaveBeenCalled()
    expect(useRoutineStore.getState().routines).toEqual([])
    expect(useSyncStore.getState().baseRevision).toBe(9)
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.putRoutines).not.toHaveBeenCalled()
  })

  it('clearLocalData while logged in refetches the cloud copy', async () => {
    await start()
    api.getRoutines.mockResolvedValueOnce(snap(4, R('cloud')))
    await engine.clearLocalData()
    expect(useRoutineStore.getState().routines).toEqual(R('cloud'))
    expect(useSyncStore.getState().baseRevision).toBe(4)
  })
})

describe('review fixes', () => {
  it('#1 local edit while a remote update is held: timer stop keeps the edit (no silent overwrite)', async () => {
    useTimerStore.setState({ status: 'running' })
    api.getRoutines.mockResolvedValueOnce(snap(5, R('remote')))
    await start()
    expect(useSyncStore.getState().pendingRemote?.revision).toBe(5)
    api.putRoutines.mockRejectedValue(new OfflineError())
    useRoutineStore.getState().addRoutine('mine')
    await vi.advanceTimersByTimeAsync(2000)
    useTimerStore.setState({ status: 'idle' })
    await vi.advanceTimersByTimeAsync(0)
    expect(useRoutineStore.getState().routines.map((r) => r.name)).toEqual(['a', 'mine'])
    expect(useSyncStore.getState().dirty).toBe(true)
    expect(useSyncStore.getState().pendingRemote).toBeNull()
  })

  it('#1 use-remote while the timer runs clears dirty so no push re-raises the conflict', async () => {
    await start()
    api.putRoutines.mockResolvedValueOnce({ conflict: snap(7, R('remote')) })
    useRoutineStore.getState().addRoutine('b')
    await vi.advanceTimersByTimeAsync(2000)
    useTimerStore.setState({ status: 'running' })
    await engine.resolveConflict('use-remote')
    expect(useSyncStore.getState().dirty).toBe(false)
    expect(useSyncStore.getState().pendingRemote?.revision).toBe(7)
    useTimerStore.setState({ status: 'idle' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(useRoutineStore.getState().routines).toEqual(R('remote'))
    expect(api.putRoutines).toHaveBeenCalledTimes(1)
  })

  it('#2 clearing local data while a PUT is in flight never uploads an empty list', async () => {
    await start()
    const d = deferred<{ revision: number; updatedAt: number }>()
    api.putRoutines.mockImplementationOnce(() => d.promise)
    useRoutineStore.getState().addRoutine('b')
    await vi.advanceTimersByTimeAsync(2000)
    const g = deferred<Snapshot>()
    api.getRoutines.mockImplementationOnce(() => g.promise)
    const clearing = engine.clearLocalData()
    d.resolve({ revision: 2, updatedAt: 2 })
    await vi.advanceTimersByTimeAsync(0)
    g.resolve(snap(2, R('cloud')))
    await clearing
    await vi.advanceTimersByTimeAsync(5000)
    for (const call of api.putRoutines.mock.calls) expect(call[1]).not.toEqual([])
    expect(useRoutineStore.getState().routines).toEqual(R('cloud'))
  })

  it('#3 another tab writing localStorage is picked up without counting as a local edit', async () => {
    await start()
    localStorage.setItem('routine-store', JSON.stringify({ state: { routines: R('tabA'), localEdited: true }, version: 1 }))
    localStorage.setItem('sync-store', JSON.stringify({ state: { baseRevision: 6, dirty: false, lastSyncedAt: 1, loggedIn: true }, version: 0 }))
    events.dispatchEvent(Object.assign(new Event('storage'), { key: 'routine-store' }))
    events.dispatchEvent(Object.assign(new Event('storage'), { key: 'sync-store' }))
    await vi.advanceTimersByTimeAsync(5000)
    expect(useRoutineStore.getState().routines).toEqual(R('tabA'))
    expect(useSyncStore.getState().baseRevision).toBe(6)
    expect(api.putRoutines).not.toHaveBeenCalled()
  })

  it('clearing the cloud while a routine timer runs resets the timer', async () => {
    await start()
    useTimerStore.setState({ status: 'running', mode: 'routine', activeRoutineId: 'a' })
    await engine.clearCloudData()
    expect(useTimerStore.getState().status).toBe('idle')
  })
})

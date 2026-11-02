import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { call, resetDb, seedUser } from './test/helpers'
import { createSession, SESSION_COOKIE } from './session'
import type { Routine, Snapshot } from '../src/types'

let cookie: string
beforeEach(async () => {
  await resetDb()
  const uid = await seedUser()
  cookie = `${SESSION_COOKIE}=${await createSession(env, uid)}`
})

const r1: Routine[] = [
  { id: 'a', name: '朝', createdAt: 1, tasks: [{ id: 't1', name: '水', duration: 60 }, { id: 't2', name: '体操', duration: 300 }] },
  { id: 'b', name: '夜', createdAt: 2, tasks: [] },
]
const get = async () => (await (await call('/api/routines', { cookie })).json()) as Snapshot
const put = (baseRevision: number, routines: unknown) =>
  call('/api/routines', { method: 'PUT', cookie, json: { baseRevision, routines } })

describe('/api/routines', () => {
  it('requires login', async () => {
    expect((await call('/api/routines')).status).toBe(401)
    expect((await call('/api/routines', { method: 'PUT', json: { baseRevision: 0, routines: [] } })).status).toBe(401)
  })

  it('empty snapshot initially', async () => {
    expect(await get()).toEqual({ revision: 0, routines: [], updatedAt: null, clearedAt: null })
  })

  it('PUT from base 0 creates revision 1 and GET returns routines in order', async () => {
    const res = await put(0, r1)
    expect(res.status).toBe(200)
    const out = (await res.json()) as { revision: number; updatedAt: number }
    expect(out.revision).toBe(1)
    const snap = await get()
    expect(snap.revision).toBe(1)
    expect(snap.routines).toEqual(r1)
    expect(snap.updatedAt).toBe(out.updatedAt)
  })

  it('stale base revision gets 409 with the latest snapshot', async () => {
    await put(0, r1)
    const res = await put(0, [])
    expect(res.status).toBe(409)
    const snap = (await res.json()) as Snapshot
    expect(snap.revision).toBe(1)
    expect(snap.routines).toEqual(r1)
  })

  it('DELETE empties routines, bumps revision and records clearedAt', async () => {
    await put(0, r1)
    const del = await call('/api/routines', { method: 'DELETE', cookie })
    expect(await del.json()).toEqual({ revision: 2 })
    const snap = await get()
    expect(snap.revision).toBe(2)
    expect(snap.routines).toEqual([])
    expect(typeof snap.clearedAt).toBe('number')
    expect((await put(1, r1)).status).toBe(409)
  })

  it('PUT after clear resets clearedAt', async () => {
    await put(0, r1)
    await call('/api/routines', { method: 'DELETE', cookie })
    await put(2, r1)
    expect((await get()).clearedAt).toBeNull()
  })

  it('rejects negative duration with 400', async () => {
    const bad = [{ ...r1[0], tasks: [{ id: 'x', name: 'x', duration: -1 }] }]
    expect((await put(0, bad)).status).toBe(400)
  })

  it('rejects malformed routines with 400', async () => {
    expect((await put(0, [{ id: 'a' }])).status).toBe(400)
    expect((await put(0, 'nope')).status).toBe(400)
  })

  it('rejects payloads over 1MB with 413', async () => {
    const big = [{ id: 'a', name: 'x'.repeat(1_100_000), createdAt: 1, tasks: [] }]
    expect((await put(0, big)).status).toBe(413)
  })
})

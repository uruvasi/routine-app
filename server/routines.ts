import { Hono } from 'hono'
import type { AppEnv, Env } from './env'
import { requireAuth } from './session'
import type { Routine, Snapshot } from '../src/types'

const SCHEMA_VERSION = 1
const MAX_PAYLOAD_BYTES = 1_000_000

function isRoutineArray(v: unknown): v is Routine[] {
  return (
    Array.isArray(v) &&
    v.every(
      (r) =>
        r &&
        typeof r === 'object' &&
        typeof r.id === 'string' &&
        typeof r.name === 'string' &&
        typeof r.createdAt === 'number' &&
        Array.isArray(r.tasks) &&
        r.tasks.every(
          (t: unknown) =>
            !!t &&
            typeof t === 'object' &&
            typeof (t as { id: unknown }).id === 'string' &&
            typeof (t as { name: unknown }).name === 'string' &&
            Number.isInteger((t as { duration: unknown }).duration) &&
            (t as { duration: number }).duration >= 0,
        ),
    )
  )
}

export async function loadSnapshot(env: Env, userId: string): Promise<Snapshot> {
  const row = await env.DB.prepare(
    'SELECT revision, payload_json, updated_at, cleared_at FROM routine_snapshots WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ revision: number; payload_json: string; updated_at: number; cleared_at: number | null }>()
  if (!row) return { revision: 0, routines: [], updatedAt: null, clearedAt: null }
  return {
    revision: row.revision,
    routines: JSON.parse(row.payload_json) as Routine[],
    updatedAt: row.updated_at,
    clearedAt: row.cleared_at,
  }
}

export function routineRoutes() {
  const r = new Hono<AppEnv>()
  r.use('*', requireAuth)

  r.get('/', async (c) => c.json(await loadSnapshot(c.env, c.var.userId)))

  r.put('/', async (c) => {
    const text = await c.req.text()
    if (new TextEncoder().encode(text).byteLength > MAX_PAYLOAD_BYTES) {
      return c.json({ error: 'payload_too_large' }, 413)
    }
    let body: { baseRevision?: unknown; routines?: unknown }
    try {
      body = JSON.parse(text)
    } catch {
      return c.json({ error: 'bad_request' }, 400)
    }
    const base = body.baseRevision
    if (!Number.isInteger(base) || (base as number) < 0 || !isRoutineArray(body.routines)) {
      return c.json({ error: 'bad_request' }, 400)
    }
    const payload = JSON.stringify(body.routines)
    const now = Date.now()
    const userId = c.var.userId
    const next = (base as number) + 1
    const res =
      base === 0
        ? await c.env.DB.prepare(
            'INSERT INTO routine_snapshots (user_id, revision, schema_version, payload_json, updated_at, cleared_at) ' +
              'VALUES (?, 1, ?, ?, ?, NULL) ON CONFLICT(user_id) DO NOTHING',
          )
            .bind(userId, SCHEMA_VERSION, payload, now)
            .run()
        : await c.env.DB.prepare(
            'UPDATE routine_snapshots SET revision = ?, schema_version = ?, payload_json = ?, updated_at = ?, cleared_at = NULL ' +
              'WHERE user_id = ? AND revision = ?',
          )
            .bind(next, SCHEMA_VERSION, payload, now, userId, base)
            .run()
    if (!res.meta.changes) return c.json(await loadSnapshot(c.env, userId), 409)
    return c.json({ revision: next, updatedAt: now })
  })

  r.delete('/', async (c) => {
    const now = Date.now()
    const userId = c.var.userId
    const row = await c.env.DB.prepare(
      'INSERT INTO routine_snapshots (user_id, revision, schema_version, payload_json, updated_at, cleared_at) ' +
        "VALUES (?, 1, ?, '[]', ?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET revision = revision + 1, payload_json = '[]', updated_at = excluded.updated_at, cleared_at = excluded.cleared_at " +
        'RETURNING revision',
    )
      .bind(userId, SCHEMA_VERSION, now, now)
      .first<{ revision: number }>()
    return c.json({ revision: row!.revision })
  })

  return r
}

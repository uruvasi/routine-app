import { env } from 'cloudflare:test'
import { createApp } from '../app'

export const ORIGIN = 'https://rt.kazusa.org'

export async function resetDb() {
  for (const t of ['routine_snapshots', 'recovery_codes', 'sessions', 'passkeys', 'challenges', 'users']) {
    await env.DB.prepare(`DELETE FROM ${t}`).run()
  }
}

export function call(
  path: string,
  init: RequestInit & { cookie?: string; origin?: string; json?: unknown } = {},
) {
  const headers = new Headers(init.headers)
  headers.set('Origin', init.origin ?? ORIGIN)
  if (init.cookie) headers.set('Cookie', init.cookie)
  let body = init.body
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.json)
  }
  const url = `${init.origin ?? ORIGIN}${path}`
  return createApp().request(url, { ...init, headers, body }, env)
}

export async function seedUser(id = 'u1') {
  await env.DB.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').bind(id, Date.now()).run()
  return id
}

/** Extracts "name=value" of a Set-Cookie header for reuse as a Cookie header. */
export function cookieFrom(res: Response, name: string): string | undefined {
  const all = res.headers.getSetCookie?.() ?? [res.headers.get('Set-Cookie') ?? '']
  for (const c of all) {
    const first = c.split(';')[0]
    if (first.startsWith(`${name}=`)) return first
  }
  return undefined
}

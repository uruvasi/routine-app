import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { call, resetDb, seedUser } from './test/helpers'
import { createSession, sha256Hex, SESSION_COOKIE, SESSION_TTL_MS } from './session'

beforeEach(resetDb)

describe('GET /api/session', () => {
  it('reports logged out, no user, login available on production origin', async () => {
    const res = await call('/api/session')
    expect(await res.json()).toEqual({ loggedIn: false, hasUser: false, loginAvailable: true })
  })

  it('reports login unavailable on other origins', async () => {
    const res = await call('/api/session', { origin: 'https://routine-app.pages.dev' })
    expect(((await res.json()) as { loginAvailable: boolean }).loginAvailable).toBe(false)
  })

  it('logged in with a valid session cookie; stores only the hash', async () => {
    const uid = await seedUser()
    const token = await createSession(env, uid)
    const res = await call('/api/session', { cookie: `${SESSION_COOKIE}=${token}` })
    expect(await res.json()).toEqual({ loggedIn: true, hasUser: true, loginAvailable: true })
    const row = await env.DB.prepare('SELECT token_hash FROM sessions').first<{ token_hash: string }>()
    expect(row!.token_hash).not.toBe(token)
    expect(row!.token_hash).toBe(await sha256Hex(token))
  })

  it('expired session is logged out', async () => {
    const uid = await seedUser()
    const token = await createSession(env, uid)
    await env.DB.prepare('UPDATE sessions SET expires_at = ?').bind(Date.now() - 1000).run()
    const res = await call('/api/session', { cookie: `${SESSION_COOKIE}=${token}` })
    expect(((await res.json()) as { loggedIn: boolean }).loggedIn).toBe(false)
  })

  it('valid access slides expiry to ~180 days from now', async () => {
    const uid = await seedUser()
    const token = await createSession(env, uid)
    await env.DB.prepare('UPDATE sessions SET expires_at = ?').bind(Date.now() + 1000).run()
    await call('/api/session', { cookie: `${SESSION_COOKIE}=${token}` })
    const row = await env.DB.prepare('SELECT expires_at FROM sessions').first<{ expires_at: number }>()
    expect(row!.expires_at).toBeGreaterThan(Date.now() + SESSION_TTL_MS - 60_000)
    expect(SESSION_TTL_MS).toBe(180 * 24 * 60 * 60 * 1000)
  })
})

describe('POST /api/logout', () => {
  it('invalidates the session and clears the cookie', async () => {
    const uid = await seedUser()
    const token = await createSession(env, uid)
    const cookie = `${SESSION_COOKIE}=${token}`
    const out = await call('/api/logout', { method: 'POST', cookie })
    expect(out.status).toBe(200)
    expect(out.headers.get('Set-Cookie')).toContain(`${SESSION_COOKIE}=;`)
    const res = await call('/api/session', { cookie })
    expect(((await res.json()) as { loggedIn: boolean }).loggedIn).toBe(false)
  })
})

describe('origin guard', () => {
  it('rejects /api/auth/* from other origins with login_unavailable', async () => {
    const res = await call('/api/auth/login/options', { method: 'POST', origin: 'https://routine-app.pages.dev' })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'login_unavailable' })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { env } from 'cloudflare:test'
import { call, cookieFrom, resetDb } from './test/helpers'
import { registerOwner, loginWith, mockRegistration } from './test/webauthn'
import { CHALLENGE_COOKIE } from './auth'

vi.mock('@simplewebauthn/server', async (orig) => {
  const real = await orig<typeof import('@simplewebauthn/server')>()
  return { ...real, verifyRegistrationResponse: vi.fn(), verifyAuthenticationResponse: vi.fn() }
})

beforeEach(async () => {
  await resetDb()
  vi.clearAllMocks()
})

const count = async (t: string) =>
  (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first<{ n: number }>())!.n

describe('passkey registration', () => {
  it('rejects wrong setup passphrase when no user exists', async () => {
    const res = await call('/api/auth/register/options', { method: 'POST', json: { passphrase: 'nope' } })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'bad_passphrase' })
  })

  it('first registration creates the owner, a session and a recovery code', async () => {
    const { res, body, session } = await registerOwner()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.recoveryCode).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/)
    expect(await count('users')).toBe(1)
    expect(await count('recovery_codes')).toBe(1)
    expect(await count('passkeys')).toBe(1)
    expect(session).toMatch(/^__Host-rt_session=/)
  })

  it('options use the configured RP ID and require resident keys', async () => {
    const res = await call('/api/auth/register/options', { method: 'POST', json: { passphrase: 'test-pass' } })
    const { options } = (await res.json()) as { options: { rp: { id: string }; authenticatorSelection: { residentKey: string } } }
    expect(options.rp.id).toBe('rt.kazusa.org')
    expect(options.authenticatorSelection.residentKey).toBe('required')
  })

  it('registration is closed once an owner exists, even with the right passphrase', async () => {
    await registerOwner()
    const res = await call('/api/auth/register/options', { method: 'POST', json: { passphrase: 'test-pass' } })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'registration_closed' })
  })

  it('logged-in owner can add a second passkey without creating a user', async () => {
    const { session } = await registerOwner('cred1')
    const opt = await call('/api/auth/register/options', { method: 'POST', cookie: session, json: {} })
    expect(opt.status).toBe(200)
    const chal = cookieFrom(opt, CHALLENGE_COOKIE)!
    mockRegistration('cred2')
    const ver = await call('/api/auth/register/verify', {
      method: 'POST',
      cookie: `${session}; ${chal}`,
      json: { response: { id: 'cred2' }, label: 'Mac' },
    })
    expect(await ver.json()).toEqual({ ok: true })
    expect(await count('passkeys')).toBe(2)
    expect(await count('users')).toBe(1)
  })

  it('failed verification does not create a user', async () => {
    const opt = await call('/api/auth/register/options', { method: 'POST', json: { passphrase: 'test-pass' } })
    const chal = cookieFrom(opt, CHALLENGE_COOKIE)!
    mockRegistration('x', false)
    const ver = await call('/api/auth/register/verify', { method: 'POST', cookie: chal, json: { response: { id: 'x' } } })
    expect(ver.status).toBe(401)
    expect(await count('users')).toBe(0)
  })
})

describe('passkey login', () => {
  it('fails with 401 when verification fails', async () => {
    await registerOwner('cred1')
    const { res } = await loginWith('cred1', false)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'auth_failed' })
  })

  it('succeeds and establishes a session; updates counter', async () => {
    await registerOwner('cred1')
    const { res, session } = await loginWith('cred1', true)
    expect(res.status).toBe(200)
    const s = await call('/api/session', { cookie: session })
    expect(((await s.json()) as { loggedIn: boolean }).loggedIn).toBe(true)
    const row = await env.DB.prepare('SELECT counter, last_used_at FROM passkeys').first<{ counter: number; last_used_at: number }>()
    expect(row!.counter).toBe(1)
    expect(row!.last_used_at).toBeGreaterThan(0)
  })

  it('unknown credential id is rejected', async () => {
    await registerOwner('cred1')
    const { res } = await loginWith('other', true)
    expect(res.status).toBe(401)
  })

  it('a challenge cannot be reused', async () => {
    await registerOwner('cred1')
    const opt = await call('/api/auth/login/options', { method: 'POST' })
    const chal = cookieFrom(opt, CHALLENGE_COOKIE)!
    const { mockAuthentication } = await import('./test/webauthn')
    mockAuthentication('cred1')
    await call('/api/auth/login/verify', { method: 'POST', cookie: chal, json: { response: { id: 'cred1' } } })
    mockAuthentication('cred1')
    const again = await call('/api/auth/login/verify', { method: 'POST', cookie: chal, json: { response: { id: 'cred1' } } })
    expect(again.status).toBe(400)
    expect(await again.json()).toEqual({ error: 'challenge_expired' })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { call, resetDb } from './test/helpers'
import { registerOwner, loginWith, mockRegistration } from './test/webauthn'
import { CHALLENGE_COOKIE } from './auth'
import { cookieFrom } from './test/helpers'
import { SESSION_COOKIE } from './session'

vi.mock('@simplewebauthn/server', async (orig) => {
  const real = await orig<typeof import('@simplewebauthn/server')>()
  return { ...real, verifyRegistrationResponse: vi.fn(), verifyAuthenticationResponse: vi.fn() }
})

beforeEach(async () => {
  await resetDb()
  vi.clearAllMocks()
})

const loggedIn = async (cookie?: string) =>
  ((await (await call('/api/session', { cookie })).json()) as { loggedIn: boolean }).loggedIn

const recover = (code: string, ip = '1.1.1.1') =>
  call('/api/auth/recover', { method: 'POST', json: { code }, headers: { 'CF-Connecting-IP': ip } })

describe('POST /api/auth/recover', () => {
  it('valid code revokes all sessions, logs in and rotates the code', async () => {
    const { body, session: s1 } = await registerOwner('cred1')
    const { session: s2 } = await loginWith('cred1')
    const res = await recover(body.recoveryCode!)
    expect(res.status).toBe(200)
    const out = (await res.json()) as { ok: boolean; recoveryCode: string }
    expect(out.recoveryCode).not.toBe(body.recoveryCode)
    expect(await loggedIn(s1)).toBe(false)
    expect(await loggedIn(s2)).toBe(false)
    expect(await loggedIn(cookieFrom(res, SESSION_COOKIE))).toBe(true)
    expect((await recover(body.recoveryCode!)).status).toBe(401)
  })

  it('accepts lowercase input without hyphens', async () => {
    const { body } = await registerOwner()
    const res = await recover(body.recoveryCode!.toLowerCase().replace(/-/g, ''))
    expect(res.status).toBe(200)
  })

  it('wrong code is 401 auth_failed', async () => {
    await registerOwner()
    const res = await recover('AAAA-AAAA-AAAA-AAAA')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'auth_failed' })
  })

  it('rate-limits after 10 failures from the same IP', async () => {
    const { body } = await registerOwner()
    for (let i = 0; i < 10; i++) expect((await recover('AAAA-AAAA-AAAA-AAAA')).status).toBe(401)
    expect((await recover('AAAA-AAAA-AAAA-AAAA')).status).toBe(429)
    expect((await recover(body.recoveryCode!)).status).toBe(429)
    expect((await recover(body.recoveryCode!, '2.2.2.2')).status).toBe(200)
  })
})

describe('passkey management', () => {
  async function addPasskey(session: string, id: string) {
    const opt = await call('/api/auth/register/options', { method: 'POST', cookie: session, json: {} })
    mockRegistration(id)
    await call('/api/auth/register/verify', {
      method: 'POST',
      cookie: `${session}; ${cookieFrom(opt, CHALLENGE_COOKIE)}`,
      json: { response: { id }, label: 'Mac' },
    })
  }

  it('requires login', async () => {
    expect((await call('/api/auth/passkeys')).status).toBe(401)
  })

  it('lists passkeys with labels', async () => {
    const { session } = await registerOwner('cred1')
    const res = await call('/api/auth/passkeys', { cookie: session })
    const { passkeys } = (await res.json()) as { passkeys: { id: string; label: string | null; createdAt: number; lastUsedAt: number | null }[] }
    expect(passkeys).toHaveLength(1)
    expect(passkeys[0]).toMatchObject({ id: 'cred1', label: 'iPhone', lastUsedAt: null })
    expect(passkeys[0].createdAt).toBeGreaterThan(0)
  })

  it('cannot delete the last passkey', async () => {
    const { session } = await registerOwner('cred1')
    const res = await call('/api/auth/passkeys/cred1', { method: 'DELETE', cookie: session })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'last_passkey' })
  })

  it('deletes a passkey when another remains', async () => {
    const { session } = await registerOwner('cred1')
    await addPasskey(session, 'cred2')
    const res = await call('/api/auth/passkeys/cred1', { method: 'DELETE', cookie: session })
    expect(res.status).toBe(200)
    const list = (await (await call('/api/auth/passkeys', { cookie: session })).json()) as { passkeys: { id: string }[] }
    expect(list.passkeys.map((p) => p.id)).toEqual(['cred2'])
  })
})

describe('POST /api/auth/revoke-others', () => {
  it('keeps the caller session and revokes the rest', async () => {
    const { session: s1 } = await registerOwner('cred1')
    const { session: s2 } = await loginWith('cred1')
    const res = await call('/api/auth/revoke-others', { method: 'POST', cookie: s1 })
    expect(res.status).toBe(200)
    expect(await loggedIn(s1)).toBe(true)
    expect(await loggedIn(s2)).toBe(false)
  })
})

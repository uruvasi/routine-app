import { vi } from 'vitest'
import { call, cookieFrom } from './helpers'
import { SESSION_COOKIE } from '../session'
import { CHALLENGE_COOKIE } from '../auth'
import * as swa from '@simplewebauthn/server'

export const mocked = vi.mocked(swa)

export function mockRegistration(credId: string, verified = true) {
  mocked.verifyRegistrationResponse.mockResolvedValueOnce(
    (verified
      ? {
          verified: true,
          registrationInfo: {
            credential: { id: credId, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal'] },
          },
        }
      : { verified: false }) as unknown as Awaited<ReturnType<typeof swa.verifyRegistrationResponse>>,
  )
}

export function mockAuthentication(credId: string, verified = true, newCounter = 1) {
  mocked.verifyAuthenticationResponse.mockResolvedValueOnce({
    verified,
    authenticationInfo: { credentialID: credId, newCounter },
  } as unknown as Awaited<ReturnType<typeof swa.verifyAuthenticationResponse>>)
}

/** Full first-time registration; returns session cookie + recovery code. */
export async function registerOwner(credId = 'cred1', passphrase = 'test-pass') {
  const opt = await call('/api/auth/register/options', { method: 'POST', json: { passphrase } })
  const chal = cookieFrom(opt, CHALLENGE_COOKIE)!
  mockRegistration(credId)
  const ver = await call('/api/auth/register/verify', {
    method: 'POST',
    cookie: chal,
    json: { response: { id: credId }, label: 'iPhone' },
  })
  const body = (await ver.json()) as { ok: boolean; recoveryCode?: string }
  return { res: ver, body, session: cookieFrom(ver, SESSION_COOKIE)! }
}

export async function loginWith(credId: string, verified = true) {
  const opt = await call('/api/auth/login/options', { method: 'POST' })
  const chal = cookieFrom(opt, CHALLENGE_COOKIE)!
  mockAuthentication(credId, verified)
  const res = await call('/api/auth/login/verify', { method: 'POST', cookie: chal, json: { response: { id: credId } } })
  return { res, session: cookieFrom(res, SESSION_COOKIE) }
}

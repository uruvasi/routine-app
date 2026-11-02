import { Hono } from 'hono'
import type { Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'
import type { AppEnv, Env } from './env'
import {
  createSession,
  randomToken,
  readSession,
  requireAuth,
  revokeSessions,
  setSessionCookie,
  sha256Hex,
} from './session'

export const CHALLENGE_COOKIE = '__Host-rt_chal'
const CHALLENGE_TTL_MS = 5 * 60 * 1000
const RP_NAME = 'Routine'
const MIN_SETUP_PASSPHRASE = 8
const RECOVER_FAIL_LIMIT = 10
const RECOVER_FAIL_WINDOW_MS = 10 * 60 * 1000
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

type ChallengePurpose = 'register-first' | 'register-add' | 'login'

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length])
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-')
}

export function normalizeRecoveryCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raw.length === 16 ? [0, 4, 8, 12].map((i) => raw.slice(i, i + 4)).join('-') : raw
}

export async function issueRecoveryCode(env: Env, userId: string): Promise<string> {
  const code = generateRecoveryCode()
  await env.DB.prepare(
    'INSERT INTO recovery_codes (user_id, code_hash, created_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(user_id) DO UPDATE SET code_hash = excluded.code_hash, created_at = excluded.created_at',
  )
    .bind(userId, await sha256Hex(code), Date.now())
    .run()
  return code
}

async function hasUser(env: Env): Promise<boolean> {
  return !!(await env.DB.prepare('SELECT id FROM users LIMIT 1').first())
}

async function saveChallenge(
  c: Context<AppEnv>,
  challenge: string,
  purpose: ChallengePurpose,
  userId: string | null,
) {
  const id = randomToken(16)
  await c.env.DB.prepare(
    'INSERT INTO challenges (id, challenge, purpose, user_id, expires_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, challenge, purpose, userId, Date.now() + CHALLENGE_TTL_MS)
    .run()
  setCookie(c, CHALLENGE_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: CHALLENGE_TTL_MS / 1000,
  })
}

/** Reads and deletes the pending challenge (single use). */
async function takeChallenge(c: Context<AppEnv>, purposes: ChallengePurpose[]) {
  const id = getCookie(c, CHALLENGE_COOKIE)
  deleteCookie(c, CHALLENGE_COOKIE, { path: '/', secure: true })
  if (!id) return null
  const row = await c.env.DB.prepare(
    'DELETE FROM challenges WHERE id = ? RETURNING challenge, purpose, user_id, expires_at',
  )
    .bind(id)
    .first<{ challenge: string; purpose: ChallengePurpose; user_id: string | null; expires_at: number }>()
  if (!row || row.expires_at <= Date.now() || !purposes.includes(row.purpose)) return null
  return row
}

export function authRoutes() {
  const r = new Hono<AppEnv>()

  r.post('/register/options', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { passphrase?: string }
    let purpose: ChallengePurpose
    let userId: string
    if (!(await hasUser(c.env))) {
      // Fail closed: a missing/weak secret must never let an arbitrary visitor become the owner.
      const secret = c.env.SETUP_PASSPHRASE
      if (typeof secret !== 'string' || secret.length < MIN_SETUP_PASSPHRASE) {
        return c.json({ error: 'setup_disabled' }, 403)
      }
      const ok =
        typeof body.passphrase === 'string' &&
        (await sha256Hex(body.passphrase)) === (await sha256Hex(c.env.SETUP_PASSPHRASE))
      if (!ok) return c.json({ error: 'bad_passphrase' }, 403)
      purpose = 'register-first'
      userId = crypto.randomUUID()
    } else {
      const s = await readSession(c)
      if (!s) return c.json({ error: 'registration_closed' }, 403)
      purpose = 'register-add'
      userId = s.userId
    }
    const existing = await c.env.DB.prepare('SELECT credential_id, transports FROM passkeys WHERE user_id = ?')
      .bind(userId)
      .all<{ credential_id: string; transports: string | null }>()
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: c.env.RP_ID,
      userName: 'owner',
      userDisplayName: 'Routine',
      userID: new Uint8Array(new TextEncoder().encode(userId)),
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      excludeCredentials: existing.results.map((p) => ({
        id: p.credential_id,
        transports: p.transports ? (JSON.parse(p.transports) as AuthenticatorTransportFuture[]) : undefined,
      })),
    })
    await saveChallenge(c, options.challenge, purpose, userId)
    return c.json({ options })
  })

  r.post('/register/verify', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { response?: RegistrationResponseJSON; label?: string }
    const chal = await takeChallenge(c, ['register-first', 'register-add'])
    if (!chal || !chal.user_id) return c.json({ error: 'challenge_expired' }, 400)
    if (chal.purpose === 'register-add') {
      const s = await readSession(c)
      if (!s || s.userId !== chal.user_id) return c.json({ error: 'registration_closed' }, 403)
    } else if (await hasUser(c.env)) {
      return c.json({ error: 'registration_closed' }, 403)
    }
    let verification
    try {
      verification = await verifyRegistrationResponse({
        response: body.response as RegistrationResponseJSON,
        expectedChallenge: chal.challenge,
        expectedOrigin: c.env.RP_ORIGIN,
        expectedRPID: c.env.RP_ID,
        requireUserVerification: false,
      })
    } catch {
      return c.json({ error: 'auth_failed' }, 401)
    }
    if (!verification.verified || !verification.registrationInfo) {
      return c.json({ error: 'auth_failed' }, 401)
    }
    const cred = verification.registrationInfo.credential
    const now = Date.now()
    const insertPasskey = c.env.DB.prepare(
      'INSERT INTO passkeys (credential_id, user_id, public_key, counter, transports, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      cred.id,
      chal.user_id,
      cred.publicKey,
      cred.counter,
      cred.transports ? JSON.stringify(cred.transports) : null,
      typeof body.label === 'string' ? body.label.slice(0, 64) : null,
      now,
    )
    if (chal.purpose === 'register-first') {
      // Guarded insert: only succeeds while there are no users (single-owner invariant).
      const created = await c.env.DB.prepare(
        'INSERT INTO users (id, created_at) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM users)',
      )
        .bind(chal.user_id, now)
        .run()
      if (!created.meta.changes) return c.json({ error: 'registration_closed' }, 403)
      await insertPasskey.run()
      const token = await createSession(c.env, chal.user_id)
      setSessionCookie(c, token)
      const recoveryCode = await issueRecoveryCode(c.env, chal.user_id)
      return c.json({ ok: true, recoveryCode })
    }
    await insertPasskey.run()
    return c.json({ ok: true })
  })

  r.post('/login/options', async (c) => {
    const options = await generateAuthenticationOptions({
      rpID: c.env.RP_ID,
      userVerification: 'preferred',
      allowCredentials: [],
    })
    await saveChallenge(c, options.challenge, 'login', null)
    return c.json({ options })
  })

  r.post('/login/verify', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { response?: AuthenticationResponseJSON }
    const chal = await takeChallenge(c, ['login'])
    if (!chal) return c.json({ error: 'challenge_expired' }, 400)
    const credId = body.response?.id
    if (!credId) return c.json({ error: 'auth_failed' }, 401)
    const pk = await c.env.DB.prepare(
      'SELECT credential_id, user_id, public_key, counter, transports FROM passkeys WHERE credential_id = ?',
    )
      .bind(credId)
      .first<{ credential_id: string; user_id: string; public_key: ArrayBuffer | number[]; counter: number; transports: string | null }>()
    if (!pk) return c.json({ error: 'auth_failed' }, 401)
    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response: body.response as AuthenticationResponseJSON,
        expectedChallenge: chal.challenge,
        expectedOrigin: c.env.RP_ORIGIN,
        expectedRPID: c.env.RP_ID,
        requireUserVerification: false,
        credential: {
          id: pk.credential_id,
          publicKey: new Uint8Array(pk.public_key as ArrayBuffer),
          counter: pk.counter,
          transports: pk.transports ? (JSON.parse(pk.transports) as AuthenticatorTransportFuture[]) : undefined,
        },
      })
    } catch {
      return c.json({ error: 'auth_failed' }, 401)
    }
    if (!verification.verified) return c.json({ error: 'auth_failed' }, 401)
    await c.env.DB.prepare('UPDATE passkeys SET counter = ?, last_used_at = ? WHERE credential_id = ?')
      .bind(verification.authenticationInfo.newCounter, Date.now(), pk.credential_id)
      .run()
    const token = await createSession(c.env, pk.user_id)
    setSessionCookie(c, token)
    return c.json({ ok: true })
  })

  r.post('/recover', async (c) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
    const now = Date.now()
    const fails = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM challenges WHERE purpose = 'recover_fail' AND challenge = ? AND expires_at > ?",
    )
      .bind(ip, now)
      .first<{ n: number }>()
    if ((fails?.n ?? 0) >= RECOVER_FAIL_LIMIT) return c.json({ error: 'rate_limited' }, 429)

    const body = (await c.req.json().catch(() => ({}))) as { code?: string }
    const code = normalizeRecoveryCode(typeof body.code === 'string' ? body.code : '')
    const row = await c.env.DB.prepare('SELECT user_id FROM recovery_codes WHERE code_hash = ?')
      .bind(await sha256Hex(code))
      .first<{ user_id: string }>()
    if (!row) {
      await c.env.DB.prepare(
        "INSERT INTO challenges (id, challenge, purpose, user_id, expires_at) VALUES (?, ?, 'recover_fail', NULL, ?)",
      )
        .bind(randomToken(16), ip, now + RECOVER_FAIL_WINDOW_MS)
        .run()
      return c.json({ error: 'auth_failed' }, 401)
    }
    await revokeSessions(c.env, row.user_id)
    const token = await createSession(c.env, row.user_id)
    setSessionCookie(c, token)
    const recoveryCode = await issueRecoveryCode(c.env, row.user_id)
    return c.json({ ok: true, recoveryCode })
  })

  r.get('/passkeys', requireAuth, async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT credential_id, label, created_at, last_used_at FROM passkeys WHERE user_id = ? ORDER BY created_at',
    )
      .bind(c.var.userId)
      .all<{ credential_id: string; label: string | null; created_at: number; last_used_at: number | null }>()
    return c.json({
      passkeys: rows.results.map((p) => ({
        id: p.credential_id,
        label: p.label,
        createdAt: p.created_at,
        lastUsedAt: p.last_used_at,
      })),
    })
  })

  r.delete('/passkeys/:id', requireAuth, async (c) => {
    const n = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM passkeys WHERE user_id = ?')
      .bind(c.var.userId)
      .first<{ n: number }>()
    if ((n?.n ?? 0) <= 1) return c.json({ error: 'last_passkey' }, 409)
    const res = await c.env.DB.prepare('DELETE FROM passkeys WHERE user_id = ? AND credential_id = ?')
      .bind(c.var.userId, c.req.param('id'))
      .run()
    if (!res.meta.changes) return c.json({ error: 'not_found' }, 404)
    return c.json({ ok: true })
  })

  r.post('/revoke-others', requireAuth, async (c) => {
    await revokeSessions(c.env, c.var.userId, c.var.sessionHash)
    return c.json({ ok: true })
  })

  return r
}

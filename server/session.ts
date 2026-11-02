import type { Context, MiddlewareHandler } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { AppEnv, Env } from './env'

export const SESSION_COOKIE = '__Host-rt_session'
export const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000

export function base64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomToken(byteLength = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

export async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Creates a session row and returns the raw token (only the hash is stored). */
export async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken()
  const now = Date.now()
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  )
    .bind(await sha256Hex(token), userId, now, now + SESSION_TTL_MS)
    .run()
  return token
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true })
}

/** Resolves the current session (sliding its expiry). Returns null when absent/expired. */
export async function readSession(
  c: Context<AppEnv>,
): Promise<{ userId: string; sessionHash: string } | null> {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return null
  const hash = await sha256Hex(token)
  const now = Date.now()
  const row = await c.env.DB.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE token_hash = ?',
  )
    .bind(hash)
    .first<{ user_id: string; expires_at: number }>()
  if (!row || row.expires_at <= now) return null
  await c.env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
    .bind(now + SESSION_TTL_MS, hash)
    .run()
  return { userId: row.user_id, sessionHash: hash }
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: 'unauthorized' }, 401)
  c.set('userId', s.userId)
  c.set('sessionHash', s.sessionHash)
  await next()
}

export async function revokeSessions(env: Env, userId: string, exceptTokenHash?: string) {
  if (exceptTokenHash) {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
      .bind(userId, exceptTokenHash)
      .run()
  } else {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
  }
}

import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import type { Routine, Snapshot } from '../types'

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized')
  }
}
export class OfflineError extends Error {
  constructor() {
    super('offline')
  }
}
export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

type Json = Record<string, unknown>

async function request<T>(path: string, init: { method?: string; json?: unknown } = {}): Promise<{ status: number; body: T }> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    })
  } catch {
    throw new OfflineError()
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (res.status === 401 && body.error === 'unauthorized') throw new UnauthorizedError()
  return { status: res.status, body }
}

async function ok<T>(path: string, init?: { method?: string; json?: unknown }): Promise<T> {
  const { status, body } = await request<T & { error?: string }>(path, init)
  if (status >= 400) throw new ApiError(status, body.error ?? 'error')
  return body
}

export type SessionInfo = { loggedIn: boolean; hasUser: boolean; loginAvailable: boolean }
export type PasskeyInfo = { id: string; label: string | null; createdAt: number; lastUsedAt: number | null }

export const getSession = () => ok<SessionInfo>('/session')
export const getRoutines = () => ok<Snapshot>('/routines')

export async function putRoutines(
  baseRevision: number,
  routines: Routine[],
): Promise<{ revision: number; updatedAt: number } | { conflict: Snapshot }> {
  const { status, body } = await request<Json>('/routines', { method: 'PUT', json: { baseRevision, routines } })
  if (status === 409) return { conflict: body as unknown as Snapshot }
  if (status >= 400) throw new ApiError(status, String(body.error ?? 'error'))
  return body as unknown as { revision: number; updatedAt: number }
}

export const deleteRoutines = () => ok<{ revision: number }>('/routines', { method: 'DELETE' })

export async function register(passphrase?: string, label?: string): Promise<{ recoveryCode?: string }> {
  const { options } = await ok<{ options: Parameters<typeof startRegistration>[0]['optionsJSON'] }>(
    '/auth/register/options',
    { method: 'POST', json: { passphrase } },
  )
  const response = await startRegistration({ optionsJSON: options })
  return ok<{ ok: true; recoveryCode?: string }>('/auth/register/verify', { method: 'POST', json: { response, label } })
}

export async function login(): Promise<void> {
  const { options } = await ok<{ options: Parameters<typeof startAuthentication>[0]['optionsJSON'] }>(
    '/auth/login/options',
    { method: 'POST' },
  )
  const response = await startAuthentication({ optionsJSON: options })
  await ok('/auth/login/verify', { method: 'POST', json: { response } })
}

export const recover = (code: string) =>
  ok<{ ok: true; recoveryCode: string }>('/auth/recover', { method: 'POST', json: { code } })
export const logout = () => ok('/logout', { method: 'POST' })
export const listPasskeys = () => ok<{ passkeys: PasskeyInfo[] }>('/auth/passkeys')
export const deletePasskey = (id: string) => ok(`/auth/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const revokeOthers = () => ok('/auth/revoke-others', { method: 'POST' })

export type SyncApi = Pick<typeof import('./api'), 'getSession' | 'getRoutines' | 'putRoutines' | 'deleteRoutines'>

import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import type { AppEnv } from './env'
import { authRoutes } from './auth'
import { clearSessionCookie, readSession, sha256Hex, SESSION_COOKIE } from './session'

export function requestOrigin(c: { req: { header: (n: string) => string | undefined; url: string } }) {
  return c.req.header('Origin') ?? new URL(c.req.url).origin
}

/** Login/registration only works on the configured RP origin (also acts as CSRF guard). */
export const originGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (requestOrigin(c) !== c.env.RP_ORIGIN) {
    return c.json({ error: 'login_unavailable' }, 403)
  }
  await next()
}

export function createApp() {
  const app = new Hono<AppEnv>().basePath('/api')

  app.use('/auth/*', originGuard)
  app.route('/auth', authRoutes())

  app.get('/session', async (c) => {
    const s = await readSession(c)
    const user = await c.env.DB.prepare('SELECT id FROM users LIMIT 1').first()
    return c.json({
      loggedIn: !!s,
      hasUser: !!user,
      loginAvailable: requestOrigin(c) === c.env.RP_ORIGIN,
    })
  })

  app.post('/logout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) {
      await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
        .bind(await sha256Hex(token))
        .run()
    }
    clearSessionCookie(c)
    return c.json({ ok: true })
  })

  return app
}

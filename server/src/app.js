import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { config } from './config.js'
import { findSessionUser } from './auth.js'
import authRoutes from './routes/auth.js'
import questionRoutes from './routes/questions.js'
import resultRoutes from './routes/results.js'
import adminRoutes from './routes/admin.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function buildApp({ pool, logger = false, rateLimitMax = 300, authRateLimitMax = 10 }) {
  const app = Fastify({ logger, trustProxy: true, bodyLimit: 1024 * 1024 })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cookie)
  await app.register(rateLimit, { max: rateLimitMax, timeWindow: '1 minute' })

  app.decorate('pool', pool)
  app.decorate('authRateLimitMax', authRateLimitMax)
  app.decorateRequest('user', null)

  // זיהוי המשתמש מהעוגייה בכל בקשה
  app.addHook('onRequest', async request => {
    request.user = await findSessionUser(pool, request.cookies?.[config.cookieName])
  })

  // הגנת CSRF: בקשות שמשנות נתונים חייבות להגיע מהאתר עצמו (בדיקת Origin/Referer מול המארח)
  app.addHook('preHandler', async (request, reply) => {
    if (SAFE_METHODS.has(request.method)) return
    const source = request.headers.origin || request.headers.referer
    if (!source) return reply.code(403).send({ error: 'בקשה לא תקינה' })
    let sourceHost = ''
    try { sourceHost = new URL(source).host } catch { /* מקור לא תקין */ }
    const allowed = new Set([request.headers.host, new URL(config.publicUrl).host])
    if (!allowed.has(sourceHost)) return reply.code(403).send({ error: 'בקשה לא תקינה' })
  })

  app.get('/api/health', async () => {
    await pool.query('SELECT 1')
    return { ok: true }
  })

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(questionRoutes, { prefix: '/api' })
  await app.register(resultRoutes, { prefix: '/api' })
  await app.register(adminRoutes, { prefix: '/api/admin' })

  app.setErrorHandler((error, request, reply) => {
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: error.statusCode === 429 ? 'יותר מדי ניסיונות, נסו שוב בעוד דקה' : 'בקשה לא תקינה' })
    }
    request.log.error(error)
    return reply.code(500).send({ error: 'שגיאה בשרת, נסו שוב' })
  })

  return app
}

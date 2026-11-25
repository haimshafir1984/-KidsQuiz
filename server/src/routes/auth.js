import { config } from '../config.js'
import { hashPassword, verifyPassword } from '../password.js'
import {
  clearSessionCookie, createSession, destroyOtherSessions, destroySession, publicUser, setSessionCookie,
} from '../auth.js'
import { requireAccount } from '../guards.js'
import { clientIp } from '../limiter.js'
import { deleteUserAccount, exportUserData } from '../userData.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6
const MAX_PASSWORD = 200
export const TERMS_VERSION = '2026-11'
const clean = value => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '')

// ללא הבדל בהודעה בין "משתמש לא קיים" ל"סיסמה שגויה", כדי לא לחשוף אילו משתמשים קיימים
const BAD_LOGIN = { error: 'שם משתמש או סיסמה שגויים' }

export default async function authRoutes(app) {
  const { pool } = app
  const strict = { config: { rateLimit: { max: app.authRateLimitMax, timeWindow: '1 minute' } } }

  app.post('/register', strict, async (request, reply) => {
    const body = request.body || {}
    const firstName = clean(body.firstName)
    const lastName = clean(body.lastName)
    const city = clean(body.city)
    const email = clean(body.email).toLowerCase()
    const phone = clean(body.phone)
    const password = typeof body.password === 'string' ? body.password : ''

    if (body.acceptTerms !== true) return reply.code(400).send({ error: 'יש לאשר את תנאי השימוש ומדיניות הפרטיות' })
    if (!(await app.verifyTurnstile(body.turnstileToken, clientIp(request)))) {
      return reply.code(400).send({ error: 'אימות האבטחה נכשל, נסו שוב' })
    }
    if (!firstName || !lastName || !city) return reply.code(400).send({ error: 'יש למלא שם פרטי, שם משפחה ועיר' })
    if (!EMAIL_PATTERN.test(email)) return reply.code(400).send({ error: 'כתובת המייל אינה תקינה' })
    if (password.length < MIN_PASSWORD) return reply.code(400).send({ error: `הסיסמה צריכה להכיל לפחות ${MIN_PASSWORD} תווים` })
    if (password.length > MAX_PASSWORD) return reply.code(400).send({ error: 'הסיסמה ארוכה מדי' })

    const existing = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [email])
    if (existing.rowCount > 0) return reply.code(409).send({ error: 'כבר קיים חשבון עם כתובת המייל הזו' })

    // שם משתמש אוטומטי מהשם המלא (השרת קובע אותו ולא הלקוח, כדי שלא ינחשו כתובת מייל של אחר).
    // כשיש כמה תלמידים עם אותו שם מתווסף מספר סידורי
    const base = `${firstName} ${lastName}`.replace(/@/g, '').trim().slice(0, 80) || 'תלמיד'
    const passwordHash = await hashPassword(password)
    let username = base
    for (let suffix = 2; suffix < 200; suffix += 1) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO users (username, email, password_hash, first_name, last_name, city, phone, birth_date, terms_accepted_at, terms_version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9) RETURNING *`,
          [username, email, passwordHash, firstName, lastName, city, phone, clean(body.birthDate), TERMS_VERSION],
        )
        const user = rows[0]
        const session = await createSession(pool, user.id, request.headers['user-agent'], user.role)
        setSessionCookie(reply, session.token, session.expiresAt)
        return { success: true, user: publicUser(user) }
      } catch (error) {
        if (error.code !== '23505') throw error
        if (String(error.constraint).includes('email')) return reply.code(409).send({ error: 'כבר קיים חשבון עם כתובת המייל הזו' })
        username = `${base} ${suffix}`
      }
    }
    return reply.code(500).send({ error: 'לא הצלחנו ליצור שם משתמש, נסו שוב' })
  })

  app.post('/login', strict, async (request, reply) => {
    const identifier = clean(request.body?.identifier).toLowerCase()
    const password = typeof request.body?.password === 'string' ? request.body.password : ''
    if (!identifier || !password || password.length > MAX_PASSWORD) return reply.code(400).send(BAD_LOGIN)

    const ip = clientIp(request)
    if (app.loginLimiter.isBlocked(ip, identifier)) {
      return reply.code(429).send({ error: 'יותר מדי ניסיונות כושלים. נסו שוב בעוד כמה דקות' })
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE lower(username) = $1 OR lower(email) = $1 ORDER BY (lower(username) = $1) DESC LIMIT 1',
      [identifier],
    )
    const user = rows[0]
    // גם כשהמשתמש לא קיים מריצים אימות מול hash דמה, כדי שזמן התגובה לא יחשוף אם המשתמש קיים
    const ok = await verifyPassword(password, user?.password_hash || 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==')
    if (!user || !ok) {
      app.loginLimiter.recordFailure(ip, identifier)
      return reply.code(401).send(BAD_LOGIN)
    }
    // הודעה ייעודית לחשבון חסום רק אחרי שהסיסמה נכונה, כדי לא לחשוף מי קיים במערכת
    if (user.disabled) return reply.code(403).send({ error: 'חשבונך חסום. יש לפנות למנהל המערכת', blocked: true })
    app.loginLimiter.recordSuccess(ip, identifier)

    // גם כשהמנוי פג נכנסים: הגישה מוגבלת לחשבון ולחידוש (השרת חוסם את התוכן)
    await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id])
    const session = await createSession(pool, user.id, request.headers['user-agent'], user.role)
    setSessionCookie(reply, session.token, session.expiresAt)
    return { success: true, user: publicUser(user) }
  })

  app.post('/logout', async (request, reply) => {
    await destroySession(pool, request.cookies?.[config.cookieName])
    clearSessionCookie(reply)
    return { success: true }
  })

  app.get('/me', async request => ({ user: request.user ? publicUser(request.user) : null }))

  app.patch('/me', { preHandler: requireAccount }, async (request, reply) => {
    const body = request.body || {}
    const firstName = clean(body.firstName)
    const lastName = clean(body.lastName)
    const city = clean(body.city)
    if (!firstName || !lastName || !city) return reply.code(400).send({ error: 'יש למלא שם, שם משפחה ועיר מגורים.' })
    const { rows } = await pool.query(
      `UPDATE users SET first_name = $2, last_name = $3, city = $4, phone = $5, birth_date = $6
       WHERE id = $1 RETURNING *`,
      [request.user.id, firstName, lastName, city, clean(body.phone), clean(body.birthDate)],
    )
    return { success: true, user: publicUser(rows[0]) }
  })

  // שינוי סיסמה עצמי: באישור הסיסמה הנוכחית, ומנתק את שאר המכשירים
  app.post('/change-password', { preHandler: requireAccount, ...strict }, async (request, reply) => {
    const current = typeof request.body?.currentPassword === 'string' ? request.body.currentPassword : ''
    const next = typeof request.body?.newPassword === 'string' ? request.body.newPassword : ''
    const limiterKey = `pw:${request.user.id}`
    const ip = clientIp(request)
    if (app.loginLimiter.isBlocked(ip, limiterKey)) return reply.code(429).send({ error: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' })
    if (!(await verifyPassword(current, request.user.password_hash))) {
      app.loginLimiter.recordFailure(ip, limiterKey)
      return reply.code(403).send({ error: 'הסיסמה הנוכחית שגויה' })
    }
    if (next.length < MIN_PASSWORD) return reply.code(400).send({ error: `הסיסמה החדשה צריכה להכיל לפחות ${MIN_PASSWORD} תווים` })
    if (next.length > MAX_PASSWORD) return reply.code(400).send({ error: 'הסיסמה ארוכה מדי' })
    await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [request.user.id, await hashPassword(next)])
    await destroyOtherSessions(pool, request.user.id, request.cookies?.[config.cookieName])
    app.loginLimiter.recordSuccess(ip, limiterKey)
    return { success: true }
  })

  // זכות עיון: הורדת כל הנתונים של המשתמש המחובר
  app.get('/me/export', { preHandler: requireAccount }, async request => exportUserData(pool, request.user.id))

  // זכות מחיקה: מחיקת החשבון וכל נתוניו, באישור סיסמה. מנהלים נמחקים רק ע"י מנהל אחר (לא כאן)
  app.delete('/me', { preHandler: requireAccount, ...strict }, async (request, reply) => {
    if (request.user.role === 'admin') return reply.code(403).send({ error: 'חשבון מנהל לא נמחק מכאן' })
    const password = typeof request.body?.password === 'string' ? request.body.password : ''
    if (!(await verifyPassword(password, request.user.password_hash))) return reply.code(403).send({ error: 'הסיסמה שגויה' })
    await deleteUserAccount(pool, request.user.id)
    clearSessionCookie(reply)
    return { success: true }
  })
}

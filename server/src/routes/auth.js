import { config } from '../config.js'
import { hashPassword, verifyPassword } from '../password.js'
import {
  clearSessionCookie, createSession, destroySession, getSubscription, publicUser, setSessionCookie,
} from '../auth.js'
import { requireUser } from '../guards.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6
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

    if (!firstName || !lastName || !city) return reply.code(400).send({ error: 'יש למלא שם פרטי, שם משפחה ועיר' })
    if (!EMAIL_PATTERN.test(email)) return reply.code(400).send({ error: 'כתובת המייל אינה תקינה' })
    if (password.length < MIN_PASSWORD) return reply.code(400).send({ error: `הסיסמה צריכה להכיל לפחות ${MIN_PASSWORD} תווים` })

    const existing = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [email])
    if (existing.rowCount > 0) return reply.code(409).send({ error: 'כבר קיים חשבון עם כתובת המייל הזו' })

    // שם משתמש אוטומטי מהשם המלא; כשיש כמה תלמידים עם אותו שם מתווסף מספר סידורי
    const base = clean(body.username) || `${firstName} ${lastName}`
    const passwordHash = await hashPassword(password)
    let username = base
    for (let suffix = 2; suffix < 200; suffix += 1) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO users (username, email, password_hash, first_name, last_name, city, phone, birth_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [username, email, passwordHash, firstName, lastName, city, phone, clean(body.birthDate)],
        )
        const user = rows[0]
        const session = await createSession(pool, user.id, request.headers['user-agent'])
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
    if (!identifier || !password) return reply.code(400).send(BAD_LOGIN)

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE lower(username) = $1 OR lower(email) = $1 ORDER BY (lower(username) = $1) DESC LIMIT 1',
      [identifier],
    )
    const user = rows[0]
    // גם כשהמשתמש לא קיים מריצים אימות מול hash דמה, כדי שזמן התגובה לא יחשוף אם המשתמש קיים
    const ok = await verifyPassword(password, user?.password_hash || 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==')
    if (!user || !ok || user.disabled) return reply.code(401).send(BAD_LOGIN)

    if (!getSubscription(user).valid) return reply.code(403).send({ error: 'פג תוקף המנוי שלך', expired: true })

    await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id])
    const session = await createSession(pool, user.id, request.headers['user-agent'])
    setSessionCookie(reply, session.token, session.expiresAt)
    return { success: true, user: publicUser(user) }
  })

  app.post('/logout', async (request, reply) => {
    await destroySession(pool, request.cookies?.[config.cookieName])
    clearSessionCookie(reply)
    return { success: true }
  })

  app.get('/me', async request => ({ user: request.user ? publicUser(request.user) : null }))

  app.patch('/me', { preHandler: requireUser }, async (request, reply) => {
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
}

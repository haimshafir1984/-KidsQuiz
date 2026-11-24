// התחברויות (sessions): אסימון אקראי בעוגייה, ובבסיס הנתונים נשמר רק ה-hash שלו.

import { createHash, randomBytes } from 'node:crypto'
import { config } from './config.js'

const hashToken = token => createHash('sha256').update(token).digest('hex')

export async function createSession(pool, userId, userAgent, role = 'student') {
  const token = randomBytes(32).toString('base64url')
  const days = role === 'admin' ? config.adminSessionDays : config.sessionDays
  const expiresAt = new Date(Date.now() + days * 86400000)
  await pool.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES ($1, $2, $3, $4)',
    [hashToken(token), userId, expiresAt, (userAgent || '').slice(0, 300)],
  )
  return { token, expiresAt }
}

export async function destroySession(pool, token) {
  if (!token) return
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
}

// ניתוק מכל המכשירים חוץ מההתחברות הנוכחית (למשל אחרי שינוי סיסמה)
export async function destroyOtherSessions(pool, userId, currentToken) {
  await pool.query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [userId, hashToken(currentToken || '')])
}

export async function findSessionUser(pool, token) {
  if (!token) return null
  const { rows } = await pool.query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND NOT u.disabled`,
    [hashToken(token)],
  )
  const user = rows[0] || null
  // מנוי שפג תוקפו מנתק גם התחברות קיימת (ולא רק כניסה חדשה)
  if (user && !getSubscription(user).valid) return null
  return user
}

export async function purgeExpiredSessions(pool) {
  const result = await pool.query('DELETE FROM sessions WHERE expires_at < now()')
  return result.rowCount
}

export function setSessionCookie(reply, token, expiresAt) {
  reply.setCookie(config.cookieName, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    expires: expiresAt,
  })
}

export function clearSessionCookie(reply) {
  reply.clearCookie(config.cookieName, { path: '/' })
}

// מצב המנוי: מנהלים תמיד פעילים. אחרת נבדק תאריך סיום מפורש, ואם אין - תקופת הניסיון מההרשמה.
export function getSubscription(user) {
  if (user.role === 'admin') return { valid: true, status: 'active', daysLeft: 999 }
  if (user.subscription_status === 'expired') return { valid: false, status: 'expired', daysLeft: 0 }
  // מנוי פעיל בלי תאריך סיום (למשל שהוגדר ידנית) נחשב פעיל ללא הגבלה
  if (user.subscription_status === 'active' && !user.subscription_until) return { valid: true, status: 'active', daysLeft: 999 }
  const until = user.subscription_until
    ? new Date(user.subscription_until).getTime()
    : new Date(user.subscription_date).getTime() + config.trialDays * 86400000
  const daysLeft = Math.max(0, Math.ceil((until - Date.now()) / 86400000))
  const valid = daysLeft > 0
  return { valid, status: valid ? user.subscription_status : 'expired', daysLeft }
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || '',
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    city: user.city,
    phone: user.phone,
    birthDate: user.birth_date,
    subscription_date: user.subscription_date,
    subscription: getSubscription(user),
  }
}

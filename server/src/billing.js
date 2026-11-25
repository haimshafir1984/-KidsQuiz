// לוגיקת תשלומים שאינה תלויה בחברת סליקה.
// כל תשלום (ידני היום, מקוון בעתיד) עובר דרך אותו אישור: בדיקת סכום, חד-פעמיות והארכת מנוי בטרנזקציה אחת.
// סכום ותקופה נקבעים בשרת בעת יצירת הרשומה ולא מגיעים מהדפדפן בעת האישור.
import { config } from './config.js'

const DAY_MS = 86400000

export const MANUAL_PROVIDER = 'manual'
export const MANUAL_METHODS = new Set(['bank_transfer', 'cash', 'check', 'other'])

// מצב המנוי אחרי תשלום: התקופה מתווספת לסוף התקופה הנוכחית (כולל ניסיון שעוד לא נגמר), או מהיום אם פגה
export function nextSubscription(user, durationDays, now = Date.now()) {
  // מנוי פעיל ללא תאריך סיום נשאר כך: תשלום לא אמור לקצר אותו
  if (user.subscription_status === 'active' && !user.subscription_until) return { status: 'active', until: null }
  let currentEnd = now
  if (user.subscription_status !== 'expired') {
    const end = user.subscription_until
      ? new Date(user.subscription_until).getTime()
      : new Date(user.subscription_date).getTime() + config.trialDays * DAY_MS
    currentEnd = Math.max(now, end)
  }
  return { status: 'active', until: new Date(currentEnd + durationDays * DAY_MS) }
}

export async function withTransaction(pool, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query(result?.rollback ? 'ROLLBACK' : 'COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// יצירת רשומת תשלום ממתינה. משמשת גם את הרישום הידני, ובעתיד את הסליקה (לפני פתיחת טופס התשלום)
export async function createPendingPayment(db, {
  userId, plan = null, amountAgorot = plan?.price_agorot, durationDays = plan?.duration_days,
  method, provider, note = '', createdBy = null,
}) {
  const { rows } = await db.query(
    `INSERT INTO payments (user_id, payer_name, plan_id, plan_name, amount_agorot, duration_days, method, provider, note, created_by)
     SELECT u.id, trim(u.first_name || ' ' || u.last_name), $2, $3, $4, $5, $6, $7, $8, $9 FROM users u WHERE u.id = $1
     RETURNING *`,
    [userId, plan?.id ?? null, plan?.name ?? '', amountAgorot, durationDays, method, provider, note, createdBy],
  )
  return rows[0] || null
}

// נעילת המשתמש לשינוי המנוי. NO KEY UPDATE (ולא FOR UPDATE) כדי לא להיתקע ב-deadlock
// מול נעילת המפתח הזר שנוצרת כשמוסיפים רשומת תשלום
export async function lockUser(client, userId) {
  const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR NO KEY UPDATE', [userId])
  return rows[0] || null
}

// אישור תשלום בתוך טרנזקציה קיימת. מחזיר { ok, duplicate?, reason?, payment? }
export async function confirmWithClient(client, { paymentId, amountAgorot, provider, transactionId }) {
  if (!transactionId) return { ok: false, reason: 'invalid' }
  const { rows } = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId])
  const payment = rows[0]
  if (!payment) return { ok: false, reason: 'not_found' }
  if (payment.provider !== provider) return { ok: false, reason: 'provider_mismatch' }
  if (payment.status === 'paid' && payment.provider_transaction_id === transactionId) {
    return { ok: true, duplicate: true, payment }
  }
  if (payment.status !== 'pending') return { ok: false, reason: 'not_pending' }
  if (!Number.isInteger(amountAgorot) || amountAgorot !== payment.amount_agorot) return { ok: false, reason: 'amount_mismatch' }

  const used = await client.query(
    'SELECT 1 FROM payments WHERE provider = $1 AND provider_transaction_id = $2', [provider, transactionId],
  )
  if (used.rowCount > 0) return { ok: false, reason: 'transaction_used' }

  let until = null
  if (payment.user_id) {
    const user = await lockUser(client, payment.user_id)
    const next = nextSubscription(user, payment.duration_days)
    until = next.until
    // תשלום לא משחרר חשבון שנחסם: חסימה היא החלטה נפרדת של מנהל
    await client.query('UPDATE users SET subscription_status = $2, subscription_until = $3 WHERE id = $1', [user.id, next.status, next.until])
  }
  const updated = await client.query(
    `UPDATE payments SET status = 'paid', provider_transaction_id = $2, paid_at = now(), subscription_until_after = $3
     WHERE id = $1 RETURNING *`,
    [paymentId, transactionId, until],
  )
  return { ok: true, duplicate: false, payment: updated.rows[0] }
}

// נקודת החיבור לחברת סליקה: לקרוא לפונקציה הזו רק אחרי שאומת שההודעה הגיעה מהספק
export async function confirmPayment(pool, details) {
  try {
    return await withTransaction(pool, async client => {
      const result = await confirmWithClient(client, details)
      return result.ok ? result : { ...result, rollback: true }
    })
  } catch (error) {
    if (error.code === '23505') return { ok: false, reason: 'transaction_used' }
    throw error
  }
}

export function publicPayment(row) {
  return {
    id: row.id,
    planName: row.plan_name,
    amountAgorot: row.amount_agorot,
    currency: row.currency,
    durationDays: row.duration_days,
    status: row.status,
    method: row.method,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    subscriptionUntil: row.subscription_until_after,
  }
}

export function publicPlan(row) {
  return { id: row.id, name: row.name, priceAgorot: row.price_agorot, durationDays: row.duration_days, active: row.active }
}

// נתיבי תשלומים: צפייה של המשתמש, וניהול מסלולים ורישום תשלומים ידניים ע"י מנהל.
// אין כאן תשלום מקוון: הוא יתווסף כשתיבחר חברת סליקה, ויאשר תשלומים רק דרך confirmPayment.
import { requireAccount, requireAdmin } from '../guards.js'
import {
  MANUAL_METHODS, MANUAL_PROVIDER, confirmWithClient, createPendingPayment, lockUser, publicPayment, publicPlan, withTransaction,
} from '../billing.js'
import { UUID_PATTERN } from '../validators.js'

const MAX_AMOUNT_AGOROT = 10_000_000
const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const intInRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max

export async function userBillingRoutes(app) {
  const { pool } = app

  // פתוח גם לתלמיד שהמנוי שלו פג (כדי שיוכל לראות איך מחדשים)
  app.get('/billing', { preHandler: requireAccount }, async request => {
    const plans = await pool.query('SELECT * FROM plans WHERE active ORDER BY duration_days, price_agorot')
    const payments = await pool.query(
      `SELECT * FROM payments WHERE user_id = $1 AND status <> 'pending' ORDER BY created_at DESC LIMIT 100`,
      [request.user.id],
    )
    return { onlineEnabled: false, plans: plans.rows.map(publicPlan), payments: payments.rows.map(publicPayment) }
  })
}

export async function adminBillingRoutes(app) {
  const { pool } = app
  app.addHook('preHandler', requireAdmin)
  app.addHook('preHandler', async (request, reply) => {
    if (request.params?.id !== undefined && !UUID_PATTERN.test(request.params.id)) {
      return reply.code(400).send({ error: 'מזהה לא תקין' })
    }
  })

  const audit = (db, actorId, action, entity, entityId, after) => db.query(
    'INSERT INTO audit_log (actor_id, action, entity, entity_id, after) VALUES ($1, $2, $3, $4, $5)',
    [actorId, action, entity, entityId, after],
  )

  app.get('/plans', async () => {
    const { rows } = await pool.query('SELECT * FROM plans ORDER BY active DESC, duration_days, price_agorot')
    return { plans: rows.map(publicPlan) }
  })

  app.post('/plans', async (request, reply) => {
    const body = request.body || {}
    const name = clean(body.name, 100)
    if (!name) return reply.code(400).send({ error: 'חסר שם למסלול' })
    if (!intInRange(body.priceAgorot, 1, MAX_AMOUNT_AGOROT)) return reply.code(400).send({ error: 'המחיר אינו תקין' })
    if (!intInRange(body.durationDays, 1, 3660)) return reply.code(400).send({ error: 'מספר הימים אינו תקין' })
    const { rows } = await pool.query(
      'INSERT INTO plans (name, price_agorot, duration_days) VALUES ($1, $2, $3) RETURNING *',
      [name, body.priceAgorot, body.durationDays],
    )
    await audit(pool, request.user.id, 'create', 'plan', rows[0].id, publicPlan(rows[0]))
    return { success: true, plan: publicPlan(rows[0]) }
  })

  // מחיר ותקופה לא משתנים במסלול קיים (כדי לא לבלבל רשומות קודמות): משביתים ויוצרים חדש
  app.patch('/plans/:id', async (request, reply) => {
    if (typeof request.body?.active !== 'boolean') return reply.code(400).send({ error: 'אין מה לעדכן' })
    const { rows } = await pool.query('UPDATE plans SET active = $2 WHERE id = $1 RETURNING *', [request.params.id, request.body.active])
    if (rows.length === 0) return reply.code(404).send({ error: 'המסלול לא נמצא' })
    await audit(pool, request.user.id, 'update', 'plan', rows[0].id, { active: rows[0].active })
    return { success: true, plan: publicPlan(rows[0]) }
  })

  app.get('/users/:id/payments', async request => {
    const { rows } = await pool.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [request.params.id])
    return { payments: rows.map(row => ({ ...publicPayment(row), note: row.note })) }
  })

  // רישום תשלום שהתקבל מחוץ למערכת (העברה, מזומן). requestId מונע רישום כפול בלחיצה חוזרת
  app.post('/users/:id/payments', async (request, reply) => {
    const body = request.body || {}
    const userId = request.params.id
    if (!UUID_PATTERN.test(body.requestId || '')) return reply.code(400).send({ error: 'בקשה לא תקינה' })
    if (!MANUAL_METHODS.has(body.method)) return reply.code(400).send({ error: 'יש לבחור אמצעי תשלום' })
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [userId])
    if (target.rowCount === 0) return reply.code(404).send({ error: 'המשתמש לא נמצא' })
    if (target.rows[0].role === 'admin') return reply.code(400).send({ error: 'אין רישום תשלום לחשבון מנהל' })

    let plan = null
    if (body.planId) {
      if (!UUID_PATTERN.test(body.planId)) return reply.code(400).send({ error: 'המסלול אינו תקין' })
      plan = (await pool.query('SELECT * FROM plans WHERE id = $1', [body.planId])).rows[0]
      if (!plan) return reply.code(404).send({ error: 'המסלול לא נמצא' })
    }
    // סכום שונה ממחיר המסלול מותר למנהל (למשל הנחה)
    const amountAgorot = body.amountAgorot ?? plan?.price_agorot
    const durationDays = plan ? plan.duration_days : body.durationDays
    if (!intInRange(amountAgorot, 1, MAX_AMOUNT_AGOROT)) return reply.code(400).send({ error: 'הסכום אינו תקין' })
    if (!intInRange(durationDays, 1, 3660)) return reply.code(400).send({ error: 'מספר הימים אינו תקין' })

    const findExisting = (db = pool) => db.query(
      'SELECT * FROM payments WHERE provider = $1 AND provider_transaction_id = $2', [MANUAL_PROVIDER, body.requestId],
    )
    const duplicateReply = row => (row.user_id === userId
      ? { success: true, duplicate: true, payment: publicPayment(row) }
      : reply.code(409).send({ error: 'מזהה הבקשה כבר בשימוש' }))

    const existing = await findExisting()
    if (existing.rowCount > 0) return duplicateReply(existing.rows[0])

    try {
      const result = await withTransaction(pool, async client => {
        // הנעילה לפני כל פעולה: רישומים של אותו תלמיד רצים אחד אחרי השני, ובקשה כפולה מזוהה כאן
        await lockUser(client, userId)
        const already = await findExisting(client)
        if (already.rowCount > 0) return { ok: true, raced: already.rows[0], rollback: true }
        const pending = await createPendingPayment(client, {
          userId, plan, amountAgorot, durationDays,
          method: body.method, provider: MANUAL_PROVIDER, note: clean(body.note, 500), createdBy: request.user.id,
        })
        const confirmed = await confirmWithClient(client, {
          paymentId: pending.id, amountAgorot, provider: MANUAL_PROVIDER, transactionId: body.requestId,
        })
        if (!confirmed.ok) return { ...confirmed, rollback: true }
        await audit(client, request.user.id, 'record_payment', 'user', userId, { paymentId: pending.id, amountAgorot, durationDays, method: body.method })
        return confirmed
      })
      if (result.raced) return duplicateReply(result.raced)
      if (!result.ok) return reply.code(409).send({ error: 'לא ניתן היה לרשום את התשלום' })
      return { success: true, duplicate: false, payment: publicPayment(result.payment) }
    } catch (error) {
      // שתי בקשות זהות במקביל: הראשונה נקלטה
      if (error.code !== '23505') throw error
      const winner = await findExisting()
      return duplicateReply(winner.rows[0])
    }
  })

  // ביטול רישום שגוי. המנוי לא משתנה אוטומטית: מתקנים אותו בכפתורי המנוי
  app.post('/payments/:id/cancel', async (request, reply) => {
    const { rows } = await pool.query(
      `UPDATE payments SET status = 'cancelled', cancelled_at = now() WHERE id = $1 AND status = 'paid' AND provider = $2 RETURNING *`,
      [request.params.id, MANUAL_PROVIDER],
    )
    if (rows.length === 0) return reply.code(404).send({ error: 'לא נמצא רישום ידני שאפשר לבטל' })
    await audit(pool, request.user.id, 'cancel_payment', 'user', rows[0].user_id, { paymentId: rows[0].id })
    return { success: true, payment: publicPayment(rows[0]) }
  })
}

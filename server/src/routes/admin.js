import { randomUUID } from 'node:crypto'
import { requireAdmin } from '../guards.js'
import { rowToQuestion } from './questions.js'
import { getSubscription } from '../auth.js'
import { hashPassword } from '../password.js'
import { clientIp, isCloudflareAddress } from '../limiter.js'
import { deleteUserAccount, exportUserData } from '../userData.js'

const QUESTION_TYPES = new Set(['multiple', 'open', 'sentence_completion', 'list', 'self_check'])

// מאמתים את מבנה השאלה ומחזירים אובייקט נקי (או הודעת שגיאה)
function validateQuestion(input) {
  if (!input || typeof input !== 'object') return { error: 'בקשה לא תקינה' }
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  if (!text) return { error: 'חסר נוסח שאלה' }
  if (!QUESTION_TYPES.has(input.type)) return { error: 'סוג שאלה לא תקין' }
  if (!input.grade || !input.subject) return { error: 'חסרים קטגוריה או נושא' }
  const answers = Array.isArray(input.correct_answer) ? input.correct_answer.filter(a => typeof a === 'string' && a.trim()) : []
  if (answers.length === 0) return { error: 'חסרה תשובה נכונה' }
  const { id: _ignored, ...rest } = input
  return { question: { ...rest, text, correct_answer: answers } }
}

function toColumns(question) {
  return [
    question.grade, question.subject, question.level || null,
    question.activityType || 'practice', Number.isFinite(question.position) ? question.position : null,
  ]
}

async function audit(client, actorId, action, entity, entityId, before, after) {
  await client.query(
    'INSERT INTO audit_log (actor_id, action, entity, entity_id, before, after) VALUES ($1, $2, $3, $4, $5, $6)',
    [actorId, action, entity, entityId, before ?? null, after ?? null],
  )
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function adminRoutes(app) {
  const { pool } = app
  app.addHook('preHandler', requireAdmin)
  // מזהה משתמש לא תקין = 400 (ולא שגיאת בסיס נתונים)
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/users/') && !UUID_PATTERN.test(request.params?.id || '')) {
      return reply.code(400).send({ error: 'מזהה משתמש לא תקין' })
    }
  })

  // אבחון: איזו כתובת לקוח השרת רואה (לאימות הגדרת TRUST_CLOUDFLARE_ONLY)
  app.get('/diagnostics/client-ip', async request => ({
    clientIp: clientIp(request),
    cloudflareOnly: app.cloudflareOnly,
    cfHeaderPresent: Boolean(request.headers['cf-connecting-ip']),
    viaCloudflare: isCloudflareAddress(String(request.headers['x-forwarded-for'] || '').split(',').pop().trim()),
  }))

  // ───── שאלות ─────
  app.post('/questions', async (request, reply) => {
    const { question, error } = validateQuestion(request.body)
    if (error) return reply.code(400).send({ error })
    const id = typeof request.body.id === 'string' && request.body.id ? request.body.id : `q-${randomUUID()}`
    const exists = await pool.query('SELECT 1 FROM questions WHERE id = $1', [id])
    if (exists.rowCount > 0) return reply.code(409).send({ error: 'מזהה השאלה כבר קיים' })
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO questions (id, grade, subject, level, activity_type, position, data, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, ...toColumns(question), question, request.user.id],
      )
      await audit(client, request.user.id, 'create', 'question', id, null, question)
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
    return { success: true, question: { ...question, id } }
  })

  app.put('/questions/:id', async (request, reply) => {
    const { id } = request.params
    const { question, error } = validateQuestion(request.body)
    if (error) return reply.code(400).send({ error })
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const current = await client.query('SELECT data FROM questions WHERE id = $1 AND NOT deleted FOR UPDATE', [id])
      if (current.rowCount === 0) {
        await client.query('ROLLBACK')
        return reply.code(404).send({ error: 'השאלה לא נמצאה' })
      }
      await client.query(
        `UPDATE questions SET grade = $2, subject = $3, level = $4, activity_type = $5, position = $6,
           data = $7, updated_at = now(), updated_by = $8 WHERE id = $1`,
        [id, ...toColumns(question), question, request.user.id],
      )
      await audit(client, request.user.id, 'update', 'question', id, current.rows[0].data, question)
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
    return { success: true, question: { ...question, id } }
  })

  // מחיקה "רכה": השאלה נשמרת (לשחזור) אבל לא מוצגת. תומך במחיקת כמה שאלות ביחד
  app.post('/questions/delete', async (request, reply) => {
    const ids = Array.isArray(request.body?.ids) ? request.body.ids.filter(id => typeof id === 'string') : []
    if (ids.length === 0) return reply.code(400).send({ error: 'לא נבחרו שאלות' })
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        'UPDATE questions SET deleted = true, updated_at = now(), updated_by = $2 WHERE id = ANY($1) AND NOT deleted RETURNING id, data',
        [ids, request.user.id],
      )
      for (const row of rows) await audit(client, request.user.id, 'delete', 'question', row.id, row.data, null)
      await client.query('COMMIT')
      return { success: true, deleted: rows.length }
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  })

  app.post('/questions/:id/restore', async (request, reply) => {
    const { rows } = await pool.query(
      'UPDATE questions SET deleted = false, updated_at = now(), updated_by = $2 WHERE id = $1 AND deleted RETURNING id, data',
      [request.params.id, request.user.id],
    )
    if (rows.length === 0) return reply.code(404).send({ error: 'השאלה לא נמצאה' })
    await audit(pool, request.user.id, 'restore', 'question', rows[0].id, null, rows[0].data)
    return { success: true, question: rowToQuestion(rows[0]) }
  })

  // ───── משתמשים ותוצאות ─────
  app.get('/users', async () => {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name, u.city, u.phone, u.birth_date,
              u.subscription_status, u.subscription_date, u.subscription_until, u.disabled, u.created_at, u.last_login_at,
              COUNT(r.id)::int AS results_count
       FROM users u LEFT JOIN results r ON r.user_id = u.id
       GROUP BY u.id ORDER BY u.created_at DESC`,
    )
    return { users: rows.map(row => ({ ...row, subscription: getSubscription(row) })) }
  })

  app.get('/results', async () => {
    const { rows } = await pool.query('SELECT id, user_id, data, created_at FROM results ORDER BY created_at DESC LIMIT 5000')
    return { results: rows.map(row => ({ ...row.data, id: row.id, userId: row.user_id, date: row.data.date || row.created_at })) }
  })

  // חסימה/שחרור של משתמש, ועדכון מנוי ידני (נקודת החיבור לתשלום)
  app.patch('/users/:id', async (request, reply) => {
    const body = request.body || {}
    const updates = []
    const values = [request.params.id]
    if (typeof body.disabled === 'boolean') { values.push(body.disabled); updates.push(`disabled = $${values.length}`) }
    if (['trial', 'active', 'expired'].includes(body.subscriptionStatus)) { values.push(body.subscriptionStatus); updates.push(`subscription_status = $${values.length}`) }
    if (body.subscriptionUntil !== undefined) {
      const until = body.subscriptionUntil === null ? null : new Date(body.subscriptionUntil)
      if (until !== null && Number.isNaN(until.getTime())) return reply.code(400).send({ error: 'תאריך לא תקין' })
      values.push(until); updates.push(`subscription_until = $${values.length}`)
    }
    // איפוס סיסמה ע"י מנהל (בהיעדר שירות מייל לשחזור עצמי). הסיסמה החדשה נמסרת למשתמש בערוץ אחר
    let passwordReset = false
    if (body.newPassword !== undefined) {
      if (typeof body.newPassword !== 'string' || body.newPassword.length < 6 || body.newPassword.length > 200) return reply.code(400).send({ error: 'הסיסמה צריכה להכיל לפחות 6 תווים' })
      values.push(await hashPassword(body.newPassword)); updates.push(`password_hash = $${values.length}`)
      passwordReset = true
    }
    if (updates.length === 0) return reply.code(400).send({ error: 'אין מה לעדכן' })
    if (request.params.id === request.user.id && body.disabled === true) return reply.code(400).send({ error: 'אי אפשר לחסום את עצמך' })
    const { rows } = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING id, username, disabled, subscription_status, subscription_until`, values)
    if (rows.length === 0) return reply.code(404).send({ error: 'המשתמש לא נמצא' })
    // איפוס סיסמה או חסימה מנתקים את המשתמש מכל המכשירים
    if (passwordReset || body.disabled === true) await pool.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id])
    // הסיסמה עצמה לא נרשמת ביומן
    const { newPassword: _hidden, ...loggedBody } = body
    await audit(pool, request.user.id, passwordReset ? 'reset_password' : 'update', 'user', rows[0].id, null, loggedBody)
    return { success: true, user: rows[0] }
  })

  // ייצוא כל נתוני תלמיד (זכות עיון), ומחיקתו המלאה (זכות מחיקה). מנהלים לא נמחקים מכאן
  app.get('/users/:id/export', async (request, reply) => {
    const data = await exportUserData(pool, request.params.id)
    if (!data) return reply.code(404).send({ error: 'המשתמש לא נמצא' })
    await audit(pool, request.user.id, 'export', 'user', request.params.id, null, null)
    return data
  })

  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params
    if (id === request.user.id) return reply.code(400).send({ error: 'אי אפשר למחוק את עצמך' })
    const target = await pool.query('SELECT role, username FROM users WHERE id = $1', [id])
    if (target.rowCount === 0) return reply.code(404).send({ error: 'המשתמש לא נמצא' })
    if (target.rows[0].role === 'admin') return reply.code(400).send({ error: 'חשבון מנהל לא נמחק מכאן' })
    await deleteUserAccount(pool, id)
    // ביומן נשמרים רק המזהה ושם המשתמש, בלי פרטי קשר
    await audit(pool, request.user.id, 'delete', 'user', id, { username: target.rows[0].username }, null)
    return { success: true }
  })

  // שאלות שנמחקו (למסך השחזור)
  app.get('/questions/deleted', async () => {
    const { rows } = await pool.query(
      'SELECT id, data, updated_at FROM questions WHERE deleted ORDER BY updated_at DESC LIMIT 500',
    )
    return { questions: rows.map(row => ({ ...rowToQuestion(row), deletedAt: row.updated_at })) }
  })

  app.get('/audit', async request => {
    const { entity, id } = request.query || {}
    const { rows } = await pool.query(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.before, a.after, a.at, u.username AS actor
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
       WHERE ($1::text IS NULL OR a.entity = $1) AND ($2::text IS NULL OR a.entity_id = $2)
       ORDER BY a.at DESC LIMIT 200`,
      [entity || null, id || null],
    )
    return { entries: rows }
  })
}

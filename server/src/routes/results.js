import { requireUser } from '../guards.js'

const int = value => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : null)
const MAX_RESULT_BYTES = 20 * 1024
const MAX_RESULTS_PER_USER = 20000
const text = value => (typeof value === 'string' ? value.slice(0, 200) : null)

export default async function resultRoutes(app) {
  const { pool } = app

  app.post('/results', { preHandler: requireUser }, async (request, reply) => {
    const body = request.body
    if (!body || typeof body !== 'object') return reply.code(400).send({ error: 'בקשה לא תקינה' })
    if (Buffer.byteLength(JSON.stringify(body)) > MAX_RESULT_BYTES) return reply.code(413).send({ error: 'התוצאה גדולה מדי' })
    const score = int(body.score)
    const total = int(body.total)
    const percent = int(body.percent)
    if ([score, total, percent].some(value => value !== null && (value < 0 || value > 100000)) || (percent !== null && percent > 100)) {
      return reply.code(400).send({ error: 'נתוני התוצאה אינם תקינים' })
    }
    const count = await pool.query('SELECT count(*)::int AS n FROM results WHERE user_id = $1', [request.user.id])
    if (count.rows[0].n >= MAX_RESULTS_PER_USER) return reply.code(429).send({ error: 'נשמרו יותר מדי תוצאות' })
    // userId נלקח תמיד מההתחברות ולא מהבקשה
    const { rows } = await pool.query(
      `INSERT INTO results (user_id, subject, grade, level, activity_type, score, total, percent, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now())) RETURNING id`,
      [
        request.user.id, text(body.subject), text(body.age ?? body.grade), text(body.level),
        text(body.activityType), score, total, percent,
        { ...body, userId: request.user.id }, body.date ?? null,
      ],
    )
    return { success: true, id: rows[0].id }
  })

  app.get('/results/me', { preHandler: requireUser }, async request => {
    const { rows } = await pool.query(
      'SELECT id, data, created_at FROM results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500',
      [request.user.id],
    )
    return { results: rows.map(row => ({ ...row.data, id: row.id, date: row.data.date || row.created_at })) }
  })
}

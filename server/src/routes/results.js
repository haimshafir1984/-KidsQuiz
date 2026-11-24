import { requireUser } from '../guards.js'

const int = value => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : null)

export default async function resultRoutes(app) {
  const { pool } = app

  app.post('/results', { preHandler: requireUser }, async (request, reply) => {
    const body = request.body
    if (!body || typeof body !== 'object') return reply.code(400).send({ error: 'בקשה לא תקינה' })
    // userId נלקח תמיד מההתחברות ולא מהבקשה
    const { rows } = await pool.query(
      `INSERT INTO results (user_id, subject, grade, level, activity_type, score, total, percent, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now())) RETURNING id`,
      [
        request.user.id, body.subject ?? null, body.age ?? body.grade ?? null, body.level ?? null,
        body.activityType ?? null, int(body.score), int(body.total), int(body.percent),
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

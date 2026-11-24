import { requireUser } from '../guards.js'

// השאלות נשמרות כ-JSON בסכמה שבקוד; כאן ממזגים אותן חזרה עם ה-id
export const rowToQuestion = row => ({ ...row.data, id: row.id })

export default async function questionRoutes(app) {
  const { pool } = app

  // כל השאלות הפעילות. הרשאה: משתמש מחובר (תלמיד או מנהל)
  app.get('/questions', { preHandler: requireUser }, async () => {
    const { rows } = await pool.query(
      `SELECT id, data FROM questions WHERE NOT deleted
       ORDER BY grade, subject, level NULLS FIRST, activity_type, position NULLS LAST, id`,
    )
    return { questions: rows.map(rowToQuestion) }
  })

  // התקדמות שמורה בחידון
  app.get('/progress', { preHandler: requireUser }, async request => {
    const { rows } = await pool.query('SELECT key, data FROM progress WHERE user_id = $1', [request.user.id])
    return { progress: Object.fromEntries(rows.map(row => [row.key, row.data])) }
  })

  app.put('/progress/:key', { preHandler: requireUser }, async (request, reply) => {
    const { key } = request.params
    if (!key || key.length > 300 || typeof request.body !== 'object' || request.body === null) {
      return reply.code(400).send({ error: 'בקשה לא תקינה' })
    }
    if (Buffer.byteLength(JSON.stringify(request.body)) > 200 * 1024) return reply.code(413).send({ error: 'ההתקדמות גדולה מדי' })
    const known = await pool.query('SELECT 1 FROM progress WHERE user_id = $1 AND key = $2', [request.user.id, key])
    if (known.rowCount === 0) {
      const count = await pool.query('SELECT count(*)::int AS n FROM progress WHERE user_id = $1', [request.user.id])
      if (count.rows[0].n >= 500) return reply.code(429).send({ error: 'יותר מדי התקדמויות שמורות' })
    }
    await pool.query(
      `INSERT INTO progress (user_id, key, data) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [request.user.id, key, request.body],
    )
    return { success: true }
  })

  app.delete('/progress/:key', { preHandler: requireUser }, async request => {
    await pool.query('DELETE FROM progress WHERE user_id = $1 AND key = $2', [request.user.id, request.params.key])
    return { success: true }
  })
}

// נושאים שנוצרו בניהול. נושאים שמגיעים מהקוד או מהשאלות עצמן לא נשמרים כאן.
import { requireAdmin, requireUser } from '../guards.js'
import { withTransaction } from '../billing.js'

const ACTIVITIES = new Set(['practice', 'exam'])
const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const rowToTrack = row => ({ ...row.data, subject: row.subject })

// מאמתים ומנקים. מחזיר { grade, subject, data } או { error }
function validateTrack(body) {
  const grade = text(body?.grade, 50)
  const subject = text(body?.subject, 100)
  if (!grade || !subject) return { error: 'חסרים קטגוריה או שם נושא' }
  const rawLevels = Array.isArray(body.levels) ? body.levels : []
  if (rawLevels.length > 200) return { error: 'יותר מדי תתי-נושאים' }
  const levels = [...new Set(rawLevels.map(level => text(level, 100)).filter(Boolean))]
  const activities = [...new Set(Array.isArray(body.activities) ? body.activities.filter(item => ACTIVITIES.has(item)) : [])]
  return {
    grade,
    subject,
    data: {
      questionTypes: text(body.questionTypes, 100) || 'מותאם אישית',
      levels,
      activities: activities.length > 0 ? activities : ['practice'],
      ...(body.levelsKind === 'subtopic' ? { levelsKind: 'subtopic' } : {}),
      // נושא שמגיע מהקוד ונמחק בניהול: נשמר כמוסתר כדי שלא יחזור להופיע ריק
      ...(body.hidden === true ? { hidden: true } : {}),
    },
  }
}

export async function userTrackRoutes(app) {
  const { pool } = app

  // תלמיד לא רואה נושא ריק: רק נושאים שיש בהם לפחות שאלה פעילה אחת (כולל שאלה שמשויכת אליהם כמקום נוסף).
  // סימון "מוסתר" נשלח לכולם, כי הוא זה שמעלים נושא מובנה. מנהל רואה הכול
  app.get('/tracks', { preHandler: requireUser }, async request => {
    const { rows } = await pool.query(
      `SELECT t.grade, t.subject, t.data FROM tracks t
       WHERE $1::boolean OR t.data->>'hidden' = 'true' OR EXISTS (
         SELECT 1 FROM questions q WHERE NOT q.deleted AND (
           (q.grade = t.grade AND q.subject = t.subject)
           OR q.data->'placements' @> jsonb_build_array(jsonb_build_object('grade', t.grade, 'subject', t.subject))
         )
       )
       ORDER BY t.grade, t.subject`,
      [request.user.role === 'admin'],
    )
    const tracks = {}
    for (const row of rows) (tracks[row.grade] ||= []).push(rowToTrack(row))
    return { tracks }
  })
}

export async function adminTrackRoutes(app) {
  const { pool } = app
  app.addHook('preHandler', requireAdmin)

  const audit = (db, actorId, action, id, before, after) => db.query(
    'INSERT INTO audit_log (actor_id, action, entity, entity_id, before, after) VALUES ($1, $2, \'track\', $3, $4, $5)',
    [actorId, action, id, before, after],
  )

  app.put('/tracks', async (request, reply) => {
    const { grade, subject, data, error } = validateTrack(request.body)
    if (error) return reply.code(400).send({ error })
    // createOnly: להעלאת נושאים ישנים מהדפדפן, בלי לדרוס הגדרה שכבר קיימת בשרת
    const createOnly = request.body.createOnly === true
    return withTransaction(pool, async client => {
      const current = await client.query('SELECT data FROM tracks WHERE grade = $1 AND subject = $2 FOR UPDATE', [grade, subject])
      if (createOnly && current.rowCount > 0) return { success: true, skipped: true }
      await client.query(
        `INSERT INTO tracks (grade, subject, data, updated_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (grade, subject) DO UPDATE SET data = EXCLUDED.data, updated_at = now(), updated_by = EXCLUDED.updated_by`,
        [grade, subject, data, request.user.id],
      )
      await audit(client, request.user.id, current.rowCount > 0 ? 'update' : 'create', `${grade}::${subject}`, current.rows[0]?.data ?? null, data)
      return { success: true }
    })
  })

  app.post('/tracks/delete', async (request, reply) => {
    const grade = text(request.body?.grade, 50)
    const subject = text(request.body?.subject, 100)
    if (!grade || !subject) return reply.code(400).send({ error: 'חסרים קטגוריה או שם נושא' })
    const { rows } = await pool.query('DELETE FROM tracks WHERE grade = $1 AND subject = $2 RETURNING data', [grade, subject])
    if (rows.length > 0) await audit(pool, request.user.id, 'delete', `${grade}::${subject}`, rows[0].data, null)
    return { success: true, deleted: rows.length }
  })
}

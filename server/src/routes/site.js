// הגדרות האתר. הקריאה ציבורית, כי עמוד הפתיחה מציג את שאלות ההתנסות לפני התחברות;
// נשלחות בה רק השאלות שהמנהל בחר להתנסות. שינוי: מנהל בלבד
import { requireAdmin } from '../guards.js'
import { withTransaction } from '../billing.js'
import { rowToQuestion } from './questions.js'
import { normalizeSiteSettings, pickDemoQuestions } from '../../../src/utils/siteSettings.js'

const KEY = 'site'

async function readSettings(db) {
  const { rows } = await db.query('SELECT data FROM site_settings WHERE key = $1', [KEY])
  return normalizeSiteSettings(rows[0]?.data)
}

export async function publicSiteRoutes(app) {
  const { pool } = app

  app.get('/site', async () => {
    const settings = await readSettings(pool)
    const { rows } = await pool.query(
      'SELECT id, data FROM questions WHERE id = ANY($1) AND NOT deleted',
      [settings.demoQuestionIds],
    )
    return { settings, demoQuestions: pickDemoQuestions(rows.map(rowToQuestion), settings.demoQuestionIds) }
  })
}

export async function adminSiteRoutes(app) {
  const { pool } = app
  app.addHook('preHandler', requireAdmin)

  app.put('/site', async (request, reply) => {
    const body = request.body
    if (!body || !Array.isArray(body.hiddenGrades) || !Array.isArray(body.demoQuestionIds)) {
      return reply.code(400).send({ error: 'בקשה לא תקינה' })
    }
    const settings = normalizeSiteSettings(body)
    await withTransaction(pool, async client => {
      const before = await client.query('SELECT data FROM site_settings WHERE key = $1 FOR UPDATE', [KEY])
      await client.query(
        `INSERT INTO site_settings (key, data, updated_by) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now(), updated_by = EXCLUDED.updated_by`,
        [KEY, settings, request.user.id],
      )
      await client.query(
        'INSERT INTO audit_log (actor_id, action, entity, entity_id, before, after) VALUES ($1, $2, \'settings\', $3, $4, $5)',
        [request.user.id, 'update', KEY, before.rows[0]?.data ?? null, settings],
      )
    })
    return { success: true, settings }
  })
}

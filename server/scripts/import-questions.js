// מייבא את השאלות מקובצי הקוד (src/data) לבסיס הנתונים. בטוח להרצה חוזרת:
// שאלה שכבר קיימת ושונתה בניהול לא נדרסת (אלא אם מעבירים --overwrite), ושאלה שנמחקה בניהול נשארת מחוקה.
import seed from '../../src/data/seedQuestions.js'
import { pool } from '../src/db.js'
import { migrate } from '../src/migrate.js'

const overwrite = process.argv.includes('--overwrite')
await migrate(pool)

let inserted = 0
let updated = 0
const client = await pool.connect()
try {
  await client.query('BEGIN')
  for (const question of seed) {
    const { id, ...data } = question
    const columns = [id, data.grade, data.subject, data.level || null, data.activityType || 'practice', Number.isFinite(data.position) ? data.position : null, data]
    const result = await client.query(
      `INSERT INTO questions (id, grade, subject, level, activity_type, position, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO ${overwrite
         ? 'UPDATE SET grade = EXCLUDED.grade, subject = EXCLUDED.subject, level = EXCLUDED.level, activity_type = EXCLUDED.activity_type, position = EXCLUDED.position, data = EXCLUDED.data, updated_at = now()'
         : 'NOTHING'}
       RETURNING (xmax = 0) AS inserted`,
      columns,
    )
    if (result.rowCount > 0) {
      if (result.rows[0].inserted) inserted += 1
      else updated += 1
    }
  }
  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
}
console.log(`שאלות בקוד: ${seed.length}. נוספו: ${inserted}, עודכנו: ${updated}`)
await pool.end()

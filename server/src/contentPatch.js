// תיקוני תוכן חד-פעמיים לשאלות שכבר בבסיס הנתונים. רצים פעם אחת בעליית השרת (נרשמים ב-schema_migrations).
// מתוקנת רק שאלה שעדיין זהה לנוסח המקורי, כך שעריכות מהניהול לא נדרסות.
// כל שינוי נרשם ביומן, ושאלה שהוסרה נמחקת "מחיקה רכה" ואפשר לשחזר אותה במסך "שחזור ויומן".
import contentFixes from '../../src/data/contentFixes.js'
import { applyContentFixes, CONTENT_FIXES_VERSION } from '../../src/utils/contentFixes.js'

const withoutId = ({ id: _id, ...data }) => data

export async function applyContentPatch(pool, log = () => {}, fixes = contentFixes, version = CONTENT_FIXES_VERSION) {
  const name = `content:${version}`
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // נעילה, כדי ששני מופעים שעולים יחד לא יריצו את התיקון פעמיים
    await client.query('LOCK TABLE schema_migrations IN EXCLUSIVE MODE')
    const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])
    if (done.rowCount > 0) {
      await client.query('COMMIT')
      return null
    }
    const ids = [...fixes.updates, ...fixes.removals].map(item => item.id)
    const { rows } = await client.query('SELECT id, data FROM questions WHERE id = ANY($1) AND NOT deleted FOR UPDATE', [ids])
    const result = applyContentFixes(rows.map(row => ({ ...row.data, id: row.id })), fixes)
    const audit = (action, id, before, after) => client.query(
      'INSERT INTO audit_log (actor_id, action, entity, entity_id, before, after) VALUES (NULL, $1, \'question\', $2, $3, $4)',
      [action, id, before, after],
    )

    for (const { before, after } of result.updated) {
      await client.query('UPDATE questions SET data = $2, updated_at = now(), updated_by = NULL WHERE id = $1', [after.id, withoutId(after)])
      await audit('update', after.id, withoutId(before), withoutId(after))
    }
    for (const question of result.removed) {
      await client.query('UPDATE questions SET deleted = true, updated_at = now(), updated_by = NULL WHERE id = $1', [question.id])
      await audit('delete', question.id, withoutId(question), null)
    }
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
    await client.query('COMMIT')
    const summary = { updated: result.updated.length, removed: result.removed.length, expected: ids.length }
    log(`תיקוני תוכן ${version}: עודכנו ${summary.updated}, הוסרו ${summary.removed} (מתוך ${summary.expected}; השאר שונו בניהול או אינן קיימות)`)
    return summary
  } catch (error) {
    await client.query('ROLLBACK')
    throw new Error(`תיקוני התוכן נכשלו: ${error.message}`)
  } finally {
    client.release()
  }
}

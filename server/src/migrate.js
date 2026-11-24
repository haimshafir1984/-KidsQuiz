// מריץ קובצי SQL מהתיקייה migrations לפי סדר השם, ורושם מה כבר רץ (כל קובץ פעם אחת, בתוך טרנזקציה).

import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

export async function migrate(pool, log = () => {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`)
  const { rows } = await pool.query('SELECT name FROM schema_migrations')
  const done = new Set(rows.map(row => row.name))
  const files = (await readdir(MIGRATIONS_DIR)).filter(name => name.endsWith('.sql')).sort()
  const applied = []

  for (const file of files) {
    if (done.has(file)) continue
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      applied.push(file)
      log(`הוחל: ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`מיגרציה ${file} נכשלה: ${error.message}`)
    } finally {
      client.release()
    }
  }
  return applied
}

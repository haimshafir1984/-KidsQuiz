// יוצר (או מאפס סיסמה של) חשבון מנהל. מנהלים נוצרים רק כאן ולא דרך טופס ההרשמה.
//   npm run seed:admins -- --email you@example.com --first "שם" --last "משפחה" [--reset]
// הסיסמה נקראת מהמשתנה ADMIN_PASSWORD, ואם אין - נשאלת בטרמינל (בלי להציג אותה).
import readline from 'node:readline'
import { pool } from '../src/db.js'
import { migrate } from '../src/migrate.js'
import { hashPassword } from '../src/password.js'

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function askHidden(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = text => { if (text.includes(prompt)) rl.output.write(text); else rl.output.write('') }
    rl.question(prompt, answer => { rl.close(); process.stdout.write('\n'); resolve(answer) })
  })
}

const email = (arg('email') || '').trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('כתובת המייל חסרה או אינה תקינה (--email name@example.com)')
  process.exit(1)
}
const firstName = arg('first') || 'מנהל'
const lastName = arg('last') || ''
const reset = process.argv.includes('--reset')

const password = process.env.ADMIN_PASSWORD || await askHidden('סיסמה למנהל (לפחות 10 תווים): ')
if (password.length < 10) {
  console.error('הסיסמה קצרה מדי (לפחות 10 תווים)')
  process.exit(1)
}

await migrate(pool)
const passwordHash = await hashPassword(password)
const existing = await pool.query('SELECT id, role FROM users WHERE lower(email) = $1', [email])

if (existing.rowCount > 0) {
  if (!reset) {
    console.error('המשתמש כבר קיים. כדי לאפס סיסמה ולהפוך למנהל הוסיפו --reset')
    process.exit(1)
  }
  await pool.query(`UPDATE users SET password_hash = $2, role = 'admin', disabled = false WHERE id = $1`, [existing.rows[0].id, passwordHash])
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [existing.rows[0].id])
  console.log(`המשתמש ${email} עודכן כמנהל, והסיסמה אופסה`)
} else {
  const username = arg('username') || `${firstName} ${lastName}`.trim()
  await pool.query(
    `INSERT INTO users (username, email, password_hash, role, first_name, last_name, subscription_status)
     VALUES ($1, $2, $3, 'admin', $4, $5, 'active')`,
    [username, email, passwordHash, firstName, lastName],
  )
  console.log(`נוצר מנהל: ${email}`)
}
await pool.end()

// בדיקות API מול PostgreSQL אמיתי. מריצים: npm test (נדרש בסיס נתונים kidsquiz_test מקומי).
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createPool } from '../src/db.js'
import { migrate } from '../src/migrate.js'
import { buildApp } from '../src/app.js'
import { hashPassword, verifyPassword } from '../src/password.js'

const TEST_DB = process.env.TEST_DATABASE_URL || 'postgres://postgres@localhost:5432/kidsquiz_test'
const ORIGIN = { origin: 'http://localhost:5180', host: 'localhost:5180' }

let pool
let app

// עוזר: שולח בקשה עם עוגיית התחברות (אם יש)
function client() {
  let cookie = ''
  return {
    async call(method, url, payload, headers = {}) {
      const response = await app.inject({
        method, url, payload,
        headers: { ...ORIGIN, ...(cookie ? { cookie } : {}), ...headers },
      })
      const set = response.headers['set-cookie']
      if (set) {
        const first = String(Array.isArray(set) ? set[0] : set).split(';')[0]
        cookie = first.endsWith('=') ? '' : first
      }
      let body = null
      try { body = response.json() } catch { /* ללא גוף */ }
      return { status: response.statusCode, body, headers: response.headers }
    },
  }
}

const student = overrides => ({
  firstName: 'דנה', lastName: 'כהן', city: 'ירושלים', email: 'dana@example.com', password: 'secret123', ...overrides,
})

before(async () => {
  pool = createPool(TEST_DB)
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public')
  await migrate(pool)
  // מנהל לבדיקות (נוצר ישירות, כמו בסקריפט seed-admins)
  await pool.query(
    `INSERT INTO users (username, email, password_hash, role, first_name, subscription_status)
     VALUES ('מנהל', 'admin@example.com', $1, 'admin', 'מנהל', 'active')`,
    [await hashPassword('admin-pass-123')],
  )
  app = await buildApp({ pool, rateLimitMax: 1000, authRateLimitMax: 1000 })
})

after(async () => {
  await app.close()
  await pool.end()
})

describe('סיסמאות', () => {
  test('hash נכון ושגוי', async () => {
    const hash = await hashPassword('abc12345')
    assert.equal(await verifyPassword('abc12345', hash), true)
    assert.equal(await verifyPassword('abc12346', hash), false)
    assert.equal(await verifyPassword('abc12345', 'garbage'), false)
  })
})

describe('הרשמה והתחברות', () => {
  test('הרשמה, me ויציאה', async () => {
    const c = client()
    const register = await c.call('POST', '/api/auth/register', student())
    assert.equal(register.status, 200)
    assert.equal(register.body.user.role, 'student')
    assert.equal(register.body.user.username, 'דנה כהן')
    assert.equal(register.body.user.password, undefined)
    assert.match(register.headers['set-cookie'], /HttpOnly/i)

    const me = await c.call('GET', '/api/auth/me')
    assert.equal(me.body.user.email, 'dana@example.com')

    await c.call('POST', '/api/auth/logout', {})
    const after = await c.call('GET', '/api/auth/me')
    assert.equal(after.body.user, null)
  })

  test('הסיסמה לא נשמרת כטקסט', async () => {
    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE email = 'dana@example.com'`)
    assert.ok(rows[0].password_hash.startsWith('scrypt$'))
    assert.ok(!rows[0].password_hash.includes('secret123'))
  })

  test('מייל כפול נדחה, ושם זהה מקבל מספר סידורי', async () => {
    const c = client()
    const dup = await c.call('POST', '/api/auth/register', student({ firstName: 'אחרת' }))
    assert.equal(dup.status, 409)
    const sameName = await c.call('POST', '/api/auth/register', student({ email: 'dana2@example.com' }))
    assert.equal(sameName.status, 200)
    assert.equal(sameName.body.user.username, 'דנה כהן 2')
  })

  test('ולידציה: סיסמה קצרה, מייל לא תקין, שדות חסרים', async () => {
    const c = client()
    assert.equal((await c.call('POST', '/api/auth/register', student({ email: 'x1@example.com', password: '123' }))).status, 400)
    assert.equal((await c.call('POST', '/api/auth/register', student({ email: 'not-an-email' }))).status, 400)
    assert.equal((await c.call('POST', '/api/auth/register', student({ email: 'x2@example.com', city: '' }))).status, 400)
  })

  test('התחברות בשם משתמש או במייל, וסיסמה שגויה', async () => {
    const byName = await client().call('POST', '/api/auth/login', { identifier: 'דנה כהן', password: 'secret123' })
    assert.equal(byName.status, 200)
    const byEmail = await client().call('POST', '/api/auth/login', { identifier: 'DANA@example.com', password: 'secret123' })
    assert.equal(byEmail.status, 200)
    const bad = await client().call('POST', '/api/auth/login', { identifier: 'dana@example.com', password: 'wrong' })
    assert.equal(bad.status, 401)
    const missing = await client().call('POST', '/api/auth/login', { identifier: 'nobody@example.com', password: 'wrong' })
    assert.equal(missing.status, 401)
    assert.deepEqual(bad.body, missing.body)
  })

  test('משתמש חסום ומנוי שפג לא מתחברים', async () => {
    const c = client()
    await c.call('POST', '/api/auth/register', student({ email: 'blocked@example.com', firstName: 'חסום' }))
    await pool.query(`UPDATE users SET disabled = true WHERE email = 'blocked@example.com'`)
    assert.equal((await client().call('POST', '/api/auth/login', { identifier: 'blocked@example.com', password: 'secret123' })).status, 401)

    await c.call('POST', '/api/auth/register', student({ email: 'old@example.com', firstName: 'ישן' }))
    await pool.query(`UPDATE users SET subscription_date = now() - interval '400 days' WHERE email = 'old@example.com'`)
    const expired = await client().call('POST', '/api/auth/login', { identifier: 'old@example.com', password: 'secret123' })
    assert.equal(expired.status, 403)
    assert.equal(expired.body.expired, true)
  })

  test('עדכון פרופיל', async () => {
    const c = client()
    await c.call('POST', '/api/auth/login', { identifier: 'dana@example.com', password: 'secret123' })
    const update = await c.call('PATCH', '/api/auth/me', { firstName: 'דנה', lastName: 'לוי', city: 'חיפה', phone: '050' })
    assert.equal(update.body.user.lastName, 'לוי')
    const invalid = await c.call('PATCH', '/api/auth/me', { firstName: '', lastName: 'x', city: 'y' })
    assert.equal(invalid.status, 400)
  })
})

describe('הגנות', () => {
  test('בקשה שמשנה נתונים בלי Origin, או ממקור זר, נחסמת', async () => {
    const noOrigin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { identifier: 'a', password: 'b' } })
    assert.equal(noOrigin.statusCode, 403)
    const foreign = await app.inject({
      method: 'POST', url: '/api/auth/login', payload: { identifier: 'a', password: 'b' },
      headers: { origin: 'https://evil.example', host: 'localhost:5180' },
    })
    assert.equal(foreign.statusCode, 403)
  })

  test('נתיבים מוגנים דורשים התחברות', async () => {
    const c = client()
    assert.equal((await c.call('GET', '/api/questions')).status, 401)
    assert.equal((await c.call('POST', '/api/results', {})).status, 401)
    assert.equal((await c.call('GET', '/api/admin/users')).status, 401)
  })

  test('תלמיד לא ניגש לניהול', async () => {
    const c = client()
    await c.call('POST', '/api/auth/login', { identifier: 'dana@example.com', password: 'secret123' })
    assert.equal((await c.call('GET', '/api/admin/users')).status, 403)
    assert.equal((await c.call('POST', '/api/admin/questions', {})).status, 403)
    assert.equal((await c.call('PATCH', '/api/admin/users/00000000-0000-0000-0000-000000000000', { disabled: true })).status, 403)
  })

  test('אי אפשר להפוך למנהל דרך ההרשמה', async () => {
    const c = client()
    const res = await c.call('POST', '/api/auth/register', { ...student({ email: 'sneaky@example.com', firstName: 'ערמומי' }), role: 'admin' })
    assert.equal(res.body.user.role, 'student')
    assert.equal((await c.call('GET', '/api/admin/users')).status, 403)
  })
})

describe('שאלות וניהול', () => {
  const sample = {
    grade: 'grade-8', subject: 'בדיקה', level: 'תת-נושא א', activityType: 'practice', type: 'multiple',
    text: 'כמה זה 1+1?', options: ['1', '2', '3'], correct_answer: ['2'],
  }
  let admin
  let studentClient
  let questionId

  before(async () => {
    admin = client()
    assert.equal((await admin.call('POST', '/api/auth/login', { identifier: 'admin@example.com', password: 'admin-pass-123' })).status, 200)
    studentClient = client()
    await studentClient.call('POST', '/api/auth/login', { identifier: 'dana@example.com', password: 'secret123' })
  })

  test('מנהל יוצר שאלה, ותלמיד רואה אותה', async () => {
    const created = await admin.call('POST', '/api/admin/questions', sample)
    assert.equal(created.status, 200)
    questionId = created.body.question.id
    const list = await studentClient.call('GET', '/api/questions')
    const found = list.body.questions.find(q => q.id === questionId)
    assert.equal(found.text, 'כמה זה 1+1?')
  })

  test('ולידציה של שאלה', async () => {
    assert.equal((await admin.call('POST', '/api/admin/questions', { ...sample, text: ' ' })).status, 400)
    assert.equal((await admin.call('POST', '/api/admin/questions', { ...sample, type: 'weird' })).status, 400)
    assert.equal((await admin.call('POST', '/api/admin/questions', { ...sample, correct_answer: [] })).status, 400)
  })

  test('עדכון שאלה נשמר ונרשם ביומן', async () => {
    const updated = await admin.call('PUT', `/api/admin/questions/${questionId}`, { ...sample, text: 'כמה זה 2+2?', correct_answer: ['4'], options: ['3', '4'] })
    assert.equal(updated.status, 200)
    const list = await studentClient.call('GET', '/api/questions')
    assert.equal(list.body.questions.find(q => q.id === questionId).text, 'כמה זה 2+2?')
    const log = await admin.call('GET', `/api/admin/audit?entity=question&id=${questionId}`)
    assert.deepEqual(log.body.entries.map(e => e.action).sort(), ['create', 'update'])
    assert.equal(log.body.entries.find(e => e.action === 'update').before.text, 'כמה זה 1+1?')
  })

  test('מחיקה רכה, והחזרה', async () => {
    const del = await admin.call('POST', '/api/admin/questions/delete', { ids: [questionId] })
    assert.equal(del.body.deleted, 1)
    assert.equal((await studentClient.call('GET', '/api/questions')).body.questions.some(q => q.id === questionId), false)
    assert.equal((await admin.call('PUT', `/api/admin/questions/${questionId}`, sample)).status, 404)
    assert.equal((await admin.call('POST', `/api/admin/questions/${questionId}/restore`, {})).status, 200)
    assert.equal((await studentClient.call('GET', '/api/questions')).body.questions.some(q => q.id === questionId), true)
  })

  test('תוצאות והתקדמות נשמרות למשתמש המחובר בלבד', async () => {
    const saved = await studentClient.call('POST', '/api/results', { subject: 'בדיקה', age: 'grade-8', score: 3, total: 5, percent: 60, userId: 'someone-else' })
    assert.equal(saved.status, 200)
    const mine = await studentClient.call('GET', '/api/results/me')
    assert.equal(mine.body.results.length, 1)
    const other = client()
    await other.call('POST', '/api/auth/login', { identifier: 'admin@example.com', password: 'admin-pass-123' })
    assert.equal((await other.call('GET', '/api/results/me')).body.results.length, 0)
    const all = await other.call('GET', '/api/admin/results')
    assert.equal(all.body.results.length, 1)
    assert.notEqual(all.body.results[0].userId, 'someone-else')

    await studentClient.call('PUT', '/api/progress/key-1', { currentIdx: 2 })
    assert.deepEqual((await studentClient.call('GET', '/api/progress')).body.progress['key-1'], { currentIdx: 2 })
    await studentClient.call('DELETE', '/api/progress/key-1')
    assert.deepEqual((await studentClient.call('GET', '/api/progress')).body.progress, {})
  })

  test('מנהל חוסם משתמש ומעדכן מנוי, ולא חוסם את עצמו', async () => {
    const users = (await admin.call('GET', '/api/admin/users')).body.users
    const dana = users.find(u => u.email === 'dana@example.com')
    const adminUser = users.find(u => u.role === 'admin')
    assert.ok(dana.results_count >= 1)
    assert.equal((await admin.call('PATCH', `/api/admin/users/${adminUser.id}`, { disabled: true })).status, 400)
    const sub = await admin.call('PATCH', `/api/admin/users/${dana.id}`, { subscriptionStatus: 'active', subscriptionUntil: '2030-01-01' })
    assert.equal(sub.body.user.subscription_status, 'active')
    const block = await admin.call('PATCH', `/api/admin/users/${dana.id}`, { disabled: true })
    assert.equal(block.body.user.disabled, true)
    // אחרי החסימה ההתחברות הפעילה של התלמיד כבר לא תקפה
    assert.equal((await studentClient.call('GET', '/api/auth/me')).body.user, null)
  })

  test('מנהל מאפס סיסמה: הישנה לא עובדת, ההתחברות הפעילה מתבטלת, והסיסמה לא ביומן', async () => {
    const forgetful = client()
    await forgetful.call('POST', '/api/auth/register', student({ email: 'forgetful@example.com', firstName: 'שכחן' }))
    const users = (await admin.call('GET', '/api/admin/users')).body.users
    const target = users.find(u => u.email === 'forgetful@example.com')
    assert.ok(target.subscription.valid)

    assert.equal((await admin.call('PATCH', `/api/admin/users/${target.id}`, { newPassword: '123' })).status, 400)
    assert.equal((await studentClient.call('PATCH', `/api/admin/users/${target.id}`, { newPassword: 'whatever123' })).status, 401)
    assert.equal((await admin.call('PATCH', `/api/admin/users/${target.id}`, { newPassword: 'fresh-pass-1' })).status, 200)

    assert.equal((await forgetful.call('GET', '/api/auth/me')).body.user, null)
    const retry = client()
    assert.equal((await retry.call('POST', '/api/auth/login', { identifier: 'forgetful@example.com', password: 'secret123' })).status, 401)
    assert.equal((await retry.call('POST', '/api/auth/login', { identifier: 'forgetful@example.com', password: 'fresh-pass-1' })).status, 200)

    const log = await admin.call('GET', `/api/admin/audit?entity=user&id=${target.id}`)
    assert.ok(log.body.entries.some(entry => entry.action === 'reset_password'))
    assert.ok(!JSON.stringify(log.body.entries).includes('fresh-pass-1'))
  })
})

describe('הגבלת ניסיונות', () => {
  test('אחרי כמה ניסיונות כניסה שגויים מתקבלת חסימה זמנית', async () => {
    const limited = await buildApp({ pool, authRateLimitMax: 3 })
    const codes = []
    for (let i = 0; i < 5; i += 1) {
      const res = await limited.inject({
        method: 'POST', url: '/api/auth/login', payload: { identifier: 'x@example.com', password: 'bad' }, headers: ORIGIN,
      })
      codes.push(res.statusCode)
    }
    await limited.close()
    assert.deepEqual(codes, [401, 401, 401, 429, 429])
  })
})

describe('בריאות', () => {
  test('health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    assert.equal(res.statusCode, 200)
  })
})

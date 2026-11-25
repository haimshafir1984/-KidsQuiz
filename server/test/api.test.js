// בדיקות API מול PostgreSQL אמיתי. מריצים: npm test (נדרש בסיס נתונים kidsquiz_test מקומי).
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createPool } from '../src/db.js'
import { migrate } from '../src/migrate.js'
import { buildApp } from '../src/app.js'
import { hashPassword, verifyPassword } from '../src/password.js'
import { clientIp, isCloudflareAddress } from '../src/limiter.js'
import { config } from '../src/config.js'
import { verifyTurnstileToken } from '../src/turnstile.js'
import ExcelJS from 'exceljs'

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
  firstName: 'דנה', lastName: 'כהן', city: 'ירושלים', email: 'dana@example.com', password: 'secret123', acceptTerms: true, ...overrides,
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
    assert.equal((await client().call('POST', '/api/auth/login', { identifier: 'blocked@example.com', password: 'secret123' })).status, 403)

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


describe('אבטחה והגנות נוספות', () => {
  test('הרשמה דורשת אישור תנאים', async () => {
    const c = client()
    const res = await c.call('POST', '/api/auth/register', student({ email: 'noterms@example.com', acceptTerms: false }))
    assert.equal(res.status, 400)
    const row = await pool.query("SELECT terms_accepted_at, terms_version FROM users WHERE email = 'dana@example.com'")
    assert.ok(row.rows[0].terms_accepted_at)
    assert.ok(row.rows[0].terms_version)
  })

  test('שם משתמש שנשלח מהלקוח מתעלמים ממנו (אי אפשר לתפוס מייל של אחר)', async () => {
    const c = client()
    const res = await c.call('POST', '/api/auth/register', student({ email: 'squatter@example.com', firstName: 'תוקף', lastName: 'בדיקה', username: 'victim@example.com' }))
    assert.equal(res.status, 200)
    assert.equal(res.body.user.username, 'תוקף בדיקה')
    // מי שנרשם אחר כך עם המייל שניסו לתפוס, עדיין נכנס רגיל עם המייל
    const victim = client()
    await victim.call('POST', '/api/auth/register', student({ email: 'victim@example.com', firstName: 'קורבן', lastName: 'בדיקה' }))
    const login = await client().call('POST', '/api/auth/login', { identifier: 'victim@example.com', password: 'secret123' })
    assert.equal(login.status, 200)
    assert.equal(login.body.user.firstName, 'קורבן')
  })

  test('אימות Turnstile: הרשמה נדחית כשהאימות נכשל', async () => {
    const strictApp = await buildApp({ pool, rateLimitMax: 1000, authRateLimitMax: 1000, verifyTurnstile: async token => token === 'good' })
    const call = payload => strictApp.inject({ method: 'POST', url: '/api/auth/register', payload, headers: ORIGIN })
    assert.equal((await call(student({ email: 'bot@example.com' }))).statusCode, 400)
    assert.equal((await call(student({ email: 'bot@example.com', turnstileToken: 'bad' }))).statusCode, 400)
    assert.equal((await call(student({ email: 'human@example.com', firstName: 'אנושי', turnstileToken: 'good' }))).statusCode, 200)
    await strictApp.close()
  })

  test('נעילה אחרי ניסיונות כושלים: לכל כתובת+חשבון, בלי לחסום חשבון אחר מאותה כתובת', async () => {
    const limited = await buildApp({ pool, rateLimitMax: 1000, authRateLimitMax: 1000, loginMaxPerIpAccount: 3, loginMaxPerAccount: 50 })
    const attempt = (identifier, password, ip = '1.2.3.4') => limited.inject({
      method: 'POST', url: '/api/auth/login', payload: { identifier, password }, headers: { ...ORIGIN, 'cf-connecting-ip': ip },
    })
    for (let i = 0; i < 3; i += 1) assert.equal((await attempt('squatter@example.com', 'wrong')).statusCode, 401)
    // גם הסיסמה הנכונה נחסמת בזמן הנעילה
    assert.equal((await attempt('squatter@example.com', 'secret123')).statusCode, 429)
    // חשבון אחר מאותה כתובת (כיתה משותפת) לא נפגע
    assert.equal((await attempt('victim@example.com', 'secret123')).statusCode, 200)
    // אותו חשבון מכתובת אחרת לא ננעל (מניעת נעילה זדונית של תלמיד)
    assert.equal((await attempt('squatter@example.com', 'secret123', '9.9.9.9')).statusCode, 200)
    await limited.close()
  })

  test('נעילה לפי חשבון מכל הכתובות יחד', async () => {
    const limited = await buildApp({ pool, rateLimitMax: 1000, authRateLimitMax: 1000, loginMaxPerIpAccount: 100, loginMaxPerAccount: 4 })
    const attempt = (ip, password) => limited.inject({
      method: 'POST', url: '/api/auth/login', payload: { identifier: 'human@example.com', password }, headers: { ...ORIGIN, 'cf-connecting-ip': ip },
    })
    for (let i = 0; i < 4; i += 1) assert.equal((await attempt(`10.0.0.${i}`, 'wrong')).statusCode, 401)
    assert.equal((await attempt('10.0.0.99', 'secret123')).statusCode, 429)
    await limited.close()
  })

  test('כותרת X-Forwarded-For מזויפת לא עוקפת הגבלה (מפתח לפי CF-Connecting-IP)', async () => {
    const limited = await buildApp({ pool, authRateLimitMax: 3 })
    const codes = []
    for (let i = 0; i < 5; i += 1) {
      const res = await limited.inject({
        method: 'POST', url: '/api/auth/login', payload: { identifier: 'x@example.com', password: 'bad' },
        headers: { ...ORIGIN, 'cf-connecting-ip': '7.7.7.7', 'x-forwarded-for': `1.1.1.${i}` },
      })
      codes.push(res.statusCode)
    }
    await limited.close()
    assert.deepEqual(codes, [401, 401, 401, 429, 429])
  })

  test('תשובות ה-API לא נשמרות במטמון', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    assert.equal(res.headers['cache-control'], 'no-store')
  })

  test('מנוי שפג תוקפו מנתק גם התחברות קיימת', async () => {
    const c = client()
    await c.call('POST', '/api/auth/register', student({ email: 'expiring@example.com', firstName: 'פוקע' }))
    assert.ok((await c.call('GET', '/api/auth/me')).body.user)
    await pool.query("UPDATE users SET subscription_status = 'expired' WHERE email = 'expiring@example.com'")
    assert.equal((await c.call('GET', '/api/auth/me')).body.user, null)
    assert.equal((await c.call('GET', '/api/questions')).status, 401)
    await pool.query("UPDATE users SET subscription_status = 'active', subscription_until = NULL WHERE email = 'expiring@example.com'")
    assert.ok((await c.call('GET', '/api/auth/me')).body.user)
  })

  test('סיסמה ארוכה מדי נדחית', async () => {
    const res = await client().call('POST', '/api/auth/register', student({ email: 'long@example.com', password: 'x'.repeat(201) }))
    assert.equal(res.status, 400)
  })

  test('תוצאה לא תקינה או גדולה נדחית', async () => {
    const c = client()
    await c.call('POST', '/api/auth/login', { identifier: 'human@example.com', password: 'secret123' })
    assert.equal((await c.call('POST', '/api/results', { subject: 'x', score: 5, total: 10, percent: 500 })).status, 400)
    assert.equal((await c.call('POST', '/api/results', { subject: 'x', score: -1, total: 10, percent: 10 })).status, 400)
    assert.equal((await c.call('POST', '/api/results', { subject: 'x', score: 5, total: 10, percent: 50, junk: 'a'.repeat(30000) })).status, 413)
    assert.equal((await c.call('POST', '/api/results', { subject: 'x', score: 5, total: 10, percent: 50 })).status, 200)
    assert.equal((await c.call('PUT', '/api/progress/big', { blob: 'a'.repeat(210000) })).status, 413)
  })

  test('מנהל מייצא ומוחק תלמיד, ולא מוחק מנהל או את עצמו', async () => {
    const admin = client()
    await admin.call('POST', '/api/auth/login', { identifier: 'admin@example.com', password: 'admin-pass-123' })
    const users = (await admin.call('GET', '/api/admin/users')).body.users
    const target = users.find(u => u.email === 'human@example.com')
    const adminUser = users.find(u => u.role === 'admin')

    const exported = await admin.call('GET', `/api/admin/users/${target.id}/export`)
    assert.equal(exported.status, 200)
    assert.equal(exported.body.profile.email, 'human@example.com')
    assert.ok(exported.body.results.length >= 1)
    assert.equal(exported.body.profile.password_hash, undefined)

    assert.equal((await admin.call('DELETE', `/api/admin/users/${adminUser.id}`)).status, 400)
    assert.equal((await admin.call('DELETE', `/api/admin/users/${target.id}`)).status, 200)
    assert.equal((await pool.query('SELECT 1 FROM users WHERE id = $1', [target.id])).rowCount, 0)
    assert.equal((await pool.query('SELECT 1 FROM results WHERE user_id = $1', [target.id])).rowCount, 0)
    const log = await admin.call('GET', `/api/admin/audit?entity=user&id=${target.id}`)
    assert.ok(log.body.entries.some(e => e.action === 'delete'))
    assert.ok(!JSON.stringify(log.body.entries).includes('human@example.com'))
    assert.equal((await client().call('GET', `/api/admin/users/${target.id}/export`)).status, 401)
  })

  test('תלמיד מייצא ומוחק את החשבון של עצמו, באישור סיסמה', async () => {
    const c = client()
    await c.call('POST', '/api/auth/register', student({ email: 'leaver@example.com', firstName: 'עוזב' }))
    const mine = await c.call('GET', '/api/auth/me/export')
    assert.equal(mine.body.profile.email, 'leaver@example.com')
    assert.equal((await c.call('DELETE', '/api/auth/me', { password: 'wrong-pass' })).status, 403)
    assert.equal((await c.call('DELETE', '/api/auth/me', { password: 'secret123' })).status, 200)
    assert.equal((await pool.query("SELECT 1 FROM users WHERE email = 'leaver@example.com'")).rowCount, 0)
    assert.equal((await c.call('GET', '/api/auth/me')).body.user, null)
  })

  test('מנהל לא נמחק דרך מחיקה עצמית', async () => {
    const admin = client()
    await admin.call('POST', '/api/auth/login', { identifier: 'admin@example.com', password: 'admin-pass-123' })
    assert.equal((await admin.call('DELETE', '/api/auth/me', { password: 'admin-pass-123' })).status, 403)
  })

  test('רשימת שאלות שנמחקו למסך השחזור', async () => {
    const admin = client()
    await admin.call('POST', '/api/auth/login', { identifier: 'admin@example.com', password: 'admin-pass-123' })
    const q = await admin.call('POST', '/api/admin/questions', { grade: 'grade-8', subject: 'שחזור', activityType: 'practice', type: 'open', text: 'שאלה למחיקה', correct_answer: ['כן'] })
    await admin.call('POST', '/api/admin/questions/delete', { ids: [q.body.question.id] })
    const deleted = await admin.call('GET', '/api/admin/questions/deleted')
    assert.ok(deleted.body.questions.some(item => item.id === q.body.question.id))
    assert.equal((await client().call('GET', '/api/admin/questions/deleted')).status, 401)
  })

  test('התחברות מנהל קצרה יותר מתלמיד', async () => {
    const admin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { identifier: 'admin@example.com', password: 'admin-pass-123' }, headers: ORIGIN })
    const stu = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { identifier: 'victim@example.com', password: 'secret123' }, headers: ORIGIN })
    const expiry = response => new Date(String(response.headers['set-cookie']).match(/Expires=([^;]+)/i)[1]).getTime()
    assert.ok(expiry(admin) < expiry(stu))
  })
})

describe('כתובת לקוח, שינוי סיסמה ואימות קלט', () => {
  const fakeRequest = (headers, cloudflareOnly, remoteAddress = '10.0.0.5') => ({
    headers, ip: remoteAddress, socket: { remoteAddress }, server: { cloudflareOnly },
  })

  test('זיהוי כתובות של Cloudflare', () => {
    assert.equal(isCloudflareAddress('172.67.10.1'), true)
    assert.equal(isCloudflareAddress('2606:4700::1'), true)
    assert.equal(isCloudflareAddress('::ffff:104.16.0.1'), true)
    assert.equal(isCloudflareAddress('8.8.8.8'), false)
    assert.equal(isCloudflareAddress('לא כתובת'), false)
  })

  test('מצב קפדני: הכותרת מתקבלת רק מחיבור של Cloudflare', () => {
    const fromCloudflare = fakeRequest({ 'cf-connecting-ip': '5.5.5.5', 'x-forwarded-for': '172.67.10.1' }, true)
    assert.equal(clientIp(fromCloudflare), '5.5.5.5')
    // גישה ישירה עם כותרת מזויפת: משתמשים בכתובת החיבור האמיתית
    const direct = fakeRequest({ 'cf-connecting-ip': '5.5.5.5', 'x-forwarded-for': '9.9.9.9' }, true)
    assert.equal(clientIp(direct), '9.9.9.9')
    // כותרת X-Forwarded-For מזויפת בתחילת הרשימה לא משפיעה (הכתובת האחרונה היא שהוסיף הפרוקסי)
    const spoofedChain = fakeRequest({ 'cf-connecting-ip': '5.5.5.5', 'x-forwarded-for': '172.67.10.1, 9.9.9.9' }, true)
    assert.equal(clientIp(spoofedChain), '9.9.9.9')
  })

  test('בלי מצב קפדני ההתנהגות כמו קודם', () => {
    assert.equal(clientIp(fakeRequest({ 'cf-connecting-ip': '5.5.5.5' }, false)), '5.5.5.5')
    assert.equal(clientIp(fakeRequest({}, false)), '10.0.0.5')
  })

  test('שינוי סיסמה: דורש סיסמה נוכחית, מנתק מכשירים אחרים ומשאיר את הנוכחי', async () => {
    const first = client()
    const second = client()
    await first.call('POST', '/api/auth/register', student({ email: 'changer@example.com', firstName: 'מחליף' }))
    await second.call('POST', '/api/auth/login', { identifier: 'changer@example.com', password: 'secret123' })

    assert.equal((await client().call('POST', '/api/auth/change-password', { currentPassword: 'a', newPassword: 'b123456' })).status, 401)
    assert.equal((await first.call('POST', '/api/auth/change-password', { currentPassword: 'wrong-pass', newPassword: 'newpass123' })).status, 403)
    assert.equal((await first.call('POST', '/api/auth/change-password', { currentPassword: 'secret123', newPassword: '123' })).status, 400)
    assert.equal((await first.call('POST', '/api/auth/change-password', { currentPassword: 'secret123', newPassword: 'newpass123' })).status, 200)

    assert.ok((await first.call('GET', '/api/auth/me')).body.user)
    assert.equal((await second.call('GET', '/api/auth/me')).body.user, null)
    const retry = client()
    assert.equal((await retry.call('POST', '/api/auth/login', { identifier: 'changer@example.com', password: 'secret123' })).status, 401)
    assert.equal((await retry.call('POST', '/api/auth/login', { identifier: 'changer@example.com', password: 'newpass123' })).status, 200)
  })

  test('מזהה משתמש לא תקין בניהול נדחה ב-400, ותאריך תוצאה לא תקין לא קורס', async () => {
    const admin = client()
    await admin.call('POST', '/api/auth/login', { identifier: 'admin@example.com', password: 'admin-pass-123' })
    assert.equal((await admin.call('DELETE', '/api/admin/users/not-a-uuid')).status, 400)
    assert.equal((await admin.call('GET', '/api/admin/users/xyz/export')).status, 400)
    assert.equal((await admin.call('PATCH', '/api/admin/users/xyz', { disabled: true })).status, 400)

    const diag = await admin.call('GET', '/api/admin/diagnostics/client-ip')
    assert.equal(diag.status, 200)
    assert.equal((await client().call('GET', '/api/admin/diagnostics/client-ip')).status, 401)

    const stu = client()
    await stu.call('POST', '/api/auth/register', student({ email: 'dater@example.com', firstName: 'תאריך' }))
    const saved = await stu.call('POST', '/api/results', { subject: 'x', score: 1, total: 2, percent: 50, date: 'לא תאריך' })
    assert.equal(saved.status, 200)
  })
})

// מחזיר אסימון התחברות של המנהל (לבדיקות שצריכות כותרות גולמיות)
async function adminToken() {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', headers: ORIGIN, payload: { identifier: 'admin@example.com', password: 'admin-pass-123' } })
  return String(res.headers['set-cookie']).split('=')[1].split(';')[0]
}

describe('בדיקות קבלה: חשבון חסום, ייצוא Excel והרשאות', () => {
  async function adminClient() {
    const admin = client()
    await admin.call('POST', '/api/auth/login', { identifier: 'admin@example.com', password: 'admin-pass-123' })
    return admin
  }

  test('חשבון חסום: הודעה ייעודית רק אחרי סיסמה נכונה, ובסיסמה שגויה ההודעה הרגילה', async () => {
    const c = client()
    await c.call('POST', '/api/auth/register', student({ email: 'blocked2@example.com', firstName: 'חסומה' }))
    await pool.query(`UPDATE users SET disabled = true WHERE email = 'blocked2@example.com'`)
    const wrong = await client().call('POST', '/api/auth/login', { identifier: 'blocked2@example.com', password: 'wrong-pass' })
    assert.equal(wrong.status, 401)
    assert.equal(wrong.body.error, 'שם משתמש או סיסמה שגויים')
    const right = await client().call('POST', '/api/auth/login', { identifier: 'blocked2@example.com', password: 'secret123' })
    assert.equal(right.status, 403)
    assert.equal(right.body.error, 'חשבונך חסום. יש לפנות למנהל המערכת')
    assert.equal(right.body.blocked, true)
    assert.equal(right.headers['set-cookie'], undefined)
  })

  test('ייצוא Excel: קובץ אמיתי, גיליונות בעברית, מימין לשמאל, בלי מידע רגיש', async () => {
    const stu = client()
    const reg = await stu.call('POST', '/api/auth/register', student({ email: 'xl@example.com', firstName: 'אקסל', lastName: 'לוי' }))
    assert.equal(reg.status, 200)
    await stu.call('POST', '/api/results', { subject: 'תנך', age: 'grade-8', level: 'ספר בראשית', activityType: 'practice', score: 7, total: 10, percent: 70, date: '2026-11-20T10:00:00.000Z' })
    await stu.call('PUT', `/api/progress/${encodeURIComponent('k1')}`, { grade: 'grade-8', subject: 'תנך', level: 'שמות', activityType: 'practice', questionCount: 12, results: [{ correct: true }, { correct: false }], updatedAt: '2026-11-21T09:00:00.000Z' })
    const id = (await (await adminClient()).call('GET', '/api/admin/users')).body.users.find(u => u.email === 'xl@example.com').id

    const response = await app.inject({
      method: 'GET', url: `/api/admin/users/${id}/export?format=xlsx`,
      headers: { ...ORIGIN, cookie: `${config.cookieName}=${await adminToken()}` },
    })
    assert.equal(response.statusCode, 200)
    assert.match(response.headers['content-type'], /spreadsheetml\.sheet/)
    const disposition = decodeURIComponent(response.headers['content-disposition'])
    assert.match(disposition, /אקסל_לוי_\d{4}-\d{2}-\d{2}\.xlsx/)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(response.rawPayload)
    assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['פרטים אישיים', 'מנוי וחשבון', 'התקדמות בלמידה', 'תוצאות חידונים'])
    for (const sheet of workbook.worksheets) assert.equal(sheet.views[0].rightToLeft, true)
    assert.equal(workbook.getWorksheet('פרטים אישיים').getRow(1).getCell(1).value, 'שם פרטי')
    assert.equal(workbook.getWorksheet('פרטים אישיים').getRow(2).getCell(1).value, 'אקסל')
    const results = workbook.getWorksheet('תוצאות חידונים').getRow(2)
    assert.equal(results.getCell(3).value, 'תנך')
    assert.equal(results.getCell(8).value, 70)
    const progress = workbook.getWorksheet('התקדמות בלמידה').getRow(2)
    assert.equal(progress.getCell(5).value, 2)
    assert.equal(progress.getCell(6).value, 1)

    const text = workbook.worksheets.map(sheet => JSON.stringify(sheet.getSheetValues())).join('')
    assert.ok(!/scrypt\$|password|token|session/i.test(text))
  })

  test('ייצוא Excel: תלמיד ואורח נדחים, ומזהה לא קיים הוא 404', async () => {
    const stu = client()
    await stu.call('POST', '/api/auth/register', student({ email: 'xl2@example.com', firstName: 'אחר' }))
    const other = (await (await adminClient()).call('GET', '/api/admin/users')).body.users.find(u => u.email === 'xl@example.com')
    assert.equal((await stu.call('GET', `/api/admin/users/${other.id}/export?format=xlsx`)).status, 403)
    assert.equal((await client().call('GET', `/api/admin/users/${other.id}/export?format=xlsx`)).status, 401)
    assert.equal((await (await adminClient()).call('GET', '/api/admin/users/00000000-0000-0000-0000-000000000000/export?format=xlsx')).status, 404)
  })

  test('תלמיד לא רואה נתונים של תלמיד אחר (תוצאות, התקדמות, ייצוא עצמי)', async () => {
    const a = client()
    const b = client()
    await a.call('POST', '/api/auth/register', student({ email: 'iso-a@example.com', firstName: 'אלף' }))
    await b.call('POST', '/api/auth/register', student({ email: 'iso-b@example.com', firstName: 'בית' }))
    await a.call('POST', '/api/results', { subject: 'סודי-א', score: 1, total: 1, percent: 100 })
    await a.call('PUT', '/api/progress/secret-a', { subject: 'סודי-א' })
    assert.ok(!JSON.stringify((await b.call('GET', '/api/results/me')).body).includes('סודי-א'))
    assert.ok(!JSON.stringify((await b.call('GET', '/api/progress')).body).includes('סודי-א'))
    assert.ok(!JSON.stringify((await b.call('GET', '/api/auth/me/export')).body).includes('סודי-א'))
    // userId שנשלח בגוף הבקשה מתעלמים ממנו
    const aId = (await a.call('GET', '/api/auth/me')).body.user.id
    await b.call('POST', '/api/results', { subject: 'מתחזה', userId: aId, score: 1, total: 1, percent: 100 })
    assert.ok(!JSON.stringify((await a.call('GET', '/api/results/me')).body).includes('מתחזה'))
    // תלמיד לא יכול לגשת לנתיבי הניהול
    for (const url of ['/api/admin/users', '/api/admin/results', '/api/admin/audit', '/api/admin/questions/deleted', '/api/admin/diagnostics/client-ip']) {
      assert.equal((await b.call('GET', url)).status, 403, url)
    }
  })

  test('Turnstile מול Cloudflare: אסימון חסר, נדחה, שירות לא זמין וקבלה תקינה', async () => {
    const originalFetch = globalThis.fetch
    const originalSecret = config.turnstileSecret
    const calls = []
    try {
      config.turnstileSecret = 'test-secret'
      globalThis.fetch = async (url, options) => {
        calls.push({ url, body: String(options.body) })
        return { json: async () => ({ success: String(options.body).includes('response=good') }) }
      }
      assert.equal(await verifyTurnstileToken('', '1.1.1.1'), false)
      assert.equal(await verifyTurnstileToken(undefined, '1.1.1.1'), false)
      assert.equal(await verifyTurnstileToken('x'.repeat(3000), '1.1.1.1'), false)
      assert.equal(calls.length, 0)
      assert.equal(await verifyTurnstileToken('bad', '1.1.1.1'), false)
      assert.equal(await verifyTurnstileToken('good', '1.1.1.1'), true)
      assert.match(calls.at(-1).body, /secret=test-secret/)
      assert.match(calls.at(-1).body, /remoteip=1\.1\.1\.1/)
      globalThis.fetch = async () => { throw new Error('network') }
      assert.equal(await verifyTurnstileToken('good', '1.1.1.1'), false)
      config.turnstileSecret = ''
      assert.equal(await verifyTurnstileToken('', '1.1.1.1'), true)
    } finally {
      globalThis.fetch = originalFetch
      config.turnstileSecret = originalSecret
    }
  })

  test('Turnstile: אסימון חד-פעמי (שימוש חוזר נדחה), ובלי אסימון אין חשבון', async () => {
    const used = new Set()
    const strictApp = await buildApp({
      pool,
      verifyTurnstile: async token => {
        if (token !== 'one-time' || used.has(token)) return false
        used.add(token)
        return true
      },
    })
    const register = (email, token) => strictApp.inject({
      method: 'POST', url: '/api/auth/register', headers: ORIGIN,
      payload: student({ email, firstName: 'טורנסטייל', turnstileToken: token }),
    })
    assert.equal((await register('ts1@example.com', undefined)).statusCode, 400)
    assert.equal((await register('ts1@example.com', 'one-time')).statusCode, 200)
    assert.equal((await register('ts2@example.com', 'one-time')).statusCode, 400)
    const created = await pool.query(`SELECT email FROM users WHERE email IN ('ts1@example.com', 'ts2@example.com')`)
    assert.deepEqual(created.rows.map(row => row.email), ['ts1@example.com'])
    await strictApp.close()
  })

  test('עוגיית ההתחברות: HttpOnly, SameSite, Path, Secure בפרודקשן, ובבסיס נשמר רק hash', async () => {
    const original = config.isProd
    config.isProd = true
    try {
      const res = await app.inject({
        method: 'POST', url: '/api/auth/register', headers: ORIGIN,
        payload: student({ email: 'cookie@example.com', firstName: 'עוגייה' }),
      })
      assert.equal(res.statusCode, 200)
      const cookie = String(res.headers['set-cookie'])
      assert.match(cookie, /HttpOnly/i)
      assert.match(cookie, /SameSite=Lax/i)
      assert.match(cookie, /Path=\//i)
      assert.match(cookie, /Secure/i)
      const token = cookie.split('=')[1].split(';')[0]
      assert.ok(!JSON.stringify(res.json()).includes(token))
      const stored = await pool.query('SELECT token_hash FROM sessions')
      assert.ok(stored.rows.every(row => row.token_hash !== token))
    } finally {
      config.isProd = original
    }
  })

  test('יציאה מוחקת את ההתחברות בשרת, ואסימון שנגנב כבר לא עובד', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', headers: ORIGIN, payload: student({ email: 'logout@example.com', firstName: 'יציאה' }) })
    const token = String(res.headers['set-cookie']).split('=')[1].split(';')[0]
    const cookieHeader = { ...ORIGIN, cookie: `${config.cookieName}=${token}` }
    assert.ok((await app.inject({ method: 'GET', url: '/api/auth/me', headers: cookieHeader })).json().user)
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: cookieHeader })
    assert.equal((await app.inject({ method: 'GET', url: '/api/auth/me', headers: cookieHeader })).json().user, null)
  })

  test('איפוס סיסמה ע"י מנהל מקצה לקצה: ישנה לא תקפה, חדשה עובדת, סשנים בוטלו, ביומן בלי הסיסמה', async () => {
    const stu = client()
    await stu.call('POST', '/api/auth/register', student({ email: 'reset2@example.com', firstName: 'איפוס' }))
    const second = client()
    await second.call('POST', '/api/auth/login', { identifier: 'reset2@example.com', password: 'secret123' })
    const admin = await adminClient()
    const id = (await admin.call('GET', '/api/admin/users')).body.users.find(u => u.email === 'reset2@example.com').id
    assert.equal((await admin.call('PATCH', `/api/admin/users/${id}`, { newPassword: 'Brand-New-77' })).status, 200)
    assert.equal((await stu.call('GET', '/api/auth/me')).body.user, null)
    assert.equal((await second.call('GET', '/api/auth/me')).body.user, null)
    assert.equal((await client().call('POST', '/api/auth/login', { identifier: 'reset2@example.com', password: 'secret123' })).status, 401)
    assert.equal((await client().call('POST', '/api/auth/login', { identifier: 'reset2@example.com', password: 'Brand-New-77' })).status, 200)
    const log = JSON.stringify((await admin.call('GET', `/api/admin/audit?entity=user&id=${id}`)).body)
    assert.ok(log.includes('reset_password'))
    assert.ok(!log.includes('Brand-New-77'))
  })

  test('מנוי שהסתיים מנתק סשן קיים, וחסימה מחזירה הודעה ייעודית בכניסה', async () => {
    const stu = client()
    await stu.call('POST', '/api/auth/register', student({ email: 'revoke@example.com', firstName: 'ביטול' }))
    const admin = await adminClient()
    const id = (await admin.call('GET', '/api/admin/users')).body.users.find(u => u.email === 'revoke@example.com').id
    assert.ok((await stu.call('GET', '/api/auth/me')).body.user)
    await admin.call('PATCH', `/api/admin/users/${id}`, { subscriptionStatus: 'expired' })
    assert.equal((await stu.call('GET', '/api/auth/me')).body.user, null)
    await admin.call('PATCH', `/api/admin/users/${id}`, { subscriptionStatus: 'active', subscriptionUntil: '2031-01-01', disabled: true })
    assert.equal((await client().call('POST', '/api/auth/login', { identifier: 'revoke@example.com', password: 'secret123' })).status, 403)
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

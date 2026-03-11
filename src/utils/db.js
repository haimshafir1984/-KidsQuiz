// שכבת נתונים המדמה ServerDB (ענן) ו-LocalDB (מכשיר מקומי)

const KEYS = {
  SERVER: 'kq_server_db', // מדמה בסיס נתונים בענן
  LOCAL:  'kq_local_db',  // מדמה אחסון מקומי על המכשיר
  MODE:   'kq_mode',      // מצב חיבור שמור לפי session
}

export const SUBSCRIPTION_DAYS = 180 // תקופת מנוי בימים

// --- גישה פנימית ---
function rS() {
  try { return JSON.parse(localStorage.getItem(KEYS.SERVER)) || { users: [], results: [] } }
  catch { return { users: [], results: [] } }
}
function wS(d) { localStorage.setItem(KEYS.SERVER, JSON.stringify(d)) }

function rL() {
  try { return JSON.parse(localStorage.getItem(KEYS.LOCAL)) || { results: [] } }
  catch { return { results: [] } }
}
function wL(d) { localStorage.setItem(KEYS.LOCAL, JSON.stringify(d)) }

// --- מיגרציה חד-פעמית: kq_users ישן → ServerDB ---
// מבטיחה תאימות לאחור עם נתוני Phase 1
function migrateOldUsers() {
  const old = localStorage.getItem('kq_users')
  if (!old) return
  try {
    const oldUsers = JSON.parse(old)
    const db = rS()
    let changed = false
    oldUsers.forEach(u => {
      if (!db.users.find(x => x.username === u.username)) {
        db.users.push({
          ...u,
          subscription_date: u.subscription_date || new Date().toISOString(),
        })
        changed = true
      }
    })
    if (changed) wS(db)
    localStorage.removeItem('kq_users')
  } catch { /* מתעלמים משגיאות מיגרציה */ }
}

// --- זריעת אדמין ברירת מחדל ---
export function seedAdmin() {
  migrateOldUsers()
  const db = rS()
  if (db.users.find(u => u.role === 'admin')) return
  db.users.push({
    id: 'admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    subscription_date: new Date().toISOString(),
  })
  wS(db)
}

// --- משתמשים (ServerDB בלבד) ---
export function serverGetUsers() { return rS().users }

export function serverFindUser(username) {
  return rS().users.find(u => u.username === username) || null
}

export function serverSaveUser(user) {
  const db = rS()
  const idx = db.users.findIndex(u => u.id === user.id)
  if (idx >= 0) db.users[idx] = user; else db.users.push(user)
  wS(db)
}

// --- תוצאות חידון ---
// מצב 'online' → ServerDB | מצב 'offline' → LocalDB
export function saveResult(result, mode) {
  if (mode === 'online') {
    const db = rS()
    db.results = [...(db.results || []), result]
    wS(db)
  } else {
    const db = rL()
    db.results = [...(db.results || []), result]
    wL(db)
  }
}

// --- ניהול: קריאת סטטיסטיקות מ-ServerDB בלבד ---
export function serverGetStats() {
  const db = rS()
  return { users: db.users || [], results: db.results || [] }
}

// --- בדיקת מנוי ---
export function checkSubscription(user) {
  if (user?.role === 'admin') return { valid: true, daysLeft: 999 }
  if (!user?.subscription_date) return { valid: false, daysLeft: 0 }
  const elapsed = (Date.now() - new Date(user.subscription_date).getTime()) / 86400000
  const daysLeft = Math.max(0, Math.floor(SUBSCRIPTION_DAYS - elapsed))
  return { valid: daysLeft > 0, daysLeft }
}

// --- מצב חיבור (שמור ב-localStorage לשיקום לאחר רענון) ---
export function getStoredMode()    { return localStorage.getItem(KEYS.MODE) }
export function setStoredMode(m)   { localStorage.setItem(KEYS.MODE, m) }
export function clearStoredMode()  { localStorage.removeItem(KEYS.MODE) }

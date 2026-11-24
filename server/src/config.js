// הגדרות השרת מתוך משתני סביבה. סודות לא נשמרים בקוד.

const isProd = process.env.NODE_ENV === 'production'

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`חסר משתנה סביבה: ${name}`)
  }
  return value
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 3000),
  databaseUrl: required('DATABASE_URL', isProd ? undefined : 'postgres://postgres@localhost:5432/kidsquiz_dev'),
  // כתובת האתר הציבורית (לבדיקת מקור הבקשות ולקישורים במיילים)
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:5180',
  cookieName: 'kq_session',
  sessionDays: Number(process.env.SESSION_DAYS || 30),
  // תקופת הניסיון בהרשמה (ימים). בהמשך תוחלף בסטטוס מנוי מחברת הסליקה
  trialDays: Number(process.env.TRIAL_DAYS || 180),
  // מנהלים מתחברים לתקופה קצרה יותר
  adminSessionDays: Number(process.env.ADMIN_SESSION_DAYS || 7),
  // Cloudflare Turnstile בהרשמה: פעיל רק כשהסוד מוגדר
  // true = לסמוך על CF-Connecting-IP רק כשהחיבור מגיע מ-Cloudflare (להפעיל אחרי אימות /api/admin/diagnostics/client-ip)
  cloudflareOnly: process.env.TRUST_CLOUDFLARE_ONLY === 'true',
  turnstileSecret: process.env.TURNSTILE_SECRET || '',
}

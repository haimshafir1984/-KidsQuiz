// ייצוא נתוני תלמיד לקובץ Excel (.xlsx): כותרות בעברית, כיוון מימין לשמאל, גיליון לכל סוג נתונים.
// לא כולל סיסמאות, hash, אסימונים או מזהים טכניים.
import ExcelJS from 'exceljs'

const GRADE_LABELS = {
  'grade-8': 'הכנה למבחני כניסה לסמינר',
  'grade-12': 'הכנה למבחני תי"ל',
  'thinking-challenge': 'אתגר מחשבתי',
}
const ACTIVITY_LABELS = { practice: 'תרגול', exam: 'מבחן', assessment: 'שאלון' }
const STATUS_LABELS = { trial: 'תקופת ניסיון', active: 'מנוי פעיל', expired: 'המנוי הסתיים' }

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
const BORDER = { style: 'thin', color: { argb: 'FFCBD5E1' } }

const asDate = value => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const asNumber = value => (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null)
const label = (map, value) => (value ? (map[value] || String(value)) : '')

// שם קובץ בטוח: שם התלמיד + תאריך הייצוא
export function exportFileName(profile, now = new Date()) {
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || 'תלמיד'
  // eslint-disable-next-line no-control-regex
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'תלמיד'
  return `${safe}_${now.toISOString().slice(0, 10)}.xlsx`
}

function addSheet(workbook, title, columns, rows) {
  const sheet = workbook.addWorksheet(title, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  sheet.columns = columns.map(column => ({ header: column.header, key: column.key, width: column.width, style: column.style || {} }))
  for (const row of rows) sheet.addRow(row)
  if (rows.length === 0) sheet.addRow({ [columns[0].key]: 'אין נתונים' })

  sheet.eachRow(row => {
    row.eachCell({ includeEmpty: true }, cell => {
      cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true, readingOrder: 'rtl' }
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
    })
  })
  sheet.getRow(1).eachCell({ includeEmpty: true }, cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    cell.fill = HEADER_FILL
  })
  sheet.getRow(1).height = 24
  return sheet
}

// data: תוצאת exportUserData; extra: { disabled }
export async function buildStudentWorkbook(data, extra = {}) {
  const { profile } = data
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'KidsQuiz'
  workbook.created = new Date()

  addSheet(workbook, 'פרטים אישיים', [
    { header: 'שם פרטי', key: 'first', width: 18 },
    { header: 'שם משפחה', key: 'last', width: 18 },
    { header: 'שם משתמש', key: 'username', width: 22 },
    { header: 'מייל', key: 'email', width: 30 },
    { header: 'טלפון', key: 'phone', width: 16 },
    { header: 'עיר', key: 'city', width: 18 },
    { header: 'תאריך לידה', key: 'birth', width: 16 },
  ], [{
    first: profile.first_name || '', last: profile.last_name || '', username: profile.username || '',
    email: profile.email || '', phone: profile.phone || '', city: profile.city || '', birth: profile.birth_date || '',
  }])

  const dateStyle = { numFmt: 'dd/mm/yyyy' }
  const dateTimeStyle = { numFmt: 'dd/mm/yyyy hh:mm' }
  addSheet(workbook, 'מנוי וחשבון', [
    { header: 'סטטוס מנוי', key: 'status', width: 18 },
    { header: 'תאריך הרשמה', key: 'joined', width: 18, style: dateStyle },
    { header: 'תוקף עד', key: 'until', width: 18, style: dateStyle },
    { header: 'מצב החשבון', key: 'account', width: 16 },
    { header: 'כניסה אחרונה', key: 'lastLogin', width: 20, style: dateTimeStyle },
    { header: 'אישור תנאי שימוש', key: 'terms', width: 20, style: dateStyle },
  ], [{
    status: label(STATUS_LABELS, profile.subscription_status),
    joined: asDate(profile.subscription_date || profile.created_at),
    until: asDate(profile.subscription_until),
    account: extra.disabled ? 'חסום' : 'פעיל',
    lastLogin: asDate(profile.last_login_at),
    terms: asDate(profile.terms_accepted_at),
  }])

  const progressRows = (data.progress || []).map(row => {
    const entry = row.data || {}
    const results = Array.isArray(entry.results) ? entry.results : []
    return {
      grade: label(GRADE_LABELS, entry.grade), subject: entry.subject || '', level: entry.level || '',
      activity: label(ACTIVITY_LABELS, entry.activityType),
      answered: results.length, correct: results.filter(item => item?.correct).length,
      total: asNumber(entry.questionCount), updated: asDate(entry.updatedAt || row.updated_at),
    }
  })
  addSheet(workbook, 'התקדמות בלמידה', [
    { header: 'קטגוריה', key: 'grade', width: 28 },
    { header: 'נושא', key: 'subject', width: 24 },
    { header: 'רמה / תת-נושא', key: 'level', width: 24 },
    { header: 'סוג פעילות', key: 'activity', width: 14 },
    { header: 'נענו', key: 'answered', width: 10 },
    { header: 'נכונות', key: 'correct', width: 10 },
    { header: 'סך שאלות', key: 'total', width: 12 },
    { header: 'עודכן', key: 'updated', width: 20, style: dateTimeStyle },
  ], progressRows)

  const resultRows = (data.results || []).map(item => ({
    date: asDate(item.date), grade: label(GRADE_LABELS, item.age || item.grade), subject: item.subject || '',
    level: item.level || '', activity: label(ACTIVITY_LABELS, item.activityType),
    score: asNumber(item.score), total: asNumber(item.total), percent: asNumber(item.percent),
  }))
  addSheet(workbook, 'תוצאות חידונים', [
    { header: 'תאריך', key: 'date', width: 20, style: dateTimeStyle },
    { header: 'קטגוריה', key: 'grade', width: 28 },
    { header: 'נושא', key: 'subject', width: 24 },
    { header: 'רמה / תת-נושא', key: 'level', width: 24 },
    { header: 'סוג פעילות', key: 'activity', width: 14 },
    { header: 'תשובות נכונות', key: 'score', width: 16 },
    { header: 'מתוך', key: 'total', width: 10 },
    { header: 'אחוז הצלחה', key: 'percent', width: 14, style: { numFmt: '0"%"' } },
  ], resultRows)

  return workbook
}

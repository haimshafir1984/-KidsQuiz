// סכומים נשמרים בשרת באגורות (מספר שלם), כדי להימנע משגיאות עיגול
export function formatAgorot(agorot) {
  if (!Number.isFinite(agorot)) return ''
  const shekels = agorot / 100
  return `${shekels.toLocaleString('he-IL', { minimumFractionDigits: Number.isInteger(shekels) ? 0 : 2, maximumFractionDigits: 2 })} ₪`
}

// "49.90" -> 4990. מחזיר null לקלט שאינו סכום חיובי עם עד שתי ספרות אחרי הנקודה
export function parseShekels(text) {
  const value = String(text ?? '').trim()
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value)) return null
  const agorot = Math.round(Number(value) * 100)
  return agorot > 0 ? agorot : null
}

export const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'העברה בנקאית',
  cash: 'מזומן',
  check: 'צ\'ק',
  other: 'אחר',
  online: 'תשלום מקוון',
}

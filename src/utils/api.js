// לקוח ה-API של האתר המקוון.
// מצב השרת נדלק רק כשהאתר נבנה עם VITE_USE_API=true (וכשאין גרסת דסקטופ).
// אחרת האתר ממשיך לעבוד מול localStorage (דמו / גרסת אופליין).

export const API_ENABLED = import.meta.env.VITE_USE_API === 'true'
  && typeof window !== 'undefined'
  && !window.desktopAPI

const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')
export const SUBSCRIPTION_EXPIRED_EVENT = 'kq:subscription-expired'

const NETWORK_ERROR = 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.'

// מחזיר תמיד { ok, status, data, error } ולעולם לא זורק, כדי שהמסכים יטפלו בשגיאה בצורה אחידה
async function request(method, path, body) {
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    let data = null
    try { data = await response.json() } catch { /* תגובה בלי גוף */ }
    // המנוי פג תוך כדי שימוש: מודיעים לאפליקציה כדי שתעבור למסך החידוש
    if (response.status === 403 && data?.expired) window.dispatchEvent(new Event(SUBSCRIPTION_EXPIRED_EVENT))
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : (data?.error || 'שגיאה בשרת, נסו שוב'),
    }
  } catch {
    return { ok: false, status: 0, data: null, error: NETWORK_ERROR }
  }
}

// הורדת קובץ (למשל Excel): מחזיר { ok, blob, fileName, error }
async function download(path) {
  try {
    const response = await fetch(`${BASE}${path}`, { credentials: 'include' })
    if (!response.ok) {
      let data = null
      try { data = await response.json() } catch { /* תגובה בלי גוף */ }
      return { ok: false, error: data?.error || 'שגיאה בשרת, נסו שוב' }
    }
    const disposition = response.headers.get('Content-Disposition') || ''
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    let fileName = 'export.xlsx'
    try { if (encoded) fileName = decodeURIComponent(encoded) } catch { /* שם קובץ לא תקין */ }
    return { ok: true, blob: await response.blob(), fileName }
  } catch {
    return { ok: false, error: NETWORK_ERROR }
  }
}

export const api = {
  download,
  get: path => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  delete: (path, body) => request('DELETE', path, body),
}

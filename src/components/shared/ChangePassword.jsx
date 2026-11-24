import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { API_ENABLED, api } from '../../utils/api'

// שינוי סיסמה עצמי (רק באתר המקוון). משאיר מחובר את המכשיר הנוכחי ומנתק את האחרים
export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!API_ENABLED) return null

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage(null)
    if (next.length < 6) return setMessage({ ok: false, text: 'הסיסמה החדשה צריכה להכיל לפחות 6 תווים' })
    if (next !== repeat) return setMessage({ ok: false, text: 'הסיסמה החדשה והחזרה עליה אינן זהות' })
    setBusy(true)
    const response = await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
    setBusy(false)
    if (!response.ok) return setMessage({ ok: false, text: response.error || 'לא הצלחנו לשנות את הסיסמה' })
    setCurrent('')
    setNext('')
    setRepeat('')
    setMessage({ ok: true, text: 'הסיסמה שונתה. מכשירים אחרים נותקו.' })
  }

  return (
    <section className="edu-card mt-6 text-right" aria-labelledby="change-password-title">
      <h2 id="change-password-title" className="text-2xl font-bold text-slate-950">שינוי סיסמה</h2>
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:max-w-md">
        <input type="password" value={current} onChange={event => setCurrent(event.target.value)} autoComplete="current-password" aria-label="הסיסמה הנוכחית" placeholder="הסיסמה הנוכחית" className="input-field" />
        <input type="password" value={next} onChange={event => setNext(event.target.value)} autoComplete="new-password" aria-label="סיסמה חדשה" placeholder="סיסמה חדשה (לפחות 6 תווים)" className="input-field" />
        <input type="password" value={repeat} onChange={event => setRepeat(event.target.value)} autoComplete="new-password" aria-label="חזרה על הסיסמה החדשה" placeholder="חזרה על הסיסמה החדשה" className="input-field" />
        <div>
          <button type="submit" disabled={busy || !current || !next || !repeat} className="btn-secondary disabled:opacity-50">
            <KeyRound className="h-5 w-5" />
            שינוי הסיסמה
          </button>
        </div>
      </form>
      {message && <p role="alert" className={`mt-3 text-base font-semibold ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>{message.text}</p>}
    </section>
  )
}

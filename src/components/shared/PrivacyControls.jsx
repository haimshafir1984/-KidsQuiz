import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { API_ENABLED, api } from '../../utils/api'
import ConfirmDialog from './ConfirmDialog'

// הורדת כל הנתונים האישיים ומחיקת החשבון (זכות עיון ומחיקה). פעיל רק באתר המקוון
export default function PrivacyControls() {
  const { user, deleteMyAccount } = useApp()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [confirming, setConfirming] = useState(false)

  if (!API_ENABLED || user?.role === 'admin') return null

  async function handleExport() {
    setMessage(null)
    const response = await api.get('/auth/me/export')
    if (!response.ok) {
      setMessage({ ok: false, text: response.error })
      return
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'הנתונים-שלי.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    setConfirming(false)
    const result = await deleteMyAccount(password)
    if (result.error) setMessage({ ok: false, text: result.error })
  }

  return (
    <section className="edu-card mt-6 text-right" aria-labelledby="privacy-controls-title">
      <h2 id="privacy-controls-title" className="text-2xl font-bold text-slate-950">הנתונים שלי</h2>
      <p className="mt-2 text-lg text-slate-700">אפשר להוריד עותק של כל המידע השמור עליכם, או למחוק את החשבון לצמיתות.</p>

      <div className="mt-4">
        <button type="button" onClick={handleExport} className="btn-secondary">
          <Download className="h-5 w-5" />
          הורדת הנתונים שלי
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
        <h3 className="text-lg font-bold text-red-800">מחיקת החשבון</h3>
        <p className="mt-1 text-base text-red-800">המחיקה סופית: החשבון, התוצאות וההתקדמות נמחקים ולא ניתן לשחזר אותם. להמשך, מקלידים את הסיסמה.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            aria-label="סיסמה לאישור מחיקה"
            className="input-field flex-1"
          />
          <button type="button" onClick={() => setConfirming(true)} disabled={!password} className="btn-danger disabled:opacity-50">
            <Trash2 className="h-5 w-5" />
            מחיקת החשבון
          </button>
        </div>
      </div>

      {message && <p role="alert" className={`mt-3 text-base font-semibold ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>{message.text}</p>}

      <ConfirmDialog
        open={confirming}
        title="למחוק את החשבון לצמיתות?"
        message="כל הנתונים שלכם יימחקו ולא ניתן יהיה לשחזר אותם."
        confirmLabel="כן, למחוק"
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </section>
  )
}

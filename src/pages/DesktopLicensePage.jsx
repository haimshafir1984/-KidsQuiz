import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { importLicense } from '../utils/runtime'
import { useApp } from '../context/AppContext'

export default function DesktopLicensePage({ licenseStatus, onRefresh }) {
  const [status, setStatus] = useState(licenseStatus)
  const [isImporting, setIsImporting] = useState(false)
  const navigate = useNavigate()
  const { user, mode } = useApp()

  useEffect(() => {
    setStatus(licenseStatus)
  }, [licenseStatus])

  useEffect(() => {
    if (!status?.valid) return

    if (!user) {
      navigate('/welcome', { replace: true })
      return
    }

    navigate(mode ? '/age' : '/mode', { replace: true })
  }, [mode, navigate, status?.valid, user])

  async function handleImportLicense() {
    setIsImporting(true)
    try {
      const nextStatus = await importLicense()
      setStatus(nextStatus)
      await onRefresh()
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex min-h-[78vh] items-center justify-center">
      <section className="edu-card w-full max-w-2xl text-right">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-4xl text-amber-600">
          🔐
        </div>
        <h1 className="text-3xl font-extrabold text-slate-950">נדרש רישיון מקומי להפעלת גרסת האופליין</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          האפליקציה המקומית בודקת קובץ רישיון שנשמר על המחשב. בלי רישיון תקין, הגישה למערכת האופליין תישאר נעולה.
        </p>

        <div className={`mt-6 rounded-2xl border p-4 ${status?.valid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <div className="text-lg font-bold">{status?.valid ? 'הרישיון תקין' : 'הרישיון אינו זמין או שאינו תקין'}</div>
          <div className="mt-1 text-sm opacity-90">{status?.message || 'יש לטעון קובץ רישיון כדי להמשיך.'}</div>
          {status?.licensePath && (
            <div className="mt-2 font-mono text-xs text-slate-600">{status.licensePath}</div>
          )}
          {status?.license?.customerName && (
            <div className="mt-3 text-sm text-slate-700">
              לקוח: <span className="font-semibold">{status.license.customerName}</span>
              {' | '}
              תוקף עד: <span className="font-semibold">{status.license.endDate}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={handleImportLicense} className="btn-primary" disabled={isImporting}>
            {isImporting ? 'טוען רישיון...' : 'בחירת קובץ רישיון'}
          </button>
          <button onClick={onRefresh} className="btn-muted">
            בדיקה מחדש
          </button>
        </div>
      </section>
    </div>
  )
}

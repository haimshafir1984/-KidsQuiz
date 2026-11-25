import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, RefreshCw, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'
import { formatAgorot } from '../utils/money'

// מסך חידוש מנוי (רק באתר המקוון): תלמיד שהמנוי שלו פג נשאר מחובר, בלי גישה לשאלות.
// תשלום מקוון עדיין לא מחובר. כשיחובר, הוא יתווסף כאן
export default function RenewPage() {
  const { userDisplayName, logout, refreshUser } = useApp()
  const [billing, setBilling] = useState({ plans: [], payments: [], error: null })
  const [checking, setChecking] = useState(false)
  const [stillExpired, setStillExpired] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.get('/billing').then(response => {
      if (cancelled) return
      if (response.ok) setBilling({ plans: response.data.plans, payments: response.data.payments, error: null })
      else setBilling({ plans: [], payments: [], error: response.error })
    })
    return () => { cancelled = true }
  }, [])

  async function handleCheckAgain() {
    setChecking(true)
    setStillExpired(false)
    const user = await refreshUser()
    setChecking(false)
    if (user && !user.subscription?.valid) setStillExpired(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-right">
      <section className="edu-card">
        <h1 className="text-3xl font-bold text-slate-950">המנוי הסתיים</h1>
        <p className="mt-3 text-lg leading-8 text-slate-700">
          {userDisplayName ? `${userDisplayName}, ` : ''}תקופת המנוי שלכם הסתיימה. ההתקדמות והתוצאות שמורות ויחכו לכם.
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-900">לחידוש המנוי יש לפנות למנהל המערכת.</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={handleCheckAgain} disabled={checking} className="btn-primary">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            {checking ? 'בודקים...' : 'כבר חידשתי, לבדוק שוב'}
          </button>
          <Link to="/profile" className="btn-secondary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            האזור האישי שלי
          </Link>
          <button type="button" onClick={logout} className="btn-muted">
            <LogOut className="h-5 w-5" aria-hidden="true" />
            יציאה
          </button>
        </div>
        {stillExpired && (
          <p role="status" className="mt-3 text-base font-semibold text-amber-800">המנוי עדיין לא חודש. אם שילמתם, פנו למנהל המערכת.</p>
        )}
      </section>

      {billing.error && <p role="alert" className="text-base font-semibold text-red-700">{billing.error}</p>}

      {billing.plans.length > 0 && (
        <section className="edu-card">
          <h2 className="text-2xl font-bold text-slate-950">מסלולי מנוי</h2>
          <ul className="mt-4 space-y-3">
            {billing.plans.map(plan => (
              <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-lg font-bold text-slate-900">{plan.name}</span>
                <span className="text-base text-slate-700">{formatAgorot(plan.priceAgorot)} ל-{plan.durationDays} ימים</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {billing.payments.length > 0 && (
        <section className="edu-card">
          <h2 className="text-2xl font-bold text-slate-950">התשלומים שלי</h2>
          <ul className="mt-4 space-y-2">
            {billing.payments.map(payment => (
              <li key={payment.id} className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-2 text-base text-slate-700">
                <span>{new Date(payment.paidAt || payment.createdAt).toLocaleDateString('he-IL')}{payment.planName ? ` | ${payment.planName}` : ''}</span>
                <span>{formatAgorot(payment.amountAgorot)}{payment.status === 'cancelled' ? ' (בוטל)' : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

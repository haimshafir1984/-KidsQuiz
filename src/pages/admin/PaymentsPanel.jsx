import { useCallback, useEffect, useState } from 'react'
import { api } from '../../utils/api'
import { PAYMENT_METHOD_LABELS, formatAgorot, parseShekels } from '../../utils/money'
import ConfirmDialog from '../../components/shared/ConfirmDialog'

const MANUAL_METHODS = ['bank_transfer', 'cash', 'check', 'other']
const CUSTOM = 'custom'

// תשלומים של תלמיד בפאנל הניהול: היסטוריה, ורישום ידני של תשלום שהתקבל (מאריך את המנוי)
export default function PaymentsPanel({ userId, onChanged }) {
  const [plans, setPlans] = useState([])
  const [payments, setPayments] = useState([])
  const [planId, setPlanId] = useState(CUSTOM)
  const [amount, setAmount] = useState('')
  const [days, setDays] = useState('30')
  const [method, setMethod] = useState('bank_transfer')
  const [note, setNote] = useState('')
  // מזהה לרישום הנוכחי: לחיצה כפולה או ניסיון חוזר לא ירשמו את אותו תשלום פעמיים
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [toCancel, setToCancel] = useState(null)

  const loadPayments = useCallback(async () => {
    const response = await api.get(`/admin/users/${userId}/payments`)
    if (response.ok) setPayments(response.data.payments)
    else setMessage({ ok: false, text: response.error })
  }, [userId])

  useEffect(() => {
    loadPayments()
    api.get('/admin/plans').then(response => {
      if (response.ok) setPlans(response.data.plans.filter(plan => plan.active))
    })
  }, [loadPayments])

  function choosePlan(value) {
    setPlanId(value)
    const plan = plans.find(item => item.id === value)
    setAmount(plan ? String(plan.priceAgorot / 100) : '')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage(null)
    const amountAgorot = parseShekels(amount)
    if (!amountAgorot) return setMessage({ ok: false, text: 'יש להזין סכום בשקלים, למשל 120 או 49.90' })
    const durationDays = Number(days)
    if (planId === CUSTOM && !(Number.isInteger(durationDays) && durationDays >= 1 && durationDays <= 3660)) {
      return setMessage({ ok: false, text: 'יש להזין מספר ימים תקין' })
    }
    setBusy(true)
    const response = await api.post(`/admin/users/${userId}/payments`, {
      requestId, method, note, amountAgorot,
      ...(planId === CUSTOM ? { durationDays } : { planId }),
    })
    setBusy(false)
    if (!response.ok) return setMessage({ ok: false, text: response.error })
    setRequestId(crypto.randomUUID())
    // מנקים את הטופס, כדי שלחיצה נוספת לא תרשום בטעות תשלום שני
    setPlanId(CUSTOM)
    setAmount('')
    setNote('')
    setMessage({ ok: true, text: response.data.duplicate ? 'התשלום כבר נרשם קודם.' : 'התשלום נרשם והמנוי הוארך.' })
    await loadPayments()
    onChanged?.()
  }

  async function handleCancel() {
    const payment = toCancel
    setToCancel(null)
    const response = await api.post(`/admin/payments/${payment.id}/cancel`)
    if (!response.ok) return setMessage({ ok: false, text: response.error })
    setMessage({ ok: true, text: 'הרישום בוטל. המנוי לא השתנה, ואפשר לעדכן אותו בכפתורי המנוי.' })
    await loadPayments()
  }

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-base font-bold text-slate-900">תשלומים</h4>
      <p className="mt-1 text-sm text-slate-600">רושמים כאן תשלום שהתקבל מחוץ לאתר. הרישום מאריך את המנוי.</p>

      <form onSubmit={handleSubmit} className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          מסלול
          <select value={planId} onChange={event => choosePlan(event.target.value)} className="input-field mt-1">
            <option value={CUSTOM}>ללא מסלול (סכום וימים ידניים)</option>
            {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} ({plan.durationDays} ימים)</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          סכום בשקלים
          <input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" className="input-field mt-1" />
        </label>
        {planId === CUSTOM && (
          <label className="text-sm font-semibold text-slate-700">
            מספר ימים
            <input value={days} onChange={event => setDays(event.target.value)} inputMode="numeric" className="input-field mt-1" />
          </label>
        )}
        <label className="text-sm font-semibold text-slate-700">
          אמצעי תשלום
          <select value={method} onChange={event => setMethod(event.target.value)} className="input-field mt-1">
            {MANUAL_METHODS.map(value => <option key={value} value={value}>{PAYMENT_METHOD_LABELS[value]}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          הערה (לא חובה, למשל מספר אסמכתא. אין לרשום פרטי אשראי)
          <input value={note} onChange={event => setNote(event.target.value)} maxLength={500} className="input-field mt-1" />
        </label>
        <div>
          <button type="submit" disabled={busy || !amount} className="btn-secondary px-3 py-2 text-sm disabled:opacity-50">
            {busy ? 'רושמים...' : 'רישום תשלום'}
          </button>
        </div>
      </form>

      {message && <p role="status" className={`mt-2 text-sm font-semibold ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}

      <ul className="mt-3 space-y-2">
        {payments.length === 0 && <li className="text-sm text-slate-500">אין עדיין תשלומים.</li>}
        {payments.map(payment => (
          <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-sm text-slate-700">
            <span>
              {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('he-IL')} | {formatAgorot(payment.amountAgorot)} | {payment.durationDays} ימים | {PAYMENT_METHOD_LABELS[payment.method]}
              {payment.planName ? ` | ${payment.planName}` : ''}{payment.note ? ` | ${payment.note}` : ''}
              {payment.status === 'cancelled' ? ' | בוטל' : payment.status === 'pending' ? ' | ממתין' : ''}
            </span>
            {payment.status === 'paid' && payment.method !== 'online' && (
              <button type="button" onClick={() => setToCancel(payment)} className="btn-muted px-3 py-1 text-sm">ביטול רישום</button>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(toCancel)}
        title="לבטל את רישום התשלום?"
        message="הרישום יסומן כמבוטל. המנוי לא ישתנה אוטומטית, ואם צריך מעדכנים אותו בכפתורי המנוי."
        confirmLabel="כן, לבטל"
        onConfirm={handleCancel}
        onCancel={() => setToCancel(null)}
      />
    </div>
  )
}

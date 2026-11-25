import { useCallback, useEffect, useState } from 'react'
import { api } from '../../utils/api'
import { formatAgorot, parseShekels } from '../../utils/money'

// מסלולי מנוי: שם, מחיר ותקופה. מסלול לא נערך (כדי לא לשנות היסטוריה): משביתים ויוצרים חדש
export default function PlansManager() {
  const [plans, setPlans] = useState([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [days, setDays] = useState('')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const response = await api.get('/admin/plans')
    if (response.ok) setPlans(response.data.plans)
    else setMessage({ ok: false, text: response.error })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(event) {
    event.preventDefault()
    setMessage(null)
    const priceAgorot = parseShekels(price)
    const durationDays = Number(days)
    if (!name.trim() || !priceAgorot || !(Number.isInteger(durationDays) && durationDays >= 1 && durationDays <= 3660)) {
      return setMessage({ ok: false, text: 'יש למלא שם, מחיר בשקלים ומספר ימים' })
    }
    setBusy(true)
    const response = await api.post('/admin/plans', { name, priceAgorot, durationDays })
    setBusy(false)
    if (!response.ok) return setMessage({ ok: false, text: response.error })
    setName('')
    setPrice('')
    setDays('')
    setMessage({ ok: true, text: 'המסלול נוסף.' })
    load()
  }

  async function toggle(plan) {
    const response = await api.patch(`/admin/plans/${plan.id}`, { active: !plan.active })
    if (!response.ok) return setMessage({ ok: false, text: response.error })
    load()
  }

  return (
    <details className="edu-card p-5 text-right">
      <summary className="cursor-pointer text-lg font-bold text-slate-950">מסלולי מנוי ({plans.filter(plan => plan.active).length} פעילים)</summary>
      <p className="mt-2 text-sm text-slate-600">מסלולים פעילים מוצגים לתלמידים במסך חידוש המנוי.</p>

      <ul className="mt-3 space-y-2">
        {plans.length === 0 && <li className="text-sm text-slate-500">עדיין לא הוגדרו מסלולים.</li>}
        {plans.map(plan => (
          <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-base text-slate-800">
            <span className={plan.active ? '' : 'text-slate-400'}>
              {plan.name} | {formatAgorot(plan.priceAgorot)} | {plan.durationDays} ימים{plan.active ? '' : ' | לא פעיל'}
            </span>
            <button type="button" onClick={() => toggle(plan)} className="btn-muted px-3 py-1 text-sm">
              {plan.active ? 'השבתה' : 'הפעלה'}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="mt-4 grid gap-2 sm:grid-cols-4">
        <input value={name} onChange={event => setName(event.target.value)} aria-label="שם המסלול" placeholder="שם המסלול" maxLength={100} className="input-field" />
        <input value={price} onChange={event => setPrice(event.target.value)} aria-label="מחיר בשקלים" placeholder="מחיר בשקלים" inputMode="decimal" className="input-field" />
        <input value={days} onChange={event => setDays(event.target.value)} aria-label="מספר ימים" placeholder="מספר ימים" inputMode="numeric" className="input-field" />
        <button type="submit" disabled={busy} className="btn-secondary disabled:opacity-50">הוספת מסלול</button>
      </form>
      {message && <p role="status" className={`mt-2 text-sm font-semibold ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}
    </details>
  )
}

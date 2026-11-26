import { useCallback, useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'

const ACTION_LABELS = {
  create: 'יצירה',
  update: 'עדכון',
  delete: 'מחיקה',
  restore: 'שחזור',
  export: 'ייצוא נתונים',
  reset_password: 'איפוס סיסמה',
}
const ENTITY_LABELS = { question: 'שאלה', user: 'משתמש', track: 'נושא' }

function formatDateTime(value) {
  return new Date(value).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

// שחזור שאלות שנמחקו ויומן פעולות המנהלים (מי שינה מה ומתי). זמין רק במצב שרת
export default function AdminActivity() {
  const { refreshQuestions } = useApp()
  const [deleted, setDeleted] = useState([])
  const [entries, setEntries] = useState([])
  const [state, setState] = useState({ loading: true, error: null })
  const [message, setMessage] = useState(null)

  const load = useCallback(async () => {
    const [deletedResponse, auditResponse] = await Promise.all([api.get('/admin/questions/deleted'), api.get('/admin/audit')])
    if (!deletedResponse.ok || !auditResponse.ok) {
      setState({ loading: false, error: deletedResponse.error || auditResponse.error })
      return
    }
    setDeleted(deletedResponse.data.questions)
    setEntries(auditResponse.data.entries)
    setState({ loading: false, error: null })
  }, [])

  useEffect(() => { load() }, [load])

  async function restore(question) {
    setMessage(null)
    const response = await api.post(`/admin/questions/${encodeURIComponent(question.id)}/restore`)
    if (!response.ok) {
      setMessage({ ok: false, text: response.error })
      return
    }
    setMessage({ ok: true, text: 'השאלה שוחזרה.' })
    await refreshQuestions()
    load()
  }

  if (state.loading) return <div className="edu-card text-center text-lg text-slate-600">טוענים...</div>
  if (state.error) return <div className="edu-card text-center text-lg text-slate-700">{state.error}</div>

  return (
    <div className="flex flex-col gap-5">
      <section className="edu-card text-right">
        <h3 className="text-2xl font-bold text-slate-950">שאלות שנמחקו</h3>
        <p className="mt-1 text-base text-slate-700">שאלה שנמחקה נשמרת בצד, ואפשר להחזיר אותה.</p>
        {message && <p className={`mt-2 text-base font-semibold ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}
        {deleted.length === 0 ? (
          <p className="mt-4 text-slate-500">אין שאלות שנמחקו.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {deleted.map(question => (
              <li key={question.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 text-right">
                  <div className="truncate text-base font-semibold text-slate-900">{question.text}</div>
                  <div className="text-sm text-slate-500">
                    {[question.subject, question.level].filter(Boolean).join(' | ')} · נמחקה {formatDateTime(question.deletedAt)}
                  </div>
                </div>
                <button type="button" onClick={() => restore(question)} className="btn-secondary shrink-0 px-3 py-2 text-sm">
                  <RotateCcw className="h-4 w-4" />
                  שחזור
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="edu-card text-right">
        <h3 className="text-2xl font-bold text-slate-950">יומן פעולות</h3>
        <p className="mt-1 text-base text-slate-700">200 הפעולות האחרונות של המנהלים.</p>
        {entries.length === 0 ? (
          <p className="mt-4 text-slate-500">עדיין אין פעולות ביומן.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-base">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">מתי</th>
                  <th className="px-3 py-2">מי</th>
                  <th className="px-3 py-2">פעולה</th>
                  <th className="px-3 py-2">על מה</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-600">{formatDateTime(entry.at)}</td>
                    <td className="px-3 py-2">{entry.actor || 'משתמש שנמחק'}</td>
                    <td className="px-3 py-2">{ACTION_LABELS[entry.action] || entry.action}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {ENTITY_LABELS[entry.entity] || entry.entity}
                      {' '}
                      <span className="text-slate-500">{entry.after?.text || entry.before?.text || entry.before?.username || (entry.entity === 'track' ? entry.entity_id.split('::')[1] : '')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

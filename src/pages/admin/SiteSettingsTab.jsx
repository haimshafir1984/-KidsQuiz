import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { GRADES, getGradeConfig } from '../../data/learningTracks'
import siteDefaults from '../../data/siteDefaults'
import { MAX_DEMO_QUESTIONS, pickDemoQuestions } from '../../utils/siteSettings'

const sameSettings = (first, second) => JSON.stringify(first) === JSON.stringify(second)
const unique = items => [...new Set(items)]
const shorten = (text, length = 80) => (text.length > length ? `${text.slice(0, length)}…` : text)

// לשונית "הגדרות האתר": אילו קטגוריות התלמידים רואים, ואילו שאלות מופיעות בהתנסות בעמוד הפתיחה
export default function SiteSettingsTab({ pushToast }) {
  const { siteSettings, updateSiteSettings, questions, placedQuestions } = useApp()
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [grade, setGrade] = useState('grade-8')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [questionId, setQuestionId] = useState('')

  // כל עוד לא נגעו בכלום, מוצג המצב השמור (גם אם הוא נטען מהשרת אחרי פתיחת המסך)
  const current = draft || siteSettings
  const dirty = Boolean(draft) && !sameSettings(draft, siteSettings)
  const change = patch => setDraft({ ...current, ...patch })

  const inGrade = useMemo(() => placedQuestions.filter(question => question.grade === grade), [placedQuestions, grade])
  const subjects = useMemo(() => unique(inGrade.map(question => question.subject)).sort((a, b) => a.localeCompare(b, 'he')), [inGrade])
  const selectedSubject = subjects.includes(subject) ? subject : ''
  const inSubject = inGrade.filter(question => question.subject === selectedSubject)
  const levels = unique(inSubject.map(question => question.level || ''))
  const selectedLevel = levels.includes(level) ? level : (levels[0] ?? '')
  const inLevel = inSubject
    .filter(question => (question.level || '') === selectedLevel)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
  const available = inLevel.filter(question => !current.demoQuestionIds.includes(question.id))

  const chosen = pickDemoQuestions(questions, current.demoQuestionIds)
  const full = current.demoQuestionIds.length >= MAX_DEMO_QUESTIONS

  function addQuestions(ids) {
    change({ demoQuestionIds: [...chosen.map(question => question.id), ...ids].slice(0, MAX_DEMO_QUESTIONS) })
    setQuestionId('')
  }

  function move(index, step) {
    const ids = chosen.map(question => question.id)
    const target = index + step
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    change({ demoQuestionIds: ids })
  }

  function toggleGrade(value) {
    const hidden = current.hiddenGrades.includes(value)
      ? current.hiddenGrades.filter(item => item !== value)
      : [...current.hiddenGrades, value]
    if (hidden.length >= GRADES.length) {
      pushToast('חייבת להישאר לפחות קטגוריה אחת גלויה.', 'warning', 'לא ניתן להסתיר')
      return
    }
    change({ hiddenGrades: hidden })
  }

  async function save() {
    setSaving(true)
    const result = await updateSiteSettings({ ...current, demoQuestionIds: chosen.map(question => question.id) })
    setSaving(false)
    if (result?.error) {
      pushToast(result.error, 'error', 'שגיאת שמירה')
      return
    }
    setDraft(null)
    pushToast('ההגדרות נשמרו.', 'success', 'שמירה בוצעה')
  }

  return (
    <div className="flex flex-col gap-5 text-right">
      <section className="edu-card p-6">
        <h2 className="text-xl font-bold text-slate-950">קטגוריות שהתלמידים רואים</h2>
        <p className="mt-1 text-base text-slate-700">
          קטגוריה מוסתרת לא נמחקת: הנושאים והשאלות נשמרים, ואפשר לערוך אותם בניהול ולהחזיר אותה בכל רגע.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {GRADES.map(item => {
            const shown = !current.hiddenGrades.includes(item.value)
            return (
              <label key={item.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                <input type="checkbox" className="h-5 w-5" checked={shown} onChange={() => toggleGrade(item.value)} />
                <span className="flex-1 text-lg font-semibold text-slate-900">{item.label}</span>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${shown ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {shown ? 'מוצגת' : 'מוסתרת'}
                </span>
              </label>
            )
          })}
        </div>
      </section>

      <section className="edu-card p-6">
        <h2 className="text-xl font-bold text-slate-950">שאלות ההתנסות בעמוד הפתיחה</h2>
        <p className="mt-1 text-base text-slate-700">
          מי שלוחץ על "רוצה להתנסות" בוחר נושא ותת-נושא ועונה על השאלות שברשימה. הן מקובצות אוטומטית לפי הנושא ותת-הנושא שלהן.
          שימו לב: השאלות האלה, עם התשובות, גלויות לכל מבקר באתר גם בלי הרשמה.
        </p>

        <ol className="mt-4 flex flex-col gap-2" aria-label="שאלות ההתנסות">
          {chosen.map((question, index) => (
            <li key={question.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-blue-700">{[question.subject, question.level].filter(Boolean).join(' · ')}</div>
                <div className="text-base text-slate-900">{shorten(question.text)}</div>
                {current.hiddenGrades.includes(question.grade) && (
                  <div className="text-sm text-amber-700">מתוך קטגוריה מוסתרת: {getGradeConfig(question.grade)?.label}</div>
                )}
              </div>
              <button type="button" className="btn-muted p-2" aria-label={`להעלות את שאלה ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className="btn-muted p-2" aria-label={`להוריד את שאלה ${index + 1}`} disabled={index === chosen.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn-muted p-2 text-red-700"
                aria-label={`להסיר את שאלה ${index + 1} מההתנסות`}
                onClick={() => change({ demoQuestionIds: chosen.filter(item => item.id !== question.id).map(item => item.id) })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {chosen.length === 0 && <li className="text-base text-slate-600">לא נבחרו שאלות. כפתור ההתנסות לא יוצג.</li>}
        </ol>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-lg font-bold text-slate-900">הוספת שאלה להתנסות</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-base font-semibold text-slate-700">
              קטגוריה
              <select className="input-field mt-1" value={grade} onChange={event => { setGrade(event.target.value); setSubject(''); setLevel(''); setQuestionId('') }}>
                {GRADES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-base font-semibold text-slate-700">
              נושא
              <select className="input-field mt-1" value={selectedSubject} onChange={event => { setSubject(event.target.value); setLevel(''); setQuestionId('') }}>
                <option value="">בחרו נושא</option>
                {subjects.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-base font-semibold text-slate-700">
              תת-נושא
              <select className="input-field mt-1" value={selectedLevel} disabled={!selectedSubject} onChange={event => { setLevel(event.target.value); setQuestionId('') }}>
                {levels.map(item => <option key={item} value={item}>{item || 'ללא תת-נושא'}</option>)}
              </select>
            </label>
            <label className="text-base font-semibold text-slate-700">
              שאלה
              <select className="input-field mt-1" value={questionId} disabled={!selectedSubject} onChange={event => setQuestionId(event.target.value)}>
                <option value="">בחרו שאלה</option>
                {available.map(question => <option key={question.id} value={question.id}>{shorten(question.text, 70)}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-secondary" disabled={!questionId || full} onClick={() => addQuestions([questionId])}>
              <Plus className="h-4 w-4" />
              הוספת השאלה
            </button>
            <button type="button" className="btn-secondary" disabled={!selectedSubject || available.length === 0 || full} onClick={() => addQuestions(available.slice(0, 2).map(question => question.id))}>
              הוספת 2 השאלות הבאות מתת-הנושא
            </button>
          </div>
          {full && <p className="mt-2 text-sm text-amber-700">אפשר לבחור עד {MAX_DEMO_QUESTIONS} שאלות.</p>}
        </div>
      </section>

      <div className="sticky bottom-0 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-float sm:flex-row sm:items-center">
        <button type="button" className="btn-primary" disabled={!dirty || saving} onClick={save}>
          {saving ? 'שומרים…' : 'שמירת ההגדרות'}
        </button>
        <button type="button" className="btn-secondary" disabled={!dirty || saving} onClick={() => setDraft(null)}>ביטול השינויים</button>
        <button type="button" className="btn-muted" disabled={saving} onClick={() => change({ demoQuestionIds: [...siteDefaults.demoQuestionIds] })}>
          שאלות ההתנסות המקוריות
        </button>
        {dirty && <span className="text-base font-semibold text-amber-700">יש שינויים שלא נשמרו.</span>}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Check, Copy, Link2, Plus, Save, Trash2, X } from 'lucide-react'
import { SELF_CHECK_ENABLED } from '../../../utils/questionAnswers'
import { placeKey } from '../../../utils/placements'
import PlacePicker from './PlacePicker'
import { CHOICE_TYPES, MAX_OPTIONS, OPTION_LETTERS, buildQuestion, markCorrect } from './questionDraft'
import { describePlace } from './treeModel'

const TYPES = [
  ['multiple', 'אמריקאית'],
  ['open', 'פתוחה קצרה'],
  ['sentence_completion', 'השלמת משפטים'],
  ['list', 'רשימה (כתבי כמה)'],
  ['self_check', 'הסבר (בדיקה עצמית)'],
]
const section = 'rounded-xl border border-slate-200 bg-white p-4 text-right'
const label = 'mb-1 block text-sm font-semibold text-slate-700'

function Preview({ draft }) {
  const options = CHOICE_TYPES.has(draft.type) ? draft.options.filter(option => option.text.trim()) : []
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
      {draft.original.groupTitle && <div className="mb-2 text-xs font-bold text-slate-500">{draft.original.groupTitle}</div>}
      <div className="text-lg font-bold text-slate-950">{draft.text || 'כאן תופיע השאלה'}</div>
      {draft.original.image && <img src={draft.original.image} alt="תמונת השאלה" className="mx-auto mt-3 max-h-48 max-w-full object-contain" />}
      {options.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {options.map((option, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <span className="ms-0 me-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{OPTION_LETTERS[index] || index + 1}</span>
              {option.text}
              {option.image && <img src={option.image} alt="" className="mx-auto mt-2 max-h-28 object-contain" />}
            </div>
          ))}
        </div>
      )}
      {draft.explanation && <div className="mt-2 text-sm text-slate-600">הסבר: {draft.explanation}</div>}
    </div>
  )
}

// "איפה השאלה מופיעה": כל המקומות, עם תרגול/מבחן ומיקום לכל אחד
function PlacesSection({ draft, groups, onChange }) {
  const [picking, setPicking] = useState(draft.places.length === 0)
  const [chosen, setChosen] = useState([])
  const update = (index, changes) => onChange(draft.places.map((place, i) => (i === index ? { ...place, ...changes } : place)))

  function addChosen() {
    onChange([...draft.places, ...chosen.map(place => ({ ...place, activityType: 'practice', requestedIndex: '' }))])
    setChosen([])
    setPicking(false)
  }

  return (
    <section className="rounded-xl border-2 border-violet-200 bg-white p-4 text-right">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Link2 className="h-5 w-5 text-violet-700" />איפה השאלה מופיעה</h3>
      {draft.places.length === 0 && <p className="mt-1 text-sm font-semibold text-amber-700">בחרו לפחות מקום אחד.</p>}
      <ul className="mt-2 space-y-2">
        {draft.places.map((place, index) => (
          <li key={placeKey(place)} className="rounded-xl bg-violet-50 px-3 py-2">
            <div className="flex items-start gap-2">
              <span className="flex-1 text-base font-bold text-slate-900">{describePlace(place)}</span>
              <button type="button" onClick={() => onChange(draft.places.filter((_, i) => i !== index))} disabled={draft.places.length === 1} className="p-1 text-slate-500 disabled:opacity-25" aria-label={`הסרת המקום ${describePlace(place)}`} title={draft.places.length === 1 ? 'שאלה חייבת להופיע לפחות במקום אחד' : 'הסרת המקום'}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <div className="inline-flex overflow-hidden rounded-full border border-violet-200 bg-white" role="group" aria-label="סוג פעילות">
                {[['practice', 'תרגול'], ['exam', 'מבחן']].map(([value, text]) => (
                  <button key={value} type="button" aria-pressed={place.activityType === value} onClick={() => update(index, { activityType: value })} className={`px-3 py-1 font-bold ${place.activityType === value ? 'bg-violet-600 text-white' : 'text-slate-600'}`}>
                    {text}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                מיקום
                <input type="number" min="1" value={place.requestedIndex} onChange={event => update(index, { requestedIndex: event.target.value })} placeholder={draft.original.id ? 'ללא שינוי' : 'בסוף'} className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1" />
              </label>
            </div>
          </li>
        ))}
      </ul>
      {draft.places.length > 1 && <p className="mt-2 text-sm text-slate-600">זו אותה שאלה ב-{draft.places.length} מקומות. שינוי בנוסח או בתשובות מתעדכן בכולם.</p>}

      {picking ? (
        <div className="mt-3">
          <PlacePicker groups={groups} lockedKeys={new Set(draft.places.map(placeKey))} chosen={chosen} onChange={setChosen} />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={addChosen} disabled={chosen.length === 0} className="btn-primary px-4 py-2 text-sm disabled:opacity-40">הוספה ({chosen.length})</button>
            <button type="button" onClick={() => { setPicking(false); setChosen([]) }} className="btn-muted px-4 py-2 text-sm">סגירת הרשימה</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} className="btn-secondary mt-3 px-4 py-2 text-sm">
          <Plus className="h-4 w-4" />
          שיוך לנושא או תת-נושא נוסף
        </button>
      )}
    </section>
  )
}

// onSave(built, addAnother) מחזיר Promise
export default function QuestionEditor({ initialDraft, groups, onSave, onCancel, onDuplicate }) {
  const [draft, setDraft] = useState(initialDraft)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isEdit = Boolean(draft.original.id)
  const isChoice = CHOICE_TYPES.has(draft.type)

  const update = changes => { setError(''); setDraft(previous => ({ ...previous, ...changes })) }
  const updateOption = (index, text) => update({ options: draft.options.map((option, i) => (i === index ? { ...option, text } : option)) })
  const updateAnswer = (index, value) => update({ answers: draft.answers.map((answer, i) => (i === index ? value : answer)) })

  async function save(addAnother) {
    const built = buildQuestion(draft)
    if (built.error) {
      setError(built.error)
      return
    }
    setBusy(true)
    const saved = await onSave(built, addAnother)
    setBusy(false)
    // שאלה הבאה: אותם מקומות ואותו סוג, שדות ריקים
    if (saved && addAnother) {
      setDraft(previous => ({
        ...previous,
        text: '',
        explanation: '',
        original: {},
        unmatched: [],
        answers: [''],
        options: previous.options.slice(0, Math.max(2, previous.options.length)).map(() => ({ text: '', image: '', correct: false })),
        places: previous.places.map(place => ({ ...place, requestedIndex: '' })),
      }))
      document.getElementById('question-text')?.focus()
    }
  }

  return (
    <form onSubmit={event => { event.preventDefault(); save(false) }} className="flex flex-col gap-4">
      <PlacesSection draft={draft} groups={groups} onChange={places => update({ places })} />

      <section className={section}>
        <span className={label}>סוג שאלה</span>
        <div className="flex flex-wrap gap-2">
          {TYPES.filter(([value]) => value !== 'self_check' || SELF_CHECK_ENABLED || draft.type === 'self_check').map(([value, text]) => (
            <button key={value} type="button" aria-pressed={draft.type === value} onClick={() => update({ type: value })} className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold ${draft.type === value ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700'}`}>
              {text}
            </button>
          ))}
        </div>

        <label className={`${label} mt-4`} htmlFor="question-text">נוסח השאלה</label>
        <textarea id="question-text" rows={3} value={draft.text} onChange={event => update({ text: event.target.value })} className="input-field" placeholder="כתבו כאן את השאלה" />

        {isChoice ? (
          <div className="mt-4">
            <span className={label}>אפשרויות תשובה. לוחצים על העיגול שליד התשובה הנכונה</span>
            {draft.unmatched.length > 0 && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                התשובה השמורה ({draft.unmatched.join(' / ')}) לא תואמת לאף אפשרות, ולכן תלמיד לא יכול לענות נכון. סמנו את התשובה הנכונה.
              </p>
            )}
            <div className="space-y-2">
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button type="button" onClick={() => { setError(''); setDraft(previous => markCorrect(previous, index)) }} aria-pressed={option.correct} aria-label={`סימון אפשרות ${index + 1} כתשובה הנכונה`} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold ${option.correct ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-500'}`}>
                    {option.correct ? <Check className="h-5 w-5" /> : (OPTION_LETTERS[index] || index + 1)}
                  </button>
                  <input value={option.text} onChange={event => updateOption(index, event.target.value)} className="input-field flex-1" placeholder={`אפשרות ${index + 1}`} />
                  {option.image && <img src={option.image} alt={`תמונת אפשרות ${index + 1}`} className="h-10 w-14 shrink-0 object-contain" />}
                  <button type="button" onClick={() => update({ options: draft.options.filter((_, i) => i !== index) })} disabled={draft.options.length <= 2} className="p-2 text-slate-500 disabled:opacity-25" aria-label={`הסרת אפשרות ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {draft.options.length < MAX_OPTIONS && (
              <button type="button" onClick={() => update({ options: [...draft.options, { text: '', image: '', correct: false }] })} className="btn-secondary mt-2 px-4 py-2 text-sm">
                <Plus className="h-4 w-4" />אפשרות
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <span className={label}>
              {draft.type === 'list' ? 'פריטים מקובלים (אפשר חלופות עם |, למשל גלבוע|הר הגלבוע)' : draft.type === 'self_check' ? 'התשובה המלאה שתוצג לתלמיד' : 'תשובות נכונות'}
            </span>
            {draft.type === 'list' && (
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
                <label className="flex items-center gap-2">כמה פריטים נדרשים מהתלמיד:
                  <input type="number" min="1" value={draft.minItems} onChange={event => update({ minItems: event.target.value })} className="input-field w-24" />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={draft.ordered} onChange={event => update({ ordered: event.target.checked })} />
                  הסדר חשוב
                </label>
              </div>
            )}
            {draft.answers.map((answer, index) => (
              <div key={index} className="flex items-center gap-2">
                {draft.type === 'self_check' && index === 0
                  ? <textarea rows={3} value={answer} onChange={event => updateAnswer(index, event.target.value)} className="input-field flex-1" aria-label="התשובה המלאה" />
                  : <input value={answer} onChange={event => updateAnswer(index, event.target.value)} className="input-field flex-1" placeholder={index === 0 ? 'תשובה נכונה' : `תשובה נוספת ${index}`} />}
                {draft.answers.length > 1 && (
                  <button type="button" onClick={() => update({ answers: draft.answers.filter((_, i) => i !== index) })} className="p-2 text-red-600" aria-label={`הסרת תשובה ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => update({ answers: [...draft.answers, ''] })} className="btn-secondary px-4 py-2 text-sm">
              <Plus className="h-4 w-4" />הוספת תשובה נוספת
            </button>
            {draft.type === 'open' && <p className="text-xs text-slate-500">בשאלה פתוחה המערכת מזהה לבד טעויות כתיב קטנות, כתיב מלא וחסר, תארים (הנביא, המלך), &quot;בן ...&quot;, מספרים במילים או בספרות (חמישים = 50) ויחידות. צריך להוסיף כאן רק ניסוחים שונים לגמרי.</p>}
          </div>
        )}

        <label className={`${label} mt-4`} htmlFor="question-explanation">הסבר (לא חובה, מוצג לתלמיד אחרי התשובה)</label>
        <input id="question-explanation" value={draft.explanation} onChange={event => update({ explanation: event.target.value })} className="input-field" placeholder="למשל: רק היא אינה פרח" />
      </section>

      <details className={section}>
        <summary className="cursor-pointer text-base font-bold text-slate-900">תצוגה מקדימה</summary>
        <Preview draft={draft} />
      </details>

      {isEdit && (
        <button type="button" onClick={() => onDuplicate(draft)} className="btn-muted self-start px-3 py-2 text-sm">
          <Copy className="h-4 w-4" />
          שכפול כעותק נפרד (שינויים בעותק לא ישפיעו על המקור)
        </button>
      )}

      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-slate-200 bg-white px-6 py-3">
        {error && <p role="alert" className="mb-2 text-right font-bold text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            <Save className="h-4 w-4" />
            {busy ? 'שומרים...' : 'שמירת שאלה'}
          </button>
          {!isEdit && <button type="button" disabled={busy} onClick={() => save(true)} className="btn-secondary disabled:opacity-60">שמירה והוספת עוד</button>}
          <button type="button" onClick={onCancel} className="btn-muted">ביטול</button>
        </div>
      </div>
    </form>
  )
}

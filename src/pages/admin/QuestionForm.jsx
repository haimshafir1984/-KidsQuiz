import { useEffect, useState } from 'react'
import { SELF_CHECK_ENABLED } from '../../utils/questionAnswers'
import { Plus, Save, Trash2 } from 'lucide-react'
import { GRADES } from '../../data/learningTracks'
import { defaultActivity } from './adminShared'

export function LinkQuestionForm({ trackCatalog, question, onLink }) {
  const [targetGrade, setTargetGrade] = useState(GRADES[0]?.value || 'grade-8')
  const [targetSubject, setTargetSubject] = useState('')
  const [targetLevel, setTargetLevel] = useState(null)
  const [targetActivity, setTargetActivity] = useState('practice')

  const availableTracks = trackCatalog[targetGrade] || []
  const activeTrack = availableTracks.find(track => track.subject === targetSubject) || availableTracks[0]
  const levels = activeTrack?.levels?.length ? activeTrack.levels : ['ללא רמה']
  const activities = activeTrack?.activities?.length ? activeTrack.activities : ['practice']

  useEffect(() => {
    if (!activeTrack) return
    setTargetSubject(activeTrack.subject)
    setTargetLevel(activeTrack.levels?.[0] || null)
    setTargetActivity(defaultActivity(activeTrack))
  }, [targetGrade])

  if (!question?.id) return null

  return (
    <section className="rounded-xl border border-dashed border-slate-300 p-4">
      <div className="text-right">
        <h4 className="text-lg font-bold text-slate-950">שיוך לקטגוריות נוספות</h4>
        <p className="mt-1 text-sm text-slate-600">השאלה משוכפלת ליעד נוסף בלי למחוק את המקור.</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <select value={targetGrade} onChange={event => setTargetGrade(event.target.value)} className="input-field">
          {GRADES.map(grade => (
            <option key={grade.value} value={grade.value}>{grade.label}</option>
          ))}
        </select>
        <select value={targetSubject} onChange={event => setTargetSubject(event.target.value)} className="input-field">
          {availableTracks.map(track => (
            <option key={track.subject} value={track.subject}>{track.subject}</option>
          ))}
        </select>
        <select
          value={targetLevel || 'ללא רמה'}
          onChange={event => setTargetLevel(event.target.value === 'ללא רמה' ? null : event.target.value)}
          className="input-field"
        >
          {levels.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
        <select value={targetActivity} onChange={event => setTargetActivity(event.target.value)} className="input-field">
          {activities.map(activity => (
            <option key={activity} value={activity}>{activity === 'exam' ? 'מבחן' : 'תרגול'}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => onLink({
            grade: targetGrade,
            subject: targetSubject,
            level: targetLevel,
            activityType: targetActivity,
          })}
          className="btn-secondary"
        >
          שכפול ושיוך
        </button>
      </div>
    </section>
  )
}

export function QuestionPreview({ question }) {
  const previewOptions = (question.type === 'multiple' || question.type === 'sentence_completion') ? question.options.filter(Boolean) : []

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
      <div className="mb-2 text-sm font-semibold text-slate-500">תצוגה מקדימה</div>
      {question.groupTitle && <div className="mb-2 text-xs font-bold text-slate-500">{question.groupTitle}</div>}
      <h4 className="text-lg font-bold text-slate-950">{question.text || 'כאן תופיע השאלה'}</h4>
      {question.image && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <img src={question.image} alt={question.text || 'תצוגת שאלה'} className="mx-auto max-h-48 max-w-full object-contain" />
        </div>
      )}
      {previewOptions.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {previewOptions.map((option, index) => (
            <div key={`${option}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                  {['א', 'ב', 'ג', 'ד', 'ה', 'ו'][index]}
                </span>
                <span>{option}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 text-sm text-emerald-700">תשובה נכונה: {question.correct_answer.filter(Boolean).join(' / ') || 'עדיין לא הוגדרה'}</div>
      {question.explanation && <div className="mt-2 text-sm text-slate-600">הסבר: {question.explanation}</div>}
    </section>
  )
}

export function QuestionForm({ initialQuestion, trackCatalog, onSave, onCancel, onLinkQuestion, onError }) {
  const [form, setForm] = useState(initialQuestion)

  useEffect(() => {
    setForm(initialQuestion)
  }, [initialQuestion])

  const availableSubjects = trackCatalog[form.grade] || []
  const activeTrack = availableSubjects.find(track => track.subject === form.subject) || availableSubjects[0]
  const availableLevels = activeTrack?.levels?.length ? activeTrack.levels : ['ללא רמה']
  const availableActivities = activeTrack?.activities || ['practice']

  function updateField(field, value) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  function handleGradeChange(grade) {
    const firstTrack = trackCatalog[grade]?.[0]
    setForm(previous => ({
      ...previous,
      grade,
      subject: firstTrack?.subject || '',
      level: firstTrack?.levels?.[0] || null,
      activityType: defaultActivity(firstTrack),
    }))
  }

  function handleSubjectChange(subject) {
    const nextTrack = (trackCatalog[form.grade] || []).find(track => track.subject === subject)
    setForm(previous => ({
      ...previous,
      subject,
      level: nextTrack?.levels?.[0] || null,
      activityType: defaultActivity(nextTrack),
    }))
  }

  function updateOption(index, value) {
    const nextOptions = [...form.options]
    nextOptions[index] = value
    updateField('options', nextOptions)
  }

  function updateCorrectAnswer(index, value) {
    const nextAnswers = [...form.correct_answer]
    nextAnswers[index] = value
    updateField('correct_answer', nextAnswers)
  }

  function addCorrectAnswer() {
    updateField('correct_answer', [...form.correct_answer, ''])
  }

  function removeCorrectAnswer(index) {
    const nextAnswers = form.correct_answer.filter((_, answerIndex) => answerIndex !== index)
    updateField('correct_answer', nextAnswers.length > 0 ? nextAnswers : [''])
  }

  function handleSubmit(event) {
    event.preventDefault()

    const cleaned = {
      ...form,
      level: form.level || null,
      position: Number(form.position) > 0 ? Number(form.position) : undefined,
      explanation: form.explanation?.trim() || '',
      options: (form.type === 'multiple' || form.type === 'sentence_completion') ? form.options.filter(option => option.trim()) : [],
      ...(form.type === 'list'
        ? { minItems: Math.max(1, Number(form.minItems) || 1), ordered: Boolean(form.ordered) }
        : { minItems: undefined, ordered: undefined }),
      correct_answer: form.correct_answer.filter(answer => answer.trim()),
    }

    if (!cleaned.text.trim()) {
      onError('יש להזין נוסח שאלה.')
      return
    }

    if (!cleaned.subject) {
      onError('יש לבחור נושא.')
      return
    }

    if (cleaned.correct_answer.length === 0) {
      onError('יש להזין לפחות תשובה נכונה אחת.')
      return
    }

    if ((cleaned.type === 'multiple' || cleaned.type === 'sentence_completion') && cleaned.options.length < 2) {
      onError('יש להזין לפחות שתי אפשרויות תשובה.')
      return
    }

    onSave(cleaned)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <QuestionPreview question={form} />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-right">
          <h3 className="text-lg font-bold text-slate-950">תוכן השאלה</h3>
          <p className="mt-1 text-sm text-slate-600">עריכה מלאה של נוסח השאלה, התשובות והסבר המשוב.</p>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold text-slate-700">נוסח השאלה</label>
          <textarea
            value={form.text}
            onChange={event => updateField('text', event.target.value)}
            rows={3}
            className="input-field"
            placeholder="כתבו כאן את השאלה"
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">סוג שאלה</label>
            <select value={form.type} onChange={event => updateField('type', event.target.value)} className="input-field">
              <option value="multiple">אמריקאית</option>
              <option value="open">פתוחה קצרה</option>
              <option value="sentence_completion">השלמת משפטים</option>
              <option value="list">רשימה (כתבי כמה)</option>
              {(SELF_CHECK_ENABLED || form.type === 'self_check') && <option value="self_check">הסבר (בדיקה עצמית)</option>}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">שדה הסבר</label>
            <input
              value={form.explanation || ''}
              onChange={event => updateField('explanation', event.target.value)}
              className="input-field"
              placeholder="למשל: רק היא אינה פרח"
            />
          </div>
        </div>

        {(form.type === 'multiple' || form.type === 'sentence_completion') && (
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-semibold text-slate-700">אפשרויות תשובה</label>
            {form.options.map((option, index) => (
              <input
                key={index}
                value={option}
                onChange={event => updateOption(index, event.target.value)}
                className="input-field"
                placeholder={`אפשרות ${index + 1}`}
              />
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            {form.type === 'list' ? 'פריטים מקובלים (אפשר חלופות עם |, למשל גלבוע|הר הגלבוע)' : form.type === 'self_check' ? 'התשובה המלאה שתוצג לתלמיד' : 'תשובות נכונות'}
          </label>
          {form.type === 'list' && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">כמה פריטים נדרשים מהתלמיד:</span>
              <input
                type="number"
                min="1"
                value={form.minItems ?? ''}
                onChange={event => updateField('minItems', event.target.value)}
                className="input-field w-24"
              />
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.ordered)}
                  onChange={event => updateField('ordered', event.target.checked)}
                />
                הסדר חשוב
              </label>
            </div>
          )}
          {form.correct_answer.map((answer, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={answer}
                onChange={event => updateCorrectAnswer(index, event.target.value)}
                className="input-field flex-1"
                placeholder={index === 0 ? 'תשובה נכונה' : `תשובה נוספת ${index}`}
              />
              {form.correct_answer.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCorrectAnswer(index)}
                  className="btn-muted px-3 py-2 text-red-600"
                  aria-label={`הסרת תשובה ${index + 1}`}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addCorrectAnswer} className="btn-secondary px-4 py-2 text-sm">
            <Plus size={16} className="ml-1 inline" />
            הוספת תשובה נוספת
          </button>
          {form.type === 'open' && (
            <p className="text-xs text-slate-500">בשאלה פתוחה המערכת מזהה לבד טעויות כתיב קטנות, כתיב מלא וחסר, תארים (הנביא, המלך), "בן ...", מספרים במילים או בספרות (חמישים = 50) ויחידות (50 מ' = חמישים מטר). צריך להוסיף כאן רק ניסוחים שונים לגמרי.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-right">
          <h3 className="text-lg font-bold text-slate-950">שיוך ומיקום</h3>
          <p className="mt-1 text-sm text-slate-600">כל השליטה על קטגוריה, נושא, רמה, פעילות ומיקום נשמרת כאן.</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">קטגוריה</label>
            <select value={form.grade} onChange={event => handleGradeChange(event.target.value)} className="input-field">
              {GRADES.map(grade => (
                <option key={grade.value} value={grade.value}>{grade.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">נושא</label>
            <select value={form.subject} onChange={event => handleSubjectChange(event.target.value)} className="input-field">
              {availableSubjects.map(track => (
                <option key={track.subject} value={track.subject}>{track.subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">רמה</label>
            <select
              value={form.level || 'ללא רמה'}
              onChange={event => updateField('level', event.target.value === 'ללא רמה' ? null : event.target.value)}
              className="input-field"
            >
              {availableLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">סוג פעילות</label>
            <select value={form.activityType} onChange={event => updateField('activityType', event.target.value)} className="input-field">
              {availableActivities.map(activity => (
                <option key={activity} value={activity}>{activity === 'exam' ? 'מבחן' : 'תרגול'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">מיקום</label>
            <input
              type="number"
              min="1"
              value={form.position ?? ''}
              onChange={event => updateField('position', event.target.value)}
              placeholder="בסוף"
              className="input-field"
            />
          </div>
        </div>
      </section>

      {initialQuestion?.id && (
        <LinkQuestionForm trackCatalog={trackCatalog} question={initialQuestion} onLink={onLinkQuestion} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn-primary">
          <Save className="h-4 w-4" />
          שמירת שאלה
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          ביטול
        </button>
      </div>
    </form>
  )
}

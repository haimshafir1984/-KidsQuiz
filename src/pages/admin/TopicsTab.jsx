import { useState } from 'react'
import { Plus, Save, Trash2, BookCopy } from 'lucide-react'
import { GRADES } from '../../data/learningTracks'
import { API_ENABLED } from '../../utils/api'

export function TopicsTab({ trackCatalog, onRename, onDelete, onAddQuestion, onAssign }) {
  const [grade, setGrade] = useState(GRADES[0]?.value || 'grade-8')
  const [drafts, setDrafts] = useState({})
  const [assignmentState, setAssignmentState] = useState({})
  const topics = trackCatalog[grade] || []

  function getDraft(subject) {
    return drafts[`${grade}::${subject}`] ?? subject
  }

  function setDraft(subject, value) {
    setDrafts(previous => ({ ...previous, [`${grade}::${subject}`]: value }))
  }

  function getAssignmentDraft(subject) {
    return assignmentState[`${grade}::${subject}`] || {
      targetGrade: GRADES.find(item => item.value !== grade)?.value || grade,
      includeQuestions: false,
      open: false,
    }
  }

  function updateAssignmentDraft(subject, data) {
    setAssignmentState(previous => ({
      ...previous,
      [`${grade}::${subject}`]: {
        ...getAssignmentDraft(subject),
        ...data,
      },
    }))
  }

  return (
    <section className="edu-card p-0 overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-950">ניהול נושאים</h2>
            <p className="mt-1 text-sm text-slate-600">אפשר לשנות שם נושא, למחוק אותו, או להוסיף שאלה ישירות לנושא.</p>
          </div>
          <div className="w-full lg:max-w-xs">
            <label className="mb-1 block text-sm font-semibold text-slate-700">קטגוריה</label>
            <select value={grade} onChange={event => setGrade(event.target.value)} className="input-field">
              {GRADES.map(item => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(0,1.4fr)_160px_140px_420px] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-right text-xs font-bold text-slate-500 lg:grid">
        <div>שם נושא</div>
        <div>סוג שאלות</div>
        <div>רמות</div>
        <div>פעולות</div>
      </div>

      <div className="divide-y divide-slate-100">
        {topics.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-500">אין עדיין נושאים בקטגוריה הזו.</div>
        ) : (
          topics.map(topic => {
            const draft = getDraft(topic.subject)
            const changed = draft.trim() !== topic.subject
            const assignment = getAssignmentDraft(topic.subject)

            return (
              <div key={`${grade}-${topic.subject}`} className="px-6 py-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_160px_140px_420px] lg:items-center">
                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-500 lg:hidden">שם נושא</div>
                    <input
                      value={draft}
                      onChange={event => setDraft(topic.subject, event.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-500 lg:hidden">סוג שאלות</div>
                    <div className="rounded-lg bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700">
                      {topic.questionTypes}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-bold text-slate-500 lg:hidden">רמות</div>
                    <div className="rounded-lg bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700">
                      {topic.levels.length > 0 ? `${topic.levels.length} רמות` : 'ללא רמות'}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button type="button" onClick={() => onAddQuestion(grade, topic.subject)} className="btn-primary px-4 py-2 text-sm">
                        <Plus className="h-4 w-4" />
                        שאלה
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAssignmentDraft(topic.subject, { open: !assignment.open })}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        <BookCopy className="h-4 w-4" />
                        שיוך נושא לכיתה
                      </button>
                      {changed && (
                        <button type="button" onClick={() => onRename(grade, topic.subject, draft)} className="btn-secondary px-4 py-2 text-sm">
                          <Save className="h-4 w-4" />
                          שמירה
                        </button>
                      )}
                      <button type="button" onClick={() => onDelete(grade, topic.subject)} className="btn-danger px-4 py-2 text-sm">
                        <Trash2 className="h-4 w-4" />
                        מחיקה
                      </button>
                    </div>
                  </div>
                </div>

                {assignment.open && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 text-right text-sm font-bold text-slate-800">
                      שיוך הנושא לקטגוריה נוספת
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_170px] lg:items-end">
                      <label className="text-right">
                        <span className="mb-1 block text-xs font-bold text-slate-500">קטגוריית יעד</span>
                        <select
                          value={assignment.targetGrade}
                          onChange={event => updateAssignmentDraft(topic.subject, { targetGrade: event.target.value })}
                          className="input-field"
                        >
                          {GRADES.filter(item => item.value !== grade).map(item => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                        <span>לשייך גם את השאלות</span>
                        <input
                          type="checkbox"
                          checked={assignment.includeQuestions}
                          onChange={event => updateAssignmentDraft(topic.subject, { includeQuestions: event.target.checked })}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onAssign({
                          sourceGrade: grade,
                          sourceSubject: topic.subject,
                          targetGrade: assignment.targetGrade,
                          includeQuestions: assignment.includeQuestions,
                        })}
                        className="btn-primary w-full justify-center px-4 py-2 text-sm"
                      >
                        ביצוע שיוך
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export function TopicForm({ onSave, onCancel, onError }) {
  const [form, setForm] = useState({
    grade: GRADES[0]?.value || 'grade-8',
    subject: '',
    questionTypes: 'מותאם אישית',
    levelsText: '',
    hasExam: false,
  })

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.subject.trim()) {
      onError('יש להזין שם נושא.')
      return
    }

    onSave({
      grade: form.grade,
      subject: form.subject,
      questionTypes: form.questionTypes,
      levels: form.levelsText.split(',').map(item => item.trim()).filter(Boolean),
      activities: form.hasExam ? ['practice', 'exam'] : ['practice'],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="edu-card flex flex-col gap-4">
      <div className="text-right">
        <h3 className="text-xl font-bold text-slate-950">הוספת נושא חדש</h3>
        <p className="mt-1 text-sm text-slate-600">
          {API_ENABLED ? 'הנושא נשמר בשרת. תלמידים יראו אותו אחרי שתהיה בו לפחות שאלה אחת.' : 'מוגדר פעם אחת ומופיע מיד גם באופליין דרך האחסון המקומי.'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">קטגוריה</label>
          <select
            value={form.grade}
            onChange={event => setForm(previous => ({ ...previous, grade: event.target.value }))}
            className="input-field"
          >
            {GRADES.map(grade => (
              <option key={grade.value} value={grade.value}>{grade.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">שם הנושא</label>
          <input
            value={form.subject}
            onChange={event => setForm(previous => ({ ...previous, subject: event.target.value }))}
            className="input-field"
            placeholder="למשל: אתגר זיכרון"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">תיאור סוגי שאלות</label>
          <input
            value={form.questionTypes}
            onChange={event => setForm(previous => ({ ...previous, questionTypes: event.target.value }))}
            className="input-field"
            placeholder="למשל: פתוחות, סגורות ותמונות"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">רמות</label>
          <input
            value={form.levelsText}
            onChange={event => setForm(previous => ({ ...previous, levelsText: event.target.value }))}
            className="input-field"
            placeholder="ללא רמות או רמה 1, רמה 2"
          />
        </div>
      </div>

      <label className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-700">
        <span>לאפשר גם מצב מבחן לנושא הזה</span>
        <input
          type="checkbox"
          checked={form.hasExam}
          onChange={event => setForm(previous => ({ ...previous, hasExam: event.target.checked }))}
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn-primary">שמירת נושא</button>
        <button type="button" onClick={onCancel} className="btn-secondary">ביטול</button>
      </div>
    </form>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  BookCopy,
  FileQuestion,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import AdminUsers from './AdminUsers'
import { GRADES, getGradeConfig } from '../data/learningTracks'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import ToastViewport from '../components/shared/ToastViewport'
import { serverGetStats } from '../utils/db'

const PAGE_SIZE = 25

function createQuestionDraft(trackCatalog, grade, subject) {
  const fallbackGrade = grade || GRADES[0]?.value || 'grade-8'
  const availableTracks = trackCatalog[fallbackGrade] || []
  const activeTrack = availableTracks.find(track => track.subject === subject) || availableTracks[0]

  return {
    text: '',
    type: 'multiple',
    options: ['', '', '', ''],
    correct_answer: [''],
    grade: fallbackGrade,
    subject: activeTrack?.subject || '',
    level: activeTrack?.levels?.[0] || null,
    activityType: activeTrack?.activities?.[0] || 'practice',
    position: 1,
    explanation: '',
  }
}

function createToast(message, type = 'info', title = '') {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
    title,
    duration: 3200,
  }
}

function TabButton({ active, label, count, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-slate-500 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
        {count}
      </span>
    </button>
  )
}

function SummaryHeader({ activeTab, onNewQuestion, onExport }) {
  return (
    <section className="edu-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-slate-950">מסך ניהול</h1>
          <p className="mt-2 text-sm text-slate-600">
            ניהול מרוכז של שאלות, נושאים ומשתמשים, עם מבנה קל לסריקה ותואם גם לעבודה מקומית.
          </p>
        </div>

        {activeTab === 'questions' && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onExport} className="btn-secondary">
              <Download className="h-4 w-4" />
              ייצוא JSON
            </button>
            <button type="button" onClick={onNewQuestion} className="btn-primary">
              <Plus className="h-4 w-4" />
              שאלה חדשה
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function TopicsTab({ trackCatalog, onRename, onDelete, onAddQuestion, onAssign }) {
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
            <p className="mt-1 text-sm text-slate-600">עריכה inline של שם נושא, מחיקה, או פתיחת הוספת שאלה ישירות לנושא.</p>
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

function TopicForm({ onSave, onCancel, onError }) {
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
        <p className="mt-1 text-sm text-slate-600">מוגדר פעם אחת ומופיע מיד גם באופליין דרך האחסון המקומי.</p>
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

function LinkQuestionForm({ trackCatalog, question, onLink }) {
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
    setTargetActivity(activeTrack.activities?.[0] || 'practice')
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

function QuestionPreview({ question }) {
  const previewOptions = question.type === 'open' ? [] : question.options.filter(Boolean)

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
      {question.type !== 'open' && (
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

function QuestionForm({ initialQuestion, trackCatalog, onSave, onCancel, onLinkQuestion, onError }) {
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
      activityType: firstTrack?.activities?.[0] || 'practice',
    }))
  }

  function handleSubjectChange(subject) {
    const nextTrack = (trackCatalog[form.grade] || []).find(track => track.subject === subject)
    setForm(previous => ({
      ...previous,
      subject,
      level: nextTrack?.levels?.[0] || null,
      activityType: nextTrack?.activities?.[0] || 'practice',
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

  function handleSubmit(event) {
    event.preventDefault()

    const cleaned = {
      ...form,
      level: form.level || null,
      position: Number(form.position) || 1,
      explanation: form.explanation?.trim() || '',
      options: form.type === 'open' ? [] : form.options.filter(option => option.trim()),
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

    if (cleaned.type !== 'open' && cleaned.options.length < 2) {
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

        {form.type !== 'open' && (
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
          <label className="block text-sm font-semibold text-slate-700">תשובות נכונות</label>
          {form.correct_answer.map((answer, index) => (
            <input
              key={index}
              value={answer}
              onChange={event => updateCorrectAnswer(index, event.target.value)}
              className="input-field"
              placeholder="תשובה נכונה"
            />
          ))}
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
              value={form.position}
              onChange={event => updateField('position', event.target.value)}
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

function Drawer({ open, title, subtitle, onClose, children }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/40">
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={onClose} className="btn-muted px-3 py-2">
              <X className="h-4 w-4" />
              סגירה
            </button>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-950">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
            </div>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function BulkActionsBar({ selectedCount, onDeleteSelected, onClear }) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky top-24 z-20 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-right text-sm font-semibold text-blue-800">
          {selectedCount} שאלות נבחרו
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onDeleteSelected} className="btn-danger px-4 py-2 text-sm">
            <Trash2 className="h-4 w-4" />
            מחיקת הנבחרות
          </button>
          <button type="button" onClick={onClear} className="btn-secondary px-4 py-2 text-sm">
            ניקוי בחירה
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionsTable({
  questions,
  selectedIds,
  onToggleSelect,
  onToggleSelectPage,
  onMove,
  onDelete,
  onEdit,
  onQuickUpdate,
  trackCatalog,
}) {
  const [editingCell, setEditingCell] = useState(null)
  const pageSelected = questions.length > 0 && questions.every(question => selectedIds.has(question.id))

  function getTracksForGrade(grade) {
    return trackCatalog[grade] || []
  }

  function getTrackForSubject(grade, subject) {
    return getTracksForGrade(grade).find(track => track.subject === subject) || null
  }

  function closeEditingCell() {
    setEditingCell(null)
  }

  function updateSubject(question, nextSubject) {
    const targetTrack = getTrackForSubject(question.grade, nextSubject)
    const nextLevels = targetTrack?.levels || []
    const nextActivities = targetTrack?.activities || ['practice']

    onQuickUpdate(question.id, {
      subject: nextSubject,
      level: nextLevels.length === 0
        ? null
        : nextLevels.includes(question.level)
          ? question.level
          : nextLevels[0],
      activityType: nextActivities.includes(question.activityType)
        ? question.activityType
        : nextActivities[0],
    })

    closeEditingCell()
  }

  function updateLevel(question, nextLevel) {
    onQuickUpdate(question.id, { level: nextLevel === 'no-level' ? null : nextLevel })
    closeEditingCell()
  }

  function updateActivity(question, nextActivity) {
    onQuickUpdate(question.id, { activityType: nextActivity })
    closeEditingCell()
  }

  function renderInlineSelect({ value, options, onChange, ariaLabel }) {
    return (
      <select
        autoFocus
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={closeEditingCell}
        className="input-field h-10 min-w-[140px] py-2 text-sm"
        aria-label={ariaLabel}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    )
  }

  return (
    <section className="edu-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-right text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3">
                <input type="checkbox" checked={pageSelected} onChange={() => onToggleSelectPage(pageSelected)} />
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700">שאלה</th>
              <th className="px-4 py-3 font-semibold text-slate-700">ניהול</th>
              <th className="px-4 py-3 font-semibold text-slate-700">מיקום</th>
              <th className="px-4 py-3 font-semibold text-slate-700">נושא</th>
              <th className="px-4 py-3 font-semibold text-slate-700">רמה</th>
              <th className="px-4 py-3 font-semibold text-slate-700">סוג</th>
              <th className="px-4 py-3 font-semibold text-slate-700">סוג פעילות</th>
            </tr>
          </thead>
          <tbody>
            {questions.map(question => {
              const gradeLabel = getGradeConfig(question.grade)?.label || question.grade
              const typeLabel = question.type === 'multiple'
                ? 'אמריקאית'
                : question.type === 'sentence_completion'
                  ? 'השלמת משפטים'
                  : 'פתוחה'

              return (
                <tr key={question.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(question.id)}
                      onChange={() => onToggleSelect(question.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[400px]">
                      <div className="font-semibold text-slate-900">{question.text}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        תשובה: {question.correct_answer.join(' / ')} | {gradeLabel} | מיקום {question.position || 1}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[280px] flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        title="עריכה"
                        onClick={() => onEdit(question)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                        עריכה
                      </button>
                      <button
                        type="button"
                        title="עריכה מלאה"
                        onClick={() => onFullEdit(question)}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        <Plus className="h-4 w-4" />
                        עריכה מלאה
                      </button>
                      <button
                        type="button"
                        title="מחיקה"
                        onClick={() => onDelete(question.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        מחיקה
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{question.subject}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{question.level || 'ללא רמה'}</td>
                  <td className="px-4 py-3 text-slate-600">{typeLabel}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      question.activityType === 'exam' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {question.activityType === 'exam' ? 'מבחן' : 'תרגול'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[120px] items-center justify-end gap-2 whitespace-nowrap">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {question.position || 1}
                      </span>
                      <button type="button" title="הזזה למעלה" onClick={() => onMove(question.id, 'up')} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" title="הזזה למטה" onClick={() => onMove(question.id, 'down')} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function InlineQuestionsTable({
  questions,
  selectedIds,
  onToggleSelect,
  onToggleSelectPage,
  onMove,
  onDelete,
  onEdit,
  onQuickUpdate,
  trackCatalog,
}) {
  const [editingCell, setEditingCell] = useState(null)
  const pageSelected = questions.length > 0 && questions.every(question => selectedIds.has(question.id))

  function getTracksForGrade(grade) {
    return trackCatalog[grade] || []
  }

  function getTrackForSubject(grade, subject) {
    return getTracksForGrade(grade).find(track => track.subject === subject) || null
  }

  function closeEditingCell() {
    setEditingCell(null)
  }

  function updateSubject(question, nextSubject) {
    const targetTrack = getTrackForSubject(question.grade, nextSubject)
    const nextLevels = targetTrack?.levels || []
    const nextActivities = targetTrack?.activities || ['practice']

    onQuickUpdate(question.id, {
      subject: nextSubject,
      level: nextLevels.length === 0
        ? null
        : nextLevels.includes(question.level)
          ? question.level
          : nextLevels[0],
      activityType: nextActivities.includes(question.activityType)
        ? question.activityType
        : nextActivities[0],
    })

    closeEditingCell()
  }

  function updateLevel(question, nextLevel) {
    onQuickUpdate(question.id, { level: nextLevel === 'no-level' ? null : nextLevel })
    closeEditingCell()
  }

  function updateActivity(question, nextActivity) {
    onQuickUpdate(question.id, { activityType: nextActivity })
    closeEditingCell()
  }

  function renderInlineSelect({ value, options, onChange, ariaLabel }) {
    return (
      <select
        autoFocus
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={closeEditingCell}
        className="input-field h-10 min-w-[140px] py-2 text-sm"
        aria-label={ariaLabel}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    )
  }

  return (
    <section className="edu-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-right text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3">
                <input type="checkbox" checked={pageSelected} onChange={() => onToggleSelectPage(pageSelected)} />
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700">שאלה</th>
              <th className="px-4 py-3 font-semibold text-slate-700">נושא</th>
              <th className="px-4 py-3 font-semibold text-slate-700">רמה</th>
              <th className="px-4 py-3 font-semibold text-slate-700">סוג</th>
              <th className="px-4 py-3 font-semibold text-slate-700">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {questions.map(question => {
              const gradeLabel = getGradeConfig(question.grade)?.label || question.grade
              const gradeTracks = getTracksForGrade(question.grade)
              const currentTrack = getTrackForSubject(question.grade, question.subject)
              const subjectOptions = gradeTracks.map(track => ({ value: track.subject, label: track.subject }))
              const levelOptions = currentTrack?.levels?.length
                ? currentTrack.levels.map(level => ({ value: level, label: level }))
                : [{ value: 'no-level', label: 'ללא רמה' }]
              const activityOptions = (currentTrack?.activities?.length ? currentTrack.activities : ['practice', 'exam']).map(activity => ({
                value: activity,
                label: activity === 'exam' ? 'מבחן' : 'תרגול',
              }))
              const activityLabel = question.activityType === 'exam' ? 'מבחן' : 'תרגול'

              return (
                <tr key={question.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(question.id)}
                      onChange={() => onToggleSelect(question.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[520px]">
                      {question.groupTitle && (
                        <div className="mb-1 text-xs font-bold text-slate-500">{question.groupTitle}</div>
                      )}
                      <div className="font-semibold text-slate-900">{question.text}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        תשובה: {question.correct_answer.join(' / ')} | {gradeLabel}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {editingCell?.id === question.id && editingCell?.field === 'subject'
                      ? renderInlineSelect({
                        value: question.subject,
                        options: subjectOptions,
                        onChange: value => updateSubject(question, value),
                        ariaLabel: 'בחירת נושא',
                      })
                      : (
                        <button
                          type="button"
                          onClick={() => setEditingCell({ id: question.id, field: 'subject' })}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          {question.subject}
                        </button>
                      )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {editingCell?.id === question.id && editingCell?.field === 'level'
                      ? renderInlineSelect({
                        value: question.level || 'no-level',
                        options: levelOptions,
                        onChange: value => updateLevel(question, value),
                        ariaLabel: 'בחירת רמה',
                      })
                      : (
                        <button
                          type="button"
                          onClick={() => setEditingCell({ id: question.id, field: 'level' })}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                        >
                          {question.level || 'ללא רמה'}
                        </button>
                      )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {editingCell?.id === question.id && editingCell?.field === 'activity'
                      ? renderInlineSelect({
                        value: question.activityType,
                        options: activityOptions,
                        onChange: value => updateActivity(question, value),
                        ariaLabel: 'בחירת סוג פעילות',
                      })
                      : (
                        <button
                          type="button"
                          onClick={() => setEditingCell({ id: question.id, field: 'activity' })}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                            question.activityType === 'exam'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          {activityLabel}
                        </button>
                      )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-start gap-3 text-slate-500">
                      <button
                        type="button"
                        title="מחיקה"
                        onClick={() => onDelete(question.id)}
                        className="rounded-md p-1 text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="עריכה"
                        onClick={() => onEdit(question)}
                        className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="הזזה למטה"
                        onClick={() => onMove(question.id, 'down')}
                        className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="הזזה למעלה"
                        onClick={() => onMove(question.id, 'up')}
                        className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function AdminPage() {
  const {
    questions,
    addQuestion,
    updateQuestion,
    duplicateQuestionToTargets,
    deleteQuestion,
    deleteQuestions,
    moveQuestion,
    trackCatalog,
    addTrack,
    assignTrackToGrade,
    renameTrack,
    deleteTrack,
  } = useApp()

  const [activeTab, setActiveTab] = useState('questions')
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [drawerQuestion, setDrawerQuestion] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null })

  function pushToast(message, type = 'info', title = '') {
    setToasts(previous => [...previous, createToast(message, type, title)])
  }

  function dismissToast(id) {
    setToasts(previous => previous.filter(toast => toast.id !== id))
  }

  function requestConfirmation({ title, message, onConfirm }) {
    setConfirmState({ open: true, title, message, onConfirm })
  }

  function closeConfirmation() {
    setConfirmState({ open: false, title: '', message: '', onConfirm: null })
  }

  const topicsCount = useMemo(
    () => Object.values(trackCatalog).flatMap(items => items).length,
    [trackCatalog],
  )

  const usersCount = useMemo(() => serverGetStats().users.filter(user => user.role !== 'admin').length, [])

  const availableSubjects = useMemo(() => {
    const subjects = gradeFilter === 'all'
      ? Object.values(trackCatalog).flatMap(tracks => tracks.map(track => track.subject))
      : (trackCatalog[gradeFilter] || []).map(track => track.subject)

    return [...new Set(subjects)].sort((first, second) => first.localeCompare(second, 'he'))
  }, [gradeFilter, trackCatalog])

  useEffect(() => {
    if (subjectFilter !== 'all' && !availableSubjects.includes(subjectFilter)) {
      setSubjectFilter('all')
    }
  }, [availableSubjects, subjectFilter])

  const filteredQuestions = useMemo(() => {
    return questions
      .filter(question => {
        const matchesGrade = gradeFilter === 'all' || question.grade === gradeFilter
        const matchesSubject = subjectFilter === 'all' || question.subject === subjectFilter
        const matchesActivity = activityFilter === 'all' || question.activityType === activityFilter
        const matchesSearch = !searchQuery.trim()
          || question.text.toLowerCase().includes(searchQuery.toLowerCase())
          || question.correct_answer.some(answer => answer.toLowerCase().includes(searchQuery.toLowerCase()))

        return matchesGrade && matchesSubject && matchesActivity && matchesSearch
      })
      .sort((first, second) => {
        if (first.grade !== second.grade) return first.grade.localeCompare(second.grade)
        if (first.subject !== second.subject) return first.subject.localeCompare(second.subject, 'he')
        if ((first.level || '') !== (second.level || '')) return (first.level || '').localeCompare(second.level || '', 'he')
        return (first.position || 0) - (second.position || 0)
      })
  }, [activityFilter, gradeFilter, questions, searchQuery, subjectFilter])

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE))

  useEffect(() => {
    setPage(previous => Math.min(previous, totalPages))
  }, [totalPages])

  const pagedQuestions = filteredQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setSelectedIds(previous => {
      const next = new Set([...previous].filter(id => filteredQuestions.some(question => question.id === id)))
      return next
    })
  }, [filteredQuestions])

  function handleToggleSelect(id) {
    setSelectedIds(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleToggleSelectPage(allSelected) {
    setSelectedIds(previous => {
      const next = new Set(previous)
      pagedQuestions.forEach(question => {
        if (allSelected) next.delete(question.id)
        else next.add(question.id)
      })
      return next
    })
  }

  function handleSave(questionData) {
    if (drawerQuestion?.id) {
      updateQuestion(drawerQuestion.id, questionData)
      pushToast('השאלה עודכנה בהצלחה.', 'success', 'שמירה בוצעה')
    } else {
      addQuestion(questionData)
      pushToast('השאלה נוספה למאגר המקומי.', 'success', 'שאלה חדשה')
    }

    setDrawerQuestion(null)
  }

  function handleQuickEdit(question) {
    setDrawerQuestion(question)
  }

  function handleFullEdit(question) {
    setDrawerQuestion(question)
  }

  function handleOpenNewQuestion(grade, subject) {
    setDrawerQuestion(createQuestionDraft(trackCatalog, grade, subject))
  }

  function handleDeleteQuestion(id) {
    requestConfirmation({
      title: 'מחיקת שאלה',
      message: 'השאלה תימחק מהמאגר המקומי ותיעלם גם מהשימוש באופליין. להמשיך?',
      onConfirm: () => {
        deleteQuestion(id)
        setSelectedIds(previous => {
          const next = new Set(previous)
          next.delete(id)
          return next
        })
        pushToast('השאלה נמחקה.', 'warning', 'מחיקה הושלמה')
        closeConfirmation()
      },
    })
  }

  function handleDeleteSelected() {
    requestConfirmation({
      title: 'מחיקת שאלות נבחרות',
      message: `יימחקו ${selectedIds.size} שאלות מהמאגר המקומי. להמשיך?`,
      onConfirm: () => {
        deleteQuestions([...selectedIds])
        setSelectedIds(new Set())
        pushToast('השאלות שנבחרו נמחקו.', 'warning', 'מחיקה קבוצתית')
        closeConfirmation()
      },
    })
  }

  function handleLinkQuestion(target) {
    if (!drawerQuestion?.id) return
    const created = duplicateQuestionToTargets(drawerQuestion.id, [target])

    if (created.length === 0) {
      pushToast('השאלה כבר קיימת ביעד שבחרת.', 'warning', 'ללא שינוי')
      return
    }

    pushToast('נוסף שיוך חדש לשאלה.', 'success', 'שיוך הושלם')
  }

  function handleAddTopic(trackData) {
    addTrack(trackData)
    setShowTopicForm(false)
    pushToast('הנושא נוסף והמערכת שמרה אותו מקומית.', 'success', 'נושא חדש')
  }

  function handleRenameTopic(grade, currentSubject, nextSubject) {
    if (!nextSubject.trim()) {
      pushToast('יש להזין שם נושא חדש.', 'warning', 'שדה חסר')
      return
    }

    renameTrack(grade, currentSubject, nextSubject)
    pushToast('שם הנושא עודכן.', 'success', 'שמירה בוצעה')
  }

  function handleDeleteTopic(grade, subject) {
    requestConfirmation({
      title: 'מחיקת נושא',
      message: `הנושא "${subject}" וכל השאלות שבו יימחקו מהמאגר המקומי. להמשיך?`,
      onConfirm: () => {
        deleteTrack(grade, subject)
        pushToast('הנושא נמחק.', 'warning', 'מחיקה הושלמה')
        closeConfirmation()
      },
    })
  }

  function handleAssignTopicToGrade(payload) {
    const { createdTrack, copiedQuestions } = assignTrackToGrade(payload)

    if (!createdTrack && copiedQuestions === 0) {
      pushToast('לא בוצע שינוי. ייתכן שהנושא כבר קיים בקטגוריה שנבחרה.', 'warning', 'ללא שינוי')
      return
    }

    if (payload.includeQuestions) {
      pushToast(`הנושא שויך ונוספו ${copiedQuestions} שאלות לקטגוריה החדשה.`, 'success', 'שיוך הושלם')
      return
    }

    pushToast('הנושא שויך לקטגוריה החדשה ללא שכפול שאלות.', 'success', 'שיוך הושלם')
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kidsquiz-questions-export.json'
    link.click()
    URL.revokeObjectURL(url)
    pushToast('קובץ JSON של המאגר הורד למחשב.', 'success', 'ייצוא בוצע')
  }

  return (
    <div className="flex flex-col gap-5">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onCancel={closeConfirmation}
        onConfirm={confirmState.onConfirm || closeConfirmation}
      />

      <SummaryHeader
        activeTab={activeTab}
        onNewQuestion={() => handleOpenNewQuestion()}
        onExport={handleExport}
      />

      <div className="flex flex-wrap items-center border-b border-slate-200">
        <TabButton
          active={activeTab === 'questions'}
          label="שאלות"
          count={questions.length}
          icon={FileQuestion}
          onClick={() => setActiveTab('questions')}
        />
        <TabButton
          active={activeTab === 'topics'}
          label="נושאים"
          count={topicsCount}
          icon={BookCopy}
          onClick={() => setActiveTab('topics')}
        />
        <TabButton
          active={activeTab === 'users'}
          label="משתמשים"
          count={usersCount}
          icon={Users}
          onClick={() => setActiveTab('users')}
        />
      </div>

      {activeTab === 'users' && <AdminUsers />}

      {activeTab === 'topics' && (
        <>
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowTopicForm(previous => !previous)} className="btn-primary">
              <Plus className="h-4 w-4" />
              {showTopicForm ? 'סגירת הוספת נושא' : 'הוספת נושא'}
            </button>
          </div>

          {showTopicForm && (
            <TopicForm
              onSave={handleAddTopic}
              onCancel={() => setShowTopicForm(false)}
              onError={message => pushToast(message, 'warning', 'שדה חסר')}
            />
          )}

          <TopicsTab
            trackCatalog={trackCatalog}
            onRename={handleRenameTopic}
            onDelete={handleDeleteTopic}
            onAddQuestion={handleOpenNewQuestion}
            onAssign={handleAssignTopicToGrade}
          />
        </>
      )}

      {activeTab === 'questions' && (
        <>
          <section className="sticky top-4 z-20 space-y-4">
            <div className="edu-card p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto]">
                <label className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    className="input-field pr-10"
                    placeholder="חיפוש בנוסח השאלה או בתשובה"
                  />
                </label>
                <select value={gradeFilter} onChange={event => setGradeFilter(event.target.value)} className="input-field">
                  <option value="all">כל הקטגוריות</option>
                  {GRADES.map(grade => (
                    <option key={grade.value} value={grade.value}>{grade.label}</option>
                  ))}
                </select>
                <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="input-field">
                  <option value="all">כל הנושאים</option>
                  {availableSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                <select value={activityFilter} onChange={event => setActivityFilter(event.target.value)} className="input-field">
                  <option value="all">כל הפעילויות</option>
                  <option value="practice">תרגול</option>
                  <option value="exam">מבחן</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setGradeFilter('all')
                    setSubjectFilter('all')
                    setActivityFilter('all')
                  }}
                  className="btn-secondary"
                >
                  איפוס
                </button>
              </div>
            </div>

            <BulkActionsBar
              selectedCount={selectedIds.size}
              onDeleteSelected={handleDeleteSelected}
              onClear={() => setSelectedIds(new Set())}
            />
          </section>

          {filteredQuestions.length === 0 ? (
            <div className="edu-card p-8 text-center text-slate-500">לא נמצאו שאלות בהתאם לסינון שנבחר.</div>
          ) : (
            <>
              <InlineQuestionsTable
                questions={pagedQuestions}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectPage={handleToggleSelectPage}
                onMove={moveQuestion}
                onDelete={handleDeleteQuestion}
                onEdit={handleQuickEdit}
                onQuickUpdate={updateQuestion}
                trackCatalog={trackCatalog}
              />

              <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredQuestions.length)} מתוך {filteredQuestions.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(previous => Math.max(1, previous - 1))}
                    disabled={page === 1}
                    className="btn-muted px-3 py-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    קודם
                  </button>
                  <span className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700">
                    עמוד {page} מתוך {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(previous => Math.min(totalPages, previous + 1))}
                    disabled={page === totalPages}
                    className="btn-muted px-3 py-2 disabled:opacity-40"
                  >
                    הבא
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Drawer
        open={Boolean(drawerQuestion)}
        title={drawerQuestion?.id ? 'עריכה מלאה של שאלה' : 'הוספת שאלה חדשה'}
        subtitle={drawerQuestion?.id
          ? 'כאן אפשר לעדכן ניסוח, מיקום, רמה, שיוכים נוספים והסבר משוב.'
          : 'הטופס שומר את כל הנתונים במאגר המקומי כדי שיעבדו גם באופליין.'}
        onClose={() => setDrawerQuestion(null)}
      >
        {drawerQuestion && (
          <QuestionForm
            initialQuestion={drawerQuestion}
            trackCatalog={trackCatalog}
            onSave={handleSave}
            onCancel={() => setDrawerQuestion(null)}
            onLinkQuestion={handleLinkQuestion}
            onError={message => pushToast(message, 'warning', 'שדה חסר')}
          />
        )}
      </Drawer>
    </div>
  )
}

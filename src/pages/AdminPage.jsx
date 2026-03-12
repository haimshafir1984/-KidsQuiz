import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import AdminUsers from './AdminUsers'
import { GRADES, getTrack, getTracksForGrade } from '../data/learningTracks'

const EMPTY_QUESTION = {
  text: '',
  type: 'multiple',
  options: ['', '', '', ''],
  correct_answer: [''],
  grade: 'grade-8',
  subject: 'ידע יהודי - תנ״ך',
  level: null,
  activityType: 'practice',
}

function QuestionForm({ initialQuestion, onSave, onCancel }) {
  const [form, setForm] = useState(initialQuestion || EMPTY_QUESTION)
  const availableSubjects = getTracksForGrade(form.grade)
  const activeTrack = getTrack(form.grade, form.subject) || availableSubjects[0]
  const availableLevels = activeTrack?.levels?.length ? activeTrack.levels : ['ללא רמה']
  const availableActivities = activeTrack?.activities || ['practice']

  function updateField(field, value) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  function handleGradeChange(grade) {
    const firstTrack = getTracksForGrade(grade)[0]
    setForm(previous => ({
      ...previous,
      grade,
      subject: firstTrack.subject,
      level: firstTrack.levels[0] || null,
      activityType: firstTrack.activities[0],
    }))
  }

  function handleSubjectChange(subject) {
    const nextTrack = getTrack(form.grade, subject)
    setForm(previous => ({
      ...previous,
      subject,
      level: nextTrack.levels[0] || null,
      activityType: nextTrack.activities[0],
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
      options: form.type === 'multiple' ? form.options.filter(option => option.trim()) : [],
      correct_answer: form.correct_answer.filter(answer => answer.trim()),
    }

    if (!cleaned.text.trim()) {
      alert('יש להזין נוסח שאלה.')
      return
    }

    if (cleaned.correct_answer.length === 0) {
      alert('יש להזין לפחות תשובה נכונה אחת.')
      return
    }

    if (cleaned.type === 'multiple' && cleaned.options.length < 2) {
      alert('יש להזין לפחות שתי אפשרויות תשובה.')
      return
    }

    onSave(cleaned)
  }

  return (
    <form onSubmit={handleSubmit} className="edu-card flex flex-col gap-4 text-right">
      <div>
        <h3 className="text-2xl font-extrabold text-slate-950">
          {initialQuestion?.id ? 'עריכת שאלה' : 'הוספת שאלה חדשה'}
        </h3>
        <p className="mt-1 text-sm text-slate-600">הוספה או עריכה של שאלות לפי כיתה, נושא, רמה וסוג פעילות.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">נוסח השאלה</label>
        <textarea
          value={form.text}
          onChange={event => updateField('text', event.target.value)}
          rows={3}
          className="input-field"
          placeholder="כתבו כאן את השאלה"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">כיתה</label>
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
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">סוג שאלה</label>
          <select value={form.type} onChange={event => updateField('type', event.target.value)} className="input-field">
            <option value="multiple">אמריקאית</option>
            <option value="open">פתוחה קצרה</option>
          </select>
        </div>
      </div>

      {form.type === 'multiple' && (
        <div className="space-y-2">
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

      <div className="space-y-2">
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn-primary">שמירת שאלה</button>
        <button type="button" onClick={onCancel} className="btn-muted">ביטול</button>
      </div>
    </form>
  )
}

function QuestionRow({ question, onEdit, onDelete }) {
  return (
    <article className="edu-card p-5 text-right">
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{question.grade === 'grade-8' ? 'כיתה ח׳' : 'כיתה י״ב'}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{question.subject}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{question.level || 'ללא רמה'}</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{question.activityType === 'exam' ? 'מבחן' : 'תרגול'}</span>
      </div>
      <h3 className="text-lg font-bold text-slate-950">{question.text}</h3>
      <div className="mt-2 text-sm text-slate-600">סוג: {question.type === 'multiple' ? 'אמריקאית' : 'פתוחה קצרה'}</div>
      <div className="mt-2 text-sm text-emerald-700">תשובה נכונה: {question.correct_answer.join(' / ')}</div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button onClick={() => onEdit(question)} className="btn-secondary">עריכה</button>
        <button onClick={() => onDelete(question.id)} className="btn-muted">מחיקה</button>
      </div>
    </article>
  )
}

export default function AdminPage() {
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useApp()
  const [activeTab, setActiveTab] = useState('questions')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [gradeFilter, setGradeFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')

  const filteredQuestions = useMemo(() => {
    return questions.filter(question => {
      const gradeMatch = gradeFilter === 'all' || question.grade === gradeFilter
      const subjectMatch = subjectFilter === 'all' || question.subject === subjectFilter
      const activityMatch = activityFilter === 'all' || question.activityType === activityFilter
      return gradeMatch && subjectMatch && activityMatch
    })
  }, [activityFilter, gradeFilter, questions, subjectFilter])

  const allSubjects = useMemo(() => {
    return [...new Set(questions.map(question => question.subject))]
  }, [questions])

  function handleSave(questionData) {
    if (editingQuestion?.id) {
      updateQuestion(editingQuestion.id, questionData)
    } else {
      addQuestion(questionData)
    }
    setEditingQuestion(null)
  }

  function handleDelete(id) {
    if (window.confirm('למחוק את השאלה שנבחרה?')) {
      deleteQuestion(id)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="edu-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-right">
            <h1 className="text-3xl font-extrabold text-slate-950">מסך ניהול</h1>
            <p className="mt-2 text-sm text-slate-600">ניהול משתמשים ושאלות בהתאם למבנה החדש של כיתות, נושאים, רמות ופעילויות.</p>
          </div>
          {activeTab === 'questions' && (
            <button onClick={() => setEditingQuestion({ ...EMPTY_QUESTION })} className="btn-primary self-start lg:self-auto">
              הוספת שאלה חדשה
            </button>
          )}
        </div>
      </section>

      <div className="flex rounded-2xl bg-white/80 p-1 shadow-sm ring-1 ring-slate-100">
        {[
          ['questions', 'שאלות'],
          ['users', 'משתמשים'],
        ].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'users' ? (
        <AdminUsers />
      ) : (
        <>
          {editingQuestion && (
            <QuestionForm
              initialQuestion={editingQuestion.id ? editingQuestion : null}
              onSave={handleSave}
              onCancel={() => setEditingQuestion(null)}
            />
          )}

          <section className="edu-card p-6">
            <div className="mb-4 text-right">
              <h2 className="text-xl font-extrabold text-slate-950">סינון מאגר השאלות</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <select value={gradeFilter} onChange={event => setGradeFilter(event.target.value)} className="input-field">
                <option value="all">כל הכיתות</option>
                {GRADES.map(grade => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </select>
              <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="input-field">
                <option value="all">כל הנושאים</option>
                {allSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              <select value={activityFilter} onChange={event => setActivityFilter(event.target.value)} className="input-field">
                <option value="all">כל הפעילויות</option>
                <option value="practice">תרגול</option>
                <option value="exam">מבחן</option>
              </select>
            </div>
          </section>

          <section className="grid gap-4">
            {filteredQuestions.length === 0 ? (
              <div className="edu-card p-8 text-center text-slate-500">לא נמצאו שאלות בהתאם לסינון שנבחר.</div>
            ) : (
              filteredQuestions.map(question => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  onEdit={setEditingQuestion}
                  onDelete={handleDelete}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}

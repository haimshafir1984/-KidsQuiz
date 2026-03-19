import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import AdminUsers from './AdminUsers'
import { GRADES, getGradeConfig } from '../data/learningTracks'

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
  }
}

function SectionToggle({ title, subtitle, count, open, onToggle, tone = 'slate' }) {
  const tones = {
    slate: 'bg-white/90 ring-slate-100',
    blue: 'bg-blue-50/80 ring-blue-100',
    amber: 'bg-amber-50/80 ring-amber-100',
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded-3xl p-5 text-right shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 ${tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {typeof count === 'number' && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {count}
              </span>
            )}
            <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
          </div>
          {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
          {open ? 'סגירה ▲' : 'פתיחה ▼'}
        </div>
      </div>
    </button>
  )
}

function TopicForm({ onSave, onCancel }) {
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
      alert('יש להזין שם נושא.')
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
    <form onSubmit={handleSubmit} className="edu-card flex flex-col gap-4 text-right">
      <div>
        <h3 className="text-2xl font-extrabold text-slate-950">הוספת נושא חדש</h3>
        <p className="mt-1 text-sm text-slate-600">הפאנל הזה מיועד ליצירת נושא חדש בלבד, בלי להעמיס על רשימת השאלות.</p>
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
            placeholder="למשל: פתוחות, אמריקאיות והשלמת משפטים"
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
        <button type="button" onClick={onCancel} className="btn-muted">ביטול</button>
      </div>
    </form>
  )
}

function TopicManager({ trackCatalog, onRename, onDelete, onAddQuestion }) {
  const [grade, setGrade] = useState(GRADES[0]?.value || 'grade-8')
  const [drafts, setDrafts] = useState({})
  const topics = trackCatalog[grade] || []

  function getDraft(subject) {
    return drafts[`${grade}::${subject}`] ?? subject
  }

  function setDraft(subject, value) {
    setDrafts(previous => ({ ...previous, [`${grade}::${subject}`]: value }))
  }

  return (
    <section className="edu-card p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="text-right">
          <h3 className="text-2xl font-extrabold text-slate-950">עריכת נושאים</h3>
          <p className="mt-1 text-sm text-slate-600">שינוי שם, מחיקה, או הוספת שאלה ישירות לנושא קיים.</p>
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

      <div className="grid gap-3">
        {topics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            אין עדיין נושאים בקטגוריה הזו.
          </div>
        ) : (
          topics.map(topic => (
            <div key={`${grade}-${topic.subject}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">שם נוכחי</label>
                    <div className="input-field bg-slate-100 text-slate-500">{topic.subject}</div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">שם חדש</label>
                    <input
                      value={getDraft(topic.subject)}
                      onChange={event => setDraft(topic.subject, event.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <button type="button" onClick={() => onAddQuestion(grade, topic.subject)} className="btn-primary h-fit">
                  הוספת שאלה לנושא
                </button>
                <button type="button" onClick={() => onRename(grade, topic.subject, getDraft(topic.subject))} className="btn-secondary h-fit">
                  שמירת שם
                </button>
                <button type="button" onClick={() => onDelete(grade, topic.subject)} className="btn-muted h-fit">
                  מחיקת נושא
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function LinkQuestionForm({ question, trackCatalog, onLink }) {
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

  function handleSubjectChange(subject) {
    const nextTrack = availableTracks.find(track => track.subject === subject)
    setTargetSubject(subject)
    setTargetLevel(nextTrack?.levels?.[0] || null)
    setTargetActivity(nextTrack?.activities?.[0] || 'practice')
  }

  if (!question?.id) return null

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 p-4">
      <div className="text-right">
        <h4 className="text-lg font-extrabold text-slate-950">שיוך לקטגוריות נוספות</h4>
        <p className="mt-1 text-sm text-slate-600">נוצר עותק של אותה שאלה בקטגוריה או בנושא נוספים.</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <select value={targetGrade} onChange={event => setTargetGrade(event.target.value)} className="input-field">
          {GRADES.map(grade => (
            <option key={grade.value} value={grade.value}>{grade.label}</option>
          ))}
        </select>
        <select value={targetSubject} onChange={event => handleSubjectChange(event.target.value)} className="input-field">
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
          הוספת שיוך נוסף לשאלה
        </button>
      </div>
    </section>
  )
}

function QuestionForm({ initialQuestion, onSave, onCancel, trackCatalog, onLinkQuestion, compact = false }) {
  const [form, setForm] = useState(initialQuestion)
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
      options: form.type === 'open' ? [] : form.options.filter(option => option.trim()),
      correct_answer: form.correct_answer.filter(answer => answer.trim()),
    }

    if (!cleaned.text.trim()) {
      alert('יש להזין נוסח שאלה.')
      return
    }

    if (!cleaned.subject) {
      alert('יש לבחור נושא.')
      return
    }

    if (cleaned.correct_answer.length === 0) {
      alert('יש להזין לפחות תשובה נכונה אחת.')
      return
    }

    if (cleaned.type !== 'open' && cleaned.options.length < 2) {
      alert('יש להזין לפחות שתי אפשרויות תשובה.')
      return
    }

    onSave(cleaned)
  }

  return (
    <form onSubmit={handleSubmit} className={`edu-card flex flex-col gap-4 text-right ${compact ? 'border-2 border-blue-100 bg-blue-50/40' : ''}`}>
      <div>
        <h3 className="text-2xl font-extrabold text-slate-950">
          {initialQuestion?.id ? 'עריכת שאלה' : 'הוספת שאלה חדשה'}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {initialQuestion?.id ? 'הטופס נפתח ליד השאלה שבחרת כדי שלא תאבדו את ההקשר.' : 'טופס מרוכז ליצירת שאלה חדשה.'}
        </p>
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">סוג שאלה</label>
          <select value={form.type} onChange={event => updateField('type', event.target.value)} className="input-field">
            <option value="multiple">אמריקאית</option>
            <option value="open">פתוחה קצרה</option>
            <option value="sentence_completion">השלמת משפטים</option>
          </select>
        </div>
      </div>

      {form.type !== 'open' && (
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

      <LinkQuestionForm question={initialQuestion} trackCatalog={trackCatalog} onLink={onLinkQuestion} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn-primary">שמירת שאלה</button>
        <button type="button" onClick={onCancel} className="btn-muted">ביטול</button>
      </div>
    </form>
  )
}

function QuestionRow({ question, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const gradeLabel = getGradeConfig(question.grade)?.label || question.grade

  return (
    <article className="edu-card p-5 text-right">
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{gradeLabel}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{question.subject}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{question.level || 'ללא רמה'}</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{question.activityType === 'exam' ? 'מבחן' : 'תרגול'}</span>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">מיקום {question.position || 1}</span>
      </div>
      <h3 className="text-lg font-bold text-slate-950">{question.text}</h3>
      <div className="mt-2 text-sm text-slate-600">
        סוג: {question.type === 'multiple' ? 'אמריקאית' : question.type === 'sentence_completion' ? 'השלמת משפטים' : 'פתוחה קצרה'}
      </div>
      <div className="mt-2 text-sm text-emerald-700">תשובה נכונה: {question.correct_answer.join(' / ')}</div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button onClick={onMoveUp} className="btn-muted">הזזה למעלה</button>
        <button onClick={onMoveDown} className="btn-muted">הזזה למטה</button>
        <button onClick={() => onEdit(question)} className="btn-secondary">עריכה ושיוך</button>
        <button onClick={() => onDelete(question.id)} className="btn-muted">מחיקת שאלה</button>
      </div>
    </article>
  )
}

export default function AdminPage() {
  const {
    questions,
    addQuestion,
    updateQuestion,
    duplicateQuestionToTargets,
    deleteQuestion,
    moveQuestion,
    trackCatalog,
    addTrack,
    renameTrack,
    deleteTrack,
  } = useApp()
  const [activeTab, setActiveTab] = useState('questions')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [newQuestionDraft, setNewQuestionDraft] = useState(null)
  const [showTopicManager, setShowTopicManager] = useState(false)
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [gradeFilter, setGradeFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')

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
        const gradeMatch = gradeFilter === 'all' || question.grade === gradeFilter
        const subjectMatch = subjectFilter === 'all' || question.subject === subjectFilter
        const activityMatch = activityFilter === 'all' || question.activityType === activityFilter
        return gradeMatch && subjectMatch && activityMatch
      })
      .sort((first, second) => {
        if (first.grade !== second.grade) return first.grade.localeCompare(second.grade)
        if (first.subject !== second.subject) return first.subject.localeCompare(second.subject, 'he')
        if ((first.level || '') !== (second.level || '')) return (first.level || '').localeCompare(second.level || '', 'he')
        return (first.position || 0) - (second.position || 0)
      })
  }, [activityFilter, gradeFilter, questions, subjectFilter])

  function closeEditors() {
    setEditingQuestion(null)
    setNewQuestionDraft(null)
  }

  function handleSave(questionData) {
    if (editingQuestion?.id) {
      updateQuestion(editingQuestion.id, questionData)
      setEditingQuestion(null)
      return
    }

    addQuestion(questionData)
    setNewQuestionDraft(null)
  }

  function handleLinkQuestion(target) {
    if (!editingQuestion?.id) return

    const created = duplicateQuestionToTargets(editingQuestion.id, [target])
    if (created.length === 0) {
      alert('השאלה כבר קיימת בקטגוריה או בנושא שבחרת.')
      return
    }

    alert('נוסף שיוך חדש לשאלה.')
  }

  function handleDeleteQuestion(id) {
    if (window.confirm('למחוק את השאלה שנבחרה?')) {
      deleteQuestion(id)
    }
  }

  function handleAddTopic(trackData) {
    addTrack(trackData)
    setShowTopicForm(false)
  }

  function handleRenameTopic(grade, currentSubject, nextSubject) {
    if (!nextSubject.trim()) {
      alert('יש להזין שם נושא חדש.')
      return
    }

    renameTrack(grade, currentSubject, nextSubject)
  }

  function handleDeleteTopic(grade, subject) {
    if (window.confirm(`למחוק את הנושא "${subject}" ואת כל השאלות שבתוכו?`)) {
      deleteTrack(grade, subject)
    }
  }

  function handleAddQuestionToTopic(grade, subject) {
    setNewQuestionDraft(createQuestionDraft(trackCatalog, grade, subject))
    setEditingQuestion(null)
  }

  function handleOpenNewQuestion() {
    setNewQuestionDraft(createQuestionDraft(trackCatalog))
    setEditingQuestion(null)
  }

  function handleEditQuestion(question) {
    setEditingQuestion(question)
    setNewQuestionDraft(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="edu-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-right">
            <h1 className="text-3xl font-extrabold text-slate-950">מסך ניהול</h1>
            <p className="mt-2 text-sm text-slate-600">ניהול שוטף של נושאים, שאלות ושיוכים, במבנה קומפקטי שקל להתמצא בו.</p>
          </div>
          {activeTab === 'questions' && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setShowTopicForm(previous => !previous)} className="btn-secondary">
                {showTopicForm ? 'סגירת הוספת נושא' : 'הוספת נושא'}
              </button>
              <button onClick={handleOpenNewQuestion} className="btn-primary">
                הוספת שאלה חדשה
              </button>
            </div>
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
          <SectionToggle
            title="עריכת נושאים"
            subtitle="פאנל נסגר כדי לשמור את אזור השאלות זמין בלי גלילה ארוכה."
            count={Object.values(trackCatalog).flatMap(items => items).length}
            open={showTopicManager}
            onToggle={() => setShowTopicManager(previous => !previous)}
            tone="amber"
          />

          {showTopicManager && (
            <TopicManager
              trackCatalog={trackCatalog}
              onRename={handleRenameTopic}
              onDelete={handleDeleteTopic}
              onAddQuestion={handleAddQuestionToTopic}
            />
          )}

          {showTopicForm && (
            <TopicForm
              onSave={handleAddTopic}
              onCancel={() => setShowTopicForm(false)}
            />
          )}

          {newQuestionDraft && (
            <QuestionForm
              initialQuestion={newQuestionDraft}
              onSave={handleSave}
              onCancel={() => setNewQuestionDraft(null)}
              trackCatalog={trackCatalog}
              onLinkQuestion={() => {}}
            />
          )}

          <SectionToggle
            title="סינון מאגר השאלות"
            subtitle="בחירת קטגוריה מצמצמת גם את רשימת הנושאים לאותה קטגוריה בלבד."
            open={showFilters}
            onToggle={() => setShowFilters(previous => !previous)}
            tone="blue"
          />

          {showFilters && (
            <section className="edu-card p-6">
              <div className="grid gap-3 md:grid-cols-3">
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
              </div>
            </section>
          )}

          <section className="grid gap-4">
            {filteredQuestions.length === 0 ? (
              <div className="edu-card p-8 text-center text-slate-500">לא נמצאו שאלות בהתאם לסינון שנבחר.</div>
            ) : (
              filteredQuestions.map(question => (
                <div key={question.id} className="grid gap-3">
                  <QuestionRow
                    question={question}
                    onEdit={handleEditQuestion}
                    onDelete={handleDeleteQuestion}
                    onMoveUp={() => moveQuestion(question.id, 'up')}
                    onMoveDown={() => moveQuestion(question.id, 'down')}
                  />

                  {editingQuestion?.id === question.id && (
                    <QuestionForm
                      initialQuestion={editingQuestion}
                      onSave={handleSave}
                      onCancel={() => setEditingQuestion(null)}
                      trackCatalog={trackCatalog}
                      onLinkQuestion={handleLinkQuestion}
                      compact
                    />
                  )}
                </div>
              ))
            )}
          </section>

          {(editingQuestion || newQuestionDraft) && (
            <div className="flex justify-center">
              <button onClick={closeEditors} className="btn-muted">
                סגירת טפסי עריכה
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

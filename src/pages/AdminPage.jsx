import { useState } from 'react'
import { useApp } from '../context/AppContext'
import AdminUsers from './AdminUsers'

const EMPTY_QUESTION = {
  text: '',
  type: 'multiple',
  options: ['', '', '', ''],
  correct_answer: [''],
  age_group: '1-3',
  subject: 'תנ"ך',
}

const SUBJECTS = ['תנ"ך', 'חשבון', 'הסקת מסקנות', 'לשון', 'ידע כללי']
const AGE_GROUPS = [
  { value: '1-3', label: 'כיתות א׳–ג׳' },
  { value: '4-6', label: 'כיתות ד׳–ו׳' },
]

// טופס הוספה/עריכה של שאלה
function QuestionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { ...EMPTY_QUESTION, options: ['', '', '', ''], correct_answer: [''] })

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setOption(i, value) {
    const opts = [...form.options]; opts[i] = value
    setField('options', opts)
  }

  function setCorrectAnswer(i, value) {
    const ca = [...form.correct_answer]; ca[i] = value
    setField('correct_answer', ca)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const cleaned = {
      ...form,
      options: form.type === 'multiple' ? form.options.filter(o => o.trim()) : [],
      correct_answer: form.correct_answer.filter(a => a.trim()),
    }
    if (!cleaned.text.trim()) { alert('יש להזין טקסט שאלה'); return }
    if (cleaned.correct_answer.length === 0) { alert('יש להזין לפחות תשובה נכונה אחת'); return }
    if (cleaned.type === 'multiple' && cleaned.options.length < 2) { alert('יש להזין לפחות 2 אפשרויות'); return }
    onSave(cleaned)
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <h3 className="text-xl font-bold text-purple-800">
        {initial?.id ? '✏️ עריכת שאלה' : '➕ הוספת שאלה'}
      </h3>

      {/* טקסט שאלה */}
      <div>
        <label className="block font-bold text-purple-700 mb-1">טקסט השאלה *</label>
        <textarea value={form.text} onChange={e => setField('text', e.target.value)}
          rows={2} className="input-field" placeholder="הכנס את השאלה..." />
      </div>

      {/* סוג / גיל / נושא */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block font-bold text-purple-700 mb-1 text-sm">סוג</label>
          <select value={form.type} onChange={e => setField('type', e.target.value)}
            className="input-field text-base py-2">
            <option value="multiple">בחירה מרובה</option>
            <option value="open">פתוחה</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-purple-700 mb-1 text-sm">גיל</label>
          <select value={form.age_group} onChange={e => setField('age_group', e.target.value)}
            className="input-field text-base py-2">
            {AGE_GROUPS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-bold text-purple-700 mb-1 text-sm">נושא</label>
          <select value={form.subject} onChange={e => setField('subject', e.target.value)}
            className="input-field text-base py-2">
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* אפשרויות */}
      {form.type === 'multiple' && (
        <div>
          <label className="block font-bold text-purple-700 mb-2">אפשרויות תשובה</label>
          {form.options.map((opt, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input type="text" value={opt} onChange={e => setOption(i, e.target.value)}
                placeholder={`אפשרות ${i + 1}`} className="input-field" />
              <button type="button"
                onClick={() => setField('options', form.options.filter((_, idx) => idx !== i))}
                className="btn-danger px-3 py-2 text-sm">✕</button>
            </div>
          ))}
          <button type="button"
            onClick={() => setField('options', [...form.options, ''])}
            className="btn-success text-sm px-3 py-2">+ הוסף אפשרות</button>
        </div>
      )}

      {/* תשובות נכונות */}
      <div>
        <label className="block font-bold text-purple-700 mb-2">תשובות נכונות</label>
        {form.correct_answer.map((ans, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input type="text" value={ans} onChange={e => setCorrectAnswer(i, e.target.value)}
              placeholder="תשובה נכונה..." className="input-field" />
            {form.correct_answer.length > 1 && (
              <button type="button"
                onClick={() => setField('correct_answer', form.correct_answer.filter((_, idx) => idx !== i))}
                className="btn-danger px-3 py-2 text-sm">✕</button>
            )}
          </div>
        ))}
        <button type="button"
          onClick={() => setField('correct_answer', [...form.correct_answer, ''])}
          className="btn-success text-sm px-3 py-2">+ הוסף תשובה נכונה</button>
      </div>

      {/* כפתורי פעולה */}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">
          {initial?.id ? '💾 שמור שינויים' : '✅ הוסף שאלה'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">ביטול</button>
      </div>
    </form>
  )
}

// כרטיס שאלה בטבלת הניהול
function QuestionRow({ question, onEdit, onDelete }) {
  const typeLabel = question.type === 'multiple' ? '⚪ בחירה' : '✏️ פתוחה'
  return (
    <div className="card flex gap-3 items-start">
      <div className="flex-1">
        <div className="flex flex-wrap gap-2 mb-1">
          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {question.age_group === '1-3' ? 'א׳–ג׳' : 'ד׳–ו׳'}
          </span>
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {question.subject}
          </span>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {typeLabel}
          </span>
        </div>
        <p className="font-semibold text-gray-800">{question.text}</p>
        <p className="text-sm text-green-600 mt-1">✅ {question.correct_answer.join(' / ')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={() => onEdit(question)} className="btn-success text-sm px-3 py-1.5">✏️ עריכה</button>
        <button onClick={() => onDelete(question.id)} className="btn-danger text-sm px-3 py-1.5">🗑️ מחק</button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useApp()

  // טאב פעיל: 'questions' | 'users'
  const [activeTab, setActiveTab] = useState('questions')
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('')
  const [ageFilter, setAgeFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')

  function handleSave(data) {
    if (editing?.id) updateQuestion(editing.id, data)
    else addQuestion(data)
    setEditing(null)
  }

  function handleDelete(id) {
    if (window.confirm('האם אתה בטוח שברצונך למחוק שאלה זו?')) deleteQuestion(id)
  }

  const filtered = questions.filter(q => {
    const matchText = q.text.includes(filter) || filter === ''
    const matchAge = ageFilter === 'all' || q.age_group === ageFilter
    const matchSubject = subjectFilter === 'all' || q.subject === subjectFilter
    return matchText && matchAge && matchSubject
  })

  return (
    <div className="flex flex-col gap-5">
      {/* כותרת */}
      <div className="card flex items-center gap-3">
        <span className="text-4xl">⚙️</span>
        <div>
          <h2 className="text-2xl font-bold text-purple-800">פאנל ניהול</h2>
          <p className="text-gray-500 text-sm">{questions.length} שאלות במאגר</p>
        </div>
        {activeTab === 'questions' && (
          <button onClick={() => setEditing('new')} className="btn-primary mr-auto text-base px-4 py-2">
            ➕ שאלה חדשה
          </button>
        )}
      </div>

      {/* טאבים */}
      <div className="flex bg-indigo-50 rounded-2xl p-1 gap-1">
        {[['questions', '📋 שאלות'], ['users', '👥 משתמשים']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              activeTab === tab
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-indigo-400 hover:text-indigo-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* תוכן טאב */}
      {activeTab === 'users' ? (
        <AdminUsers />
      ) : (
        <>
          {/* טופס הוספה/עריכה */}
          {editing && (
            <QuestionForm
              initial={editing === 'new' ? null : editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          )}

          {/* סינון */}
          <div className="card flex flex-col gap-3">
            <h3 className="font-bold text-purple-700">🔍 סינון שאלות</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="חיפוש לפי טקסט..." className="input-field py-2" />
              <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)}
                className="input-field py-2">
                <option value="all">כל הגילאים</option>
                <option value="1-3">כיתות א׳–ג׳</option>
                <option value="4-6">כיתות ד׳–ו׳</option>
              </select>
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
                className="input-field py-2">
                <option value="all">כל הנושאים</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* רשימת שאלות */}
          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <div className="card text-center text-gray-500">
                <div className="text-5xl mb-2">📭</div>
                <p>לא נמצאו שאלות</p>
              </div>
            ) : (
              filtered.map(q => (
                <QuestionRow key={q.id} question={q}
                  onEdit={setEditing} onDelete={handleDelete} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

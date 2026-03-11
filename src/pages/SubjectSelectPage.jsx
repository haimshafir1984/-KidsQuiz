import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const SUBJECTS = [
  { name: 'תנ"ך', emoji: '📖', subtitle: 'היכרות עם סיפורים, דמויות ומושגים מרכזיים.', tone: 'bg-amber-50 text-amber-600', hover: 'hover:border-amber-300' },
  { name: 'חשבון', emoji: '➗', subtitle: 'תרגול חישוב, הבנה מספרית ופתרון בעיות.', tone: 'bg-blue-50 text-blue-600', hover: 'hover:border-blue-300' },
  { name: 'הסקת מסקנות', emoji: '🧠', subtitle: 'פיתוח חשיבה, ניתוח מידע והבנת הקשרים.', tone: 'bg-violet-50 text-violet-600', hover: 'hover:border-violet-300' },
  { name: 'לשון', emoji: '✍️', subtitle: 'דיוק בשפה, אוצר מילים והבנת הנקרא.', tone: 'bg-rose-50 text-rose-600', hover: 'hover:border-rose-300' },
  { name: 'ידע כללי', emoji: '🌍', subtitle: 'הרחבת אופקים במגוון נושאים מהעולם שסביבנו.', tone: 'bg-emerald-50 text-emerald-600', hover: 'hover:border-emerald-300' },
]

export default function SubjectSelectPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { startQuiz, questions } = useApp()
  const age = state?.age

  if (!age) {
    navigate('/age')
    return null
  }

  function handleSubjectSelect(subject) {
    const quiz = startQuiz(age, subject)
    if (quiz.length === 0) {
      alert(`אין שאלות עדיין בנושא "${subject}" לגיל זה. נסה נושא אחר!`)
      return
    }
    navigate('/quiz')
  }

  function countForSubject(subject) {
    return questions.filter(question => question.age_group === age && question.subject === subject).length
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-slate-100">
          מסלול {age === '1-3' ? 'כיתות א׳-ג׳ 🦖' : 'כיתות ד׳-ו׳ 🚀'}
        </div>
        <h1 className="section-title">איזה תחום נרצה לתרגל עכשיו?</h1>
        <p className="section-subtitle mt-3">
          בחרו את תחום הלימוד שייתן היום שילוב נכון של סקרנות, אתגר והצלחה.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SUBJECTS.map(subject => {
          const count = countForSubject(subject.name)
          const available = count > 0

          return (
            <button
              key={subject.name}
              onClick={() => handleSubjectSelect(subject.name)}
              disabled={!available}
              className={`edu-card border-2 text-right transition-all duration-200 ${
                available
                  ? `${subject.hover} hover:-translate-y-1 hover:shadow-xl`
                  : 'opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-4xl ${subject.tone}`}>
                  {subject.emoji}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold text-slate-950">{subject.name}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {available ? `${count} שאלות` : 'בקרוב'}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {available ? subject.subtitle : 'התחום הזה עדיין לא כולל שאלות במסלול הנוכחי.'}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </section>

      <div className="flex justify-center">
        <button onClick={() => navigate('/age')} className="btn-muted">
          חזרה לבחירת כיתה ↩️
        </button>
      </div>
    </div>
  )
}

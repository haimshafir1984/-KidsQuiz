import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function getGradeEmoji(percent) {
  if (percent === 100) return '💎'
  if (percent >= 80) return '🌟'
  if (percent >= 60) return '👏'
  return '💪'
}

export default function SummaryPage() {
  const { quizResults, selectedSubject, selectedAge, startQuiz } = useApp()
  const navigate = useNavigate()

  if (!quizResults || quizResults.length === 0) {
    navigate('/age')
    return null
  }

  const total = quizResults.length
  const correct = quizResults.filter(result => result.correct).length
  const incorrect = total - correct
  const percent = Math.round((correct / total) * 100)
  const mistakes = quizResults.filter(result => !result.correct)
  const gradeEmoji = getGradeEmoji(percent)

  function handleRetry() {
    const quiz = startQuiz(selectedAge, selectedSubject)
    if (quiz.length > 0) navigate('/quiz')
    else navigate('/subject')
  }

  const statCards = [
    { label: 'סך הכול שאלות', value: total, tone: 'bg-slate-50 text-slate-700', emoji: '📚' },
    { label: 'תשובות נכונות', value: correct, tone: 'bg-emerald-50 text-emerald-700', emoji: '🎉' },
    { label: 'תשובות שגויות', value: incorrect, tone: 'bg-red-50 text-red-700', emoji: '📝' },
  ]

  return (
    <div className="page-shell">
      <section className="edu-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-right">
            <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-slate-100">
              סיכום הישגים {gradeEmoji}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl">השלמת את התרגול בהצלחה</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              סיימת סבב תרגול בנושא {selectedSubject}. זה הזמן לחגוג את ההצלחות, להבין מה כבר חזק,
              ולראות איפה אפשר להשתפר בפעם הבאה.
            </p>
          </div>

          <div className="rounded-[20px] border-2 border-slate-100 bg-violet-50 px-8 py-6 text-center shadow-[0_10px_15px_-3px_rgba(0,0,0,0.04)]">
            <div className="text-5xl">{gradeEmoji}</div>
            <div className="mt-2 text-sm font-semibold text-slate-600">ציון כולל</div>
            <div className="mt-1 text-4xl font-extrabold text-slate-950">{percent}%</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {statCards.map(card => (
          <div key={card.label} className="edu-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${card.tone}`}>
                {card.emoji}
              </div>
              <div className="text-3xl font-extrabold text-slate-950">{card.value}</div>
            </div>
            <div className="text-sm font-semibold text-slate-600">{card.label}</div>
          </div>
        ))}
      </section>

      {mistakes.length > 0 && (
        <section className="edu-card">
          <div className="mb-5 text-right">
            <h2 className="text-2xl font-extrabold text-slate-950">שאלות לחיזוק נוסף 🧠</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              הנה המקומות שבהם כדאי לעצור לרגע, להבין טוב יותר ולחזור חזק יותר לניסיון הבא.
            </p>
          </div>

          <div className="space-y-3">
            {mistakes.map((result, index) => {
              const answer = Array.isArray(result.question.correct_answer)
                ? result.question.correct_answer[0]
                : result.question.correct_answer

              return (
                <article key={`${result.question.text}-${index}`} className="rounded-xl border border-red-100 bg-red-50 p-4 text-right">
                  <h3 className="font-bold text-slate-900">{result.question.text}</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white px-3 py-2 text-sm text-red-700 shadow-sm">
                      <span className="font-semibold">התשובה שנבחרה:</span> {result.userAnswer}
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2 text-sm text-emerald-700 shadow-sm">
                      <span className="font-semibold">התשובה הנכונה:</span> {answer}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={handleRetry} className="btn-primary">
          מנסים שוב 🚀
        </button>
        <button onClick={() => navigate('/subject')} className="btn-secondary">
          בוחרים נושא חדש 📚
        </button>
      </div>
    </div>
  )
}

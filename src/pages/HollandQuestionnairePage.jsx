import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { HOLLAND_QUESTIONS, HOLLAND_SCALE, analyzeHollandAnswers } from '../data/hollandQuestionnaire'
import { getGradeConfig } from '../data/learningTracks'

export default function HollandQuestionnairePage() {
  const navigate = useNavigate()
  const {
    selectedGrade,
    selectedSubject,
    hollandAnswers,
    updateHollandAnswer,
    finishHollandQuestionnaire,
  } = useApp()

  if (!selectedGrade || selectedSubject !== 'שאלון הולנד') {
    return <Navigate to="/subject" replace />
  }

  const answeredCount = Object.keys(hollandAnswers).length
  const progress = Math.round((answeredCount / HOLLAND_QUESTIONS.length) * 100)
  const gradeLabel = getGradeConfig(selectedGrade)?.label
  const allAnswered = answeredCount === HOLLAND_QUESTIONS.length

  const groupedQuestions = useMemo(() => {
    return HOLLAND_QUESTIONS.reduce((groups, question) => {
      if (!groups[question.typeCode]) groups[question.typeCode] = []
      groups[question.typeCode].push(question)
      return groups
    }, {})
  }, [])

  function handleSubmit() {
    if (!allAnswered) {
      alert('כדי לקבל תוצאה מלאה יש לסמן תשובה לכל השאלות.')
      return
    }

    const analysis = analyzeHollandAnswers(hollandAnswers)
    finishHollandQuestionnaire({
      ...analysis,
      answers: hollandAnswers,
      answeredCount,
    })
    navigate('/holland-result')
  }

  return (
    <div className="page-shell">
      <section className="page-hero text-right md:mx-0 md:max-w-none">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-slate-100">
          שאלון הולנד | {gradeLabel}
        </div>
        <h1 className="section-title">שאלון הכוונה אישיותית</h1>
        <p className="section-subtitle mt-3">
          סמנו עד כמה כל פעילות מתאימה לכם. בסיום המערכת תציג את הטיפוס המוביל ואת השילוב של שני הטיפוסים הבולטים.
        </p>
      </section>

      <section className="edu-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-600">התקדמות בשאלון</span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700">
            {answeredCount} / {HOLLAND_QUESTIONS.length}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-3 rounded-full bg-gradient-to-r from-rose-500 to-violet-500 transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="space-y-6">
        {Object.entries(groupedQuestions).map(([typeCode, questions]) => (
          <div key={typeCode} className="edu-card p-6">
            <div className="mb-4 text-right">
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                קבוצת שאלות {typeCode}
              </div>
            </div>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <article key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-right">
                  <div className="text-lg font-bold text-slate-950">{index + 1}. {question.text}</div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {HOLLAND_SCALE.map(option => {
                      const isActive = Number(hollandAnswers[question.id]) === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateHollandAnswer(question.id, option.value)}
                          className={`rounded-2xl border-2 px-4 py-3 text-right transition-all duration-200 ${
                            isActive
                              ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-base font-bold">{option.value}</div>
                          <div className="mt-1 text-sm">{option.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={handleSubmit} className="btn-primary">
          ניתוח התוצאה
        </button>
        <button onClick={() => navigate('/track')} className="btn-muted">
          חזרה למסלול
        </button>
      </div>
    </div>
  )
}

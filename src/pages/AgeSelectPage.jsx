import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getActivityLabel } from '../data/learningTracks'
import { isDesktopRuntime } from '../utils/runtime'

export default function AgeSelectPage() {
  const navigate = useNavigate()
  const { chooseGrade, savedQuizProgress, prepareQuiz, visibleGrades } = useApp()
  const desktop = isDesktopRuntime()

  // התרגול האחרון שנשמר ועדיין לא הסתיים - מוצג בראש המסך כדי להמשיך בלחיצה אחת
  // תרגול פתוח בקטגוריה שהוסתרה לא מוצע להמשך
  const visibleValues = new Set(visibleGrades.map(grade => grade.value))
  const openProgress = (savedQuizProgress || []).filter(progress => visibleValues.has(progress.grade))
  const lastProgress = [...openProgress]
    .sort((first, second) => new Date(second.updatedAt || 0) - new Date(first.updatedAt || 0))[0] || null

  function handleResume(progress) {
    prepareQuiz({
      grade: progress.grade,
      subject: progress.subject,
      level: progress.level || null,
      activityType: progress.activityType,
    })

    if (progress.activityType === 'exam' && !progress.quizSession?.startedAt) {
      navigate('/exam-intro')
      return
    }

    navigate('/quiz')
  }

  function handleGradeSelect(grade) {
    chooseGrade(grade)
    navigate('/subject')
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
          שלב 1: בחירת קטגוריה
        </div>
        <h1 className="section-title">מה נרצה לתרגל היום?</h1>
        <p className="section-subtitle mt-3">
          לחצו על אחד הכרטיסים כדי להתחיל.
        </p>
      </section>

      {lastProgress && (
        <section className="rounded-card-lg border-2 border-amber-300 bg-amber-50/70 p-5 text-right shadow-card">
          <div className="text-base font-semibold text-amber-800">עצרתם באמצע - אפשר להמשיך</div>
          <div className="mt-1 text-2xl font-bold text-slate-950">{lastProgress.subject}</div>
          <div className="mt-1 text-base text-slate-700">
            {[lastProgress.level, getActivityLabel(lastProgress.activityType)].filter(Boolean).join(' | ')}
            {' - '}
            נענו {lastProgress.results?.length || 0} מתוך {lastProgress.questionCount} שאלות
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button onClick={() => handleResume(lastProgress)} className="btn-primary w-full py-3.5 text-lg sm:w-auto">
              להמשיך מאיפה שעצרתי
            </button>
            {openProgress.length > 1 && (
              <button onClick={() => navigate('/profile')} className="btn-secondary w-full py-3.5 text-lg sm:w-auto">
                כל התרגולים הפתוחים ({openProgress.length})
              </button>
            )}
          </div>
        </section>
      )}

      <section className={`grid gap-4 ${visibleGrades.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {visibleGrades.map(grade => (
          <button
            key={grade.value}
            onClick={() => handleGradeSelect(grade.value)}
            className={`edu-card border-2 text-right transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${grade.hover}`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${grade.tone}`}>
                {grade.emoji}
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-2xl font-bold text-slate-950">{grade.label}</h2>
                <p className="text-lg leading-7 text-slate-700">{grade.description}</p>
              </div>
            </div>
          </button>
        ))}
      </section>

      {!desktop && (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-base text-slate-700">אין אצלכם אינטרנט במחשב?</p>
          <button onClick={() => navigate('/offline-download')} className="btn-secondary">
            הורדת התוכנה למחשב (עובדת ללא אינטרנט)
          </button>
        </div>
      )}
    </div>
  )
}

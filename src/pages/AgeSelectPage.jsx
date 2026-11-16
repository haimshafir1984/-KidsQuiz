import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { GRADES } from '../data/learningTracks'
import { isDesktopRuntime } from '../utils/runtime'

export default function AgeSelectPage() {
  const navigate = useNavigate()
  const { chooseGrade } = useApp()
  const desktop = isDesktopRuntime()

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

      <section className="grid gap-4 md:grid-cols-2">
        {GRADES.map(grade => (
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

import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { GRADES } from '../data/learningTracks'

export default function AgeSelectPage() {
  const navigate = useNavigate()
  const { chooseGrade } = useApp()

  function handleGradeSelect(grade) {
    chooseGrade(grade)
    navigate('/subject')
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
          בחירת שכבת לימוד
        </div>
        <h1 className="section-title">באיזו כיתה נרצה להתחיל?</h1>
        <p className="section-subtitle mt-3">
          בחרו את שכבת הגיל כדי להציג נושאים, רמות ופעילויות שמותאמים בדיוק למסלול הלמידה.
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
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-extrabold text-slate-950">{grade.label}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                    מסלול פעיל
                  </span>
                </div>
                <p className="text-base leading-7 text-slate-600">{grade.description}</p>
              </div>
            </div>
          </button>
        ))}
      </section>

      <div className="flex justify-center">
        <button onClick={() => navigate('/mode')} className="btn-muted">
          חזרה לבחירת מצב עבודה ↩️
        </button>
      </div>
    </div>
  )
}

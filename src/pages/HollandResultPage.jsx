import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { HOLLAND_TYPES } from '../data/hollandQuestionnaire'
import { getGradeConfig } from '../data/learningTracks'

export default function HollandResultPage() {
  const navigate = useNavigate()
  const { hollandResults, selectedGrade, beginHollandQuestionnaire } = useApp()

  if (!hollandResults) {
    return <Navigate to="/subject" replace />
  }

  const gradeLabel = getGradeConfig(selectedGrade)?.label

  return (
    <div className="page-shell">
      <section className="edu-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-right">
            <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-rose-700 ring-1 ring-slate-100">
              תוצאות שאלון הולנד
            </div>
            <h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl">הפרופיל האישיותי נותח בהצלחה</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              השאלון הושלם עבור {gradeLabel}. כאן אפשר לראות את הטיפוס המוביל שלך ואת השילוב של שני הטיפוסים הבולטים ביותר.
            </p>
          </div>

          <div className={`rounded-[20px] border-2 border-slate-100 px-8 py-6 text-center shadow-[0_10px_15px_-3px_rgba(0,0,0,0.04)] ${hollandResults.topType.color}`}>
            <div className="text-sm font-semibold">טיפוס מוביל</div>
            <div className="mt-2 text-5xl font-extrabold">{hollandResults.topCode}</div>
            <div className="mt-2 text-xl font-bold">{hollandResults.topType.name}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="edu-card p-6 text-right">
          <h2 className="text-2xl font-extrabold text-slate-950">הניתוח המרכזי</h2>
          <div className={`mt-5 rounded-2xl border p-5 ${hollandResults.topType.color}`}>
            <div className="text-lg font-bold">הטיפוס המוביל שלך: {hollandResults.topType.name}</div>
            <p className="mt-2 leading-7">{hollandResults.topType.description}</p>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-lg font-bold text-slate-950">השילוב הבולט שלך</div>
            <p className="mt-2 text-base leading-7 text-slate-600">
              הקוד המשולב שלך הוא <span className="font-bold text-slate-950">{hollandResults.combinedCode}</span>, כלומר שילוב של
              {' '}<span className="font-bold text-slate-950">{hollandResults.topType.name}</span>
              {' '}ו-<span className="font-bold text-slate-950">{hollandResults.secondType.name}</span>.
            </p>
          </div>
        </div>

        <aside className="edu-card p-6 text-right">
          <h2 className="text-2xl font-extrabold text-slate-950">התפלגות ניקוד</h2>
          <div className="mt-5 space-y-4">
            {hollandResults.sorted.map(([typeCode, score]) => {
              const type = HOLLAND_TYPES[typeCode]
              const width = Math.round((score / 12) * 100)
              return (
                <div key={typeCode}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900">{type.name}</span>
                    <span className="text-sm font-semibold text-slate-600">{score} / 12</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-gradient-to-r from-rose-500 to-violet-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </aside>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={() => { beginHollandQuestionnaire(selectedGrade); navigate('/holland-questionnaire') }} className="btn-primary">
          מילוי מחדש של השאלון
        </button>
        <button onClick={() => navigate('/subject')} className="btn-muted">
          חזרה לבחירת נושא
        </button>
      </div>
    </div>
  )
}

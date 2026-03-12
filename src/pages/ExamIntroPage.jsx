import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function ExamIntroPage() {
  const navigate = useNavigate()
  const { quizQuestions, selectedSubject, selectedLevel, beginExamSession } = useApp()

  if (!quizQuestions || quizQuestions.length === 0) {
    return <Navigate to="/track" replace />
  }

  function handleStartExam() {
    beginExamSession()
    navigate('/quiz')
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm ring-1 ring-amber-100">
          הכנה למבחן
        </div>
        <h1 className="section-title">המבחן יתחיל בעוד רגע</h1>
        <p className="section-subtitle mt-3">
          במסלול זה הזמן למענה הוא 3 דקות. מרגע הלחיצה על כפתור ההתחלה יופיע שעון עצר בראש המסך.
        </p>
      </section>

      <section className="edu-card text-right">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-500">נושא</div>
            <div className="mt-2 text-xl font-extrabold text-slate-950">{selectedSubject}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-500">רמה</div>
            <div className="mt-2 text-xl font-extrabold text-slate-950">{selectedLevel || 'ללא רמה'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-500">זמן מוקצב</div>
            <div className="mt-2 text-xl font-extrabold text-slate-950">3 דקות</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-800">
          <div className="text-lg font-bold">לפני שמתחילים</div>
          <ul className="mt-2 space-y-2 text-sm leading-6">
            <li>ענו ברצף ושמרו על קצב עבודה יציב.</li>
            <li>כאשר הזמן יסתיים, המערכת תעביר אתכם אוטומטית למסך הסיכום.</li>
            <li>מספר השאלות במבחן הנוכחי: {quizQuestions.length}.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button onClick={() => navigate('/track')} className="btn-muted">
            חזרה למסלול ↩️
          </button>
          <button onClick={handleStartExam} className="btn-primary">
            התחלת מבחן ⏱️
          </button>
        </div>
      </section>
    </div>
  )
}

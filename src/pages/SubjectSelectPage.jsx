import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getGradeConfig, getTracksForGrade, SUBJECT_TONES } from '../data/learningTracks'

export default function SubjectSelectPage() {
  const navigate = useNavigate()
  const { selectedGrade, chooseSubject, questions } = useApp()

  if (!selectedGrade) {
    return <Navigate to="/age" replace />
  }

  const grade = getGradeConfig(selectedGrade)
  const tracks = getTracksForGrade(selectedGrade)

  function handleSubjectSelect(subject) {
    chooseSubject(subject)
    navigate('/track')
  }

  function countForTrack(subject) {
    return questions.filter(question => question.grade === selectedGrade && question.subject === subject).length
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-slate-100">
          {grade?.label} | בחירת נושא
        </div>
        <h1 className="section-title">איזה נושא נפתח עכשיו?</h1>
        <p className="section-subtitle mt-3">
          כל נושא כולל את מסלולי הפעילות שהוגדרו עבורו, יחד עם רמות קושי לפי הצורך.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tracks.map(track => {
          const styling = SUBJECT_TONES[track.subject] || {
            tone: 'bg-slate-100 text-slate-700',
            hover: 'hover:border-slate-300',
            emoji: '📚',
          }
          const total = countForTrack(track.subject)
          const activityLabel = track.activities.length > 1 ? 'תרגול ומבחן' : 'תרגול'
          const levelLabel = track.levels.length > 0 ? `${track.levels.length} רמות` : 'ללא חלוקה לרמות'

          return (
            <button
              key={track.subject}
              onClick={() => handleSubjectSelect(track.subject)}
              className={`edu-card border-2 text-right transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${styling.hover}`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-4xl ${styling.tone}`}>
                  {styling.emoji}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold text-slate-950">{track.subject}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {total} שאלות
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">סוגי שאלות: {track.questionTypes}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {activityLabel}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {levelLabel}
                    </span>
                  </div>
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

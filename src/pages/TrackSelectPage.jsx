import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getActivityLabel, SUBJECT_TONES } from '../data/learningTracks'

export default function TrackSelectPage() {
  const navigate = useNavigate()
  const {
    selectedGrade,
    selectedSubject,
    selectedLevel,
    setSelectedLevel,
    prepareQuiz,
    getSavedQuizProgress,
    clearQuizProgress,
    beginHollandQuestionnaire,
    trackCatalog,
  } = useApp()

  if (!selectedGrade || !selectedSubject) {
    return <Navigate to="/subject" replace />
  }

  const track = (trackCatalog[selectedGrade] || []).find(item => item.subject === selectedSubject)

  if (!track) {
    return <Navigate to="/subject" replace />
  }

  const isHolland = selectedSubject === 'שאלון הולנד'
  const styling = SUBJECT_TONES[selectedSubject] || {
    tone: 'bg-slate-100 text-slate-700',
    hover: 'hover:border-slate-300',
    emoji: '📚',
  }
  const levelOptions = track.levels.length ? track.levels : ['ללא רמה']
  const activeLevel = selectedLevel || levelOptions[0]
  const normalizedLevel = activeLevel === 'ללא רמה' ? null : activeLevel

  const helperText = useMemo(() => {
    if (isHolland) {
      return 'השאלון בנוי מסדרת היגדים בדירוג 0 עד 3, ובסיום יופיע ניתוח של הטיפוס המוביל והשילוב הדומיננטי.'
    }

    if (track.activities.length > 1) {
      return 'בחרו רמה ולאחר מכן החליטו אם להתחיל תרגול או מבחן. אם קיימת שמירה, המערכת תחזיר אתכם לאותו מקום.'
    }

    return 'בחרו רמה כדי להתחיל תרגול מותאם למסלול שנבחר.'
  }, [isHolland, track.activities.length])

  const currentPracticeProgress = !isHolland
    ? getSavedQuizProgress({
        grade: selectedGrade,
        subject: selectedSubject,
        level: normalizedLevel,
        activityType: 'practice',
      })
    : null

  function handleStart(activityType) {
    if (isHolland) {
      beginHollandQuestionnaire(selectedGrade)
      navigate('/holland-questionnaire')
      return
    }

    setSelectedLevel(normalizedLevel)
    const prepared = prepareQuiz({
      grade: selectedGrade,
      subject: selectedSubject,
      level: normalizedLevel,
      activityType,
    })

    if (prepared.length === 0) {
      window.alert('עדיין אין שאלות זמינות עבור הבחירה הזאת.')
      return
    }

    if (activityType === 'exam') {
      navigate('/exam-intro')
      return
    }

    navigate('/quiz')
  }

  function handleRestart(activityType) {
    const selection = {
      grade: selectedGrade,
      subject: selectedSubject,
      level: normalizedLevel,
      activityType,
    }

    clearQuizProgress(selection)
    const prepared = prepareQuiz({
      ...selection,
      restart: true,
    })

    if (prepared.length === 0) {
      window.alert('עדיין אין שאלות זמינות עבור הבחירה הזאת.')
      return
    }

    if (activityType === 'exam') {
      navigate('/exam-intro')
      return
    }

    navigate('/quiz')
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
          הגדרת מסלול פעילות
        </div>
        <h1 className="section-title">{selectedSubject}</h1>
        <p className="section-subtitle mt-3">{helperText}</p>
      </section>

      {!isHolland && (
        <section className="edu-card">
          <div className="flex items-start gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${styling.tone}`}>
              {styling.emoji}
            </div>
            <div className="flex-1 text-right">
              <h2 className="text-2xl font-extrabold text-slate-950">בחירת רמה</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {track.levels.length > 0 ? 'המסלול מחולק לרמות כדי להתאים את עומק התרגול.' : 'לנושא הזה אין חלוקה לרמות, ולכן אפשר להמשיך ישירות.'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {levelOptions.map(level => {
              const isActive = activeLevel === level
              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level === 'ללא רמה' ? null : level)}
                  className={`rounded-2xl border-2 p-4 text-right transition-all duration-200 ${
                    isActive
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-lg font-bold">{level}</div>
                  <div className="mt-1 text-sm opacity-80">
                    {level === 'ללא רמה' ? 'הנושא הזה פועל כיחידה אחת.' : 'רמת קושי נפרדת עם שאלות ייעודיות.'}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="edu-card">
        <div className="text-right">
          <h2 className="text-2xl font-extrabold text-slate-950">{isHolland ? 'פתיחת השאלון' : 'בחירת סוג פעילות'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isHolland
              ? 'זהו שאלון הכוונה אישיותי. בסיום המערכת תציג ניתוח של הטיפוס המוביל ושל שני הטיפוסים הבולטים ביותר.'
              : track.activities.includes('exam')
                ? 'במסלול הזה אפשר לבחור בין תרגול שוטף לבין מבחן מדוד של 3 דקות.'
                : 'במסלול הזה מוגדר כרגע תרגול בלבד.'}
          </p>
        </div>

        {!isHolland && currentPracticeProgress && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm font-semibold text-amber-800">
            יש למסלול הזה שמירה פעילה. לחיצה על הפעילות תמשיך מאותו מקום, ואפשר גם להתחיל מחדש.
          </div>
        )}

        <div className={`mt-6 grid gap-4 ${isHolland ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
          {(isHolland ? ['practice'] : track.activities).map(activityType => {
            const isExam = activityType === 'exam'
            const activitySavedProgress = !isHolland
              ? getSavedQuizProgress({
                  grade: selectedGrade,
                  subject: selectedSubject,
                  level: normalizedLevel,
                  activityType,
                })
              : null

            return (
              <div key={activityType} className="space-y-2">
                <button
                  onClick={() => handleStart(activityType)}
                  className={`w-full rounded-[20px] border-2 p-6 text-right shadow-[0_10px_15px_-3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                    isHolland
                      ? 'border-rose-200 bg-rose-50/70 hover:border-rose-300'
                      : isExam
                        ? 'border-amber-200 bg-amber-50/70 hover:border-amber-300'
                        : 'border-blue-200 bg-blue-50/70 hover:border-blue-300'
                  }`}
                >
                  <div className="text-3xl">{isHolland ? '🧭' : isExam ? '⏱️' : '📚'}</div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xl font-extrabold text-slate-950">
                      {isHolland ? 'התחלת שאלון הולנד' : getActivityLabel(activityType)}
                    </div>
                    {activitySavedProgress && (
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-700">
                        יש שמירה פעילה
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {isHolland
                      ? '24 היגדים בדירוג אישי, עם ניתוח מסכם של הטיפוס המוביל והשילוב המרכזי.'
                      : isExam
                        ? 'מבחן מוקצב ל-3 דקות עם שעון חי בראש המסך וסיום אוטומטי כאשר הזמן מסתיים.'
                        : 'תרגול חופשי עם משוב מיידי, בלי מגבלת זמן ועם אפשרות ללמוד בקצב אישי.'}
                  </p>
                </button>

                {activitySavedProgress && (
                  <button onClick={() => handleRestart(activityType)} className="btn-secondary w-full justify-center">
                    התחלה מחדש של {getActivityLabel(activityType)}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex justify-center">
        <button onClick={() => navigate('/subject')} className="btn-muted">
          חזרה לבחירת נושא ↩️
        </button>
      </div>
    </div>
  )
}

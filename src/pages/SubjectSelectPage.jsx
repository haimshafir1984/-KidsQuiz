import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { GENERAL_EXAM_SUBJECT, getGradeConfig, SUBJECT_TONES } from '../data/learningTracks'
import { HOLLAND_QUESTIONS } from '../data/hollandQuestionnaire'

const GROUPS = [
  { key: 'exam', title: 'מבחן מסכם' },
  { key: 'new', title: 'נושאים חדשים' },
  { key: 'jewish', title: 'יהדות' },
  { key: 'language', title: 'שפה' },
  { key: 'thinking', title: 'חשיבה ומתמטיקה' },
  { key: 'quiz', title: 'שאלונים' },
]

function getGroupKey(subject) {
  if (subject === GENERAL_EXAM_SUBJECT) return 'exam'
  if (/ חדש$/.test(subject)) return 'new'
  if (/תנ"ך|תנך|אבות|שבת|תפילה|דינים|מעגל השנה|יהודית/.test(subject)) return 'jewish'
  if (/מילולי|אנלוגיות|אנגלית/.test(subject)) return 'language'
  if (/הולנד|שאלון אישי/.test(subject)) return 'quiz'
  return 'thinking'
}

export default function SubjectSelectPage() {
  const navigate = useNavigate()
  const { selectedGrade, chooseSubject, questions, trackCatalog, prepareQuiz, getSavedQuizProgress } = useApp()

  if (!selectedGrade) {
    return <Navigate to="/age" replace />
  }

  const grade = getGradeConfig(selectedGrade)
  const tracks = trackCatalog[selectedGrade] || []

  function handleSubjectSelect(track) {
    chooseSubject(track.subject)

    if (track.subject === GENERAL_EXAM_SUBJECT) {
      const prepared = prepareQuiz({
        grade: selectedGrade,
        subject: track.subject,
        level: null,
        activityType: 'exam',
      })

      if (prepared.length === 0) {
        window.alert('עדיין אין מספיק שאלות זמינות עבור המבחן הכללי.')
        return
      }

      navigate('/exam-intro')
      return
    }

    const hasLevels = track.levels.length > 0
    const hasOnlyPractice = track.activities.length === 1 && track.activities[0] === 'practice'

    if (track.subject !== 'שאלון הולנד' && !hasLevels && hasOnlyPractice) {
      const prepared = prepareQuiz({
        grade: selectedGrade,
        subject: track.subject,
        level: null,
        activityType: 'practice',
      })

      if (prepared.length === 0) {
        window.alert('עדיין אין שאלות זמינות עבור הנושא הזה.')
        return
      }

      navigate('/quiz')
      return
    }

    navigate('/track')
  }

  function countForTrack(subject) {
    if (subject === GENERAL_EXAM_SUBJECT) {
      return 30
    }

    if (subject === 'שאלון הולנד') {
      return HOLLAND_QUESTIONS.length
    }

    return questions.filter(question => question.grade === selectedGrade && question.subject === subject).length
  }

  const groupedTracks = GROUPS
    .map(group => ({ ...group, items: tracks.filter(track => getGroupKey(track.subject) === group.key) }))
    .filter(group => group.items.length > 0)

  function renderCard(track) {
    const styling = SUBJECT_TONES[track.subject] || {
      tone: 'bg-slate-100 text-slate-700',
      hover: 'hover:border-slate-300',
      emoji: '📚',
    }
    const isExam = track.subject === GENERAL_EXAM_SUBJECT
    const total = countForTrack(track.subject)
    const subtitle = isExam
      ? '30 שאלות מכל הנושאים, 20 דקות, בלי משוב באמצע'
      : track.levels.length > 0
        ? `${track.levels.length} ${track.levelsKind === 'subtopic' ? 'תתי-נושאים' : 'רמות'}`
        : `${total} שאלות`
    const savedPractice = track.subject !== 'שאלון הולנד' && !isExam
      ? getSavedQuizProgress({
          grade: selectedGrade,
          subject: track.subject,
          level: null,
          activityType: 'practice',
        })
      : null

    return (
      <button
        key={track.subject}
        onClick={() => handleSubjectSelect(track)}
        className={`edu-card border-2 p-4 text-right transition-all duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-5 ${
          isExam ? 'border-amber-300 bg-amber-50/60 hover:border-amber-400' : styling.hover
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-3xl ${styling.tone}`}>
            {isExam ? '📝' : styling.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-slate-950">{track.subject}</h3>
            <p className="mt-1 text-base text-slate-700">{subtitle}</p>
          </div>
          {savedPractice && (
            <span className="flex-shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              להמשיך
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-base font-semibold text-violet-700 shadow-sm ring-1 ring-slate-100">
          {grade?.label}
        </div>
        <h1 className="section-title">איזה נושא נתרגל?</h1>
        <p className="section-subtitle mt-3">לחצו על נושא כדי להתחיל.</p>
      </section>

      {groupedTracks.map(group => (
        <section key={group.key} aria-labelledby={`group-${group.key}`}>
          <h2 id={`group-${group.key}`} className="mb-3 text-2xl font-bold text-slate-900">{group.title}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {group.items.map(renderCard)}
          </div>
        </section>
      ))}

      <div className="flex justify-center">
        <button onClick={() => navigate('/age')} className="btn-muted">
          חזרה לבחירת קטגוריה
        </button>
      </div>
    </div>
  )
}

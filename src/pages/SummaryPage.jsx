import { useMemo } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { formatCorrectAnswer, formatUserAnswer } from '../utils/questionAnswers'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { GENERAL_EXAM_SUBJECT, getActivityLabel, getGradeConfig } from '../data/learningTracks'

const CONFETTI_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-amber-400', 'bg-emerald-500', 'bg-rose-400']

function getGradeEmoji(percent) {
  if (percent === 100) return '💎'
  if (percent >= 80) return '🌟'
  if (percent >= 60) return '👏'
  return '💪'
}

// משפט סיום חם לפי הציון (בלשון רבים, כמו בשאר האתר)
function getClosingMessage(percent, isReview) {
  if (isReview) return percent === 100 ? 'חזרתם על כל הטעויות ועכשיו הכול נכון. כל הכבוד על ההתמדה!' : 'חזרה על טעויות היא הדרך הכי טובה ללמוד. אפשר לנסות שוב.'
  if (percent === 100) return 'מושלם! כל התשובות נכונות.'
  if (percent >= 80) return 'כל הכבוד! שליטה מצוינת בחומר.'
  if (percent >= 60) return 'יפה מאוד. עוד קצת תרגול ותגיעו למצוין.'
  return 'התחלה טובה. כל תרגול מקרב להצלחה, ואפשר לחזור על הטעויות עכשיו.'
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: Math.round(Math.random() * 96),
    delay: Math.round(Math.random() * 300),
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  })), [])

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden motion-reduce:hidden" aria-hidden="true">
      {pieces.map(piece => (
        <span
          key={piece.id}
          className={`absolute top-0 h-2 w-2 rounded-sm ${piece.color} animate-confetti-fall`}
          style={{ left: `${piece.left}%`, animationDelay: `${piece.delay}ms` }}
        />
      ))}
    </div>
  )
}

function AnswerSection({ title, tone, items }) {
  return (
    <section className="edu-card">
      <div className="mb-5 text-right">
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          כאן אפשר לראות בדיוק איך עניתם ומה הייתה התשובה הנכונה בכל שאלה.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((result, index) => {
          const answer = formatCorrectAnswer(result.question)

          return (
            <article key={`${result.question.id}-${index}`} className={`rounded-xl border p-4 text-right ${tone}`}>
              {result.question.groupTitle && (
                <div className="mb-2 text-xs font-bold text-slate-500">{result.question.groupTitle}</div>
              )}
              <h3 className="font-bold text-slate-900">{result.question.text}</h3>
              {result.question.image && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <img
                    src={result.question.image}
                    alt={result.question.text}
                    className="mx-auto h-auto max-h-56 max-w-full rounded-xl object-contain"
                  />
                </div>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                  <span className="font-semibold">התשובה שנבחרה:</span> {formatUserAnswer(result.question, result.userAnswer) || 'לא נענתה שאלה זו'}
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
  )
}

export default function SummaryPage() {
  const {
    quizResults,
    selectedSubject,
    selectedGrade,
    selectedLevel,
    selectedActivity,
    prepareQuiz,
    startMistakesPractice,
    mistakesPractice,
    trackCatalog,
    userResults,
  } = useApp()
  const navigate = useNavigate()

  if (!quizResults) {
    return <Navigate to="/age" replace />
  }

  const total = quizResults.totalQuestions
  const answered = quizResults.answeredQuestions
  const correct = quizResults.correctAnswers
  const incorrect = quizResults.incorrectAnswers
  const percent = quizResults.percent
  const mistakes = quizResults.items.filter(result => !result.correct)
  const successes = quizResults.items.filter(result => result.correct)
  const isGeneralExam = quizResults.subject === GENERAL_EXAM_SUBJECT
  const isExam = quizResults.activityType === 'exam'
  const gradeEmoji = getGradeEmoji(percent)
  const gradeConfig = getGradeConfig(selectedGrade)

  // השוואה לפעם הקודמת בנושא/רמה/סוג פעילות זהים
  const completedAtMs = new Date(quizResults.completedAt).getTime()
  const previousPercent = (() => {
    if (mistakesPractice) return null
    const sameSelection = (userResults || []).filter(result => {
      const resultGrade = result.age || result.grade
      return result.subject === quizResults.subject
        && (result.level || null) === (quizResults.level || null)
        && result.activityType === quizResults.activityType
        && (!resultGrade || resultGrade === quizResults.grade)
        && new Date(result.date).getTime() < completedAtMs - 2000
    })
    if (sameSelection.length === 0) return null
    const latest = sameSelection.reduce((best, item) => (new Date(item.date) > new Date(best.date) ? item : best))
    return Number.isFinite(Number(latest.percent)) ? Number(latest.percent) : null
  })()
  const percentDelta = previousPercent === null ? null : percent - previousPercent

  // התקדמות בנושא: כמה תתי-נושאים/רמות כבר תורגלו
  const track = (trackCatalog?.[selectedGrade] || []).find(item => item.subject === quizResults.subject)
  const trackLevels = track?.levels || []
  const levelUnit = track?.levelsKind === 'subtopic' ? 'תתי-נושאים' : 'רמות'
  const doneLevels = new Set(
    (userResults || [])
      .filter(result => result.subject === quizResults.subject && result.level && result.activityType !== 'exam')
      .map(result => result.level),
  )
  if (quizResults.level && !mistakesPractice) doneLevels.add(quizResults.level)
  const doneCount = trackLevels.filter(level => doneLevels.has(level)).length
  const currentLevelIndex = trackLevels.indexOf(quizResults.level)
  const nextLevel = !isGeneralExam && currentLevelIndex >= 0 ? trackLevels[currentLevelIndex + 1] || null : null
  const mistakeQuestions = mistakes.map(item => item.question)

  const subjectBreakdown = isGeneralExam
    ? Object.values(
        quizResults.items.reduce((accumulator, item) => {
          const subject = item.question.subject || 'ללא נושא'
          if (!accumulator[subject]) accumulator[subject] = { subject, correct: 0, total: 0 }
          accumulator[subject].total += 1
          if (item.correct) accumulator[subject].correct += 1
          return accumulator
        }, {}),
      )
        .map(entry => ({ ...entry, percent: Math.round((entry.correct / entry.total) * 100) }))
        .sort((first, second) => first.subject.localeCompare(second.subject, 'he'))
    : []

  function handleMistakesPractice() {
    const list = startMistakesPractice(mistakeQuestions)
    if (list.length > 0) navigate('/quiz')
  }

  function handleNextLevel() {
    const quiz = prepareQuiz({
      grade: selectedGrade,
      subject: selectedSubject,
      level: nextLevel,
      activityType: 'practice',
    })
    navigate(quiz.length > 0 ? '/quiz' : '/track')
  }

  function handleRetry() {
    const quiz = prepareQuiz({
      grade: selectedGrade,
      subject: selectedSubject,
      level: selectedLevel,
      activityType: selectedActivity,
      restart: true,
    })

    if (quiz.length === 0) {
      navigate('/track')
      return
    }

    if (selectedActivity === 'exam') {
      navigate('/exam-intro')
      return
    }

    navigate('/quiz')
  }

  const statCards = [
    { label: 'סך הכול שאלות', value: total, tone: 'bg-slate-50 text-slate-700', emoji: '📚' },
    { label: 'שאלות שנענו', value: answered, tone: 'bg-blue-50 text-blue-700', emoji: '🧾' },
    { label: 'תשובות נכונות', value: correct, tone: 'bg-emerald-50 text-emerald-700', emoji: '🎉' },
    { label: 'תשובות שגויות', value: incorrect, tone: 'bg-red-50 text-red-700', emoji: '📝' },
  ]

  return (
    <div className="page-shell">
      <section className="study-page text-center">
        {percent === 100 && <Confetti />}
        <div className="study-qnum">
          סיכום {mistakesPractice ? 'תרגול הטעויות' : getActivityLabel(quizResults.activityType)} {gradeEmoji}
        </div>
        <h1 className="mt-1 text-xl font-bold text-slate-700">
          {quizResults.timedOut ? 'הזמן הסתיים והפעילות הושלמה' : 'סיימתם!'}
        </h1>
        <div className="mt-2 font-study text-7xl font-bold leading-none text-blue-700 sm:text-8xl" aria-label={`${correct} מתוך ${total}`}>
          {correct}<small className="mr-2 text-3xl text-slate-500 sm:text-4xl"> / {total}</small>
        </div>
        <div className="mt-2 text-xl font-bold text-violet-700">{percent}% נכון</div>
        <p className="mx-auto mt-3 max-w-xl text-lg leading-7 text-slate-700">{getClosingMessage(percent, mistakesPractice)}</p>

        {percentDelta !== null && (
          <p className={`mt-3 inline-flex rounded-full px-4 py-1.5 text-base font-bold ${
            percentDelta > 0 ? 'bg-emerald-50 text-emerald-700' : percentDelta < 0 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'
          }`}>
            {percentDelta > 0 ? `↑ שיפור של ${percentDelta}% לעומת הפעם הקודמת (${previousPercent}%)`
              : percentDelta < 0 ? `בפעם הקודמת היה ${previousPercent}%. בפעם הבאה נשפר`
                : `אותה תוצאה כמו בפעם הקודמת (${previousPercent}%)`}
          </p>
        )}

        <p className="mt-3 text-base text-slate-600">
          {selectedSubject}{quizResults.level ? ` | ${quizResults.level}` : ''}{gradeConfig ? ` | ${gradeConfig.label}` : ''}
        </p>

        {trackLevels.length > 1 && !mistakesPractice && (
          <div className="mx-auto mt-4 max-w-xl text-right">
            <div className="mb-2 text-base font-bold text-slate-700">
              השלמתם {doneCount} מתוך {trackLevels.length} {levelUnit} ב{quizResults.subject}
            </div>
            <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${doneCount} מתוך ${trackLevels.length} ${levelUnit}`}>
              {trackLevels.map(level => (
                <i key={level} title={level} className={`study-dot ${doneLevels.has(level) ? 'study-dot--done' : ''} ${level === quizResults.level ? 'ring-4 ring-violet-100' : ''}`} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {mistakes.length > 0 && (
            <button onClick={handleMistakesPractice} className="btn-primary px-6 py-3 text-lg">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              תרגול על הטעויות ({mistakes.length})
            </button>
          )}
          {nextLevel && (
            <button onClick={handleNextLevel} className={`${mistakes.length > 0 ? 'btn-secondary' : 'btn-primary'} px-6 py-3 text-lg`}>
              {track?.levelsKind === 'subtopic' ? 'לתת-הנושא הבא' : 'לרמה הבאה'}: {nextLevel}
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          {mistakes.length === 0 && !nextLevel && (
            <button onClick={() => navigate('/subject')} className="btn-primary px-6 py-3 text-lg">בחירת נושא חדש</button>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(card => (
          <div key={card.label} className="edu-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${card.tone}`}>
                {card.emoji}
              </div>
              <div className="text-3xl font-bold text-slate-950">{card.value}</div>
            </div>
            <div className="text-sm font-semibold text-slate-600">{card.label}</div>
          </div>
        ))}
      </section>

      {isGeneralExam && subjectBreakdown.length > 0 && (
        <section className="edu-card">
          <div className="mb-5 text-right">
            <h2 className="text-2xl font-bold text-slate-950">פילוח לפי נושא</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              כמה תשובות נכונות נאספו בכל נושא במבחן הכללי - שימושי כדי לדעת איפה כדאי להתמקד בתרגול הבא.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subjectBreakdown.map(entry => (
              <div key={entry.subject} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
                <div className="text-sm font-semibold text-slate-700">{entry.subject}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className={`text-lg font-bold ${
                    entry.percent >= 80 ? 'text-emerald-700' : entry.percent >= 60 ? 'text-blue-700' : 'text-red-600'
                  }`}>
                    {entry.percent}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{entry.correct} מתוך {entry.total}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isGeneralExam ? (
        <>
          {successes.length > 0 && (
            <AnswerSection
              title="תשובות נכונות"
              tone="border-emerald-100 bg-emerald-50"
              items={successes}
            />
          )}

          {mistakes.length > 0 && (
            <AnswerSection
              title="תשובות שגויות"
              tone="border-red-100 bg-red-50"
              items={mistakes}
            />
          )}
        </>
      ) : (
        mistakes.length > 0 && (
          <AnswerSection
            title="שאלות לחיזוק נוסף 🧠"
            tone="border-red-100 bg-red-50"
            items={mistakes}
          />
        )
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={() => navigate('/track')} className={isExam ? 'btn-primary' : 'btn-secondary'}>
          חזרה למסלול
        </button>
        <button onClick={handleRetry} className={isExam ? 'btn-secondary' : 'btn-primary'}>
          התחלה מחדש
        </button>
        <button onClick={() => navigate('/subject')} className="btn-muted">
          בחירת נושא אחר
        </button>
      </div>
    </div>
  )
}

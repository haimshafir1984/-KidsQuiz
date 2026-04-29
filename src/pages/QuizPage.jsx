import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fuzzyMatch } from '../utils/fuzzyMatch'

const LETTER_BADGES = [
  'bg-sky-50 text-sky-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-indigo-50 text-indigo-600',
  'bg-rose-50 text-rose-600',
  'bg-cyan-50 text-cyan-600',
]

function formatTime(secondsLeft) {
  const safeSeconds = Math.max(secondsLeft, 0)
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0')
  const seconds = String(safeSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function VisualImage({ src, alt, className = '' }) {
  return (
    <img
      src={src}
      alt={alt}
      className={`mx-auto h-auto max-w-full rounded-2xl bg-white object-contain ${className}`}
      loading="lazy"
    />
  )
}

function MultipleChoice({ options, optionImages, onAnswer, answered, selectedAnswer, isCorrect }) {
  const hasOptionImages = Array.isArray(optionImages) && optionImages.length > 0

  return (
    <div className={`grid gap-3 ${hasOptionImages ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((option, index) => {
        const isSelected = selectedAnswer === option
        let stateClass = 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 hover:-translate-x-1'

        if (answered && isSelected && isCorrect) {
          stateClass = 'border-emerald-300 bg-emerald-50 text-emerald-700'
        } else if (answered && isSelected && !isCorrect) {
          stateClass = 'border-red-300 bg-red-50 text-red-700'
        } else if (answered) {
          stateClass = 'border-slate-100 bg-slate-50 text-slate-400'
        }

        return (
          <button
            key={option}
            onClick={() => !answered && onAnswer(option)}
            disabled={answered}
            className={`quiz-option flex ${hasOptionImages ? 'flex-col items-stretch p-3' : 'items-center gap-4'} text-lg font-semibold ${stateClass}`}
          >
            <div className={`flex ${hasOptionImages ? 'w-full items-center justify-between gap-3' : 'items-center gap-4'}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${LETTER_BADGES[index]}`}>
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו'][index]}
              </span>
              <span className={`${hasOptionImages ? 'text-base' : 'flex-1 text-right'}`}>{option}</span>
            </div>
            {hasOptionImages && optionImages[index] && (
              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-2">
                <VisualImage src={optionImages[index]} alt={`אפשרות ${option}`} className="max-h-44" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function OpenText({ onAnswer, answered }) {
  const [text, setText] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!text.trim() || answered) return
    onAnswer(text)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder="כתבו את תשובתכם כאן"
        className="input-field"
        disabled={answered}
        autoFocus
      />
      {!answered && (
        <button type="submit" className="btn-primary self-start">
          שליחת תשובה
        </button>
      )}
    </form>
  )
}

function FeedbackMessage({ isCorrect, correctAnswer, explanation, isLastQuestion, onNext }) {
  const tone = isCorrect
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700'

  return (
    <div className={`mt-5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${tone}`}>
      <div className="flex items-start gap-3 text-right">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl">
          {isCorrect ? '🎉' : '❌'}
        </div>
        <div>
          <div className="text-lg font-bold">{isCorrect ? 'תשובה נכונה' : 'התשובה אינה מדויקת'}</div>
          <div className="mt-1 text-sm opacity-90">
            {isCorrect ? 'אפשר להמשיך בביטחון לשלב הבא.' : `התשובה הנכונה היא: ${correctAnswer}`}
          </div>
          {isCorrect && explanation && (
            <div className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-sm font-medium text-slate-700">
              הסבר: {explanation}
            </div>
          )}
        </div>
      </div>
      <button onClick={onNext} className="btn-primary self-start sm:self-auto">
        {isLastQuestion ? 'לסיכום' : 'לשאלה הבאה'}
      </button>
    </div>
  )
}

export default function QuizPage() {
  const {
    quizQuestions,
    finishQuiz,
    selectedSubject,
    selectedLevel,
    selectedActivity,
    selectedGrade,
    activeQuizProgress,
    quizSession,
    saveQuizProgress,
  } = useApp()
  const navigate = useNavigate()

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [results, setResults] = useState([])
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (selectedActivity !== 'exam' || !quizSession.deadlineAt) return null
    return Math.max(0, Math.ceil((quizSession.deadlineAt - Date.now()) / 1000))
  })

  const resultsRef = useRef([])
  const completedRef = useRef(false)

  function buildSelection() {
    return {
      grade: selectedGrade,
      subject: selectedSubject,
      level: selectedLevel,
      activityType: selectedActivity,
    }
  }

  function persistProgress(nextState = {}) {
    if (!selectedGrade || !selectedSubject) return

    saveQuizProgress(buildSelection(), {
      currentIdx: nextState.currentIdx ?? currentIdx,
      answered: nextState.answered ?? answered,
      selectedAnswer: nextState.selectedAnswer ?? selectedAnswer,
      isCorrect: nextState.isCorrect ?? isCorrect,
      quizSession,
      questionCount: quizQuestions.length,
      results: (nextState.results ?? resultsRef.current).map(result => ({
        questionId: result.question.id,
        userAnswer: result.userAnswer,
        correct: result.correct,
      })),
    })
  }

  useEffect(() => {
    if (!quizQuestions || quizQuestions.length === 0) {
      navigate('/track')
    }
  }, [navigate, quizQuestions])

  useEffect(() => {
    completedRef.current = false

    if (!activeQuizProgress) {
      resultsRef.current = []
      setResults([])
      setCurrentIdx(0)
      setAnswered(false)
      setIsCorrect(null)
      setSelectedAnswer(null)
      return
    }

    const restoredResults = (activeQuizProgress.results || [])
      .map(result => {
        const question = quizQuestions.find(item => item.id === result.questionId)
        if (!question) return null
        return {
          question,
          userAnswer: result.userAnswer,
          correct: result.correct,
        }
      })
      .filter(Boolean)

    const safeIndex = Math.min(activeQuizProgress.currentIdx || 0, Math.max(quizQuestions.length - 1, 0))
    resultsRef.current = restoredResults
    setResults(restoredResults)
    setCurrentIdx(safeIndex)
    setAnswered(Boolean(activeQuizProgress.answered))
    setIsCorrect(activeQuizProgress.isCorrect ?? null)
    setSelectedAnswer(activeQuizProgress.selectedAnswer ?? null)
  }, [activeQuizProgress, quizQuestions])

  useEffect(() => {
    if (selectedActivity !== 'exam') return
    if (!quizSession.startedAt || !quizSession.deadlineAt) {
      navigate('/exam-intro')
      return
    }

    function tick() {
      const remaining = Math.max(0, Math.ceil((quizSession.deadlineAt - Date.now()) / 1000))
      setSecondsLeft(remaining)

      if (remaining === 0 && !completedRef.current) {
        completedRef.current = true
        finishQuiz(resultsRef.current, { timedOut: true, secondsLeft: 0 })
        navigate('/summary')
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [finishQuiz, navigate, quizSession.deadlineAt, quizSession.startedAt, selectedActivity])

  if (!quizQuestions || quizQuestions.length === 0) return null

  const question = quizQuestions[currentIdx]
  const progress = ((currentIdx + 1) / quizQuestions.length) * 100
  const isOptionQuestion = question.type === 'multiple' || question.type === 'sentence_completion'
  const correctAnswer = Array.isArray(question.correct_answer)
    ? question.correct_answer[0]
    : question.correct_answer
  const isLastQuestion = currentIdx === quizQuestions.length - 1

  function handleAnswer(userAnswer) {
    let correct = false

    if (isOptionQuestion) {
      correct = question.correct_answer.includes(userAnswer)
    } else {
      correct = fuzzyMatch(userAnswer, question.correct_answer)
    }

    const nextResults = [...resultsRef.current, { question, userAnswer, correct }]
    resultsRef.current = nextResults
    setResults(nextResults)
    setIsCorrect(correct)
    setAnswered(true)
    setSelectedAnswer(userAnswer)
    persistProgress({
      currentIdx,
      answered: true,
      selectedAnswer: userAnswer,
      isCorrect: correct,
      results: nextResults,
    })
  }

  function completeQuiz(meta = {}) {
    if (completedRef.current) return
    completedRef.current = true
    finishQuiz(resultsRef.current, meta)
    navigate('/summary')
  }

  function handleNext() {
    if (!answered) return

    if (isLastQuestion) {
      completeQuiz({ timedOut: false, secondsLeft })
      return
    }

    const nextIndex = currentIdx + 1
    setCurrentIdx(nextIndex)
    setAnswered(false)
    setIsCorrect(null)
    setSelectedAnswer(null)
    persistProgress({
      currentIdx: nextIndex,
      answered: false,
      selectedAnswer: null,
      isCorrect: null,
      results: resultsRef.current,
    })
  }

  function handleSaveAndExit() {
    persistProgress()
    navigate('/subject')
  }

  return (
    <div className="page-shell">
      <section className="page-hero text-right md:mx-0 md:max-w-none">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
          {selectedActivity === 'exam' ? 'מבחן פעיל' : 'תרגול פעיל'} | {selectedSubject}
        </div>
        <h1 className="section-title font-extrabold">
          {selectedActivity === 'exam' ? 'שומרים על קצב ומסיימים בזמן' : 'ממשיכים לצבור הצלחות שאלה אחר שאלה'}
        </h1>
        <p className="section-subtitle mt-3">
          {selectedLevel ? `רמה נוכחית: ${selectedLevel}. ` : ''}
          {selectedActivity === 'exam'
            ? 'השעון פועל כעת. אפשר לענות ברצף ולקבל סיכום מלא עם סיום המבחן.'
            : 'אפשר לענות בקצב אישי, לקבל משוב מיידי ולהתקדם בביטחון.'}
        </p>
      </section>

      <section className="edu-card-quiz p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-600">{selectedSubject}</span>
          <div className="flex items-center gap-3">
            {selectedActivity === 'exam' && (
              <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                זמן נותר: {formatTime(secondsLeft || 0)}
              </span>
            )}
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">
              {currentIdx + 1} / {quizQuestions.length}
            </span>
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="edu-card-quiz p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              שאלה {currentIdx + 1}
            </div>
            {question.groupTitle && (
              <div className="mb-3 text-sm font-bold tracking-wide text-slate-500">
                {question.groupTitle}
              </div>
            )}
            <p className="text-right text-2xl font-extrabold leading-relaxed text-slate-950">
              {question.text}
            </p>
          </div>
          <button onClick={handleSaveAndExit} className="btn-muted self-start">
            שמירה ויציאה
          </button>
        </div>

        {question.image && (
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-slate-50 p-3 sm:p-5">
            <VisualImage src={question.image} alt={question.text} className="max-h-[320px]" />
          </div>
        )}

        {isOptionQuestion ? (
          <MultipleChoice
            key={question.id}
            options={question.options}
            optionImages={question.optionImages}
            onAnswer={handleAnswer}
            answered={answered}
            selectedAnswer={selectedAnswer}
            isCorrect={isCorrect}
          />
        ) : (
          <OpenText key={question.id} onAnswer={handleAnswer} answered={answered} />
        )}

        {answered && (
          <FeedbackMessage
            isCorrect={isCorrect}
            correctAnswer={correctAnswer}
            explanation={question.explanation}
            isLastQuestion={isLastQuestion}
            onNext={handleNext}
          />
        )}
      </section>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { GENERAL_EXAM_SUBJECT } from '../data/learningTracks'
import { fuzzyMatch } from '../utils/fuzzyMatch'
import ConfirmDialog from '../components/shared/ConfirmDialog'

const GENERAL_EXAM_PERSIST_DEBOUNCE_MS = 800

const LETTER_BADGES = [
  'bg-sky-50 text-sky-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-indigo-50 text-indigo-600',
  'bg-rose-50 text-rose-600',
  'bg-cyan-50 text-cyan-600',
  'bg-teal-50 text-teal-600',
  'bg-fuchsia-50 text-fuchsia-600',
]

const OPTION_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח']

function getOptionBadgeClass(index) {
  return LETTER_BADGES[index % LETTER_BADGES.length]
}

function getOptionLetter(index) {
  return OPTION_LETTERS[index] ?? String(index + 1)
}

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

function evaluateAnswer(question, userAnswer) {
  if (question.type === 'multiple' || question.type === 'sentence_completion') {
    return question.correct_answer.includes(userAnswer)
  }

  return fuzzyMatch(userAnswer, question.correct_answer)
}

function MultipleChoice({
  options,
  optionImages,
  onAnswer,
  answered,
  selectedAnswer,
  isCorrect,
  reviewMode = false,
}) {
  const hasOptionImages = Array.isArray(optionImages) && optionImages.length > 0

  return (
    <div className={`grid gap-3 ${hasOptionImages ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((option, index) => {
        const isSelected = selectedAnswer === option
        let stateClass = 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 hover:-translate-x-1'

        if (reviewMode) {
          stateClass = isSelected
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 hover:-translate-x-1'
        } else if (answered && isSelected && isCorrect) {
          stateClass = 'border-emerald-300 bg-emerald-50 text-emerald-700'
        } else if (answered && isSelected && !isCorrect) {
          stateClass = 'border-red-300 bg-red-50 text-red-700'
        } else if (answered) {
          stateClass = 'border-slate-100 bg-slate-50 text-slate-400'
        }

        return (
          <button
            key={option}
            onClick={() => {
              if (!answered || reviewMode) onAnswer(option)
            }}
            disabled={!reviewMode && answered}
            className={`quiz-option flex ${hasOptionImages ? 'flex-col items-stretch p-3' : 'items-center gap-4'} text-lg font-semibold ${stateClass}`}
          >
            <div className={`flex ${hasOptionImages ? 'w-full items-center justify-between gap-3' : 'items-center gap-4'}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${getOptionBadgeClass(index)}`}>
                {getOptionLetter(index)}
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

function OpenText({ onAnswer, answered, reviewMode = false, value = '', onChangeText }) {
  const [text, setText] = useState(value)

  useEffect(() => {
    setText(value)
  }, [value])

  function handleSubmit(event) {
    event.preventDefault()
    if (!text.trim() || answered) return
    onAnswer(text)
  }

  if (reviewMode) {
    return (
      <input
        type="text"
        value={value}
        onChange={event => onChangeText(event.target.value)}
        placeholder="כתבו את תשובתכם כאן"
        className="input-field"
      />
    )
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
  const motionClass = isCorrect ? 'animate-pop' : 'animate-shake'

  return (
    <div className={`mt-5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${tone} ${motionClass} motion-reduce:animate-none`}>
      <div className="flex items-start gap-3 text-right">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl">
          {isCorrect ? '🎉' : '❌'}
        </div>
        <div>
          <div className="text-lg font-bold">{isCorrect ? 'תשובה נכונה' : 'התשובה אינה מדויקת'}</div>
          <div className="mt-1 text-sm opacity-90">
            {isCorrect ? 'אפשר להמשיך בביטחון לשלב הבא.' : `התשובה הנכונה היא: ${correctAnswer}`}
          </div>
          {explanation && (
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

  const isGeneralExam = selectedActivity === 'exam' && selectedSubject === GENERAL_EXAM_SUBJECT
  const pageSize = isGeneralExam ? 5 : 1

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [results, setResults] = useState([])
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (selectedActivity !== 'exam' || !quizSession.deadlineAt) return null
    return Math.max(0, Math.ceil((quizSession.deadlineAt - Date.now()) / 1000))
  })

  const [showFinishConfirm, setShowFinishConfirm] = useState(false)

  const resultsRef = useRef([])
  const completedRef = useRef(false)
  const finishQuizRef = useRef(finishQuiz)
  const persistTimeoutRef = useRef(null)

  useEffect(() => {
    finishQuizRef.current = finishQuiz
  }, [finishQuiz])

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) window.clearTimeout(persistTimeoutRef.current)
    }
  }, [])

  const pageQuestions = useMemo(() => {
    return isGeneralExam
      ? quizQuestions.slice(currentIdx, currentIdx + pageSize)
      : quizQuestions.slice(currentIdx, currentIdx + 1)
  }, [currentIdx, isGeneralExam, pageSize, quizQuestions])

  const answerMap = useMemo(() => {
    return Object.fromEntries(results.map(result => [result.question.id, result.userAnswer]))
  }, [results])

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
      questionIds: quizQuestions.map(question => question.id),
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
    setAnswered(isGeneralExam ? false : Boolean(activeQuizProgress.answered))
    setIsCorrect(isGeneralExam ? null : (activeQuizProgress.isCorrect ?? null))
    setSelectedAnswer(isGeneralExam ? null : (activeQuizProgress.selectedAnswer ?? null))
  }, [activeQuizProgress, isGeneralExam, quizQuestions])

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
        finishQuizRef.current(resultsRef.current, { timedOut: true, secondsLeft: 0 })
        navigate('/summary')
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [navigate, quizSession.deadlineAt, quizSession.startedAt, selectedActivity])

  if (!quizQuestions || quizQuestions.length === 0) return null

  const question = quizQuestions[currentIdx]
  const progress = isGeneralExam
    ? (Math.min(currentIdx + pageSize, quizQuestions.length) / quizQuestions.length) * 100
    : ((currentIdx + 1) / quizQuestions.length) * 100
  const correctAnswer = question
    ? Array.isArray(question.correct_answer) ? question.correct_answer[0] : question.correct_answer
    : ''
  const isLastQuestion = currentIdx === quizQuestions.length - 1
  const isLastPage = currentIdx + pageSize >= quizQuestions.length
  const answeredExamCount = isGeneralExam
    ? quizQuestions.filter(item => (answerMap[item.id] || '').toString().trim().length > 0).length
    : 0
  const unansweredExamCount = quizQuestions.length - answeredExamCount

  function completeQuiz(meta = {}) {
    if (completedRef.current) return
    completedRef.current = true
    finishQuiz(resultsRef.current, meta)
    navigate('/summary')
  }

  function handleAnswer(userAnswer) {
    const correct = evaluateAnswer(question, userAnswer)

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

  function handleGeneralExamAnswer(targetQuestion, userAnswer) {
    const correct = evaluateAnswer(targetQuestion, userAnswer)
    const nextResults = [...resultsRef.current]
    const existingIndex = nextResults.findIndex(result => result.question.id === targetQuestion.id)

    if (existingIndex >= 0) {
      nextResults[existingIndex] = { question: targetQuestion, userAnswer, correct }
    } else {
      nextResults.push({ question: targetQuestion, userAnswer, correct })
    }

    resultsRef.current = nextResults
    setResults(nextResults)

    if (persistTimeoutRef.current) window.clearTimeout(persistTimeoutRef.current)
    persistTimeoutRef.current = window.setTimeout(() => {
      persistProgress({
        currentIdx,
        answered: false,
        selectedAnswer: null,
        isCorrect: null,
        results: nextResults,
      })
    }, GENERAL_EXAM_PERSIST_DEBOUNCE_MS)
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

  function handleNextExamPage() {
    if (isLastPage) {
      if (unansweredExamCount > 0) {
        setShowFinishConfirm(true)
        return
      }
      completeQuiz({ timedOut: false, secondsLeft })
      return
    }

    const nextIndex = currentIdx + pageSize
    setCurrentIdx(nextIndex)
    persistProgress({
      currentIdx: nextIndex,
      answered: false,
      selectedAnswer: null,
      isCorrect: null,
      results: resultsRef.current,
    })
  }

  function handleConfirmFinishExam() {
    setShowFinishConfirm(false)
    completeQuiz({ timedOut: false, secondsLeft })
  }

  function handleSaveAndExit() {
    if (persistTimeoutRef.current) window.clearTimeout(persistTimeoutRef.current)
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
          {isGeneralExam
            ? 'מבחן כללי על זמן, עם מעבר מסודר בין עמודים'
            : selectedActivity === 'exam'
              ? 'שומרים על קצב ומסיימים בזמן'
              : 'ממשיכים לצבור הצלחות שאלה אחר שאלה'}
        </h1>
        <p className="section-subtitle mt-3">
          {selectedLevel ? `רמה נוכחית: ${selectedLevel}. ` : ''}
          {isGeneralExam
            ? 'בכל עמוד יוצגו 5 שאלות. אין משוב במהלך המבחן, ובסיום יופיע ציון מלא עם פירוט תשובות.'
            : selectedActivity === 'exam'
              ? 'השעון פועל כעת. אפשר לענות ברצף ולקבל סיכום מלא עם סיום המבחן.'
              : 'אפשר לענות בקצב אישי, לקבל משוב מיידי ולהתקדם בביטחון.'}
        </p>
      </section>

      <section className="edu-card-quiz p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-600">{selectedSubject}</span>
          <div className="flex items-center gap-3">
            {selectedActivity === 'exam' && (
              <span
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  (secondsLeft ?? Infinity) <= 60
                    ? 'animate-pulse bg-red-50 text-red-700 motion-reduce:animate-none'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                זמן נותר: {formatTime(secondsLeft || 0)}
              </span>
            )}
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">
              {isGeneralExam
                ? `עמוד ${Math.floor(currentIdx / pageSize) + 1} / ${Math.ceil(quizQuestions.length / pageSize)}`
                : `${currentIdx + 1} / ${quizQuestions.length}`}
            </span>
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="edu-card-quiz p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              {isGeneralExam
                ? `שאלות ${currentIdx + 1}-${Math.min(currentIdx + pageSize, quizQuestions.length)}`
                : `שאלה ${currentIdx + 1}`}
            </div>
            {!isGeneralExam && question?.groupTitle && (
              <div className="mb-3 text-sm font-bold tracking-wide text-slate-500">
                {question.groupTitle}
              </div>
            )}
            {!isGeneralExam && (
              <p className="text-right text-2xl font-extrabold leading-relaxed text-slate-950">
                {question.text}
              </p>
            )}
          </div>
          <button onClick={handleSaveAndExit} className="btn-muted self-start">
            שמירה ויציאה
          </button>
        </div>

        {isGeneralExam ? (
          <div className="space-y-5">
            {pageQuestions.map((pageQuestion, index) => {
              const currentAnswer = answerMap[pageQuestion.id] || ''
              const isOptionQuestion = pageQuestion.type === 'multiple' || pageQuestion.type === 'sentence_completion'
              const isAnswered = currentAnswer.toString().trim().length > 0

              return (
                <article key={pageQuestion.id} className="rounded-card border border-slate-200 bg-slate-50/70 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                      שאלה {currentIdx + index + 1}
                    </div>
                    {isAnswered && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        נענתה
                      </span>
                    )}
                  </div>
                  {pageQuestion.groupTitle && (
                    <div className="mb-2 text-sm font-bold tracking-wide text-slate-500">
                      {pageQuestion.groupTitle}
                    </div>
                  )}
                  <p className="mb-5 text-right text-xl font-extrabold leading-relaxed text-slate-950">
                    {pageQuestion.text}
                  </p>

                  {pageQuestion.image && (
                    <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-3 sm:p-5">
                      <VisualImage src={pageQuestion.image} alt={pageQuestion.text} className="max-h-[280px]" />
                    </div>
                  )}

                  {isOptionQuestion ? (
                    <MultipleChoice
                      options={pageQuestion.options}
                      optionImages={pageQuestion.optionImages}
                      onAnswer={(value) => handleGeneralExamAnswer(pageQuestion, value)}
                      answered={false}
                      selectedAnswer={currentAnswer}
                      isCorrect={null}
                      reviewMode
                    />
                  ) : (
                    <OpenText
                      onAnswer={() => {}}
                      answered={false}
                      reviewMode
                      value={currentAnswer}
                      onChangeText={(value) => handleGeneralExamAnswer(pageQuestion, value)}
                    />
                  )}
                </article>
              )
            })}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold text-slate-500">
                {isLastPage
                  ? `נענו ${answeredExamCount} מתוך ${quizQuestions.length} שאלות.`
                  : 'ניתן להשאיר שאלה ריקה ולחזור אליה בהמשך המבחן, כל עוד לא סיימתם.'}
              </div>
              <button onClick={handleNextExamPage} className="btn-primary">
                {isLastPage ? 'סיום מבחן' : 'לעמוד הבא'}
              </button>
            </div>
          </div>
        ) : (
          <div key={question.id} className="animate-fade-slide-in motion-reduce:animate-none">
            {question.image && (
              <div className="mb-6 rounded-[28px] border border-slate-200 bg-slate-50 p-3 sm:p-5">
                <VisualImage src={question.image} alt={question.text} className="max-h-[320px]" />
              </div>
            )}

            {(question.type === 'multiple' || question.type === 'sentence_completion') ? (
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
          </div>
        )}
      </section>

      <ConfirmDialog
        open={showFinishConfirm}
        title="לסיים את המבחן?"
        message={`נותרו ${unansweredExamCount} שאלות ללא מענה. אפשר לחזור ולהשלים אותן, או לסיים את המבחן כפי שהוא.`}
        confirmLabel="סיום מבחן"
        cancelLabel="חזרה למבחן"
        tone="primary"
        onConfirm={handleConfirmFinishExam}
        onCancel={() => setShowFinishConfirm(false)}
      />
    </div>
  )
}

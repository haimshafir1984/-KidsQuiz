import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { GENERAL_EXAM_SUBJECT } from '../data/learningTracks'
import {
  evaluateQuestionAnswer,
  formatCorrectAnswer,
  getListMinItems,
  SELF_CHECK_KNOWN,
  SELF_CHECK_UNKNOWN,
} from '../utils/questionAnswers'
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

function MultipleChoice({
  options,
  optionImages,
  onAnswer,
  answered,
  selectedAnswer,
  isCorrect,
  correctAnswer = null,
  reviewMode = false,
}) {
  const hasOptionImages = Array.isArray(optionImages) && optionImages.length > 0

  return (
    <div className={`grid gap-3 ${hasOptionImages ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((option, index) => {
        const isSelected = selectedAnswer === option
        const idleClass = 'border-slate-200 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50'
        const idleLetter = 'border-2 border-blue-600 bg-white text-blue-700'
        let stateClass = idleClass
        let letterClass = idleLetter
        let tag = null

        if (reviewMode) {
          stateClass = isSelected ? 'border-blue-600 bg-blue-50 text-blue-800' : idleClass
          letterClass = isSelected ? 'border-2 border-blue-600 bg-blue-600 text-white' : idleLetter
        } else if (answered && isSelected && isCorrect) {
          stateClass = 'border-emerald-600 bg-emerald-50 text-emerald-900'
          letterClass = 'border-2 border-emerald-600 bg-emerald-600 text-white'
          tag = { text: '✔ תשובה נכונה', cls: 'bg-emerald-200 text-emerald-800' }
        } else if (answered && isSelected && !isCorrect) {
          stateClass = 'border-rose-600 bg-rose-50 text-rose-900'
          letterClass = 'border-2 border-rose-600 bg-rose-600 text-white'
          tag = { text: '✖ הבחירה שלך', cls: 'bg-rose-200 text-rose-800' }
        } else if (answered && correctAnswer && option === correctAnswer) {
          // בתשובה שגויה מסמנים בירוק גם את התשובה הנכונה
          stateClass = 'border-emerald-600 bg-emerald-50 text-emerald-900'
          letterClass = 'border-2 border-emerald-600 bg-emerald-600 text-white'
          tag = { text: '✔ תשובה נכונה', cls: 'bg-emerald-200 text-emerald-800' }
        } else if (answered) {
          stateClass = 'border-slate-100 bg-slate-50 text-slate-400'
          letterClass = 'border-2 border-slate-300 bg-white text-slate-400'
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
            <div className={`flex flex-wrap ${hasOptionImages ? 'w-full items-center justify-between gap-3' : 'w-full items-center gap-x-4 gap-y-2'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${letterClass}`}>
                {getOptionLetter(index)}
              </span>
              <span className={`${hasOptionImages ? 'text-base' : 'min-w-0 flex-1 text-right'}`}>{option}</span>
              {tag && (
                <span className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${tag.cls}`}>{tag.text}</span>
              )}
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

function ListAnswer({ question, onAnswer, answered }) {
  const [text, setText] = useState('')
  const needed = getListMinItems(question)

  function handleSubmit(event) {
    event.preventDefault()
    if (!text.trim() || answered) return
    onAnswer(text)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-base font-semibold text-slate-700">
        כותבים לפחות {needed} פריטים. אפשר שורה לכל פריט, או להפריד בפסיקים.
      </p>
      <textarea
        value={text}
        onChange={event => setText(event.target.value)}
        rows={5}
        placeholder={'למשל:\nפריט ראשון\nפריט שני'}
        className="input-field"
        disabled={answered}
        autoFocus
      />
      {!answered && (
        <button type="submit" className="btn-primary w-full py-3.5 text-lg sm:w-auto sm:self-start">
          שליחת תשובה
        </button>
      )}
    </form>
  )
}

function SelfCheck({ question, onAnswer, answered }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-slate-700">
        חושבים על התשובה (או אומרים אותה בקול), ואז מציגים אותה ובודקים את עצמנו.
      </p>

      {!revealed && !answered && (
        <button type="button" onClick={() => setRevealed(true)} className="btn-primary w-full py-3.5 text-lg sm:w-auto">
          הצגת התשובה
        </button>
      )}

      {(revealed || answered) && (
        <>
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-right text-lg leading-8 text-slate-900">
            <div className="mb-1 text-base font-bold text-blue-700">התשובה:</div>
            {question.correct_answer[0]}
          </div>

          {!answered && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onAnswer(SELF_CHECK_KNOWN)}
                className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 text-lg font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                ✔ ידעתי
              </button>
              <button
                type="button"
                onClick={() => onAnswer(SELF_CHECK_UNKNOWN)}
                className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-lg font-bold text-amber-800 transition hover:bg-amber-100"
              >
                לא ידעתי, אחזור על זה
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FeedbackMessage({ isCorrect, correctAnswer, explanation, isLastQuestion, onNext, questionType }) {
  const isSelfCheck = questionType === 'self_check'
  const tone = isCorrect
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700'
  const motionClass = isCorrect ? 'animate-pop' : 'animate-shake'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky bottom-3 z-20 mt-5 flex flex-col gap-4 rounded-2xl border-2 p-4 shadow-float sm:flex-row sm:items-center sm:justify-between ${tone} ${motionClass} motion-reduce:animate-none`}
    >
      <div className="flex items-start gap-3 text-right">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl">
          {isCorrect ? '🎉' : '❌'}
        </div>
        <div>
          <div className="text-xl font-bold">{isCorrect ? (isSelfCheck ? 'יופי, ממשיכים' : 'נכון! כל הכבוד') : (isSelfCheck ? 'לא נורא, זה עוד יגיע' : 'לא בדיוק')}</div>
          <div className="mt-1 text-base opacity-90">
            {isCorrect ? 'אפשר להמשיך לשאלה הבאה.' : (isSelfCheck ? 'אפשר לחזור לשאלה הזאת בהמשך.' : `התשובה הנכונה היא: ${correctAnswer}`)}
          </div>
          {explanation && (
            <div className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-base font-medium text-slate-700">
              הסבר: {explanation}
            </div>
          )}
        </div>
      </div>
      <button onClick={onNext} className="btn-primary w-full py-3.5 text-lg sm:w-auto sm:self-auto">
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
  const correctAnswer = question ? formatCorrectAnswer(question) : ''
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
    const correct = evaluateQuestionAnswer(question, userAnswer)

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
    const correct = evaluateQuestionAnswer(targetQuestion, userAnswer)
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
      <section className="edu-card-quiz p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-base font-semibold text-slate-700">
            {selectedSubject}{selectedLevel ? ` | ${selectedLevel}` : ''}
          </span>
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
        {isGeneralExam && (
          <p className="mt-3 text-base leading-7 text-slate-700">
            בכל עמוד 5 שאלות. אין משוב במהלך המבחן, ובסיום יופיע ציון מלא עם פירוט התשובות.
          </p>
        )}
      </section>

      <section className="edu-card-quiz relative overflow-hidden p-4 pt-7 sm:p-8 sm:pt-10">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-l from-violet-600 to-blue-600" aria-hidden="true" />
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-base font-semibold text-amber-800">
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
              <p className="text-right text-2xl font-extrabold leading-relaxed text-slate-950 sm:text-3xl">
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
                correctAnswer={correctAnswer}
              />
            ) : question.type === 'list' ? (
              <ListAnswer key={question.id} question={question} onAnswer={handleAnswer} answered={answered} />
            ) : question.type === 'self_check' ? (
              <SelfCheck key={question.id} question={question} onAnswer={handleAnswer} answered={answered} />
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
                questionType={question.type}
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

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
import { isSoundEnabled, playFeedbackSound, setSoundEnabled } from '../utils/sounds'

const GENERAL_EXAM_PERSIST_DEBOUNCE_MS = 800

// שמות מחלקות מלאים (ולא מורכבים בזמן ריצה), כדי ש-Tailwind לא יסיר אותם מה-CSS
const OPT_STATE_CLASS = {
  sel: 'study-opt--sel',
  ok: 'study-opt--ok',
  bad: 'study-opt--bad',
  dim: 'study-opt--dim',
}
const LETTER_STATE_CLASS = {
  sel: 'study-letter--sel',
  ok: 'study-letter--ok',
  bad: 'study-letter--bad',
  dim: 'study-letter--dim',
}

const OPTION_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח']

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
    <div className={hasOptionImages ? 'grid grid-cols-1 gap-3 md:grid-cols-2' : 'grid grid-cols-1'}>
      {options.map((option, index) => {
        const isSelected = selectedAnswer === option
        // מצב השורה: ברירת מחדל, נבחרה, נכונה, שגויה, או עמומה אחרי מענה
        let state = ''
        let tag = null

        if (reviewMode) {
          state = isSelected ? 'sel' : ''
        } else if (answered && isSelected && isCorrect) {
          state = 'ok'
          tag = { text: '✔ תשובה נכונה', cls: 'bg-emerald-200 text-emerald-800' }
        } else if (answered && isSelected && !isCorrect) {
          state = 'bad'
          tag = { text: '✖ הבחירה שלך', cls: 'bg-rose-200 text-rose-800' }
        } else if (answered && correctAnswer && option === correctAnswer) {
          // בתשובה שגויה מסמנים בירוק גם את התשובה הנכונה
          state = 'ok'
          tag = { text: '✔ תשובה נכונה', cls: 'bg-emerald-200 text-emerald-800' }
        } else if (answered) {
          state = 'dim'
        }

        const letter = (
          <span className={`study-letter ${LETTER_STATE_CLASS[state] || ''}`}>{getOptionLetter(index)}</span>
        )
        const tagNode = tag && (
          <span className={`whitespace-nowrap rounded-full px-3 py-1 font-sans text-sm font-bold ${tag.cls}`}>{tag.text}</span>
        )

        if (hasOptionImages) {
          // אפשרויות עם תמונה: כרטיסים (בלי שורות)
          const cardState = {
            sel: 'border-blue-600 bg-blue-50',
            ok: 'border-emerald-600 bg-emerald-50',
            bad: 'border-rose-600 bg-rose-50',
            dim: 'border-slate-100 bg-slate-50 opacity-60',
          }[state] || 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50'
          return (
            <button
              key={option}
              onClick={() => {
                if (!answered || reviewMode) onAnswer(option)
              }}
              disabled={!reviewMode && answered}
              className={`flex flex-col items-stretch rounded-2xl border-2 p-3 text-right font-study text-lg font-medium transition-colors ${cardState}`}
            >
              <div className="flex w-full items-center justify-between gap-3">
                {letter}
                <span className="min-w-0 flex-1">{option}</span>
                {tagNode}
              </div>
              {optionImages[index] && (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-2">
                  <VisualImage src={optionImages[index]} alt={`אפשרות ${option}`} className="max-h-44" />
                </div>
              )}
            </button>
          )
        }

        return (
          <button
            key={option}
            onClick={() => {
              if (!answered || reviewMode) onAnswer(option)
            }}
            disabled={!reviewMode && answered}
            className={`study-opt ${OPT_STATE_CLASS[state] || ''}`}
          >
            {letter}
            <span className="min-w-0 flex-1 text-right">{option}</span>
            {tagNode}
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
        className="study-input"
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
        className="study-input"
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
        className="study-input"
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
          <div className="whitespace-pre-line rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-right text-lg leading-8 text-slate-900">
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

// משוב אחרי תשובה: הערה בתוך הדף, ופס פעולה דביק בתחתית עם כפתור "לשאלה הבאה"
function FeedbackMessage({ isCorrect, correctAnswer, explanation, isLastQuestion, onNext, questionType, progressText }) {
  const isSelfCheck = questionType === 'self_check'
  const motionClass = isCorrect ? 'animate-pop' : 'animate-shake'
  const headline = isCorrect
    ? (isSelfCheck ? 'יופי, ממשיכים' : 'נכון! כל הכבוד')
    : (isSelfCheck ? 'לא נורא, זה עוד יגיע' : 'לא בדיוק')

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className={`mt-5 text-right ${motionClass} motion-reduce:animate-none`}
      >
        <div className={`flex items-center gap-2 text-xl font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
          <span aria-hidden="true">{isCorrect ? '🎉' : '✖'}</span>
          {headline}
        </div>
        {!isCorrect && !isSelfCheck && (
          <div className="mt-1 text-lg text-slate-800">
            התשובה הנכונה: <b>{correctAnswer}</b>
          </div>
        )}
        {explanation && (
          <div className="study-note">
            <b>הסבר:</b> {explanation}
          </div>
        )}
      </div>
      <div className="study-actions">
        <span className="text-base font-bold text-slate-600">{progressText}</span>
        <button onClick={onNext} className="btn-primary px-8 py-3.5 text-lg">
          {isLastQuestion ? 'לסיכום' : 'לשאלה הבאה'}
        </button>
      </div>
    </>
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
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
  }

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
    playFeedbackSound(correct)

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

  const DOTS_LIMIT = 40
  const showDots = !isGeneralExam && quizQuestions.length <= DOTS_LIMIT

  return (
    <div className="page-shell gap-4">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <span className="rounded-full bg-white px-4 py-2 text-base font-extrabold text-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.12)]">
          {selectedSubject}{selectedLevel ? ` | ${selectedLevel}` : ''}
        </span>
        <div className="flex flex-wrap items-center gap-2">
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
          {!isGeneralExam && (
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              className="btn-muted px-3 py-2 text-base"
              title={soundOn ? 'כיבוי צלילים' : 'הפעלת צלילים'}
            >
              {soundOn ? '🔊 צליל פעיל' : '🔇 צליל כבוי'}
            </button>
          )}
          <button onClick={handleSaveAndExit} className="btn-muted px-3 py-2 text-base">
            שמירה ויציאה
          </button>
        </div>
        {showDots ? (
          <div
            className="flex w-full flex-wrap justify-center gap-1.5"
            role="img"
            aria-label={`שאלה ${currentIdx + 1} מתוך ${quizQuestions.length}`}
          >
            {quizQuestions.map((item, index) => (
              <i
                key={item.id}
                className={`study-dot ${index < currentIdx ? 'study-dot--done' : index === currentIdx ? 'study-dot--cur' : ''}`}
              />
            ))}
          </div>
        ) : (
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      <section className="study-page">
        <div className="study-qnum">
          {isGeneralExam
            ? `שאלות ${currentIdx + 1}-${Math.min(currentIdx + pageSize, quizQuestions.length)} מתוך ${quizQuestions.length} (עמוד ${Math.floor(currentIdx / pageSize) + 1} מתוך ${Math.ceil(quizQuestions.length / pageSize)})`
            : `שאלה ${currentIdx + 1} מתוך ${quizQuestions.length}`}
        </div>
        {isGeneralExam && (
          <p className="mt-2 text-base leading-7 text-slate-700">
            בכל עמוד 5 שאלות. אין משוב במהלך המבחן, ובסיום יופיע ציון מלא עם פירוט התשובות.
          </p>
        )}
        {!isGeneralExam && question?.groupTitle && (
          <div className="mt-2 text-sm font-bold tracking-wide text-slate-500">{question.groupTitle}</div>
        )}
        {!isGeneralExam && (
          <h1 className="study-question mb-5 mt-2 text-right">{question.text}</h1>
        )}

        {isGeneralExam ? (
          <div className="mt-4 space-y-8">
            {pageQuestions.map((pageQuestion, index) => {
              const currentAnswer = answerMap[pageQuestion.id] || ''
              const isOptionQuestion = pageQuestion.type === 'multiple' || pageQuestion.type === 'sentence_completion'
              const isAnswered = currentAnswer.toString().trim().length > 0

              return (
                <article key={pageQuestion.id} className="border-t-2 border-blue-100 pt-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-base font-extrabold text-violet-700">שאלה {currentIdx + index + 1}</span>
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
                  <p className="mb-4 text-right font-study text-2xl font-bold leading-snug text-slate-950">
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

            <div className="study-actions">
              <div className="text-sm font-semibold text-slate-600">
                {isLastPage
                  ? `נענו ${answeredExamCount} מתוך ${quizQuestions.length} שאלות.`
                  : 'ניתן להשאיר שאלה ריקה ולחזור אליה בהמשך המבחן, כל עוד לא סיימתם.'}
              </div>
              <button onClick={handleNextExamPage} className="btn-primary px-8 py-3.5 text-lg">
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
                progressText={`${currentIdx + 1} מתוך ${quizQuestions.length}`}
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

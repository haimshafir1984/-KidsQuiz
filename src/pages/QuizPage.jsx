import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fuzzyMatch } from '../utils/fuzzyMatch'

const LETTER_BADGES = [
  'bg-sky-50 text-sky-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-indigo-50 text-indigo-600',
]

function MultipleChoice({ options, onAnswer, answered, selectedAnswer, isCorrect }) {
  return (
    <div className="grid grid-cols-1 gap-3">
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
            className={`quiz-option flex items-center gap-4 text-lg font-semibold ${stateClass}`}
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${LETTER_BADGES[index]}`}>
              {['א', 'ב', 'ג', 'ד'][index]}
            </span>
            <span className="flex-1 text-right">{option}</span>
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
    if (text.trim() && !answered) onAnswer(text)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder="כתוב את תשובתך כאן..."
        className="input-field"
        disabled={answered}
        autoFocus
      />
      {!answered && (
        <button type="submit" className="btn-primary self-start">
          שלח תשובה ✨
        </button>
      )}
    </form>
  )
}

function FeedbackMessage({ isCorrect, correctAnswer, isLastQuestion, onNext }) {
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
          <div className="text-lg font-bold">{isCorrect ? 'תשובה מצוינת!' : 'לא נורא, ממשיכים ללמוד'}</div>
          <div className="mt-1 text-sm opacity-90">
            {isCorrect ? 'השאלה הזו מאחוריך, אפשר להתקדם בביטחון.' : `התשובה הנכונה היא: ${correctAnswer}`}
          </div>
        </div>
      </div>
      <button onClick={onNext} className="btn-primary self-start sm:self-auto">
        {isLastQuestion ? 'לסיכום 🌟' : 'לשאלה הבאה ➜'}
      </button>
    </div>
  )
}

export default function QuizPage() {
  const { quizQuestions, finishQuiz, selectedSubject } = useApp()
  const navigate = useNavigate()

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!quizQuestions || quizQuestions.length === 0) navigate('/subject')
  }, [navigate, quizQuestions])

  if (!quizQuestions || quizQuestions.length === 0) return null

  const question = quizQuestions[currentIdx]
  const progress = ((currentIdx + 1) / quizQuestions.length) * 100
  const correctAnswer = Array.isArray(question.correct_answer)
    ? question.correct_answer[0]
    : question.correct_answer
  const isLastQuestion = currentIdx === quizQuestions.length - 1

  function handleAnswer(userAnswer) {
    let correct = false

    if (question.type === 'multiple') {
      correct = question.correct_answer.includes(userAnswer)
    } else {
      correct = fuzzyMatch(userAnswer, question.correct_answer)
    }

    setIsCorrect(correct)
    setAnswered(true)
    setSelectedAnswer(userAnswer)
    setResults(previous => [...previous, { question, userAnswer, correct }])
  }

  function handleNext() {
    if (!answered) return

    if (isLastQuestion) {
      finishQuiz(results)
      navigate('/summary')
      return
    }

    setCurrentIdx(previous => previous + 1)
    setAnswered(false)
    setIsCorrect(null)
    setSelectedAnswer(null)
  }

  return (
    <div className="page-shell">
      <section className="page-hero text-right md:mx-0 md:max-w-none">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
          תרגול פעיל בנושא {selectedSubject} 🎯
        </div>
        <h1 className="section-title">ממשיכים לצבור הצלחות שאלה אחר שאלה</h1>
        <p className="section-subtitle mt-3">
          שמרו על קצב קבוע, בחרו בביטחון וקבלו משוב ברור וצבעוני אחרי כל תשובה.
        </p>
      </section>

      <section className="edu-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-600">{selectedSubject}</span>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">
            {currentIdx + 1} / {quizQuestions.length}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="edu-card p-6 sm:p-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
            שאלה {currentIdx + 1} ✨
          </div>
          <p className="text-right text-2xl font-extrabold leading-relaxed text-slate-950">
            {question.text}
          </p>
        </div>

        {question.type === 'multiple' ? (
          <MultipleChoice
            options={question.options}
            onAnswer={handleAnswer}
            answered={answered}
            selectedAnswer={selectedAnswer}
            isCorrect={isCorrect}
          />
        ) : (
          <OpenText onAnswer={handleAnswer} answered={answered} />
        )}

        {answered && (
          <FeedbackMessage
            isCorrect={isCorrect}
            correctAnswer={correctAnswer}
            isLastQuestion={isLastQuestion}
            onNext={handleNext}
          />
        )}
      </section>
    </div>
  )
}

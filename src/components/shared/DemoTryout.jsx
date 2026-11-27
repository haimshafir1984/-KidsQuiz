import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { groupDemoQuestions } from '../../utils/siteSettings'
import {
  SELF_CHECK_KNOWN,
  SELF_CHECK_UNKNOWN,
  evaluateQuestionAnswer,
  formatCorrectAnswer,
  getListMinItems,
  hasOptions,
} from '../../utils/questionAnswers'
import { useDialogA11y } from './useDialogA11y'

function TryQuestion({ question, number, value, checked, onChange, onCheck }) {
  const isCorrect = checked ? evaluateQuestionAnswer(question, value) : false
  const isSelfCheck = question.type === 'self_check'
  const choice = hasOptions(question.type)

  return (
    <article className="demo-modal__question">
      <div className="demo-modal__question-head">
        <span className="demo-modal__question-type">שאלה {number}</span>
      </div>
      {question.groupTitle && <p className="text-base font-semibold text-slate-600">{question.groupTitle}</p>}
      <p className="demo-modal__question-text whitespace-pre-line">{question.text}</p>
      {question.image && <img src={question.image} alt="" className="mb-3 max-h-56 w-full rounded-xl bg-white object-contain" />}

      {choice && (
        <div className="demo-modal__options">
          {question.options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={checked}
              aria-pressed={value === option}
              className={`demo-modal__option ${value === option ? 'demo-modal__option--active' : ''}`}
              onClick={() => onChange(option)}
            >
              {question.optionImages?.[index] && <img src={question.optionImages[index]} alt="" className="mb-1 max-h-20 object-contain" />}
              {option}
            </button>
          ))}
        </div>
      )}

      {!choice && !isSelfCheck && (
        question.type === 'list' ? (
          <textarea
            rows={3}
            className="demo-modal__input"
            aria-label={`התשובה לשאלה ${number}`}
            placeholder={`כתבו לפחות ${getListMinItems(question)}, כל אחד בשורה`}
            value={value}
            disabled={checked}
            onChange={event => onChange(event.target.value)}
          />
        ) : (
          <input
            type="text"
            className="demo-modal__input"
            aria-label={`התשובה לשאלה ${number}`}
            placeholder="כתבו כאן את התשובה"
            value={value}
            disabled={checked}
            onChange={event => onChange(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && value.trim()) onCheck() }}
          />
        )
      )}

      {!checked && !isSelfCheck && (
        <button type="button" className="demo-modal__primary mt-3" disabled={!value.trim()} onClick={() => onCheck()}>
          בדיקה
        </button>
      )}

      {!checked && isSelfCheck && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="demo-modal__primary" onClick={() => onChange(SELF_CHECK_KNOWN, true)}>ידעתי, להציג את התשובה</button>
          <button type="button" className="demo-modal__secondary" onClick={() => onChange(SELF_CHECK_UNKNOWN, true)}>להציג את התשובה</button>
        </div>
      )}

      {checked && (
        <p
          role="status"
          className={`demo-modal__feedback whitespace-pre-line ${isCorrect ? 'demo-modal__feedback--success' : 'demo-modal__feedback--neutral'}`}
        >
          {isSelfCheck
            ? `התשובה: ${question.correct_answer[0]}`
            : isCorrect ? 'נכון מאוד!' : `התשובה הנכונה: ${formatCorrectAnswer(question)}`}
          {question.explanation ? `\n${question.explanation}` : ''}
        </p>
      )}
    </article>
  )
}

// חלון ההתנסות בעמוד הפתיחה: בוחרים נושא ותת-נושא ועונים על השאלות שנבחרו בניהול
export default function DemoTryout({ questions, onClose }) {
  const topics = useMemo(() => groupDemoQuestions(questions), [questions])
  const [topicIndex, setTopicIndex] = useState(0)
  const [subtopicIndex, setSubtopicIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState({})
  const dialogRef = useDialogA11y(true, onClose)

  const topic = topics[topicIndex] || topics[0]
  const subtopic = topic?.subtopics[subtopicIndex] || topic?.subtopics[0]
  const visible = subtopic?.questions || []

  const answeredCount = Object.keys(checked).length
  const correctCount = questions.filter(question => checked[question.id] && evaluateQuestionAnswer(question, answers[question.id] || '')).length

  function chooseTopic(index) {
    setTopicIndex(index)
    setSubtopicIndex(0)
  }

  return (
    <div className="demo-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="demo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-tryout-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="demo-modal__header">
          <div>
            <div className="demo-modal__eyebrow">התנסות קצרה</div>
            <h3 id="demo-tryout-title" className="demo-modal__title">רוצים להרגיש את המערכת מבפנים?</h3>
            <p className="demo-modal__subtitle">בוחרים נושא ותת-נושא, ועונים על כמה שאלות מתוך המערכת.</p>
          </div>
          <button type="button" className="demo-modal__close" onClick={onClose} aria-label="סגירת חלון ההתנסות">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!topic && <p className="text-base text-slate-700">אין כרגע שאלות להתנסות.</p>}

        {topic && (
          <>
            <div className="demo-modal__step">1. בוחרים נושא</div>
            <div className="demo-modal__tabs">
              {topics.map((item, index) => (
                <button
                  key={item.subject}
                  type="button"
                  aria-pressed={item === topic}
                  className={`demo-modal__tab ${item === topic ? 'demo-modal__tab--active' : ''}`}
                  onClick={() => chooseTopic(index)}
                >
                  {item.subject}
                </button>
              ))}
            </div>

            {(topic.subtopics.length > 1 || topic.subtopics[0].level) && (
              <>
                <div className="demo-modal__step">2. בוחרים תת-נושא</div>
                <div className="demo-modal__tabs">
                  {topic.subtopics.map((item, index) => (
                    <button
                      key={item.level}
                      type="button"
                      aria-pressed={item === subtopic}
                      className={`demo-modal__tab ${item === subtopic ? 'demo-modal__tab--active' : ''}`}
                      onClick={() => setSubtopicIndex(index)}
                    >
                      {item.level || 'כללי'}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="demo-modal__grid">
              {visible.map((question, index) => (
                <TryQuestion
                  key={question.id}
                  question={question}
                  number={index + 1}
                  value={answers[question.id] || ''}
                  checked={Boolean(checked[question.id])}
                  onChange={(value, reveal) => {
                    setAnswers(previous => ({ ...previous, [question.id]: value }))
                    if (reveal) setChecked(previous => ({ ...previous, [question.id]: true }))
                  }}
                  onCheck={() => setChecked(previous => ({ ...previous, [question.id]: true }))}
                />
              ))}
            </div>
          </>
        )}

        <div className="demo-modal__footer">
          <p className="demo-modal__result">
            {answeredCount > 0 ? `עניתם נכון על ${correctCount} מתוך ${answeredCount}.` : ' '}
          </p>
          <div className="demo-modal__actions">
            <button type="button" className="demo-modal__secondary" onClick={onClose}>סגירה</button>
          </div>
        </div>
      </div>
    </div>
  )
}

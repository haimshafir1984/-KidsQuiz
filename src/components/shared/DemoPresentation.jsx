import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react'

const SLIDES = [
  {
    id: 'intro',
    eyebrow: 'סקירה מהירה',
    title: 'כך נראית חוויית הלמידה במערכת',
    description:
      'בכמה צעדים קצרים אפשר להבין איך תלמיד נכנס, עונה על שאלות, ושומר את כל ההתקדמות שלו במקום אחד.',
    tone: 'from-slate-700 via-blue-700 to-sky-700',
    icon: Sparkles,
    render: IntroSlide,
  },
  {
    id: 'question-multiple',
    eyebrow: 'שאלה לדוגמה',
    title: 'שאלה אמריקאית עם משוב מיידי',
    description:
      'המסך נשאר ממוקד בשאלה, עם התקדמות ברורה ותשובות גדולות שקל לבחור. פשוט, נעים ומעודד להמשיך.',
    tone: 'from-slate-700 via-blue-700 to-teal-700',
    icon: Target,
    render: MultipleChoiceSlide,
  },
  {
    id: 'question-open',
    eyebrow: 'עוד סוג שאלה',
    title: 'גם שאלות פתוחות והשלמות משפטים',
    description:
      'אפשר לשלב כמה סוגי שאלות בלי לאבד את תחושת הפשטות. השאלה נשארת במרכז והחוויה נשארת ברורה.',
    tone: 'from-slate-700 via-indigo-700 to-blue-700',
    icon: BookOpenCheck,
    render: OpenQuestionSlide,
  },
  {
    id: 'profile',
    eyebrow: 'אזור אישי',
    title: 'תוצאות, שמירות והתקדמות במקום אחד',
    description:
      'האזור האישי מרכז ציונים, ממוצע, שמירות פעילות וחזרה מהירה בדיוק לנקודה האחרונה.',
    tone: 'from-slate-800 via-slate-700 to-blue-800',
    icon: LayoutDashboard,
    render: ProfileSlide,
  },
]

const TRY_MULTIPLE_QUESTION = {
  text: 'מי חיבר את הספר "היד החזקה"?',
  options: ['הרמב"ם', 'רבי יהודה הלוי', 'רבי יוסף קארו', 'הרב קוק'],
  correctAnswer: 'הרמב"ם',
}

const TRY_OPEN_QUESTION = {
  text: 'השלימו את המשפט: "עלינו לשבח ל___ הכל"',
  correctAnswer: 'אדון',
}

function IntroSlide() {
  return (
    <div className="demo-device demo-device--soft">
      <div className="demo-strip">
        <span className="demo-pill demo-pill--blue">למידה לפי מסלול</span>
        <span className="demo-pill demo-pill--mint">שמירת התקדמות</span>
      </div>

      <div className="demo-kpi-grid">
        <article className="demo-kpi">
          <div className="demo-kpi__icon demo-kpi__icon--blue">
            <Target className="h-4 w-4" />
          </div>
          <strong>356</strong>
          <span>שאלות פעילות</span>
        </article>
        <article className="demo-kpi">
          <div className="demo-kpi__icon demo-kpi__icon--violet">
            <BarChart3 className="h-4 w-4" />
          </div>
          <strong>38</strong>
          <span>נושאים</span>
        </article>
        <article className="demo-kpi">
          <div className="demo-kpi__icon demo-kpi__icon--amber">
            <Trophy className="h-4 w-4" />
          </div>
          <strong>3</strong>
          <span>מסלולים</span>
        </article>
      </div>

      <div className="demo-feature-list">
        <div className="demo-feature-row">
          <span className="demo-feature-dot demo-feature-dot--blue" />
          תרגול לפי כיתה, נושא, רמה וסוג פעילות
        </div>
        <div className="demo-feature-row">
          <span className="demo-feature-dot demo-feature-dot--mint" />
          שמירה באמצע וחזרה לאותו מקום
        </div>
        <div className="demo-feature-row">
          <span className="demo-feature-dot demo-feature-dot--amber" />
          אזור אישי עם תוצאות והתקדמות
        </div>
      </div>
    </div>
  )
}

function MultipleChoiceSlide() {
  return (
    <div className="demo-device">
      <div className="demo-question-top">
        <span className="demo-pill demo-pill--blue">תרגול פעיל | אינטליגנציה יהודית</span>
        <span className="demo-pill demo-pill--muted">שאלה 7 מתוך 12</span>
      </div>

      <div className="demo-progress">
        <span style={{ width: '58%' }} />
      </div>

      <div className="demo-question-card">
        <div className="demo-question-card__eyebrow">מי חיבר את הספרים האלה</div>
        <h3>היד החזקה?</h3>
      </div>

      <div className="demo-answer-grid">
        <div className="demo-answer demo-answer--active">
          <span>א</span>
          הרמב"ם
        </div>
        <div className="demo-answer">
          <span>ב</span>
          רבי יהודה הלוי
        </div>
        <div className="demo-answer">
          <span>ג</span>
          הרב קוק
        </div>
        <div className="demo-answer">
          <span>ד</span>
          רבי יוסף קארו
        </div>
      </div>

      <div className="demo-feedback">
        <CheckCircle2 className="h-4 w-4" />
        תשובה נכונה. ההסבר מוצג מיד והלומד ממשיך בביטחון לשאלה הבאה.
      </div>
    </div>
  )
}

function OpenQuestionSlide() {
  return (
    <div className="demo-device">
      <div className="demo-question-top">
        <span className="demo-pill demo-pill--rose">תרגול פתוח | לשון</span>
        <span className="demo-pill demo-pill--muted">שאלה 3 מתוך 9</span>
      </div>

      <div className="demo-progress">
        <span style={{ width: '31%' }} />
      </div>

      <div className="demo-question-card">
        <div className="demo-question-card__eyebrow">השלמת משפטים</div>
        <h3>השלימו: "עלינו לשבח ל... הכל"</h3>
      </div>

      <div className="demo-open-box">
        <div className="demo-open-box__label">תשובת התלמיד</div>
        <div className="demo-open-box__value">אדון</div>
      </div>

      <div className="demo-feedback demo-feedback--soft">
        <BookOpenCheck className="h-4 w-4" />
        גם בשאלות פתוחות נשמרת אותה חוויה נקייה, עם מקום ברור לכתיבה ולמשוב.
      </div>
    </div>
  )
}

function ProfileSlide() {
  return (
    <div className="demo-device">
      <div className="demo-profile-head">
        <div>
          <div className="demo-question-card__eyebrow">אזור אישי</div>
          <h3 className="demo-profile-title">נועה לוי</h3>
          <p className="demo-profile-subtitle">כיתה ח׳ | עבודה מחוברת</p>
        </div>
        <div className="demo-avatar">נ</div>
      </div>

      <div className="demo-kpi-grid">
        <article className="demo-kpi">
          <div className="demo-kpi__icon demo-kpi__icon--blue">
            <BarChart3 className="h-4 w-4" />
          </div>
          <strong>89%</strong>
          <span>ממוצע</span>
        </article>
        <article className="demo-kpi">
          <div className="demo-kpi__icon demo-kpi__icon--mint">
            <BookOpenCheck className="h-4 w-4" />
          </div>
          <strong>18</strong>
          <span>פעילויות</span>
        </article>
        <article className="demo-kpi">
          <div className="demo-kpi__icon demo-kpi__icon--amber">
            <Clock3 className="h-4 w-4" />
          </div>
          <strong>2</strong>
          <span>שמירות</span>
        </article>
      </div>

      <div className="demo-history-card">
        <div className="demo-history-row">
          <div>
            <strong>השלמת סדרות</strong>
            <span>נענו 7 מתוך 12</span>
          </div>
          <button>המשך</button>
        </div>
        <div className="demo-history-row">
          <div>
            <strong>אוצר מילים</strong>
            <span>מבחן אחרון: 92%</span>
          </div>
          <button>צפייה</button>
        </div>
      </div>
    </div>
  )
}

export default function DemoPresentation() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isTryModalOpen, setIsTryModalOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState('')
  const [openAnswer, setOpenAnswer] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const activeSlide = SLIDES[activeIndex]
  const ActiveSlideComponent = activeSlide.render
  const ActiveIcon = activeSlide.icon

  const isMultipleCorrect = selectedOption === TRY_MULTIPLE_QUESTION.correctAnswer
  const isOpenCorrect = openAnswer.trim().toLowerCase() === TRY_OPEN_QUESTION.correctAnswer
  const score = Number(isMultipleCorrect) + Number(isOpenCorrect)

  const resultMessage = useMemo(() => {
    if (!isSubmitted) return ''
    if (score === 2) return 'יפה מאוד, שתי התשובות נכונות.'
    if (score === 1) return 'יפה, תשובה אחת נכונה. כבר מרגישים את חוויית המערכת.'
    return 'זו רק הדגמה קצרה, ותמיד אפשר לנסות שוב.'
  }, [isSubmitted, score])

  function goToNext() {
    setActiveIndex((previous) => (previous + 1) % SLIDES.length)
  }

  function goToPrevious() {
    setActiveIndex((previous) => (previous - 1 + SLIDES.length) % SLIDES.length)
  }

  function openTryModal() {
    setSelectedOption('')
    setOpenAnswer('')
    setIsSubmitted(false)
    setIsTryModalOpen(true)
  }

  function closeTryModal() {
    setIsTryModalOpen(false)
  }

  function submitTryAnswers() {
    setIsSubmitted(true)
  }

  return (
    <>
      <aside className="demo-presentation">
        <div className={`demo-presentation__hero bg-gradient-to-br ${activeSlide.tone}`}>
          <div className="demo-presentation__icon">
            <ActiveIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="demo-presentation__eyebrow">{activeSlide.eyebrow}</div>
            <h2>{activeSlide.title}</h2>
            <p>{activeSlide.description}</p>
          </div>
        </div>

        <div className="demo-presentation__canvas">
          <ActiveSlideComponent />
        </div>

        <div className="demo-presentation__footer">
          <div className="demo-presentation__nav">
            <button type="button" onClick={goToPrevious} className="demo-nav-btn" aria-label="קודם">
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="demo-presentation__dots">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`demo-dot ${index === activeIndex ? 'demo-dot--active' : ''}`}
                  aria-label={`מעבר לשקופית ${index + 1}`}
                />
              ))}
            </div>

            <button type="button" onClick={goToNext} className="demo-nav-btn" aria-label="הבא">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="demo-presentation__actions">
            <span className="demo-presentation__caption">
              שקופית {activeIndex + 1} מתוך {SLIDES.length}
            </span>
            <button type="button" className="demo-presentation__cta" onClick={openTryModal}>
              רוצה להתנסות
            </button>
          </div>
        </div>
      </aside>

      {isTryModalOpen ? (
        <div className="demo-modal__backdrop" role="presentation" onClick={closeTryModal}>
          <div
            className="demo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-tryout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="demo-modal__header">
              <div>
                <div className="demo-modal__eyebrow">התנסות קצרה</div>
                <h3 id="demo-tryout-title" className="demo-modal__title">
                  רוצים להרגיש את המערכת מבפנים?
                </h3>
                <p className="demo-modal__subtitle">
                  שתי שאלות קצרות, אחת סגורה ואחת פתוחה, כדי לראות את החוויה בזמן אמת.
                </p>
              </div>

              <button
                type="button"
                className="demo-modal__close"
                onClick={closeTryModal}
                aria-label="סגירת חלון ההתנסות"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="demo-modal__grid">
              <article className="demo-modal__question">
                <div className="demo-modal__question-head">
                  <span className="demo-modal__question-type">שאלה סגורה</span>
                  <CircleHelp className="h-4 w-4" />
                </div>
                <p className="demo-modal__question-text">{TRY_MULTIPLE_QUESTION.text}</p>
                <div className="demo-modal__options">
                  {TRY_MULTIPLE_QUESTION.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`demo-modal__option ${
                        selectedOption === option ? 'demo-modal__option--active' : ''
                      }`}
                      onClick={() => setSelectedOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {isSubmitted ? (
                  <p
                    className={`demo-modal__feedback ${
                      isMultipleCorrect
                        ? 'demo-modal__feedback--success'
                        : 'demo-modal__feedback--neutral'
                    }`}
                  >
                    {isMultipleCorrect
                      ? 'נכון מאוד, זו התשובה המדויקת.'
                      : `התשובה בדוגמה היא: ${TRY_MULTIPLE_QUESTION.correctAnswer}`}
                  </p>
                ) : null}
              </article>

              <article className="demo-modal__question">
                <div className="demo-modal__question-head">
                  <span className="demo-modal__question-type">שאלה פתוחה</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="demo-modal__question-text">{TRY_OPEN_QUESTION.text}</p>
                <input
                  type="text"
                  className="demo-modal__input"
                  placeholder="כתבו כאן את התשובה"
                  value={openAnswer}
                  onChange={(event) => setOpenAnswer(event.target.value)}
                />

                {isSubmitted ? (
                  <p
                    className={`demo-modal__feedback ${
                      isOpenCorrect
                        ? 'demo-modal__feedback--success'
                        : 'demo-modal__feedback--neutral'
                    }`}
                  >
                    {isOpenCorrect
                      ? 'מעולה, זו בדיוק ההשלמה הנכונה.'
                      : `התשובה בדוגמה היא: ${TRY_OPEN_QUESTION.correctAnswer}`}
                  </p>
                ) : null}
              </article>
            </div>

            <div className="demo-modal__footer">
              <p className="demo-modal__result">{isSubmitted ? resultMessage : ' '}</p>
              <div className="demo-modal__actions">
                <button type="button" className="demo-modal__secondary" onClick={closeTryModal}>
                  סגירה
                </button>
                <button type="button" className="demo-modal__primary" onClick={submitTryAnswers}>
                  בדיקת תשובות
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

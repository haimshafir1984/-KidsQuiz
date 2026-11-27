import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import DemoTryout from './DemoTryout'

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
          <strong>5</strong>
          <span>סוגי שאלות</span>
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
  const { demoQuestions } = useApp()

  const activeSlide = SLIDES[activeIndex]
  const ActiveSlideComponent = activeSlide.render
  const ActiveIcon = activeSlide.icon

  function goToNext() {
    setActiveIndex((previous) => (previous + 1) % SLIDES.length)
  }

  function goToPrevious() {
    setActiveIndex((previous) => (previous - 1 + SLIDES.length) % SLIDES.length)
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
            {demoQuestions.length > 0 && (
              <button type="button" className="demo-presentation__cta" onClick={() => setIsTryModalOpen(true)}>
                רוצה להתנסות
              </button>
            )}
          </div>
        </div>
      </aside>

      {isTryModalOpen && <DemoTryout questions={demoQuestions} onClose={() => setIsTryModalOpen(false)} />}
    </>
  )
}

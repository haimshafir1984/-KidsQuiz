import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Dot, GraduationCap, LineChart, Rocket } from 'lucide-react'
import DemoPresentation from '../components/shared/DemoPresentation'

const FEATURE_CARDS = [
  {
    icon: GraduationCap,
    title: 'למידה שמרגישה טוב',
    description: 'ממשק מזמין שמאפשר להתרכז בתוכן, בלי לאבד אנרגיה בדרך.',
  },
  {
    icon: Rocket,
    title: 'התקדמות עם תנופה',
    description: 'משימות ממוקדות ומשוב מיידי ששומרים על קצב ומוטיבציה.',
  },
  {
    icon: LineChart,
    title: 'תמונה ברורה להורים',
    description: 'אזור אישי שמרכז תוצאות, שמירות והתקדמות לאורך זמן.',
  },
]

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="page-shell justify-center lg:min-h-[78vh]">
      <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="space-y-6 text-right">
          <div className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
            <Dot className="h-5 w-5 text-blue-600" />
            פלטפורמת למידה ותרגול
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-5xl">
              לומדים חכם, מתרגלים בנינוחות ומתקדמים בביטחון
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-700">
              סביבת תרגול מקצועית ונעימה, עם מבנה ברור ומשוב מיידי שמאפשרים לתלמידים להישאר מרוכזים,
              להבין מהר יותר, ולחוות הצלחה לאורך הדרך.
            </p>
          </div>

          {/* הכפתורים מיד אחרי הכותרת, כדי שבטלפון לא צריך לגלול כדי להתחיל */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-start">
            <button onClick={() => navigate('/auth?tab=register')} className="btn-primary w-full py-4 text-lg sm:w-auto">
              <ArrowLeft className="h-5 w-5" />
              יצירת חשבון חדש
            </button>
            <button onClick={() => navigate('/auth')} className="btn-secondary w-full py-4 text-lg sm:w-auto">
              יש לי כבר חשבון - כניסה
            </button>
          </div>

          <div className="hidden rounded-3xl border border-blue-100 bg-gradient-to-l from-blue-50/70 via-white to-violet-50/70 p-5 shadow-sm lg:block">
            <div className="mb-2 text-sm font-semibold text-blue-700">הדגמה חיה בתוך עמוד הפתיחה</div>
            <p className="text-base leading-7 text-slate-700">
              בצד שמאל אפשר לראות איך נראית הכניסה למערכת, איך נראית שאלה לדוגמה, ואיך נראה האזור האישי -
              הכול לפני שנרשמים.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FEATURE_CARDS.map(card => {
              const Icon = card.icon

              return (
                <div key={card.title} className="edu-card p-5">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mb-2 text-lg font-semibold text-slate-900">{card.title}</h2>
                  <p className="text-base leading-6 text-slate-700">{card.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        <DemoPresentation />
      </section>
    </div>
  )
}

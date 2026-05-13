import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Dot, GraduationCap, Rocket } from 'lucide-react'
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
    icon: Dot,
    title: 'תמונה ברורה להורים',
    description: 'אזור אישי שמרכז תוצאות, שמירות והתקדמות לאורך זמן.',
  },
]

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="page-shell min-h-[78vh] justify-center">
      <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="space-y-6 text-right">
          <div className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
            <Dot className="h-5 w-5 text-blue-600" />
            פלטפורמת למידה ותרגול
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
              לומדים חכם, מתרגלים בנינוחות ומתקדמים בביטחון
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
              סביבת תרגול מקצועית ונעימה, עם מבנה ברור ומשוב מיידי שמאפשרים לתלמידים להישאר מרוכזים,
              להבין מהר יותר, ולחוות הצלחה לאורך הדרך.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-gradient-to-l from-blue-50/70 via-white to-violet-50/70 p-5 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-blue-700">מצגת חיה בתוך עמוד הפתיחה</div>
            <p className="text-sm leading-7 text-slate-600">
              בצד ימין מחכה הדגמה שמציגה איך נראית הכניסה למערכת, איך נראית שאלה לדוגמה,
              ואיך נראה האזור האישי. זאת נקודת פתיחה טובה למצגת מכירתית שנלטש יחד בהמשך.
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
                  <h2 className="mb-2 text-base font-semibold text-slate-900">{card.title}</h2>
                  <p className="text-sm leading-6 text-slate-600">{card.description}</p>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-start">
            <button onClick={() => navigate('/auth?tab=register')} className="btn-primary">
              <ArrowLeft className="h-4 w-4" />
              יצירת חשבון
            </button>
            <button onClick={() => navigate('/auth')} className="btn-secondary">
              כניסה לחשבון קיים
            </button>
          </div>
        </div>

        <DemoPresentation />
      </section>
    </div>
  )
}

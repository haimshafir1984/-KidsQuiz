import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, CheckCircle2, Dot, GraduationCap, Rocket } from 'lucide-react'

const DEMO = {
  text: 'כמה ימים יש בשבוע?',
  options: ['5', '6', '7', '8'],
  answer: '7',
}

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
    icon: BarChart3,
    title: 'תוצאות ברורות',
    description: 'מעקב אחר הישגים בצורה נגישה, מסודרת ומעודדת.',
  },
]

export default function WelcomePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const answered = selected !== null
  const isCorrect = selected === DEMO.answer

  function pick(option) {
    if (!answered) setSelected(option)
  }

  function getOptionClass(option) {
    if (!answered) {
      return 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:-translate-x-1'
    }

    if (option === DEMO.answer) {
      return 'border-emerald-300 bg-emerald-50 text-emerald-700'
    }

    if (option === selected) {
      return 'border-red-300 bg-red-50 text-red-700'
    }

    return 'border-slate-200 bg-slate-50 text-slate-400'
  }

  return (
    <div className="page-shell min-h-[78vh] justify-center">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
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
              סביבת תרגול מקצועית ונעימה, עם מבנה ברור ומשוב מיידי שמאפשרים לתלמידים
              להישאר מרוכזים, להבין מהר יותר, ולחוות הצלחה לאורך הדרך.
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

        <aside className="edu-card p-6 sm:p-8">
          <div className="mb-5 text-right">
            <div className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              שאלת הדגמה
            </div>
            <h2 className="text-2xl font-bold text-slate-950">{DEMO.text}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              גם במענה קצר מרגישים היררכיה ברורה, שקט ויזואלי ומשוב מיידי.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEMO.options.map((option, index) => (
              <button
                key={option}
                onClick={() => pick(option)}
                className={`rounded-xl border p-5 text-right text-lg font-semibold transition-all duration-200 ${getOptionClass(option)}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                    {['א', 'ב', 'ג', 'ד'][index]}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          {answered && (
            <div className={`mt-4 rounded-xl border px-4 py-4 text-right ${
              isCorrect
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center justify-end gap-2 text-lg font-bold">
                <span>{isCorrect ? 'מעולה!' : 'כמעט!'}</span>
                {isCorrect && <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div className="mt-1 text-sm opacity-90">
                {isCorrect ? 'בחרת בתשובה הנכונה והתקדמת מעולה.' : `התשובה הנכונה היא ${DEMO.answer}.`}
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DEMO = {
  text: 'כמה ימים יש בשבוע?',
  options: ['5', '6', '7', '8'],
  answer: '7',
}

const FEATURE_CARDS = [
  {
    emoji: '🎓',
    title: 'למידה שמרגישה טוב',
    description: 'ממשק מזמין שמאפשר להתרכז בתוכן, בלי לאבד אנרגיה בדרך.',
    tone: 'bg-blue-50 text-blue-600',
  },
  {
    emoji: '🚀',
    title: 'התקדמות עם תנופה',
    description: 'משימות ממוקדות ומשוב מיידי ששומרים על קצב ומוטיבציה.',
    tone: 'bg-violet-50 text-violet-600',
  },
  {
    emoji: '✨',
    title: 'תוצאות ברורות',
    description: 'מעקב אחר הישגים בצורה נגישה, צבעונית ומעודדת.',
    tone: 'bg-amber-50 text-amber-600',
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
      return 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 hover:-translate-x-1'
    }

    if (option === DEMO.answer) {
      return 'border-emerald-300 bg-emerald-50 text-emerald-700'
    }

    if (option === selected) {
      return 'border-red-300 bg-red-50 text-red-700'
    }

    return 'border-slate-100 bg-slate-50 text-slate-400'
  }

  return (
    <div className="page-shell min-h-[78vh] justify-center">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6 text-right">
          <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
            פלטפורמת למידה צבעונית ומעודדת ✨
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">
              לומדים חכם, מתרגלים בכיף ומתקדמים עם חיוך 🚀
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              סביבת תרגול שמביאה בסיס מקצועי ואמין, עם צבע, אנרגיה ומשוב ברור שמחזיק את
              התלמידים מעורבים לאורך כל הדרך.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FEATURE_CARDS.map(card => (
              <div key={card.title} className="edu-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${card.tone}`}>
                  {card.emoji}
                </div>
                <h2 className="mb-2 text-lg font-bold text-slate-900">{card.title}</h2>
                <p className="text-sm leading-6 text-slate-600">{card.description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-start">
            <button onClick={() => navigate('/auth?tab=register')} className="btn-primary">
              מתחילים עכשיו ✨
            </button>
            <button onClick={() => navigate('/auth')} className="btn-secondary">
              כבר יש לי חשבון 🎯
            </button>
          </div>
        </div>

        <aside className="edu-card p-6 sm:p-8">
          <div className="mb-5 text-right">
            <div className="mb-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              שאלת הדגמה 🎓
            </div>
            <h2 className="text-2xl font-extrabold text-slate-950">{DEMO.text}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              חוויית המענה החדשה מרגישה קלילה וחיה, אבל שומרת על מבנה ברור ומקצועי.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEMO.options.map(option => (
              <button
                key={option}
                onClick={() => pick(option)}
                className={`rounded-2xl border-2 p-5 text-right text-lg font-semibold transition-all duration-200 ${getOptionClass(option)}`}
              >
                {option}
              </button>
            ))}
          </div>

          {answered && (
            <div className={`mt-4 rounded-2xl border px-4 py-4 text-right ${
              isCorrect
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              <div className="text-lg font-bold">{isCorrect ? 'מעולה! 🎉' : 'כמעט! ❌'}</div>
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

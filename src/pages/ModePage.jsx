import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { checkSubscription, SUBSCRIPTION_DAYS } from '../utils/db'

const MODES = [
  {
    value: 'online',
    emoji: '🌐',
    label: 'עבודה מחוברת',
    desc: 'שמירה בענן וגישה נוחה לנתונים מכל מקום.',
    details: 'בחירה מצוינת ללמידה רציפה עם מעקב זמין ונגיש.',
    tone: 'bg-sky-50 text-sky-600',
    hover: 'hover:border-sky-300 hover:bg-sky-50/70',
  },
  {
    value: 'offline',
    emoji: '💾',
    label: 'עבודה מקומית',
    desc: 'שמירת נתונים על המכשיר הנוכחי ללא תלות קבועה ברשת.',
    details: 'מתאים לסביבת עבודה מקומית או לתרגול מהיר וגמיש.',
    tone: 'bg-amber-50 text-amber-600',
    hover: 'hover:border-amber-300 hover:bg-amber-50/70',
  },
]

export default function ModePage() {
  const { user, setMode } = useApp()
  const navigate = useNavigate()

  const { daysLeft } = checkSubscription(user)
  const daysLeftDisplay = user?.role === 'admin' ? null : daysLeft

  function handleMode(mode) {
    setMode(mode)
    navigate('/age')
  }

  return (
    <div className="page-shell min-h-[72vh] justify-center">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
          בחירת מצב עבודה ⚙️
        </div>
        <h1 className="section-title">איך נרצה לשמור את ההתקדמות?</h1>
        <p className="section-subtitle mt-3">
          בחרו את אופן העבודה המתאים כדי להתאים את חוויית הלמידה לסביבה שלכם.
        </p>

        {daysLeftDisplay !== null && (
          <div className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
            daysLeft > 30
              ? 'bg-emerald-50 text-emerald-700'
              : daysLeft > 7
                ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700'
          }`}>
            נותרו {daysLeft} ימים מתוך {SUBSCRIPTION_DAYS} לתקופת המנוי
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {MODES.map(mode => (
          <button
            key={mode.value}
            onClick={() => handleMode(mode.value)}
            className={`edu-card border-2 text-right transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${mode.hover}`}
          >
            <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${mode.tone}`}>
              {mode.emoji}
            </div>
            <div className="mb-2 text-2xl font-extrabold text-slate-950">{mode.label}</div>
            <p className="mb-3 text-base leading-7 text-slate-600">{mode.desc}</p>
            <p className="text-sm leading-6 text-slate-600">{mode.details}</p>
          </button>
        ))}
      </section>
    </div>
  )
}

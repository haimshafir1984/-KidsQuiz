import { useNavigate } from 'react-router-dom'

const AGE_OPTIONS = [
  {
    value: '1-3',
    label: 'כיתות א׳-ג׳',
    desc: 'מסלול מלא משחקיות, יסודות חזקים והתחלה בטוחה של תהליך הלמידה.',
    emoji: '🦖',
    tone: 'bg-emerald-50 text-emerald-600',
    hover: 'hover:border-emerald-300',
    badge: 'יסודות ירוקים',
  },
  {
    value: '4-6',
    label: 'כיתות ד׳-ו׳',
    desc: 'מסלול מתקדם יותר עם קצב מהיר, אתגר בריא ותחושת התקדמות מתמדת.',
    emoji: '🚀',
    tone: 'bg-sky-50 text-sky-600',
    hover: 'hover:border-sky-300',
    badge: 'תנופה כחולה',
  },
]

export default function AgeSelectPage() {
  const navigate = useNavigate()

  function handleAgeSelect(age) {
    navigate('/subject', { state: { age } })
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
          בחירת מסלול לימוד 🎒
        </div>
        <h1 className="section-title">באיזה שלב לימודי נתחיל היום?</h1>
        <p className="section-subtitle mt-3">
          בחרו את המסלול המתאים כדי לפתוח תרגול מותאם, אנרגטי ומדויק לרמת התלמיד.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {AGE_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => handleAgeSelect(option.value)}
            className={`edu-card border-2 text-right transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${option.hover}`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${option.tone}`}>
                {option.emoji}
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-extrabold text-slate-950">{option.label}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                    {option.badge}
                  </span>
                </div>
                <p className="text-base leading-7 text-slate-600">{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  )
}

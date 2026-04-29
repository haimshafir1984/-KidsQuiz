import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, KeyRound, LineChart, Lock, UserPlus2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { isDesktopRuntime } from '../utils/runtime'

const FEATURE_CARDS = [
  {
    icon: UserPlus2,
    title: 'פתיחה מהירה',
    description: 'כניסה או הרשמה במסך אחד, בצורה ברורה ופשוטה.',
  },
  {
    icon: LineChart,
    title: 'התקדמות נשמרת',
    description: 'ציונים, שמירות ותוצאות מחכים לך גם בהמשך.',
  },
  {
    icon: Lock,
    title: 'גישה בטוחה',
    description: 'פרטי ההתחברות נשמרים במבנה ברור ונוח.',
  },
]

export default function AuthPage() {
  const [params] = useSearchParams()
  const desktop = isDesktopRuntime()
  const [authTab, setAuthTab] = useState(desktop ? 'login' : params.get('tab') === 'register' ? 'register' : 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showExpired, setShowExpired] = useState(false)

  const { login, register } = useApp()
  const navigate = useNavigate()

  function resetForm() {
    setError('')
    setShowExpired(false)
    setUsername('')
    setPassword('')
  }

  function handleTabChange(tab) {
    if (desktop && tab === 'register') return
    setAuthTab(tab)
    resetForm()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setShowExpired(false)

    if (!username.trim() || !password.trim()) {
      setError('יש למלא אימייל וסיסמה')
      return
    }

    if (desktop && authTab === 'register') {
      setError('בגרסת האופליין לא ניתן לפתוח משתמש חדש. יש ליצור משתמש במערכת האונליין בלבד.')
      return
    }

    const result = authTab === 'login'
      ? login(username, password)
      : register(username, password)

    if (result.error) {
      if (result.expired) setShowExpired(true)
      else setError(result.error)
      return
    }

    const loggedUser = result.user
    if (loggedUser?.role === 'admin') {
      navigate('/admin')
      return
    }

    if (!loggedUser?.firstName || !loggedUser?.lastName || !loggedUser?.city) {
      navigate('/profile')
      return
    }

    navigate('/mode')
  }

  if (showExpired) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <section className="edu-card w-full max-w-lg text-right">
          <div className="mb-5 inline-flex rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
            גישה הסתיימה
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950">פג תוקף המנוי</h1>
          <p className="mt-3 leading-7 text-slate-600">
            תקופת הגישה למערכת הסתיימה. כדי להמשיך לתרגל ולשמור הישגים, יש ליצור קשר עם מנהל המערכת.
          </p>
          <div className="mt-6">
            <button onClick={() => setShowExpired(false)} className="btn-secondary">
              חזרה למסך הכניסה
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell min-h-[78vh] justify-center">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6 text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-sky-50 to-violet-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-sky-100">
            <CheckCircle2 className="h-4 w-4" />
           
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              {desktop ? 'כניסה לגרסה המקומית' : authTab === 'login' ? 'חוזרים ללמוד בלי להסתבך' : 'פותחים חשבון ומתחילים בצורה מסודרת'}
            </h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FEATURE_CARDS.map(card => {
              const Icon = card.icon

              return (
                <div key={card.title} className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 via-white to-violet-100 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mb-2 text-base font-semibold text-slate-900">{card.title}</h2>
                  <p className="text-sm leading-6 text-slate-600">{card.description}</p>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-sky-100 bg-gradient-to-l from-white to-sky-50/60 p-5 text-right shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-600">אחרי הכניסה</div>
            <p className="text-sm leading-7 text-slate-700">
              {desktop
                ? 'תועברו ישירות למסלולי העבודה המקומיים הקיימים במחשב.'
                : authTab === 'login'
                  ? 'המערכת תחזיר אתכם להמשך הלמידה, כולל ציונים ושמירות פעילות.'
                  : 'לאחר יצירת החשבון ייפתח עמוד פרטים אישיים קצר, ואז אפשר להתחיל לעבוד.'}
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_50px_-24px_rgba(37,99,235,0.28)] ring-1 ring-slate-100 backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 text-blue-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="text-right">
              <div className="inline-flex rounded-full bg-gradient-to-l from-sky-50 to-violet-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-sky-100">
                {desktop ? 'גרסת אופליין' : authTab === 'login' ? 'כניסה' : 'הרשמה'}
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">
                {desktop ? 'התחברות למערכת המקומית' : authTab === 'login' ? 'כניסה לחשבון קיים' : 'יצירת חשבון חדש'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {desktop
                  ? 'בגרסת האופליין ניתן להתחבר בלבד. פתיחת משתמש חדש מתבצעת במערכת המחוברת.'
                  : authTab === 'login'
                    ? 'מלאו אימייל וסיסמה כדי להמשיך בדיוק מהמקום שבו עצרתם.'
                    : 'מלאו אימייל וסיסמה. בשלב הבא תשלימו פרטים אישיים קצרים.'}
              </p>
            </div>
          </div>

          {!desktop && (
            <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-50/80 p-1">
              {[
                ['login', 'כניסה'],
                ['register', 'הרשמה'],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                    authTab === tab
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-sky-100'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {desktop && (
            <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-right text-sm font-semibold text-amber-700">
              פתיחת משתמש חדש אינה זמינה באופליין. יש ליצור משתמש דרך הגרסה המחוברת ואז להתחבר כאן.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">אימייל</label>
              <input
                type="text"
                value={username}
                onChange={event => setUsername(event.target.value)}
                placeholder="הכנס אימייל"
                autoComplete="username"
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="הכנס סיסמה"
                autoComplete="current-password"
                className="input-field"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button type="submit" className="btn-primary shadow-[0_16px_30px_-16px_rgba(37,99,235,0.55)]">
                {authTab === 'register' && !desktop ? 'יצירת חשבון' : 'כניסה למערכת'}
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/welcome')}
                className="text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-blue-600"
              >
                חזרה למסך הפתיחה
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  )
}

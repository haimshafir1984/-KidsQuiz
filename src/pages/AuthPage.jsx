import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function AuthPage() {
  const [params] = useSearchParams()
  const [authTab, setAuthTab] = useState(params.get('tab') === 'register' ? 'register' : 'login')
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
    setAuthTab(tab)
    resetForm()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setShowExpired(false)

    if (!username.trim() || !password.trim()) {
      setError('יש למלא שם משתמש וסיסמה')
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
    navigate(loggedUser?.role === 'admin' ? '/admin' : '/mode')
  }

  if (showExpired) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <section className="edu-card w-full max-w-lg text-right">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-4xl text-red-600">
            ⏰
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950">פג תוקף המנוי</h1>
          <p className="mt-3 leading-7 text-slate-600">
            תקופת הגישה למערכת הסתיימה. כדי להמשיך לתרגל ולשמור הישגים, יש ליצור קשר עם מנהל המערכת.
          </p>
          <div className="mt-6">
            <button onClick={() => setShowExpired(false)} className="btn-secondary">
              חזרה למסך הכניסה 🔁
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="grid min-h-[78vh] gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <section className="space-y-6 text-right">
        <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-100">
          הצטרפות מהירה למערכת 🚀
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">
            ברוכים הבאים! 👋
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            התחברו או פתחו חשבון חדש כדי להתחיל תרגול אינטראקטיבי, לצבור הישגים ולשמור על מוטיבציה גבוהה לאורך הדרך.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { emoji: '🎯', text: 'תרגול ממוקד לפי רמה' },
            { emoji: '📈', text: 'מעקב התקדמות ברור' },
            { emoji: '✨', text: 'חוויית למידה צבעונית' },
            { emoji: '🔐', text: 'גישה מסודרת ובטוחה' },
          ].map(item => (
            <div key={item.text} className="edu-card flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                {item.emoji}
              </div>
              <div className="text-sm font-semibold text-slate-700">{item.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="edu-card mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-4xl text-amber-600">
            {authTab === 'login' ? '🔑' : '🌟'}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-extrabold text-slate-950">
              {authTab === 'login' ? 'כניסה למערכת' : 'יצירת חשבון חדש'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {authTab === 'login'
                ? 'המשיכו בדיוק מהמקום שבו עצרתם.'
                : 'פתחו חשבון חדש והתחילו לצבור הצלחות כבר מהשאלה הראשונה.'}
            </p>
          </div>
        </div>

        <div className="mb-6 flex border-b border-slate-200">
          {[
            ['login', 'כניסה'],
            ['register', 'הרשמה'],
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                authTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-blue-600 hover:text-blue-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">שם משתמש</label>
            <input
              type="text"
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder="הכנס שם משתמש"
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
              autoComplete={authTab === 'login' ? 'current-password' : 'new-password'}
              className="input-field"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="submit" className="btn-primary">
              {authTab === 'login' ? 'כניסה 🚀' : 'הרשמה ✨'}
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
    </div>
  )
}

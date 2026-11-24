import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LineChart, Lock, Mail, Phone, UserPlus2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { isDesktopRuntime } from '../utils/runtime'
import { TANAKH_NEW_SUBJECT } from '../data/tanakhNewQuestions'

const FEATURE_CARDS = [
  {
    icon: UserPlus2,
    title: 'פתיחה מהירה',
    description: 'כניסה או הרשמה במסך אחד, בצורה ברורה, מסודרת ונעימה.',
  },
  {
    icon: LineChart,
    title: 'ההתקדמות נשמרת',
    description: 'ציונים, שמירות ותוצאות מחכים לכם גם בהמשך הדרך.',
  },
  {
    icon: Lock,
    title: 'גישה בטוחה',
    description: 'פרטי החשבון נשמרים בצורה ברורה ונוחה לשימוש.',
  },
]

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="input-field pl-14"
      />
      <button
        type="button"
        onClick={() => setVisible(current => !current)}
        className="absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
        title={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  )
}

// קישורי הדגמה: /auth?tab=register&start=tanakh-new מעביר אחרי ההרשמה ישר לנושא "תנך חדש"
const START_TARGETS = {
  'tanakh-new': { grade: 'grade-8', subject: TANAKH_NEW_SUBJECT },
}

function buildUsername(firstName, lastName) {
  return `${firstName || ''} ${lastName || ''}`.trim().replace(/\s+/g, ' ')
}

export default function AuthPage() {
  const [params] = useSearchParams()
  const desktop = isDesktopRuntime()
  const [authTab, setAuthTab] = useState(desktop ? 'login' : params.get('tab') === 'register' ? 'register' : 'login')
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showExpired, setShowExpired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    city: '',
    username: '',
    password: '',
    phone: '',
    email: '',
  })

  const { login, register, setMode, chooseGrade, chooseSubject } = useApp()
  const startTarget = START_TARGETS[params.get('start')] || null
  const navigate = useNavigate()

  const generatedUsername = useMemo(() => {
    return buildUsername(registerForm.firstName, registerForm.lastName)
  }, [registerForm.firstName, registerForm.lastName])

  useEffect(() => {
    setRegisterForm((current) => ({
      ...current,
      username: generatedUsername,
    }))
  }, [generatedUsername])

  function resetForm() {
    setError('')
    setShowExpired(false)
    setLoginIdentifier('')
    setPassword('')
    setRegisterForm({
      firstName: '',
      lastName: '',
      city: '',
        username: '',
      password: '',
        phone: '',
      email: '',
    })
  }

  function handleTabChange(tab) {
    if (desktop && tab === 'register') return
    setAuthTab(tab)
    resetForm()
  }

  function updateRegisterField(field, value) {
    setRegisterForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // אין יותר שלב ביניים של בחירת מצב עבודה: באתר עובדים אונליין, ובתוכנה המקומית עובדים מקומית
  function goToLearning() {
    setMode(desktop ? 'offline' : 'online')

    if (startTarget) {
      chooseGrade(startTarget.grade)
      chooseSubject(startTarget.subject)
      navigate('/track')
      return
    }

    navigate('/age')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setShowExpired(false)

    if (authTab === 'login') {
      if (!loginIdentifier.trim() || !password.trim()) {
        setError('יש למלא שם משתמש או מייל וסיסמה')
        return
      }

      setSubmitting(true)
      const result = await login(loginIdentifier, password)
      setSubmitting(false)

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

      goToLearning()
      return
    }

    if (desktop) {
      setError('בגרסת האופליין לא ניתן לפתוח משתמש חדש. יש ליצור משתמש במערכת האונליין בלבד.')
      return
    }

    const requiredFields = [
      registerForm.firstName,
      registerForm.lastName,
      registerForm.city,
      registerForm.password,
      registerForm.email,
    ]

    if (requiredFields.some((value) => !value.trim())) {
      setError('יש למלא את כל שדות החובה בטופס ההרשמה')
      return
    }

    if (!registerForm.username.trim()) {
      setError('שם המשתמש נוצר אוטומטית לפי שם פרטי ושם משפחה')
      return
    }

    if (registerForm.password.trim().length < 6) {
      setError('הסיסמה קצרה מדי. יש לבחור לפחות 6 תווים')
      return
    }

    setSubmitting(true)
    const result = await register({
      firstName: registerForm.firstName,
      lastName: registerForm.lastName,
      city: registerForm.city,
      username: registerForm.username,
      password: registerForm.password,
      phone: registerForm.phone,
      email: registerForm.email,
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    goToLearning()
  }

  if (showExpired) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <section className="edu-card w-full max-w-lg text-right">
          <div className="mb-5 inline-flex rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
            הגישה הסתיימה
          </div>
          <h1 className="text-3xl font-bold text-slate-950">פג תוקף המנוי</h1>
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
    <div className="page-shell justify-center lg:min-h-[78vh]">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        {/* עמודת השיווק מוצגת רק במסך רחב; בטלפון הטופס הוא הדבר הראשון שרואים */}
        <section className="hidden space-y-6 text-right lg:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-sky-50 to-violet-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-sky-100">
            <CheckCircle2 className="h-4 w-4" />
            מעבר פשוט וברור ללמידה
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              {desktop
                ? 'כניסה לגרסה המקומית'
                : authTab === 'login'
                  ? 'חוזרים ללמוד בלי להסתבך'
                  : 'יוצרים חשבון ומתחילים בצורה מסודרת'}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.title} className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 via-white to-violet-100 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">{card.title}</h3>
                  <p className="text-base leading-6 text-slate-700">{card.description}</p>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-sky-100 bg-gradient-to-l from-white to-sky-50/60 p-5 text-right shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-600">אחרי הכניסה</div>
            <p className="text-base leading-7 text-slate-700">
              {desktop
                ? 'תועברו ישירות למסלולי העבודה המקומיים הקיימים במחשב.'
                : authTab === 'login'
                  ? 'המערכת תחזיר אתכם להמשך הלמידה, כולל ציונים ושמירות פעילות.'
                  : 'אחרי יצירת החשבון תעברו ישר לבחירת נושא הלמידה.'}
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-2xl rounded-card-lg border border-white/80 bg-white/92 p-5 shadow-[0_18px_50px_-24px_rgba(37,99,235,0.28)] ring-1 ring-slate-100 backdrop-blur-sm sm:p-8">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 text-blue-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                {desktop ? 'התחברות למערכת המקומית' : authTab === 'login' ? 'כניסה לחשבון' : 'יצירת חשבון חדש'}
              </h1>
              <p className="mt-2 text-base leading-7 text-slate-700">
                {desktop
                  ? 'בגרסת האופליין ניתן להתחבר בלבד. פתיחת משתמש חדש מתבצעת במערכת המחוברת.'
                  : authTab === 'login'
                    ? 'הקלידו את שם המשתמש (או המייל) והסיסמה.'
                    : 'ממלאים כמה פרטים קצרים, וממשיכים ישר ללמידה.'}
              </p>
            </div>
          </div>

          {!desktop ? (
            <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-50/80 p-1">
              {[
                ['login', 'כניסה'],
                ['register', 'הרשמה'],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  aria-pressed={authTab === tab}
                  className={`flex-1 rounded-lg px-4 py-3.5 text-lg font-semibold transition-all ${
                    authTab === tab
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-sky-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {desktop ? (
            <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-right text-base font-semibold text-amber-800">
              פתיחת משתמש חדש אינה זמינה באופליין. יש ליצור משתמש דרך הגרסה המחוברת ואז להתחבר כאן.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {authTab === 'login' ? (
              <>
                <div>
                  <label className="mb-2 block text-base font-semibold text-slate-900">שם משתמש או מייל</label>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(event) => setLoginIdentifier(event.target.value)}
                    placeholder="הקלידו כאן"
                    autoComplete="username"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-base font-semibold text-slate-900">סיסמה</label>
                  <PasswordInput
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="הקלידו את הסיסמה"
                    autoComplete="current-password"
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-semibold text-slate-900">
                    שם פרטי <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={registerForm.firstName}
                    onChange={(event) => updateRegisterField('firstName', event.target.value)}
                    autoComplete="given-name"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-base font-semibold text-slate-900">
                    שם משפחה <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={registerForm.lastName}
                    onChange={(event) => updateRegisterField('lastName', event.target.value)}
                    autoComplete="family-name"
                    className="input-field"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-base font-semibold text-slate-900">
                    עיר מגורים <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={registerForm.city}
                    onChange={(event) => updateRegisterField('city', event.target.value)}
                    autoComplete="address-level2"
                    className="input-field"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-base font-semibold text-slate-900">
                    סיסמה <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    value={registerForm.password}
                    onChange={(event) => updateRegisterField('password', event.target.value)}
                    placeholder="לפחות 6 תווים"
                    autoComplete="new-password"
                  />
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    אפשר ללחוץ על העין כדי לראות מה הקלדתם.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-base font-semibold text-slate-900">
                    מייל <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(event) => updateRegisterField('email', event.target.value)}
                      autoComplete="email"
                      className="input-field pr-11"
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-base font-semibold text-slate-900">
                    טלפון <span className="font-normal text-slate-500">(לא חובה)</span>
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={registerForm.phone}
                      onChange={(event) => updateRegisterField('phone', event.target.value)}
                      autoComplete="tel"
                      className="input-field pr-11"
                    />
                  </div>
                </div>

                {registerForm.username ? (
                  <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-base leading-7 text-slate-800 sm:col-span-2">
                    שם המשתמש שלכם לכניסה יהיה: <strong>{registerForm.username}</strong>
                    <div className="text-sm text-slate-600">אפשר גם להיכנס בהמשך עם כתובת המייל.</div>
                  </div>
                ) : null}
              </div>
            )}

            {error ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-base font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary w-full py-4 text-lg shadow-[0_16px_30px_-16px_rgba(37,99,235,0.55)] disabled:opacity-60">
                {authTab === 'register' && !desktop ? 'יצירת חשבון והתחלה' : 'כניסה'}
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/welcome')}
                className="btn-muted py-3 text-base"
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

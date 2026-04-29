import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, BookOpenCheck, Clock3, MapPin, Phone, Save, UserCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getActivityLabel, getGradeConfig } from '../data/learningTracks'
import { isProfileComplete } from '../utils/userProfile'

function formatDate(dateValue) {
  if (!dateValue) return '-'
  return new Date(dateValue).toLocaleDateString('he-IL')
}

function getAverage(results) {
  if (results.length === 0) return 0
  return Math.round(results.reduce((sum, result) => sum + (result.percent || 0), 0) / results.length)
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/88 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 via-white to-violet-100 text-blue-700">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-3xl font-bold text-slate-950">{value}</div>
      <div className="mt-2 text-sm font-semibold text-slate-600">{label}</div>
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const {
    user,
    mode,
    userDisplayName,
    userResults,
    savedQuizProgress,
    updateUserProfile,
    clearQuizProgress,
    prepareQuiz,
  } = useApp()

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    city: user?.city || '',
    birthDate: user?.birthDate || '',
    phone: user?.phone || '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const profileComplete = isProfileComplete(user)
  const stats = useMemo(() => {
    const latest = userResults[0] || null
    const best = userResults.reduce((currentBest, result) => {
      if (!currentBest || (result.percent || 0) > (currentBest.percent || 0)) return result
      return currentBest
    }, null)

    return {
      testsCount: userResults.length,
      average: getAverage(userResults),
      latest,
      best,
    }
  }, [userResults])

  function handleChange(field, value) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const wasIncomplete = !profileComplete

    const result = updateUserProfile(form)
    if (result.error) {
      setError(result.error)
      return
    }

    setMessage('הפרטים נשמרו בהצלחה.')
    if (wasIncomplete) {
      navigate('/mode')
    }
  }

  function handleResume(progress) {
    prepareQuiz({
      grade: progress.grade,
      subject: progress.subject,
      level: progress.level || null,
      activityType: progress.activityType,
    })

    if (progress.activityType === 'exam' && !progress.quizSession?.startedAt) {
      navigate('/exam-intro')
      return
    }

    navigate('/quiz')
  }

  function handleRestart(progress) {
    clearQuizProgress({
      grade: progress.grade,
      subject: progress.subject,
      level: progress.level || null,
      activityType: progress.activityType,
    })

    const prepared = prepareQuiz({
      grade: progress.grade,
      subject: progress.subject,
      level: progress.level || null,
      activityType: progress.activityType,
      restart: true,
    })

    if (prepared.length === 0) {
      navigate('/subject')
      return
    }

    if (progress.activityType === 'exam') {
      navigate('/exam-intro')
      return
    }

    navigate('/quiz')
  }

  const statCards = [
    { label: 'מבחנים ותרגולים', value: stats.testsCount, icon: BookOpenCheck },
    { label: 'ממוצע כללי', value: `${stats.average}%`, icon: BarChart3 },
    { label: 'שמירות פעילות', value: savedQuizProgress.length, icon: Clock3 },
  ]

  return (
    <div className="page-shell min-h-[78vh] justify-center">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <section className="space-y-6 text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-sky-50 to-violet-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-sky-100">
            <UserCircle2 className="h-4 w-4" />
            אזור אישי
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
              {userDisplayName || 'מרכז התקדמות אישי'}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
              אותו סגנון נקי של עמוד הפתיחה, רק עם כל מה שחשוב לך במקום אחד: פרטים אישיים, שמירות פעילות, ציונים והיסטוריית עבודה.
            </p>
          </div>

          {!profileComplete && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm font-semibold text-amber-800">
              לפני שממשיכים, יש להשלים שם, שם משפחה ועיר מגורים. לאחר השמירה השם המלא יוצג בכל המערכת במקום כתובת המייל.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {statCards.map(card => (
              <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} />
            ))}
          </div>

          <section className="rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_50px_-24px_rgba(37,99,235,0.24)] ring-1 ring-slate-100 backdrop-blur-sm">
            <div className="mb-5 text-right">
              <div className="mb-3 inline-flex rounded-full bg-gradient-to-l from-sky-50 to-violet-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-sky-100">
                היסטוריית מבחנים ותרגולים
              </div>
              <h2 className="text-2xl font-bold text-slate-950">תמונה מרוכזת של ההתקדמות</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                כאן מופיע אותו סיכום שמתקבל בסוף כל פעילות, רק באופן מרוכז לאורך זמן.
              </p>
            </div>

            {stats.latest && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right">
                  <div className="text-sm font-semibold text-slate-500">פעילות אחרונה</div>
                  <div className="mt-1 text-lg font-bold text-slate-950">{stats.latest.subject}</div>
                  <div className="mt-1 text-sm text-slate-600">{stats.latest.percent}% | {formatDate(stats.latest.date)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right">
                  <div className="text-sm font-semibold text-slate-500">שיא אישי</div>
                  <div className="mt-1 text-lg font-bold text-slate-950">{stats.best?.subject || '-'}</div>
                  <div className="mt-1 text-sm text-slate-600">{stats.best?.percent ?? 0}%</div>
                </div>
              </div>
            )}

            {userResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-right text-sm text-slate-600">
                עדיין לא נשמרו תוצאות. אחרי הפעילות הראשונה, ההיסטוריה תתחיל להתמלא כאן.
              </div>
            ) : (
              <div className="space-y-3">
                {userResults.map(result => {
                  const gradeLabel = getGradeConfig(result.age)?.label || result.age
                  return (
                    <article key={result.id} className="rounded-2xl border border-slate-200 bg-gradient-to-l from-white to-slate-50/70 p-4 text-right shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-950">{result.subject}</h3>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.source === 'offline' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                              {result.source === 'offline' ? 'אופליין' : 'אונליין'}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {gradeLabel}
                            {result.level ? ` | ${result.level}` : ''}
                            {' | '}
                            {result.activityType === 'assessment' ? 'שאלון אישי' : getActivityLabel(result.activityType)}
                          </div>
                          <div className="mt-2 text-sm text-slate-500">
                            {result.answered} נענו מתוך {result.total} | {formatDate(result.date)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                          <div className="text-sm font-semibold text-slate-500">ציון</div>
                          <div className="mt-1 text-2xl font-bold text-slate-950">{result.percent}%</div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </section>

        <section className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_50px_-24px_rgba(124,58,237,0.22)] ring-1 ring-slate-100 backdrop-blur-sm sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 text-blue-700">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <div className="text-right">
                <div className="inline-flex rounded-full bg-gradient-to-l from-sky-50 to-violet-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-sky-100">
                  פרטים אישיים
                </div>
                <h2 className="mt-3 text-2xl font-bold text-slate-950">כרטיס המשתמש שלך</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  שדות החובה נמצאים בראש הטופס. לאחר השמירה, המערכת תציג את השם המלא במקום האימייל.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">שם פרטי *</label>
                  <input value={form.firstName} onChange={event => handleChange('firstName', event.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">שם משפחה *</label>
                  <input value={form.lastName} onChange={event => handleChange('lastName', event.target.value)} className="input-field" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">עיר מגורים *</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={form.city} onChange={event => handleChange('city', event.target.value)} className="input-field pr-10" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">תאריך לידה</label>
                  <input type="date" value={form.birthDate} onChange={event => handleChange('birthDate', event.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">טלפון</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={form.phone} onChange={event => handleChange('phone', event.target.value)} className="input-field pr-10" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-l from-white to-slate-50 px-4 py-3 text-right text-sm text-slate-600">
                כתובת ההתחברות: <span className="font-semibold text-slate-900">{user?.username}</span>
                <div className="mt-1 text-xs text-slate-500">מצב עבודה: {mode === 'offline' ? 'מקומי' : 'מחובר'}</div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="submit" className="btn-primary shadow-[0_16px_30px_-16px_rgba(37,99,235,0.55)]">
                  <Save className="h-4 w-4" />
                  שמירת פרטים
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_50px_-24px_rgba(14,165,233,0.2)] ring-1 ring-slate-100 backdrop-blur-sm">
            <div className="mb-5 text-right">
              <div className="mb-3 inline-flex rounded-full bg-gradient-to-l from-sky-50 to-violet-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-sky-100">
                שמירות פעילות
              </div>
              <h2 className="text-2xl font-bold text-slate-950">המשך מאותו מקום</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                אפשר להמשיך בדיוק מהמקום שבו עצרת, או לאפס ולפתוח את המסלול מחדש.
              </p>
            </div>

            {savedQuizProgress.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-right text-sm text-slate-600">
                עדיין אין שמירות פעילות. ברגע שתשמור יציאה מתוך חידון, היא תופיע כאן.
              </div>
            ) : (
              <div className="space-y-3">
                {savedQuizProgress.map(progress => {
                  const gradeLabel = getGradeConfig(progress.grade)?.label || progress.grade
                  const answeredCount = progress.results?.length || 0

                  return (
                    <article key={progress.key} className="rounded-2xl border border-slate-200 bg-gradient-to-l from-white to-sky-50/50 p-4 text-right shadow-sm">
                      <h3 className="text-lg font-bold text-slate-950">{progress.subject}</h3>
                      <div className="mt-1 text-sm text-slate-600">
                        {gradeLabel}
                        {progress.level ? ` | ${progress.level}` : ''}
                        {' | '}
                        {getActivityLabel(progress.activityType)}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        נענו {answeredCount} מתוך {progress.questionCount} שאלות | נשמר ב־{formatDate(progress.updatedAt)}
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button onClick={() => handleResume(progress)} className="btn-primary">
                          המשך מהמקום האחרון
                        </button>
                        <button onClick={() => handleRestart(progress)} className="btn-secondary">
                          התחלה מחדש
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </section>
      </section>
    </div>
  )
}

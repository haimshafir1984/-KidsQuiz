import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Download, Search, Users, BarChart3, ShieldCheck } from 'lucide-react'
import { checkSubscription } from '../utils/db'
import { API_ENABLED, api } from '../utils/api'
import { useDialogA11y } from '../components/shared/useDialogA11y'
import ConfirmDialog from '../components/shared/ConfirmDialog'

const COLUMNS = [
  { key: 'fullName', label: 'שם' },
  { key: 'city', label: 'עיר' },
  { key: 'phone', label: 'טלפון' },
  { key: 'email', label: 'מייל' },
  { key: 'subscription_date', label: 'תאריך הרשמה' },
  { key: 'daysLeft', label: 'זמן נותר למנוי' },
  { key: 'testsCount', label: 'מבחנים' },
  { key: 'average', label: 'ממוצע ציונים' },
]

function csvCell(value) {
  const text = String(value ?? '').replace(/"/g, '""')
  return `"${text}"`
}

const PAGE_SIZE = 12

function SummaryCard({ title, value, helper, icon: Icon, tone }) {
  return (
    <div className="edu-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-950">{value}</div>
          <div className="text-sm font-semibold text-slate-600">{title}</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-slate-500">{helper}</div>
    </div>
  )
}

export default function AdminUsers({ stats }) {
  const { users, results, loading, error, reload } = stats
  const students = useMemo(() => users.filter(user => user.role !== 'admin'), [users])
  const [sortKey, setSortKey] = useState('fullName')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [page, setPage] = useState(1)

  const preparedStudents = useMemo(() => {
    return students.map(user => {
      const { valid, daysLeft } = checkSubscription(user)
      const userResults = results.filter(result => result.userId === user.id)
      const average = userResults.length > 0
        ? Math.round(userResults.reduce((sum, result) => sum + result.percent, 0) / userResults.length)
        : null

      return {
        ...user,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        valid,
        daysLeft,
        testsCount: userResults.length,
        average,
        userResults,
      }
    })
  }, [results, students])

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return preparedStudents

    return preparedStudents.filter(user => [user.fullName, user.username, user.city, user.phone, user.email]
      .some(value => String(value || '').toLowerCase().includes(query)))
  }, [preparedStudents, searchQuery])

  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents].sort((first, second) => {
      const firstValue = first[sortKey] ?? ''
      const secondValue = second[sortKey] ?? ''

      if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return sortDirection === 'asc' ? firstValue - secondValue : secondValue - firstValue
      }

      return sortDirection === 'asc'
        ? String(firstValue).localeCompare(String(secondValue), 'he')
        : String(secondValue).localeCompare(String(firstValue), 'he')
    })

    return sorted
  }, [filteredStudents, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedStudents = sortedStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const selectedUser = sortedStudents.find(user => user.id === selectedUserId) || null
  const dialogRef = useDialogA11y(Boolean(selectedUser), () => setSelectedUserId(null))

  const averageScore = preparedStudents.filter(user => user.average !== null)
  const averageValue = averageScore.length > 0
    ? Math.round(averageScore.reduce((sum, user) => sum + user.average, 0) / averageScore.length)
    : 0
  const activeSubscriptions = preparedStudents.filter(user => user.valid).length

  const [resetPassword, setResetPassword] = useState('')
  const [resetMessage, setResetMessage] = useState(null)

  // איפוס סיסמה ע"י מנהל (אין עדיין שחזור סיסמה במייל). את הסיסמה החדשה מוסרים לתלמיד בערוץ אחר
  async function handleResetPassword(userId) {
    setResetMessage(null)
    const response = await api.patch(`/admin/users/${userId}`, { newPassword: resetPassword })
    if (!response.ok) {
      setResetMessage({ ok: false, text: response.error })
      return
    }
    setResetPassword('')
    setResetMessage({ ok: true, text: 'הסיסמה אופסה. התלמיד נותק מכל המכשירים ויוכל להיכנס עם הסיסמה החדשה.' })
  }

  const [actionMessage, setActionMessage] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // עדכון מנוי/חסימה בשרת, ואז רענון הרשימה
  async function updateUser(userId, changes, successText) {
    setActionMessage(null)
    const response = await api.patch(`/admin/users/${userId}`, changes)
    if (!response.ok) {
      setActionMessage({ ok: false, text: response.error })
      return
    }
    setActionMessage({ ok: true, text: successText })
    reload()
  }

  // הארכה: מוסיפים ימים על מה שנשאר למנוי (או מהיום, אם פג)
  function extendSubscription(user, days) {
    const remainingMs = user.valid ? user.daysLeft * 86400000 : 0
    const until = new Date(Date.now() + remainingMs + days * 86400000).toISOString()
    return updateUser(user.id, { subscriptionStatus: 'active', subscriptionUntil: until }, `המנוי הוארך ב-${days} ימים.`)
  }

  // הורדת נתוני תלמיד כקובץ Excel (גיליונות: פרטים, מנוי, התקדמות, תוצאות)
  async function exportStudent(user) {
    setActionMessage(null)
    const response = await api.download(`/admin/users/${user.id}/export?format=xlsx`)
    if (!response.ok) {
      setActionMessage({ ok: false, text: response.error })
      return
    }
    const url = URL.createObjectURL(response.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = response.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setActionMessage({ ok: true, text: 'קובץ Excel הורד.' })
  }

  async function deleteStudent(user) {
    setConfirmDelete(false)
    const response = await api.delete(`/admin/users/${user.id}`)
    if (!response.ok) {
      setActionMessage({ ok: false, text: response.error })
      return
    }
    setSelectedUserId(null)
    reload()
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDirection(previous => previous === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('he-IL')
  }

  // ייצוא כל התלמידים לקובץ CSV שנפתח באקסל (עם BOM כדי שהעברית תוצג נכון)
  function handleExport() {
    const header = ['שם', 'שם משתמש', 'עיר', 'טלפון', 'מייל', 'תאריך הרשמה', 'ימים שנותרו במנוי', 'מבחנים', 'ממוצע ציונים']
    const rows = sortedStudents.map(user => [
      user.fullName,
      user.username,
      user.city || '',
      user.phone || '',
      user.email || '',
      formatDate(user.subscription_date),
      user.valid ? user.daysLeft : 'פג תוקף',
      user.testsCount,
      user.average !== null ? `${user.average}%` : '',
    ])
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'תלמידים.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="edu-card text-center text-lg text-slate-600">טוענים את רשימת התלמידים...</div>
  if (error) {
    return (
      <div className="edu-card text-center">
        <p className="text-lg text-slate-700">{error}</p>
        <button type="button" onClick={reload} className="btn-primary mt-4">נסו שוב</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title='סה״כ תלמידים'
          value={students.length}
          helper='כולל משתמשים פעילים ולא פעילים במערכת המקוונת.'
          icon={Users}
          tone='bg-blue-50 text-blue-700'
        />
        <SummaryCard
          title='ממוצע כללי'
          value={`${averageValue}%`}
          helper='מחושב מתוך כל התוצאות שנשמרו במערכת.'
          icon={BarChart3}
          tone='bg-emerald-50 text-emerald-700'
        />
        <SummaryCard
          title='מנויים פעילים'
          value={`${activeSubscriptions}/${students.length || 0}`}
          helper='מי שעובד בתוכנה במחשב (בלי אינטרנט) לא מופיע כאן.'
          icon={ShieldCheck}
          tone='bg-amber-50 text-amber-700'
        />
      </section>

      <section className="edu-card p-0 overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 text-right">
          <h3 className="text-2xl font-bold text-slate-950">תלמידים ותוצאות</h3>
          <p className="mt-1 text-base text-slate-700">
            לחיצה על שורה פותחת את פירוט התוצאות של התלמיד.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={event => { setSearchQuery(event.target.value); setPage(1) }}
                placeholder="חיפוש לפי שם, עיר, טלפון או מייל"
                className="input-field pr-11"
              />
            </div>
            <button type="button" onClick={handleExport} className="btn-secondary" disabled={sortedStudents.length === 0}>
              <Download className="h-5 w-5" />
              ייצוא לאקסל
            </button>
          </div>
        </div>

        {sortedStudents.length === 0 ? (
          <div className="px-6 py-12 text-center text-lg text-slate-600">
            {students.length === 0 ? 'אין תלמידים רשומים עדיין.' : 'לא נמצאו תלמידים שמתאימים לחיפוש.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-right text-base">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {COLUMNS.map(column => {
                      const isActive = sortKey === column.key
                      const SortIcon = isActive && sortDirection === 'desc' ? ArrowDownWideNarrow : ArrowUpWideNarrow

                      return (
                        <th key={column.key} className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className="inline-flex items-center gap-2 font-semibold text-slate-700 transition hover:text-slate-950"
                          >
                            <SortIcon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            {column.label}
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {pagedStudents.map(user => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {user.fullName}
                        <div className="text-sm font-normal text-slate-500">
                          {user.username}
                          {user.disabled && <span className="mr-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">חסום</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{user.city || '—'}</td>
                      <td className="px-4 py-3 text-slate-700" dir="ltr" style={{ textAlign: 'right' }}>{user.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-700" dir="ltr" style={{ textAlign: 'right' }}>{user.email || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(user.subscription_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.valid
                            ? user.daysLeft > 30 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {user.valid ? `${user.daysLeft} ימים` : 'פג תוקף'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{user.testsCount || '—'}</td>
                      <td className="px-4 py-3">
                        {user.average !== null ? (
                          <span className={`font-bold ${
                            user.average >= 80 ? 'text-emerald-700' :
                            user.average >= 60 ? 'text-blue-700' :
                            'text-red-600'
                          }`}>
                            {user.average}%
                          </span>
                        ) : (
                          <span className="text-slate-400">אין נתונים</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedStudents.length)} מתוך {sortedStudents.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(previous => Math.min(totalPages, previous + 1))}
                  disabled={safePage === totalPages}
                  className="btn-muted px-3 py-2 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                  הבא
                </button>
                <span className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700">
                  עמוד {safePage} מתוך {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(previous => Math.max(1, previous - 1))}
                  disabled={safePage === 1}
                  className="btn-muted px-3 py-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  קודם
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedUser && (
        <div
          className="fixed inset-y-0 right-0 z-[115] flex w-full justify-end bg-slate-950/35 md:w-auto"
          onClick={() => setSelectedUserId(null)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-panel-title"
            className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-6 text-right shadow-xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => setSelectedUserId(null)} className="btn-muted px-3 py-2">
                סגירה
              </button>
              <div>
                <h3 id="student-panel-title" className="text-2xl font-bold text-slate-950">{selectedUser.fullName}</h3>
                <p className="mt-1 text-base text-slate-700">
                  {[selectedUser.city, selectedUser.phone, selectedUser.email].filter(Boolean).join(' | ')}
                </p>
                <p className="mt-1 text-base text-slate-700">
                  נרשם בתאריך {formatDate(selectedUser.subscription_date)} | {selectedUser.valid ? `${selectedUser.daysLeft} ימים למנוי` : 'המנוי פג'}
                </p>
              </div>
            </div>

            {API_ENABLED && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-base font-bold text-slate-900">איפוס סיסמה</h4>
                <p className="mt-1 text-sm text-slate-600">בוחרים סיסמה חדשה (לפחות 6 תווים) ומוסרים אותה לתלמיד.</p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={event => setResetPassword(event.target.value)}
                    className="input-field flex-1"
                    dir="ltr"
                    autoComplete="off"
                    aria-label="סיסמה חדשה"
                  />
                  <button type="button" onClick={() => handleResetPassword(selectedUser.id)} disabled={resetPassword.length < 6} className="btn-secondary disabled:opacity-50">
                    איפוס
                  </button>
                </div>
                {resetMessage && (
                  <p className={`mt-2 text-sm font-semibold ${resetMessage.ok ? 'text-emerald-700' : 'text-red-600'}`}>{resetMessage.text}</p>
                )}
              </div>
            )}

            {API_ENABLED && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-base font-bold text-slate-900">מנוי וגישה</h4>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedUser.disabled ? 'החשבון חסום. ' : ''}
                  {selectedUser.valid ? `נותרו ${selectedUser.daysLeft} ימים` : 'המנוי פג'}
                  {selectedUser.subscription_until ? ` (עד ${formatDate(selectedUser.subscription_until)})` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[30, 90, 180, 365].map(days => (
                    <button key={days} type="button" onClick={() => extendSubscription(selectedUser, days)} className="btn-secondary px-3 py-2 text-sm">
                      הארכה ב-{days} ימים
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateUser(selectedUser.id, { subscriptionStatus: 'expired' }, 'המנוי הסתיים.')}
                    className="btn-muted px-3 py-2 text-sm"
                  >
                    סיום מנוי
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateUser(selectedUser.id, { disabled: !selectedUser.disabled }, selectedUser.disabled ? 'החשבון שוחרר.' : 'החשבון נחסם והתלמיד נותק.')}
                    className="btn-secondary px-3 py-2 text-sm"
                  >
                    {selectedUser.disabled ? 'שחרור חשבון' : 'חסימת חשבון'}
                  </button>
                  <button type="button" onClick={() => exportStudent(selectedUser)} className="btn-secondary px-3 py-2 text-sm">
                    הורדת נתוני התלמיד (Excel)
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(true)} className="btn-danger px-3 py-2 text-sm">
                    מחיקת תלמיד
                  </button>
                </div>
                {actionMessage && (
                  <p className={`mt-2 text-sm font-semibold ${actionMessage.ok ? 'text-emerald-700' : 'text-red-600'}`}>{actionMessage.text}</p>
                )}
                <ConfirmDialog
                  open={confirmDelete}
                  title={`למחוק את ${selectedUser.fullName}?`}
                  message="החשבון, התוצאות וההתקדמות יימחקו לצמיתות ולא ניתן לשחזר אותם. מומלץ להוריד קודם את נתוני התלמיד."
                  confirmLabel="כן, למחוק"
                  onConfirm={() => deleteStudent(selectedUser)}
                  onCancel={() => setConfirmDelete(false)}
                />
              </div>
            )}

            <div className="mt-6 space-y-3">
              {selectedUser.userResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  אין עדיין תוצאות שמורות לתלמיד הזה.
                </div>
              ) : (
                selectedUser.userResults.map(result => (
                  <article key={result.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{result.subject}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{result.level || 'ללא רמה'}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{result.activityType === 'exam' ? 'מבחן' : 'תרגול'}</span>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      תאריך: {formatDate(result.date)} | נענו {result.answered}/{result.total}
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-950">{result.percent}%</div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

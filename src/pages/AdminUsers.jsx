import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Users, BarChart3, ShieldCheck } from 'lucide-react'
import { serverGetStats, checkSubscription } from '../utils/db'

const COLUMNS = [
  { key: 'username', label: 'שם משתמש' },
  { key: 'subscription_date', label: 'תאריך הרשמה' },
  { key: 'daysLeft', label: 'זמן נותר למנוי' },
  { key: 'testsCount', label: 'כמות מבחנים' },
  { key: 'average', label: 'ממוצע ציונים' },
]

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

export default function AdminUsers() {
  const { users, results } = serverGetStats()
  const students = users.filter(user => user.role !== 'admin')
  const [sortKey, setSortKey] = useState('username')
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
        valid,
        daysLeft,
        testsCount: userResults.length,
        average,
        userResults,
      }
    })
  }, [results, students])

  const sortedStudents = useMemo(() => {
    const sorted = [...preparedStudents].sort((first, second) => {
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
  }, [preparedStudents, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedStudents = sortedStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const selectedUser = sortedStudents.find(user => user.id === selectedUserId) || null

  const averageScore = preparedStudents.filter(user => user.average !== null)
  const averageValue = averageScore.length > 0
    ? Math.round(averageScore.reduce((sum, user) => sum + user.average, 0) / averageScore.length)
    : 0
  const activeSubscriptions = preparedStudents.filter(user => user.valid).length

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
          helper='מחושב מתוך התוצאות ששמורות במאגר השרת המדומה.'
          icon={BarChart3}
          tone='bg-emerald-50 text-emerald-700'
        />
        <SummaryCard
          title='מנויים פעילים'
          value={`${activeSubscriptions}/${students.length || 0}`}
          helper='שימו לב: נתוני offline נשארים על המכשיר המקומי ואינם מוצגים כאן.'
          icon={ShieldCheck}
          tone='bg-amber-50 text-amber-700'
        />
      </section>

      <section className="edu-card p-0 overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 text-right">
          <h3 className="text-2xl font-bold text-slate-950">משתמשים ותוצאות</h3>
          <p className="mt-1 text-sm text-slate-600">
            הנתונים כאן מבוססים על מאגר השרת המדומה בלבד. תוצאות offline נשמרות מקומית על כל מכשיר.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">אין תלמידים רשומים עדיין.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-right text-sm">
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
                      <td className="px-4 py-3 font-semibold text-slate-900">{user.username}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(user.subscription_date)}</td>
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
        <div className="fixed inset-y-0 right-0 z-[115] flex w-full justify-end bg-slate-950/35 md:w-auto">
          <div className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-6 text-right shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => setSelectedUserId(null)} className="btn-muted px-3 py-2">
                סגירה
              </button>
              <div>
                <h3 className="text-2xl font-bold text-slate-950">{selectedUser.username}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  נרשם בתאריך {formatDate(selectedUser.subscription_date)} | {selectedUser.valid ? `${selectedUser.daysLeft} ימים למנוי` : 'המנוי פג'}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {selectedUser.userResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  אין עדיין מבחנים שמורים עבור המשתמש הזה במאגר המקוון.
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

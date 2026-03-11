import { serverGetStats, checkSubscription } from '../utils/db'

// עמודות הטבלה
const COLS = ['שם משתמש', 'תאריך הרשמה', 'זמן נותר למנוי', 'כמות מבחנים', 'ממוצע ציונים']

export default function AdminUsers() {
  // קריאה מ-ServerDB בלבד — ציוני offline לא מופיעים (נשמרו על המכשיר המקומי)
  const { users, results } = serverGetStats()
  const students = users.filter(u => u.role !== 'admin')

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-purple-800 mb-1">
        👥 תלמידים רשומים ({students.length})
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        * ציוני תלמידים שבחרו "לא מחובר" אינם מופיעים — הנתונים נשמרו על מכשירם בלבד
      </p>

      {students.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-2">📭</div>
          <p className="text-gray-400">אין תלמידים רשומים עדיין</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                {COLS.map(h => (
                  <th key={h} className="pb-3 pr-3 text-purple-700 font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(u => {
                const { valid, daysLeft } = checkSubscription(u)
                // ציונים רלוונטיים: רק מה-ServerDB (online בלבד)
                const userResults = results.filter(r => r.userId === u.id)
                const avg = userResults.length > 0
                  ? Math.round(userResults.reduce((s, r) => s + r.percent, 0) / userResults.length)
                  : null

                return (
                  <tr key={u.id}
                    className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    {/* שם משתמש */}
                    <td className="py-3 pr-3 font-semibold text-gray-800">{u.username}</td>

                    {/* תאריך הרשמה */}
                    <td className="py-3 pr-3 text-gray-500">
                      {new Date(u.subscription_date).toLocaleDateString('he-IL')}
                    </td>

                    {/* זמן נותר */}
                    <td className="py-3 pr-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        valid
                          ? daysLeft > 30 ? 'bg-green-100 text-green-700'
                                          : 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {valid ? `${daysLeft} ימים` : 'פג תוקף'}
                      </span>
                    </td>

                    {/* כמות מבחנים */}
                    <td className="py-3 pr-3 font-semibold text-gray-700">
                      {userResults.length > 0
                        ? <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">{userResults.length}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* ממוצע ציונים */}
                    <td className="py-3 pr-3">
                      {avg !== null ? (
                        <span className={`font-bold text-base ${
                          avg >= 80 ? 'text-green-600' :
                          avg >= 60 ? 'text-blue-600' :
                                      'text-red-500'
                        }`}>
                          {avg}%
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">אין נתונים</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

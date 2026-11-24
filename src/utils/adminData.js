import { useCallback, useEffect, useState } from 'react'
import { API_ENABLED, api } from './api'
import { serverGetStats } from './db'

// ממיר משתמש מהשרת (snake_case) לצורה שמסך הניהול כבר מכיר
function normalizeServerUser(user) {
  return {
    ...user,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    birthDate: user.birth_date || '',
    subscription_date: user.subscription_date,
  }
}

// נתוני המשתמשים והתוצאות למסך הניהול: מהשרת במצב מקוון, אחרת מה-localStorage
export function useAdminStats() {
  const [state, setState] = useState(() => (
    API_ENABLED
      ? { users: [], results: [], loading: true, error: null }
      : { ...serverGetStats(), loading: false, error: null }
  ))

  const load = useCallback(async (silent = false) => {
    if (!API_ENABLED) return
    if (!silent) setState(previous => ({ ...previous, loading: true, error: null }))
    const [users, results] = await Promise.all([api.get('/admin/users'), api.get('/admin/results')])
    if (!users.ok || !results.ok) {
      setState(previous => ({ ...previous, loading: false, error: users.error || results.error }))
      return
    }
    setState({
      users: users.data.users.map(normalizeServerUser),
      results: results.data.results,
      loading: false,
      error: null,
    })
  }, [])

  useEffect(() => { load() }, [load])

  // רענון שקט (בלי מסך טעינה), למשל אחרי שינוי מנוי
  return { ...state, reload: () => load(true) }
}

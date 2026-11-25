// ייצוא ומחיקה של נתוני משתמש (זכות עיון ומחיקה)

export async function exportUserData(pool, userId) {
  const user = await pool.query(
    `SELECT id, username, email, role, first_name, last_name, city, phone, birth_date,
            subscription_status, subscription_date, subscription_until, terms_accepted_at, terms_version, created_at, last_login_at
     FROM users WHERE id = $1`,
    [userId],
  )
  if (user.rowCount === 0) return null
  const results = await pool.query('SELECT id, data, created_at FROM results WHERE user_id = $1 ORDER BY created_at', [userId])
  const progress = await pool.query('SELECT key, data, updated_at FROM progress WHERE user_id = $1', [userId])
  const payments = await pool.query(
    `SELECT plan_name, amount_agorot, currency, duration_days, status, method, created_at, paid_at
     FROM payments WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  )
  return {
    payments: payments.rows,
    exportedAt: new Date().toISOString(),
    profile: user.rows[0],
    results: results.rows.map(row => ({ ...row.data, id: row.id, date: row.data.date || row.created_at })),
    progress: progress.rows,
  }
}

// מחיקה: ההתחברויות, התוצאות וההתקדמות נמחקים עם המשתמש (ON DELETE CASCADE).
// רשומות תשלום נשמרות בלי קישור לחשבון (עם שם המשלם), לצורכי הנהלת חשבונות
export async function deleteUserAccount(pool, userId) {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId])
  return result.rowCount > 0
}

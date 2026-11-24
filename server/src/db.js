import pg from 'pg'
import { config } from './config.js'

export function createPool(connectionString = config.databaseUrl) {
  const pool = new pg.Pool({ connectionString, max: 10 })
  // בלי מאזין, ניתוק של חיבור פנוי (למשל הפעלה מחדש של בסיס הנתונים) מפיל את כל התהליך
  pool.on('error', error => console.error('שגיאת חיבור לבסיס הנתונים:', error.message))
  return pool
}

export const pool = createPool()

import { config } from './config.js'
import { pool } from './db.js'
import { migrate } from './migrate.js'
import { applyContentPatch } from './contentPatch.js'
import { buildApp } from './app.js'
import { purgeExpiredSessions } from './auth.js'

// בעלייה מריצים מיגרציות (בטוח להרצה חוזרת), ואז מקשיבים
await migrate(pool, message => console.log(message))
await applyContentPatch(pool, message => console.log(message))
const app = await buildApp({ pool, logger: true })

// ניקוי התחברויות שפג תוקפן: בעלייה ואחת ל-6 שעות
const purge = () => purgeExpiredSessions(pool).catch(error => console.error('ניקוי התחברויות נכשל:', error.message))
purge()
const purgeTimer = setInterval(purge, 6 * 60 * 60 * 1000)
purgeTimer.unref()

const shutdown = async () => {
  await app.close()
  await pool.end()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

await app.listen({ port: config.port, host: '0.0.0.0' })

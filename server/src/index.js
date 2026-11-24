import { config } from './config.js'
import { pool } from './db.js'
import { migrate } from './migrate.js'
import { buildApp } from './app.js'

// בעלייה מריצים מיגרציות (בטוח להרצה חוזרת), ואז מקשיבים
await migrate(pool, message => console.log(message))
const app = await buildApp({ pool, logger: true })

const shutdown = async () => {
  await app.close()
  await pool.end()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

await app.listen({ port: config.port, host: '0.0.0.0' })

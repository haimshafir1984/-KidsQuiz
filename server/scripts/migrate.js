import { pool } from '../src/db.js'
import { migrate } from '../src/migrate.js'

const applied = await migrate(pool, message => console.log(message))
console.log(applied.length ? `הוחלו ${applied.length} מיגרציות` : 'בסיס הנתונים מעודכן')
await pool.end()

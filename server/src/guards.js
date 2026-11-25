// בדיקות הרשאה לשימוש בנתיבים (preHandler)
import { getSubscription } from './auth.js'

// מחובר, גם אם המנוי פג: רק לפעולות על החשבון עצמו (פרטים, ייצוא, מחיקה, סיסמה, צפייה בתשלומים)
export function requireAccount(request, reply, done) {
  if (!request.user) return reply.code(401).send({ error: 'יש להתחבר' })
  done()
}

// מחובר עם מנוי בתוקף: ברירת המחדל לכל תוכן. מנהלים תמיד בתוקף
export function requireUser(request, reply, done) {
  if (!request.user) return reply.code(401).send({ error: 'יש להתחבר' })
  if (!getSubscription(request.user).valid) return reply.code(403).send({ error: 'פג תוקף המנוי שלך', expired: true })
  done()
}

export function requireAdmin(request, reply, done) {
  if (!request.user) return reply.code(401).send({ error: 'יש להתחבר' })
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'אין הרשאה' })
  done()
}

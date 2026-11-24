// בדיקות הרשאה לשימוש בנתיבים (preHandler)

export function requireUser(request, reply, done) {
  if (!request.user) return reply.code(401).send({ error: 'יש להתחבר' })
  done()
}

export function requireAdmin(request, reply, done) {
  if (!request.user) return reply.code(401).send({ error: 'יש להתחבר' })
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'אין הרשאה' })
  done()
}

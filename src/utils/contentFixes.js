// החלת תיקוני תוכן על שאלות קיימות (בקוד, בדפדפן ובשרת).
// תיקון או הסרה מוחלים רק על שאלה שעדיין זהה לנוסח המקורי (from), כך שעריכה שנעשתה בניהול לא נדרסת.
export const CONTENT_FIXES_VERSION = 'proofreading-1'

const list = value => (Array.isArray(value) ? value : []).map(item => String(item).trim()).filter(Boolean)
const sameList = (first, second) => {
  const a = list(first)
  const b = list(second)
  return a.length === b.length && a.every((item, index) => item === b[index])
}

export function matchesOriginal(question, from) {
  return String(question.text || '').trim() === String(from.text || '').trim()
    && question.type === from.type
    && sameList(question.options, from.options)
    && sameList(question.correct_answer, from.correct_answer)
}

export function applyContentFixes(questions, fixes) {
  const updates = new Map(fixes.updates.map(item => [item.id, item]))
  const removals = new Map(fixes.removals.map(item => [item.id, item]))
  const updated = []
  const removed = []

  const next = questions.flatMap(question => {
    const removal = removals.get(question.id)
    if (removal && matchesOriginal(question, removal.from)) {
      removed.push(question)
      return []
    }
    const update = updates.get(question.id)
    if (update && matchesOriginal(question, update.from)) {
      const fixed = { ...question, ...update.to }
      updated.push({ before: question, after: fixed })
      return [fixed]
    }
    return [question]
  })

  return { questions: next, updated, removed }
}

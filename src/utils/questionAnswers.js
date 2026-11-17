// לוגיקת בדיקת תשובות לפי סוג שאלה, משותפת לחידון, לסיכום ולניהול.
//
// סוגי שאלות:
//  multiple / sentence_completion - בחירה מתוך אפשרויות
//  open        - תשובה קצרה בטקסט (התאמה חכמה, ר' fuzzyMatch.js)
//  list        - "כתבי כמה": התלמיד כותב כמה פריטים; correct_answer הוא מאגר הפריטים המקובלים
//                (כל פריט יכול לכלול חלופות עם |, למשל "גלבוע|הר הגלבוע"), ו-minItems הוא כמה נדרשים.
//                ordered: true - הסדר חשוב (הפריטים במאגר הם בסדר הנכון)
//  self_check  - שאלת הסבר: התלמיד מציג את התשובה המלאה ומדווח אם ידע; correct_answer[0] הוא התשובה להצגה

import { fuzzyMatch } from './fuzzyMatch.js'

// שאלות הסבר (self_check): פעילות. כדי להסתיר שוב: false
export const SELF_CHECK_ENABLED = true

export const SELF_CHECK_KNOWN = 'known'
export const SELF_CHECK_UNKNOWN = 'unknown'

export function hasOptions(type) {
  return type === 'multiple' || type === 'sentence_completion'
}

// מאגר פריטים לשאלת רשימה: כל פריט הוא מערך של חלופות
export function getListEntries(question) {
  return (question.correct_answer || []).map(entry => String(entry).split('|').map(part => part.trim()).filter(Boolean))
}

export function getListMinItems(question) {
  const entries = getListEntries(question)
  const requested = Number(question.minItems)
  if (Number.isFinite(requested) && requested > 0) return Math.min(requested, entries.length)
  return entries.length
}

function splitListAnswer(text) {
  return String(text ?? '')
    .split(/[\n,،;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

// אם התלמיד כתב "גלבוע וכרמל וחרמון" בלי פסיקים, מפצלים גם לפי "ו" צמודה למילה
function splitByConjunction(items) {
  return items.flatMap(item => item.split(/\s+ו(?=[א-ת])/).map(part => part.trim()).filter(Boolean))
}

function countListMatches(items, entries, ordered = false) {
  const used = new Set()
  let lastIndex = -1

  items.forEach(item => {
    const entryIndex = entries.findIndex((alternatives, index) => (
      !used.has(index)
      && (!ordered || index > lastIndex)
      && alternatives.some(alternative => fuzzyMatch(item, [alternative]))
    ))
    if (entryIndex !== -1) {
      used.add(entryIndex)
      lastIndex = entryIndex
    }
  })

  return used.size
}

export function countListAnswerMatches(question, userAnswer) {
  const entries = getListEntries(question)
  const baseItems = splitListAnswer(userAnswer)
  // אם התלמיד כתב הכול ברצף בלי פסיקים, מנסים גם פיצול לפי מילים
  const singleWords = baseItems.flatMap(item => item.split(/\s+/).filter(Boolean))
  const ordered = Boolean(question.ordered)
  return Math.max(
    countListMatches(baseItems, entries, ordered),
    countListMatches(splitByConjunction(baseItems), entries, ordered),
    countListMatches(singleWords, entries, ordered),
  )
}

export function evaluateQuestionAnswer(question, userAnswer) {
  if (hasOptions(question.type)) {
    return question.correct_answer.includes(userAnswer)
  }

  if (question.type === 'self_check') {
    return userAnswer === SELF_CHECK_KNOWN
  }

  if (question.type === 'list') {
    return countListAnswerMatches(question, userAnswer) >= getListMinItems(question)
  }

  return fuzzyMatch(userAnswer, question.correct_answer)
}

// הטקסט שמוצג כ"התשובה הנכונה" בחידון ובסיכום
export function formatCorrectAnswer(question) {
  const answers = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer]

  if (question.type === 'list') {
    const entries = getListEntries(question).map(alternatives => alternatives[0])
    const needed = getListMinItems(question)
    const preview = entries.slice(0, 8).join(', ')
    return `${preview}${entries.length > 8 ? ' ...' : ''} (נדרשו לפחות ${needed})`
  }

  return answers[0] ?? ''
}

export function formatUserAnswer(question, userAnswer) {
  if (question.type === 'self_check') {
    if (userAnswer === SELF_CHECK_KNOWN) return 'ידעתי'
    if (userAnswer === SELF_CHECK_UNKNOWN) return 'לא ידעתי'
  }

  return userAnswer
}

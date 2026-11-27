// הגדרות האתר (קטגוריות מוסתרות ושאלות ההתנסות): נרמול וקיבוץ. משמש את הדפדפן ואת השרת
import defaults from '../data/siteDefaults.js'

export const GRADE_VALUES = ['grade-8', 'grade-12', 'thinking-challenge']
export const MAX_DEMO_QUESTIONS = 24

const strings = value => [...new Set(value.filter(item => typeof item === 'string' && item.trim()))]

export function normalizeSiteSettings(input) {
  const source = input && typeof input === 'object' ? input : {}
  const hidden = Array.isArray(source.hiddenGrades)
    ? strings(source.hiddenGrades).filter(grade => GRADE_VALUES.includes(grade))
    : defaults.hiddenGrades
  return {
    // תמיד נשארת לפחות קטגוריה אחת גלויה
    hiddenGrades: hidden.length >= GRADE_VALUES.length ? [...defaults.hiddenGrades] : [...hidden],
    demoQuestionIds: (Array.isArray(source.demoQuestionIds) ? strings(source.demoQuestionIds) : defaults.demoQuestionIds)
      .slice(0, MAX_DEMO_QUESTIONS),
  }
}

// השאלות שנבחרו, לפי הסדר שנקבע. שאלה שנמחקה פשוט לא מופיעה
export function pickDemoQuestions(questions, ids) {
  const byId = new Map(questions.map(question => [question.id, question]))
  return ids.map(id => byId.get(id)).filter(Boolean)
}

// נושא, בתוכו תתי-נושאים, ובתוכם השאלות, לפי סדר ההופעה
export function groupDemoQuestions(questions) {
  const topics = new Map()
  questions.forEach(question => {
    if (!topics.has(question.subject)) topics.set(question.subject, new Map())
    const subtopics = topics.get(question.subject)
    const level = question.level || ''
    if (!subtopics.has(level)) subtopics.set(level, [])
    subtopics.get(level).push(question)
  })
  return [...topics].map(([subject, subtopics]) => ({
    subject,
    subtopics: [...subtopics].map(([level, items]) => ({ level, questions: items })),
  }))
}

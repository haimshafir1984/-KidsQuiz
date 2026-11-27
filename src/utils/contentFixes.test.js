import { describe, expect, test } from 'vitest'
import contentFixes from '../data/contentFixes'
import seedQuestions from '../data/seedQuestions'
import siteDefaults from '../data/siteDefaults'
import { applyContentFixes } from './contentFixes'
import { evaluateQuestionAnswer } from './questionAnswers'
import { fuzzyMatch } from './fuzzyMatch'
import { groupDemoQuestions, normalizeSiteSettings, pickDemoQuestions } from './siteSettings'

const byId = new Map(seedQuestions.map(question => [question.id, question]))
const original = item => ({ id: item.id, grade: 'grade-8', subject: 'נושא', ...item.from })

describe('תיקוני ההגהה', () => {
  test('המאגר שבקוד כבר מתוקן: הוסרו 95 שאלות וכל תיקון הוחל', () => {
    contentFixes.removals.forEach(item => expect(byId.has(item.id)).toBe(false))
    contentFixes.updates.forEach(item => expect(byId.get(item.id)).toMatchObject(item.to))
  })

  test('שאלה מקורית מתוקנת ומוסרת, והרצה שנייה לא משנה כלום', () => {
    const stored = [...contentFixes.updates, ...contentFixes.removals].map(original)
    const first = applyContentFixes(stored, contentFixes)
    expect(first.updated).toHaveLength(contentFixes.updates.length)
    expect(first.removed).toHaveLength(contentFixes.removals.length)
    const second = applyContentFixes(first.questions, contentFixes)
    expect(second.updated).toHaveLength(0)
    expect(second.removed).toHaveLength(0)
  })

  test('שאלה שנערכה בניהול לא נדרסת ולא מוסרת', () => {
    const edited = [contentFixes.updates[0], contentFixes.removals[0]].map(item => ({ ...original(item), text: 'נוסח שערך המנהל' }))
    const result = applyContentFixes(edited, contentFixes)
    expect(result.questions).toEqual(edited)
  })

  test('שדות שאינם חלק מהתיקון (כמו שיוכים נוספים) נשמרים', () => {
    const item = contentFixes.updates[0]
    const placements = [{ grade: 'grade-8', subject: 'א' }, { grade: 'grade-12', subject: 'ב' }]
    const [fixed] = applyContentFixes([{ ...original(item), placements, position: 7 }], contentFixes).questions
    expect(fixed.placements).toEqual(placements)
    expect(fixed.position).toBe(7)
  })

  test('כל תשובה ראשית בשאלה פתוחה שתוקנה מתקבלת', () => {
    contentFixes.updates.forEach(item => {
      const question = byId.get(item.id)
      if (question.type !== 'open') return
      question.correct_answer.forEach(answer => expect(evaluateQuestionAnswer(question, answer), `${question.text} ← ${answer}`).toBe(true))
    })
  })

  test('קיצורי תואר (ר\', רב) וברכת זיכרון לא פוסלים תשובה', () => {
    expect(fuzzyMatch("ר' ישראל סלנטר", ['ישראל סלנטר'])).toBe(true)
    expect(fuzzyMatch('רב ישראל סלנטר זצ"ל', ['ישראל סלנטר'])).toBe(true)
  })
})

describe('הגדרות האתר', () => {
  test('ברירת המחדל: רק ההכנה לסמינר גלויה, והתנסות של 2 נושאים, 2 תתי-נושאים ו-2 שאלות בכל אחד', () => {
    const settings = normalizeSiteSettings(null)
    expect(settings.hiddenGrades).toEqual(['grade-12', 'thinking-challenge'])
    const picked = pickDemoQuestions(seedQuestions, siteDefaults.demoQuestionIds)
    expect(picked).toHaveLength(siteDefaults.demoQuestionIds.length)
    const topics = groupDemoQuestions(picked)
    expect(topics).toHaveLength(2)
    topics.forEach(topic => {
      expect(topic.subtopics).toHaveLength(2)
      topic.subtopics.forEach(subtopic => expect(subtopic.questions).toHaveLength(2))
    })
  })

  test('אי אפשר להסתיר את כל הקטגוריות, ורשימה ריקה של שאלות נשמרת ריקה', () => {
    const settings = normalizeSiteSettings({ hiddenGrades: ['grade-8', 'grade-12', 'thinking-challenge'], demoQuestionIds: [] })
    expect(settings.hiddenGrades).not.toContain('grade-8')
    expect(settings.demoQuestionIds).toEqual([])
    expect(normalizeSiteSettings({ hiddenGrades: [] }).hiddenGrades).toEqual([])
  })
})

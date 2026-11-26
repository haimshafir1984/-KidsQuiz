import { describe, expect, test } from 'vitest'
import seedQuestions from '../../../data/seedQuestions'
import { ensureQuestionPositions } from '../../../context/appHelpers'
import { addPlacements, upsertQuestion } from '../../../utils/placements'
import { buildQuestion, copyDraft, draftFromQuestion, markCorrect, newDraft } from './questionDraft'
import { assignableGroups, buildTree, entriesAt, filterEntries, leafPlace, resolveNode, sortEntries } from './treeModel'

const seed = ensureQuestionPositions(seedQuestions).normalized
const q = (id, extra = {}) => ({ id, text: id, type: 'open', correct_answer: ['x'], grade: 'grade-8', subject: 'דינים', level: 'ברכות', activityType: 'practice', position: 1, ...extra })
const catalog = { 'grade-8': [{ subject: 'דינים', levels: ['ברכות', 'תפילה'], activities: ['practice'] }, { subject: 'שבת', levels: [], activities: ['practice'] }, { subject: 'מבחן כללי', levels: [], activities: ['exam'] }] }

describe('עורך השאלה לא משנה נתונים קיימים', () => {
  test('פתיחה ושמירה בלי שינוי של כל שאלות המאגר: אותו תוכן ואותו מיקום', () => {
    let checked = 0
    const brokenAnswers = []
    for (const question of seed) {
      const built = buildQuestion(draftFromQuestion(question))
      if (built.error) {
        brokenAnswers.push(question.id)
        continue
      }
      const saved = upsertQuestion([question], built.question, built.places, () => 'x').questions[0]
      expect(saved.text).toBe(question.text.trim())
      expect(saved.correct_answer).toEqual(question.correct_answer)
      expect(saved.options || []).toEqual(question.options || [])
      expect(saved.optionImages).toEqual(question.optionImages?.length ? question.optionImages : undefined)
      for (const field of ['grade', 'subject', 'activityType', 'position', 'image', 'groupTitle', 'minItems', 'ordered']) {
        expect(saved[field] ?? null).toEqual(field === 'ordered' && question.type === 'list' ? Boolean(question.ordered) : question[field] ?? null)
      }
      expect(saved.level ?? null).toBe(question.level ?? null)
      expect(saved.placements).toBeUndefined()
      checked += 1
    }
    expect(checked).toBeGreaterThan(1400)
    // רק שאלות אמריקאיות שהתשובה השמורה שלהן לא תואמת לאף אפשרות דורשות תיקון לפני שמירה
    const unmatched = seed.filter(item => ['multiple', 'sentence_completion'].includes(item.type)
      && !item.correct_answer.some(answer => item.options.some(option => option.trim() === answer.trim())))
    expect(brokenAnswers).toEqual(unmatched.map(item => item.id))
  })

  test('סימון התשובה הנכונה, ומחיקת אפשרות שומרת על התמונות במקומן', () => {
    const draft = draftFromQuestion(q('a', { type: 'multiple', options: ['א1', 'ב1', 'ג1'], optionImages: ['1.png', '2.png', '3.png'], correct_answer: ['ג1'] }))
    expect(draft.options.map(option => option.correct)).toEqual([false, false, true])
    const without = { ...draft, options: draft.options.filter((_, index) => index !== 0) }
    expect(buildQuestion(without).question).toMatchObject({ options: ['ב1', 'ג1'], optionImages: ['2.png', '3.png'], correct_answer: ['ג1'] })
    expect(buildQuestion(markCorrect(without, 0)).question.correct_answer).toEqual(['ב1'])
  })

  test('בדיקות חובה', () => {
    expect(buildQuestion(newDraft([])).error).toBeTruthy()
    const draft = { ...newDraft([{ grade: 'grade-8', subject: 'שבת', level: null }]), text: 'שאלה' }
    expect(buildQuestion(draft).error).toMatch('שתי אפשרויות')
    const filled = { ...draft, options: [{ text: 'כן', correct: false }, { text: 'לא', correct: false }] }
    expect(buildQuestion(filled).error).toMatch('לסמן')
    expect(buildQuestion(markCorrect(filled, 1)).question.correct_answer).toEqual(['לא'])
    expect(buildQuestion({ ...draft, type: 'open' }).error).toMatch('תשובה נכונה')
  })

  test('עותק נפרד לא נושא את המזהה של המקור', () => {
    const copy = buildQuestion(copyDraft(draftFromQuestion(q('a'))))
    expect(copy.question.id).toBeUndefined()
  })
})

describe('עץ התוכן', () => {
  const questions = addPlacements([q('a'), q('b', { position: 2 }), q('direct', { level: null })], ['a'], [{ grade: 'grade-8', subject: 'דינים', level: 'תפילה' }]).questions
  const tree = buildTree(catalog, questions)
  const topic = tree.grades[0].topics[0]

  test('ספירה ייחודית, ו"ללא תת-נושא" לשאלות ישירות', () => {
    expect(topic.count).toBe(3)
    expect(topic.subtopics.map(item => [item.label, item.count])).toEqual([['ללא תת-נושא', 1], ['ברכות', 2], ['תפילה', 1]])
  })

  test('נושא מערכת ריק לא מוצג ולא ניתן לשיוך', () => {
    expect(tree.grades[0].topics.map(item => item.subject)).toEqual(['דינים', 'שבת'])
    expect(assignableGroups(tree)[0].topics.flatMap(item => item.places.map(place => place.label))).toEqual(['ברכות', 'תפילה', 'שבת'])
  })

  test('כל שאלה נגישה מ"כל השאלות", והפעולות מתייחסות למקום חד-משמעי', () => {
    const outside = [...questions, q('lost', { grade: 'unknown' })]
    expect(entriesAt(outside, {})).toHaveLength(4)
    const inTopic = entriesAt(questions, { grade: 'grade-8', subject: 'דינים' })
    expect(inTopic.find(entry => entry.question.id === 'a').place).toBeNull()
    expect(entriesAt(questions, { grade: 'grade-8', subject: 'דינים', level: 'תפילה' })[0].place.level).toBe('תפילה')
  })

  test('חיפוש בנוסח ובתשובה, וסינון פעילות', () => {
    const entries = entriesAt(questions, {})
    expect(filterEntries(entries, { search: 'dir' })).toHaveLength(1)
    expect(filterEntries(entries, { search: 'x' })).toHaveLength(3)
    expect(filterEntries(entries, { activity: 'exam' })).toHaveLength(0)
  })

  test('מקום להוספה, וחזרה להורה כשצומת נעלם', () => {
    expect(leafPlace(tree, { grade: 'grade-8', subject: 'דינים' })).toBeNull()
    expect(leafPlace(tree, { grade: 'grade-8', subject: 'שבת' })).toEqual({ grade: 'grade-8', subject: 'שבת', level: null })
    expect(resolveNode(tree, { grade: 'grade-8', subject: 'דינים', level: 'אין' })).toEqual({ grade: 'grade-8', subject: 'דינים' })
    expect(resolveNode(tree, { grade: 'grade-8', subject: 'אין' })).toEqual({ grade: 'grade-8' })
  })

  test('סדר בתוך תת-נושא לפי המיקום', () => {
    const node = { grade: 'grade-8', subject: 'דינים', level: 'ברכות' }
    expect(sortEntries(tree, entriesAt(questions, node), node).map(entry => entry.question.id)).toEqual(['a', 'b'])
  })
})

import { describe, expect, test } from 'vitest'
import {
  addPlacements, deletePlaces, expandPlacements, getPlacements, linkTopicToGrade, moveDirectQuestionsToSubtopic,
  movePlacement, placeKey, questionsInGroup, removeFromPlace, renameSubtopicPlaces, renameTopicPlaces,
  reorderInGroup, setPlacementActivity, uniqueById, upsertQuestion, withPlacements,
} from './placements'

const q = (id, extra = {}) => ({ id, text: id, type: 'open', correct_answer: ['x'], grade: 'grade-8', subject: 'דינים', level: 'ברכות', activityType: 'practice', position: 1, ...extra })
const place = (subject, level = null, extra = {}) => ({ grade: 'grade-8', subject, level, activityType: 'practice', ...extra })
const order = (list, p) => questionsInGroup(list, p).map(entry => entry.question.id)
const byId = (list, id) => list.find(item => item.id === id)

describe('שאלה בכמה מקומות', () => {
  test('שאלה במקום אחד נשארת בדיוק במבנה הישן', () => {
    const original = q('a')
    expect(withPlacements(original, getPlacements(original))).toEqual(original)
    expect(expandPlacements([original])[0]).toBe(original)
  })

  test('שיוך מוסיף placements, משכפל את המקום הראשון לשדות הרגילים, ושם את השאלה בסוף היעד', () => {
    const list = [q('a'), q('b', { subject: 'שבת', level: 'קידוש', position: 4 })]
    const result = addPlacements(list, ['a'], [place('שבת', 'קידוש')])
    const linked = byId(result.questions, 'a')
    expect(result.added).toBe(1)
    expect(linked.subject).toBe('דינים')
    expect(linked.placements).toHaveLength(2)
    expect(linked.placements[1].position).toBe(5)
    expect(byId(result.questions, 'b')).toBe(list[1])
    // שיוך חוזר לאותו מקום לא משנה כלום, גם עם פעילות אחרת
    expect(addPlacements(result.questions, ['a'], [place('שבת', 'קידוש', { activityType: 'exam' })]).added).toBe(0)
  })

  test('כמה שאלות משויכות יחד בסדר רציף', () => {
    const list = [q('a'), q('b', { position: 2 })]
    const { questions, added } = addPlacements(list, ['a', 'b'], [place('שבת'), place('מועדים')])
    expect(added).toBe(4)
    expect(order(questions, place('שבת'))).toEqual(['a', 'b'])
    expect(order(questions, place('מועדים'))).toEqual(['a', 'b'])
  })

  test('צד התלמיד רואה את השאלה בכל מקום, עם אותו מזהה; בספירה ייחודית היא פעם אחת', () => {
    const { questions } = addPlacements([q('a')], ['a'], [place('שבת', null, { activityType: 'exam' })])
    const views = expandPlacements(questions)
    expect(views.map(v => [v.id, v.subject, v.level, v.activityType])).toEqual([['a', 'דינים', 'ברכות', 'practice'], ['a', 'שבת', null, 'exam']])
    expect(views[0].placements).toBeUndefined()
    expect(uniqueById(views)).toHaveLength(1)
  })

  test('הסרה ממקום אחד משאירה את האחרים; הסרה מהמקום האחרון מוחקת', () => {
    let { questions } = addPlacements([q('a')], ['a'], [place('שבת')])
    questions = removeFromPlace(questions, 'a', placeKey(place('דינים', 'ברכות')))
    expect(byId(questions, 'a').subject).toBe('שבת')
    expect(byId(questions, 'a').placements).toBeUndefined()
    expect(removeFromPlace(questions, 'a', placeKey(place('שבת')))).toEqual([])
  })

  test('העברה למקום אחר שומרת על הפעילות; העברה למקום שהשאלה כבר בו רק מסירה מהמקור', () => {
    const moved = movePlacement([q('a', { activityType: 'exam' })], 'a', placeKey(place('דינים', 'ברכות')), place('שבת'))
    expect(byId(moved, 'a')).toMatchObject({ subject: 'שבת', level: null, activityType: 'exam', position: 1 })
    const { questions } = addPlacements([q('a')], ['a'], [place('שבת')])
    const merged = movePlacement(questions, 'a', placeKey(place('דינים', 'ברכות')), place('שבת'))
    expect(getPlacements(byId(merged, 'a'))).toHaveLength(1)
  })

  test('שינוי פעילות במקום אחד לא משנה את האחר', () => {
    const { questions } = addPlacements([q('a')], ['a'], [place('שבת')])
    const next = setPlacementActivity(questions, 'a', placeKey(place('שבת')), 'exam')
    expect(getPlacements(byId(next, 'a')).map(p => p.activityType)).toEqual(['practice', 'exam'])
  })

  test('סידור: גם כשכמה שאלות באותו מיקום (התקלה הישנה) החצים עובדים', () => {
    const list = [q('a'), q('b'), q('c')]
    const next = reorderInGroup(list, place('דינים', 'ברכות'), 'c', 1)
    expect(order(next, place('דינים', 'ברכות'))).toEqual(['a', 'c', 'b'])
    expect(next.map(item => item.position).sort()).toEqual([1, 2, 3])
  })

  test('הסדר נשמר בנפרד לכל מקום', () => {
    let { questions } = addPlacements([q('a'), q('b', { position: 2 })], ['a', 'b'], [place('שבת')])
    questions = reorderInGroup(questions, place('שבת'), 'b', 0)
    expect(order(questions, place('שבת'))).toEqual(['b', 'a'])
    expect(order(questions, place('דינים', 'ברכות'))).toEqual(['a', 'b'])
  })
})

describe('שמירה מהעורך', () => {
  test('שאלה חדשה בסוף הרשימה', () => {
    const draft = { text: 'חדשה', type: 'open', correct_answer: ['x'] }
    const { questions, id } = upsertQuestion([q('a', { position: 7 })], draft, [place('דינים', 'ברכות')], () => 'new')
    expect(id).toBe('new')
    expect(byId(questions, 'new').position).toBe(8)
    expect(byId(questions, 'new').placements).toBeUndefined()
  })

  test('עריכה שומרת על המיקום ועל שדות שהעורך לא מציג', () => {
    const list = [q('a', { position: 3, groupTitle: 'כותרת', image: 'x.png' }), q('b', { position: 4 })]
    const { questions } = upsertQuestion(list, { ...list[0], text: 'תוקן' }, getPlacements(list[0]), () => 'unused')
    expect(byId(questions, 'a')).toEqual({ ...list[0], text: 'תוקן' })
    expect(byId(questions, 'b')).toBe(list[1])
  })

  test('מיקום מבוקש מזיז את השאלה', () => {
    const list = [q('a'), q('b', { position: 2 }), q('c', { position: 3 })]
    const { questions } = upsertQuestion(list, list[2], [{ ...getPlacements(list[2])[0], requestedIndex: 1 }], () => 'unused')
    expect(order(questions, place('דינים', 'ברכות'))).toEqual(['c', 'a', 'b'])
    expect(byId(questions, 'c').requestedIndex).toBeUndefined()
  })

  test('הסרת מקום בעורך', () => {
    const { questions } = addPlacements([q('a')], ['a'], [place('שבת')])
    const saved = upsertQuestion(questions, byId(questions, 'a'), [getPlacements(byId(questions, 'a'))[1]], () => 'unused').questions
    expect(byId(saved, 'a')).toMatchObject({ subject: 'שבת' })
    expect(byId(saved, 'a').placements).toBeUndefined()
  })
})

describe('נושאים ותתי-נושאים', () => {
  const base = () => addPlacements([q('only'), q('shared', { position: 2 }), q('direct', { subject: 'אחר', level: null })], ['shared'], [place('שבת')]).questions

  test('שינוי שם נושא משנה את כל המקומות שלו בלבד', () => {
    const next = renameTopicPlaces(base(), 'grade-8', 'דינים', 'הלכה')
    expect(getPlacements(byId(next, 'shared')).map(p => p.subject)).toEqual(['הלכה', 'שבת'])
    expect(byId(next, 'only').subject).toBe('הלכה')
    expect(byId(next, 'direct').subject).toBe('אחר')
  })

  test('שינוי שם תת-נושא', () => {
    const next = renameSubtopicPlaces(base(), 'grade-8', 'דינים', 'ברכות', 'ברכת המזון')
    expect(byId(next, 'only').level).toBe('ברכת המזון')
  })

  test('מחיקת נושא: שאלה משותפת נשארת, שאלה שרק שם נמחקת', () => {
    const result = deletePlaces(base(), 'grade-8', 'דינים')
    expect(result.removedIds).toEqual(['only'])
    expect(result.unlinked).toBe(1)
    expect(byId(result.questions, 'shared')).toMatchObject({ subject: 'שבת' })
  })

  test('מחיקת "ללא תת-נושא" לא נוגעת בתתי-נושאים', () => {
    const list = [q('a'), q('b', { level: null })]
    expect(deletePlaces(list, 'grade-8', 'דינים', null).removedIds).toEqual(['b'])
  })

  test('תת-נושא ראשון: השאלות הישירות עוברות אליו', () => {
    const next = moveDirectQuestionsToSubtopic(base(), 'grade-8', 'אחר', 'ראשון')
    expect(byId(next, 'direct').level).toBe('ראשון')
  })

  test('שיוך נושא לקטגוריה: אותן שאלות, לא עותקים', () => {
    const { questions, added } = linkTopicToGrade([q('a'), q('b', { position: 2 })], 'grade-8', 'דינים', 'grade-12')
    expect(added).toBe(2)
    expect(questions).toHaveLength(2)
    expect(order(questions, { grade: 'grade-12', subject: 'דינים', level: 'ברכות', activityType: 'practice' })).toEqual(['a', 'b'])
  })
})

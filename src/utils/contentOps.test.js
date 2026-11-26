import { describe, expect, test } from 'vitest'
import {
  addSubtopic, addTopic, assignTopicToGrade, deleteSubtopic, deleteTopic, moveSubtopic, renameSubtopic, renameTopic,
} from './contentOps'
import { mergeTrackCollections } from '../context/appHelpers'
import { BASE_VISIBLE_TRACKS, GENERAL_EXAM_SUBJECT } from '../data/learningTracks'
import { expandPlacements, getPlacements, questionsInGroup } from './placements'
import { diffTracks, findLocalOnlyTracks } from './tracksSync'

// בונה את העץ כמו שהאפליקציה בונה אותו: קוד + ניהול + שאלות (בלי תלות ב-React)
function catalog(questions, customTracks, showEmptyLevels = true) {
  const result = {}
  for (const grade of ['grade-8', 'grade-12']) {
    const bySubject = new Map()
    expandPlacements(questions).filter(q => q.grade === grade).forEach(q => {
      const entry = bySubject.get(q.subject) || { subject: q.subject, levels: new Set(), activities: new Set() }
      if (q.level) entry.levels.add(q.level)
      entry.activities.add(q.activityType)
      bySubject.set(q.subject, entry)
    })
    const fromQuestions = [...bySubject.values()].map(t => ({ ...t, levels: [...t.levels].sort(), activities: [...t.activities].sort() }))
    result[grade] = mergeTrackCollections(
      [...BASE_VISIBLE_TRACKS[grade], ...(customTracks[grade] || []).map(t => ({ ...t, defined: true }))],
      fromQuestions,
      { showEmptyLevels },
    )
  }
  return result
}

// מחיל פעולה על המצב ומחזיר מצב חדש, כמו applyContent
const apply = (state, result) => {
  const questions = result.questions || state.questions
  const customTracks = result.tracks || state.customTracks
  return { questions, customTracks, trackCatalog: catalog(questions, customTracks) }
}
const start = (questions = [], customTracks = {}) => apply({ questions, customTracks }, {})
const topic = (state, subject, grade = 'grade-8') => state.trackCatalog[grade].find(t => t.subject === subject)
const q = (id, extra = {}) => ({ id, text: id, type: 'open', correct_answer: ['x'], grade: 'grade-8', subject: 'שלי', level: null, activityType: 'practice', position: 1, ...extra })

describe('נושאים', () => {
  test('נושא חדש מופיע בעץ, ושם כפול או שם מערכת נדחים', () => {
    const state = start()
    const next = apply(state, addTopic(state, 'grade-8', ' חדש לגמרי '))
    expect(topic(next, 'חדש לגמרי')).toBeTruthy()
    expect(addTopic(next, 'grade-8', 'חדש לגמרי').error).toBeTruthy()
    expect(addTopic(next, 'grade-8', GENERAL_EXAM_SUBJECT).error).toBeTruthy()
    expect(addTopic(next, 'grade-8', '  ').error).toBeTruthy()
  })

  test('שינוי שם של נושא מהקוד לא משאיר אחריו נושא ריק (התקלה הישנה), ושומר תתי-נושאים וסדר', () => {
    const state = start()
    const builtIn = topic(state, 'תנ"ך')
    expect(builtIn).toBeTruthy()
    const subtopics = state.trackCatalog['grade-8'].find(t => t.levelsKind === 'subtopic')
    const next = apply(state, renameTopic(state, 'grade-8', subtopics.subject, 'שם אחר'))
    expect(topic(next, subtopics.subject)).toBeUndefined()
    expect(topic(next, 'שם אחר').levels).toEqual(subtopics.levels)
    expect(topic(next, 'שם אחר').levelsKind).toBe('subtopic')
  })

  test('מחיקת נושא מהקוד מסתירה אותו; שאלה שחוזרת אליו מציגה אותו שוב', () => {
    const state = start([q('a', { subject: 'תנ"ך' })])
    const next = apply(state, deleteTopic(state, 'grade-8', 'תנ"ך'))
    expect(next.questions).toEqual([])
    expect(topic(next, 'תנ"ך')).toBeUndefined()
    expect(catalog([q('a', { subject: 'תנ"ך' })], next.customTracks)['grade-8'].find(t => t.subject === 'תנ"ך').hidden).toBeUndefined()
    // אפשר להוסיף שוב נושא בשם הזה
    expect(addTopic(next, 'grade-8', 'תנ"ך').error).toBeUndefined()
  })

  test('שינוי שם לשם קיים נדחה ולא מאחד נושאים בטעות', () => {
    const state = start([q('a'), q('b', { subject: 'אחר' })])
    expect(renameTopic(state, 'grade-8', 'שלי', 'אחר').error).toBeTruthy()
  })

  test('סימון מוסתר נשלח לשרת ולא מוצע להעלאה מהדפדפן', () => {
    const state = start()
    const { tracks } = deleteTopic(state, 'grade-8', 'תנ"ך')
    expect(diffTracks({}, tracks).upserts[0]).toMatchObject({ subject: 'תנ"ך', hidden: true })
    expect(findLocalOnlyTracks(tracks, {})).toEqual([])
  })
})

describe('תתי-נושאים', () => {
  const withTopic = () => start([q('a'), q('b', { position: 2 })])

  test('תת-נושא ראשון מקבל את שאלות הנושא, והבאים נוספים בסוף', () => {
    let state = withTopic()
    const first = addSubtopic(state, 'grade-8', 'שלי', 'ת')
    expect(first.movedCount).toBe(2)
    state = apply(state, first)
    state = apply(state, addSubtopic(state, 'grade-8', 'שלי', 'א'))
    expect(topic(state, 'שלי').levels).toEqual(['ת', 'א'])
    expect(topic(state, 'שלי').levelsKind).toBe('subtopic')
    expect(state.questions.map(item => item.level)).toEqual(['ת', 'ת'])
    expect(addSubtopic(state, 'grade-8', 'שלי', 'א').error).toBeTruthy()
  })

  test('סידור, שינוי שם ומחיקה', () => {
    let state = withTopic()
    state = apply(state, addSubtopic(state, 'grade-8', 'שלי', 'ראשון'))
    state = apply(state, addSubtopic(state, 'grade-8', 'שלי', 'שני'))
    state = apply(state, moveSubtopic(state, 'grade-8', 'שלי', 'שני', 'up'))
    expect(topic(state, 'שלי').levels).toEqual(['שני', 'ראשון'])
    state = apply(state, renameSubtopic(state, 'grade-8', 'שלי', 'ראשון', 'מתוקן'))
    expect(topic(state, 'שלי').levels).toEqual(['שני', 'מתוקן'])
    expect(state.questions.every(item => item.level === 'מתוקן')).toBe(true)
    expect(renameSubtopic(state, 'grade-8', 'שלי', 'מתוקן', 'שני').error).toBeTruthy()
    const removed = deleteSubtopic(state, 'grade-8', 'שלי', 'מתוקן')
    expect(removed.removedCount).toBe(2)
    state = apply(state, removed)
    expect(topic(state, 'שלי').levels).toEqual(['שני'])
  })

  test('סידור תתי-נושאים בנושא מהקוד נשמר', () => {
    const state = start()
    const base = state.trackCatalog['grade-8'].find(t => t.levelsKind === 'subtopic')
    const next = apply(state, moveSubtopic(state, 'grade-8', base.subject, base.levels[1], 'up'))
    expect(topic(next, base.subject).levels.slice(0, 2)).toEqual([base.levels[1], base.levels[0]])
  })
})

describe('שיוך נושא לקטגוריה', () => {
  test('בלי שאלות: רק הנושא', () => {
    const state = start([q('a')])
    const result = assignTopicToGrade(state, 'grade-8', 'שלי', 'grade-12', false)
    expect(result.createdTopic).toBe(true)
    expect(result.questions).toBeUndefined()
  })

  test('עם שאלות: אותן שאלות, בסוף מה שכבר ביעד, ובלי להכפיל עותק ישן', () => {
    const state = start([
      q('a'), q('b', { position: 2 }),
      q('copy-of-a', { text: 'a', grade: 'grade-12' }),
    ])
    const result = assignTopicToGrade(state, 'grade-8', 'שלי', 'grade-12', true)
    expect(result.added).toBe(1)
    expect(result.questions).toHaveLength(3)
    expect(getPlacements(result.questions[0])).toHaveLength(1)
    const order = questionsInGroup(result.questions, { grade: 'grade-12', subject: 'שלי', level: null, activityType: 'practice' })
    expect(order.map(e => [e.question.id, e.place.position])).toEqual([['copy-of-a', 1], ['b', 2]])
    const again = apply(state, result)
    expect(assignTopicToGrade(again, 'grade-8', 'שלי', 'grade-12', true).error).toBeTruthy()
  })
})

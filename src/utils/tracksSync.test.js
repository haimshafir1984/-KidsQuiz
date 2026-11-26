import { describe, expect, test } from 'vitest'
import { diffTracks, findLocalOnlyTracks } from './tracksSync'
import { mergeTrackCollections } from '../context/appHelpers'
import { createQuestionDraft, defaultActivity } from '../pages/admin/adminShared'

const track = (subject, extra = {}) => ({ subject, levels: [], activities: ['practice'], questionTypes: 'מותאם אישית', ...extra })

describe('הפרש נושאים לשרת', () => {
  test('חדש ומשתנה נשמרים, מוסר נמחק, ללא שינוי לא נשלח', () => {
    const before = { 'grade-8': [track('א'), track('ב'), track('ג')] }
    const after = { 'grade-8': [track('א'), track('ב', { levels: ['1'] }), track('ד')] }
    const { upserts, removals } = diffTracks(before, after)
    expect(upserts.map(item => item.subject)).toEqual(['ב', 'ד'])
    expect(removals).toEqual([{ grade: 'grade-8', subject: 'ג' }])
  })

  test('שינוי שם = מחיקה ושמירה', () => {
    const { upserts, removals } = diffTracks({ 'grade-8': [track('ישן')] }, { 'grade-8': [track('חדש')] })
    expect(upserts).toHaveLength(1)
    expect(removals).toEqual([{ grade: 'grade-8', subject: 'ישן' }])
  })

  test('נושאים שקיימים רק בדפדפן', () => {
    const local = { 'grade-8': [track('רק כאן'), track('גם בשרת')], 'grade-12': [] }
    const server = { 'grade-8': [track('גם בשרת')] }
    expect(findLocalOnlyTracks(local, server).map(item => item.subject)).toEqual(['רק כאן'])
  })
})

describe('מיזוג נושא שהוגדר בניהול עם השאלות שלו', () => {
  const defined = track('חדש', { levels: ['ב', 'א', 'ג'], activities: ['practice', 'exam'], defined: true })
  const fromQuestions = track('חדש', { levels: ['א'], questionTypes: 'פתוחות' })

  test('למנהל: כל תתי-הנושאים נשארים, בסדר שהוגדר, ומצב המבחן לא נעלם (התקלה המקורית)', () => {
    const [merged] = mergeTrackCollections([defined], [fromQuestions], { showEmptyLevels: true })
    expect(merged.levels).toEqual(['ב', 'א', 'ג'])
    expect(merged.activities).toEqual(['exam', 'practice'])
    expect(merged.questionTypes).toBe('פתוחות')
  })

  test('לתלמיד: רק תתי-נושאים שיש בהם שאלות', () => {
    const [merged] = mergeTrackCollections([defined], [fromQuestions], { showEmptyLevels: false })
    expect(merged.levels).toEqual(['א'])
  })

  test('תת-נושא שקיים רק בשאלות נוסף בסוף', () => {
    const [merged] = mergeTrackCollections([defined], [track('חדש', { levels: ['ד', 'א'] })], { showEmptyLevels: true })
    expect(merged.levels).toEqual(['ב', 'א', 'ג', 'ד'])
  })
})

describe('טיוטת שאלה חדשה', () => {
  const catalog = { 'grade-8': [track('נושא', { levels: ['ב', 'א'], activities: ['exam', 'practice'] })] }

  test('ברירת המחדל היא תרגול גם כש-exam ראשון ברשימה, והמיקום ריק (בסוף הרשימה)', () => {
    const draft = createQuestionDraft(catalog, 'grade-8', 'נושא')
    expect(draft.activityType).toBe('practice')
    expect(draft.position).toBe('')
    expect(draft.level).toBe('ב')
  })

  test('נושא של מבחן בלבד נשאר מבחן', () => {
    expect(defaultActivity({ activities: ['exam'] })).toBe('exam')
    expect(defaultActivity(undefined)).toBe('practice')
  })
})

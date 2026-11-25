import { describe, expect, test } from 'vitest'
import { GENERAL_EXAM_SUBJECT } from '../data/learningTracks'
import {
  ensureQuestionPositions,
  getExamTimeLimitSeconds,
  getQuizProgressKey,
  runInBatches,
  sanitizeUser,
  shuffleItems,
  sortQuestionsByPosition,
} from './appHelpers'

const q = (id, extra = {}) => ({ id, grade: 'grade-8', subject: 'שבת', level: null, activityType: 'practice', ...extra })

describe('מיקום ומיון שאלות', () => {
  test('שאלות בלי position מקבלות מספר סידורי לפי קבוצה', () => {
    const { normalized, changed } = ensureQuestionPositions([q('a'), q('b'), q('c', { subject: 'דינים' })])
    expect(changed).toBe(true)
    expect(normalized.map(item => item.position)).toEqual([1, 2, 1])
  })

  test('position קיים נשמר, והספירה ממשיכה ממנו', () => {
    const { normalized, changed } = ensureQuestionPositions([q('a', { position: 5 }), q('b')])
    expect(changed).toBe(true)
    expect(normalized.map(item => item.position)).toEqual([5, 6])
  })

  test('מיון לפי position', () => {
    const sorted = sortQuestionsByPosition([q('b', { position: 2 }), q('a', { position: 1 })])
    expect(sorted.map(item => item.id)).toEqual(['a', 'b'])
  })
})

describe('מפתחות וזמנים', () => {
  test('מפתח התקדמות יציב ומבחין בין רמות וסוגי פעילות', () => {
    const base = { userId: 'u1', grade: 'grade-8', subject: 'שבת' }
    expect(getQuizProgressKey(base)).toBe('u1::grade-8::שבת::no-level::practice')
    expect(getQuizProgressKey({ ...base, level: 'א', activityType: 'exam' })).toBe('u1::grade-8::שבת::א::exam')
  })

  test('מגבלת זמן רק במבחן, ומבחן כללי ארוך יותר', () => {
    expect(getExamTimeLimitSeconds('שבת', 'practice')).toBeNull()
    expect(getExamTimeLimitSeconds(GENERAL_EXAM_SUBJECT, 'exam')).toBe(20 * 60)
    expect(getExamTimeLimitSeconds('שבת', 'exam')).toBeLessThan(20 * 60)
  })
})

describe('עזרים כלליים', () => {
  test('sanitizeUser מסיר סיסמה ולא משנה את המקור', () => {
    const user = { id: 1, username: 'x', password: 'secret' }
    expect(sanitizeUser(user)).toEqual({ id: 1, username: 'x' })
    expect(user.password).toBe('secret')
    expect(sanitizeUser(null)).toBeNull()
  })

  test('shuffleItems שומר את כל הפריטים', () => {
    const items = Array.from({ length: 30 }, (_, index) => index)
    expect([...shuffleItems(items)].sort((a, b) => a - b)).toEqual(items)
  })

  test('runInBatches: true רק כשכל הפעולות הצליחו, ולא יותר מ-5 במקביל', async () => {
    let running = 0
    let maxRunning = 0
    const task = ok => async () => {
      running += 1
      maxRunning = Math.max(maxRunning, running)
      await new Promise(resolve => setTimeout(resolve, 5))
      running -= 1
      return { ok }
    }
    expect(await runInBatches(Array.from({ length: 12 }, () => task(true)))).toBe(true)
    expect(maxRunning).toBeLessThanOrEqual(5)
    expect(await runInBatches([task(true), task(false)])).toBe(false)
  })
})

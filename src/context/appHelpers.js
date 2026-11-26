// עזרים טהורים של AppContext (נרמול שאלות ונושאים, מיון, זמני מבחן, ריצה בקבוצות). הופרדו מהקומפוננטה לקריאות ולבדיקה.
import { GENERAL_EXAM_SUBJECT } from '../data/learningTracks'
import { normalizeSubjectName } from '../data/subjectCatalog'
import { normalizeImportedQuestionStructure } from '../data/seedQuestions'

export const GENERAL_EXAM_QUESTION_COUNT = 30
export const GENERAL_EXAM_TIME_LIMIT_SECONDS = 20 * 60
export const STANDARD_EXAM_TIME_LIMIT_SECONDS = 180
export const HOLLAND_SUBJECT = 'שאלון הולנד'
export const LEGACY_SUBJECTS = new Set([
  'ידע יהודי - תנ״ך',
  'תפילה וברכות',
  'שבת',
  'מעגל השנה',
  'אינטליגנציה יהודית',
  'אנלוגיות',
  'לשון',
  'הבעה והבנה',
  'אוצר מילים',
  'הסקת מסקנות',
  'השלמת צורות',
  'מתמטיקה - היגיון',
  'סדרות מספרים',
  'אנגלית',
  'ראייה מרחבית',
  'אינטליגנציה כללית',
  'שאלון אישי',
  'פרקי אבות',
  'מטריצות',
  'ידע כמותי',
  'גיאומטריה',
])

export function getQuestionGroupKey(question) {
  return [question.grade, question.subject, question.level || 'no-level', question.activityType].join('::')
}

export function ensureQuestionPositions(items) {
  const counters = new Map()
  let changed = false

  const normalized = items.map(question => {
    const groupKey = getQuestionGroupKey(question)
    const currentCount = counters.get(groupKey) || 0
    const nextPosition = currentCount + 1
    counters.set(groupKey, nextPosition)

    if (typeof question.position === 'number') {
      counters.set(groupKey, Math.max(nextPosition, question.position))
      return question
    }

    changed = true
    return { ...question, position: nextPosition }
  })

  return { normalized, changed }
}

export function sortQuestionsByPosition(items) {
  return [...items].sort((first, second) => {
    const positionDiff = (first.position || 0) - (second.position || 0)
    if (positionDiff !== 0) return positionDiff
    return first.id.localeCompare(second.id)
  })
}

export function getQuestionTypesLabel(types, hasVisuals = false) {
  if (hasVisuals) return 'סגורות עם תמונות'
  if (types.has('sentence_completion')) return 'השלמת משפטים'
  if (types.has('multiple') && types.has('open')) return 'פתוחות וסגורות'
  if (types.has('list') || types.has('self_check')) return 'מגוונות'
  if (types.has('multiple')) return 'סגורות'
  if (types.has('open')) return 'פתוחות'
  return 'מותאם אישית'
}

export function mergeTrackCollections(baseTracks = [], questionTracks = [], { showEmptyLevels = true } = {}) {
  const merged = new Map()

  baseTracks.forEach(track => {
    const previous = merged.get(track.subject)
    merged.set(track.subject, {
      ...(previous?.levelsKind ? { levelsKind: previous.levelsKind } : {}),
      ...track,
      levels: [...(track.levels || [])],
      activities: [...(track.activities || ['practice'])],
    })
  })

  questionTracks.forEach(track => {
    const baseTrack = merged.get(track.subject)
    const questionLevels = [...(track.levels || [])]
    // נושא עם תתי-נושאים: שומרים על סדר ההגדרה ועל סוג החלוקה, ולא על מיון אלפביתי
    const keepsBaseOrder = baseTrack?.levelsKind === 'subtopic'
    let levels = questionLevels
    let activities = [...(track.activities || ['practice'])]
    if (baseTrack?.defined) {
      // נושא שהוגדר בניהול: הסדר שנקבע נשמר, ותתי-נושאים ריקים לא נעלמים אחרי השאלה הראשונה
      levels = [
        ...baseTrack.levels.filter(level => showEmptyLevels || questionLevels.includes(level)),
        ...questionLevels.filter(level => !baseTrack.levels.includes(level)),
      ]
      activities = [...new Set([...baseTrack.activities, ...activities])].sort()
    } else if (keepsBaseOrder) {
      levels = [
        ...baseTrack.levels.filter(level => questionLevels.includes(level)),
        ...questionLevels.filter(level => !baseTrack.levels.includes(level)),
      ]
    }

    merged.set(track.subject, {
      ...track,
      ...(baseTrack?.levelsKind ? { levelsKind: baseTrack.levelsKind } : {}),
      levels,
      activities,
    })
  })

  return [...merged.values()].sort((first, second) => first.subject.localeCompare(second.subject, 'he'))
}

export function normalizeQuestionSubjects(items) {
  let changed = false

  const normalized = items.map(question => {
    const normalizedSubject = normalizeSubjectName(question.subject)
    if (normalizedSubject === question.subject) return question
    changed = true
    return { ...question, subject: normalizedSubject }
  })

  return { normalized, changed }
}

export function normalizeQuestionGroupTitles(items) {
  const normalized = normalizeImportedQuestionStructure(items)
  const changed = normalized.length !== items.length
    || normalized.some((question, index) => {
      const original = items[index]
      return !original
        || original.id !== question.id
        || original.text !== question.text
        || (original.groupTitle || '') !== (question.groupTitle || '')
    })

  return { normalized, changed }
}

export function cloneQuestionForTarget(question, target, existingQuestions) {
  const relatedQuestions = existingQuestions.filter(existing => {
    return existing.grade === target.grade
      && existing.subject === target.subject
      && (existing.level || null) === (target.level || null)
      && existing.activityType === target.activityType
  })

  const nextPosition = relatedQuestions.length > 0
    ? Math.max(...relatedQuestions.map(item => item.position || 0)) + 1
    : 1

  return {
    ...question,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    grade: target.grade,
    subject: target.subject,
    level: target.level || null,
    activityType: target.activityType,
    position: nextPosition,
  }
}

export function getQuizProgressKey({ userId, grade, subject, level = null, activityType = 'practice' }) {
  return [userId, grade, subject, level || 'no-level', activityType].join('::')
}

export function getQuestionCountForSelection(questions, selection) {
  return questions.filter(question => {
    return question.grade === selection.grade
      && question.subject === selection.subject
      && (question.level || null) === (selection.level || null)
      && question.activityType === selection.activityType
  }).length
}

export function shuffleItems(items) {
  const nextItems = [...items]

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]]
  }

  return nextItems
}

export function getExamTimeLimitSeconds(subject, activityType) {
  if (activityType !== 'exam') return null
  return subject === GENERAL_EXAM_SUBJECT ? GENERAL_EXAM_TIME_LIMIT_SECONDS : STANDARD_EXAM_TIME_LIMIT_SECONDS
}

// מסיר את שדה הסיסמה לפני שמירת המשתמש במצב הלקוח - הסיסמה נחוצה רק בשכבת השרת המדומה
export function sanitizeUser(user) {
  if (!user) return user
  const { password, ...sanitized } = user
  return sanitized
}

export const SYNC_FAILED_MESSAGE = 'לא הצלחנו לשמור את השינוי בשרת. הנתונים נטענו מחדש, נסו שוב.'
export const SAVE_CONCURRENCY = 5

// מריץ את הפעולות בקבוצות קטנות במקביל, כדי שעדכון של מאות שאלות לא יפתח מאות בקשות בבת אחת
export async function runInBatches(tasks) {
  let allOk = true
  for (let index = 0; index < tasks.length; index += SAVE_CONCURRENCY) {
    const results = await Promise.all(tasks.slice(index, index + SAVE_CONCURRENCY).map(task => task()))
    if (results.some(result => !result.ok)) allOk = false
  }
  return allOk
}

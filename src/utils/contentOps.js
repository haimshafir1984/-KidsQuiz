// פעולות על נושאים ותתי-נושאים במסך העץ. טהורות: מקבלות { questions, customTracks, trackCatalog }
// ומחזירות { questions?, tracks? } לשמירה (או { error }).
//
// trackCatalog הוא העץ כפי שהמנהל רואה אותו (מהקוד, מהשאלות ומהניהול). customTracks הוא רק מה שנשמר בניהול.
// כשמשנים משהו בנושא, נשמרת לו הגדרה ב-customTracks והיא גוברת על ההגדרה מהקוד.

import { BASE_VISIBLE_TRACKS, GENERAL_EXAM_SUBJECT } from '../data/learningTracks'
import {
  deletePlaces, getPlacements, linkTopicToGrade, moveDirectQuestionsToSubtopic,
  renameSubtopicPlaces, renameTopicPlaces,
} from './placements'

const HOLLAND_SUBJECT = 'שאלון הולנד'
// נושאים מיוחדים של המערכת: אי אפשר ליצור, לשנות או להוסיף להם שאלות
export const SYSTEM_SUBJECTS = new Set([GENERAL_EXAM_SUBJECT, HOLLAND_SUBJECT])
const NAME_LIMIT = 100

const findInCatalog = (trackCatalog, grade, subject) => (trackCatalog[grade] || []).find(track => track.subject === subject)
const isBuiltIn = (grade, subject) => (BASE_VISIBLE_TRACKS[grade] || []).some(track => track.subject === subject)

function definitionFrom(source, subject) {
  return {
    id: `track-${subject}`,
    subject,
    questionTypes: source?.questionTypes || 'מותאם אישית',
    levels: [...(source?.levels || [])],
    activities: source?.activities?.length ? [...source.activities] : ['practice'],
    ...(source?.levelsKind ? { levelsKind: source.levelsKind } : {}),
  }
}

const hiddenEntry = subject => ({ id: `track-${subject}`, subject, questionTypes: 'מוסתר', levels: [], activities: ['practice'], hidden: true })

// מחליף או מוסיף הגדרה לנושא; entry=null מסיר
function setDefinition(tracks, grade, subject, entry) {
  const others = (tracks[grade] || []).filter(track => track.subject !== subject)
  return { ...tracks, [grade]: entry ? [...others, entry] : others }
}

function checkName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return { error: 'יש להזין שם.' }
  if (trimmed.length > NAME_LIMIT) return { error: 'השם ארוך מדי (עד 100 תווים).' }
  return { name: trimmed }
}

export function addTopic({ customTracks, trackCatalog }, grade, rawName) {
  const { name, error } = checkName(rawName)
  if (error) return { error }
  if (SYSTEM_SUBJECTS.has(name) || findInCatalog(trackCatalog, grade, name)) return { error: 'כבר קיים נושא בשם הזה בקטגוריה.' }
  return { tracks: setDefinition(customTracks, grade, name, definitionFrom(null, name)), name }
}

export function renameTopic({ questions, customTracks, trackCatalog }, grade, subject, rawName) {
  const { name, error } = checkName(rawName)
  if (error) return { error }
  if (name === subject) return {}
  if (SYSTEM_SUBJECTS.has(name) || findInCatalog(trackCatalog, grade, name)) return { error: 'כבר קיים נושא בשם הזה בקטגוריה.' }
  const definition = definitionFrom(findInCatalog(trackCatalog, grade, subject), name)
  let tracks = setDefinition(customTracks, grade, subject, isBuiltIn(grade, subject) ? hiddenEntry(subject) : null)
  tracks = setDefinition(tracks, grade, name, definition)
  return { questions: renameTopicPlaces(questions, grade, subject, name), tracks, name }
}

export function deleteTopic({ questions, customTracks }, grade, subject) {
  const result = deletePlaces(questions, grade, subject)
  const tracks = setDefinition(customTracks, grade, subject, isBuiltIn(grade, subject) ? hiddenEntry(subject) : null)
  return { questions: result.questions, tracks, removedCount: result.removedIds.length, unlinkedCount: result.unlinked }
}

function saveLevels({ customTracks, trackCatalog }, grade, subject, levels, extra = {}) {
  const definition = { ...definitionFrom(findInCatalog(trackCatalog, grade, subject), subject), ...extra, levels }
  return setDefinition(customTracks, grade, subject, definition)
}

export function addSubtopic(state, grade, subject, rawName) {
  const { name, error } = checkName(rawName)
  if (error) return { error }
  const current = findInCatalog(state.trackCatalog, grade, subject)
  if (!current) return { error: 'הנושא לא נמצא.' }
  if (current.levels.includes(name)) return { error: 'כבר קיים תת-נושא בשם הזה.' }
  const isFirst = current.levels.length === 0
  const tracks = saveLevels(state, grade, subject, [...current.levels, name], isFirst ? { levelsKind: 'subtopic' } : {})
  if (!isFirst) return { tracks, name }
  const questions = moveDirectQuestionsToSubtopic(state.questions, grade, subject, name)
  const movedCount = questions.filter((question, index) => question !== state.questions[index]).length
  return { tracks, questions, movedCount, name }
}

export function renameSubtopic(state, grade, subject, level, rawName) {
  const { name, error } = checkName(rawName)
  if (error) return { error }
  if (name === level) return {}
  const current = findInCatalog(state.trackCatalog, grade, subject)
  if (current?.levels.includes(name)) return { error: 'כבר קיים תת-נושא בשם הזה.' }
  const levels = (current?.levels || []).map(item => (item === level ? name : item))
  return {
    questions: renameSubtopicPlaces(state.questions, grade, subject, level, name),
    tracks: saveLevels(state, grade, subject, levels),
    name,
  }
}

export function moveSubtopic(state, grade, subject, level, direction) {
  const levels = [...(findInCatalog(state.trackCatalog, grade, subject)?.levels || [])]
  const index = levels.indexOf(level)
  const target = index + (direction === 'up' ? -1 : 1)
  if (index === -1 || target < 0 || target >= levels.length) return {}
  ;[levels[index], levels[target]] = [levels[target], levels[index]]
  // סדר שנקבע ידנית נשמר כמו שהוא, גם אצל התלמידים
  return { tracks: saveLevels(state, grade, subject, levels) }
}

// level === null: השאלות שבלי תת-נושא
export function deleteSubtopic(state, grade, subject, level) {
  const result = deletePlaces(state.questions, grade, subject, level)
  const output = { questions: result.questions, removedCount: result.removedIds.length, unlinkedCount: result.unlinked }
  if (level === null) return output
  const levels = (findInCatalog(state.trackCatalog, grade, subject)?.levels || []).filter(item => item !== level)
  return { ...output, tracks: saveLevels(state, grade, subject, levels) }
}

export function assignTopicToGrade({ questions, customTracks, trackCatalog }, sourceGrade, subject, targetGrade, includeQuestions) {
  const source = findInCatalog(trackCatalog, sourceGrade, subject)
  if (!source || sourceGrade === targetGrade) return { error: 'לא ניתן לשייך את הנושא לקטגוריה הזו.' }
  const target = findInCatalog(trackCatalog, targetGrade, subject)
  const output = {}
  if (!target) output.tracks = setDefinition(customTracks, targetGrade, subject, definitionFrom(source, subject))

  let added = 0
  if (includeQuestions) {
    // מי שכבר העתיק את הנושא בעבר: שאלה עם אותו נוסח שכבר נמצאת ביעד לא תופיע פעמיים
    const existing = new Set(questions.flatMap(question => getPlacements(question)
      .filter(place => place.grade === targetGrade && place.subject === subject)
      .map(place => JSON.stringify([place.level, question.text.trim()]))))
    // מעבירים את כל הרשימה, כדי שהמיקומים ביעד ימשיכו אחרי השאלות שכבר שם
    const linked = linkTopicToGrade(questions, sourceGrade, subject, targetGrade,
      (question, place) => existing.has(JSON.stringify([place.level, question.text.trim()])))
    added = linked.added
    if (added > 0) output.questions = linked.questions
  }

  if (!output.tracks && !output.questions) return { error: 'לא בוצע שינוי: הנושא והשאלות כבר קיימים בקטגוריה הזו.' }
  return { ...output, added, createdTopic: Boolean(output.tracks) }
}

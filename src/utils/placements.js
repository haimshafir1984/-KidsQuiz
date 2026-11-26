// שאלה יכולה להופיע בכמה מקומות (קטגוריה + נושא + תת-נושא). כל הפעולות כאן טהורות:
// מקבלות רשימת שאלות ומחזירות רשימה חדשה, ושאלה שלא השתנתה נשארת אותו אובייקט (כדי שרק מה שהשתנה יישלח לשרת).
//
// שאלה במקום אחד נשמרת כמו תמיד (grade, subject, level, activityType, position), בלי שדה placements.
// שאלה בכמה מקומות: placements הוא הרשימה המלאה, והמקום הראשון משוכפל לשדות הרגילים.

const PLACE_FIELDS = ['grade', 'subject', 'level', 'activityType', 'position']

export function normalizePlacement(place) {
  return {
    grade: place.grade,
    subject: place.subject,
    level: place.level || null,
    activityType: place.activityType || 'practice',
    position: Number.isFinite(place.position) && place.position > 0 ? place.position : null,
  }
}

// מקום מזוהה בלי סוג הפעילות: שאלה מופיעה במקום פעם אחת
export function placeKey(place) {
  return JSON.stringify([place.grade, place.subject, place.level || null])
}

// קבוצת המיון: אותו מקום ואותה פעילות
export function groupKey(place) {
  return JSON.stringify([place.grade, place.subject, place.level || null, place.activityType || 'practice'])
}

export function getPlacements(question) {
  if (Array.isArray(question.placements) && question.placements.length > 0) return question.placements.map(normalizePlacement)
  return [normalizePlacement(question)]
}

export function findPlacement(question, key) {
  return getPlacements(question).find(place => placeKey(place) === key) || null
}

export function withPlacements(question, places) {
  const unique = new Map()
  places.map(normalizePlacement).forEach(place => {
    if (!unique.has(placeKey(place))) unique.set(placeKey(place), place)
  })
  const list = [...unique.values()]
  if (list.length === 0) throw new Error('שאלה חייבת להופיע לפחות במקום אחד')

  const { placements: _previous, ...rest } = question
  const next = { ...rest }
  PLACE_FIELDS.forEach(field => { next[field] = list[0][field] })
  if (next.position === null) delete next.position
  if (list.length > 1) next.placements = list
  return next
}

// לצד התלמיד: "עותק תצוגה" לכל מקום, עם אותו מזהה. שאלה במקום אחד מוחזרת כמו שהיא
export function expandPlacements(questions) {
  return questions.flatMap(question => {
    if (!Array.isArray(question.placements) || question.placements.length < 2) return [question]
    const { placements: _all, ...rest } = question
    return getPlacements(question).map(place => ({ ...rest, ...place }))
  })
}

export function uniqueById(questions) {
  return [...new Map(questions.map(question => [question.id, question])).values()]
}

// השאלות שבקבוצה, לפי הסדר, כל אחת עם המקום הרלוונטי
export function questionsInGroup(questions, group) {
  const key = groupKey(group)
  return questions
    .map(question => ({ question, place: getPlacements(question).find(place => groupKey(place) === key) }))
    .filter(entry => entry.place)
    .sort((first, second) => ((first.place.position || 0) - (second.place.position || 0)) || String(first.question.id).localeCompare(String(second.question.id)))
}

export function nextPosition(questions, group, excludeId = null) {
  const positions = questionsInGroup(questions, group)
    .filter(entry => entry.question.id !== excludeId)
    .map(entry => entry.place.position || 0)
  return positions.length > 0 ? Math.max(...positions) + 1 : 1
}

function replaceQuestion(questions, id, build) {
  return questions.map(question => (question.id === id ? build(question) : question))
}

function replacePlace(question, key, nextPlace) {
  return withPlacements(question, getPlacements(question).map(place => (placeKey(place) === key ? nextPlace : place)))
}

// שיוך שאלות למקומות נוספים. מקום שהשאלה כבר מופיעה בו נשאר בלי שינוי
export function addPlacements(questions, ids, targets, activityType = 'practice') {
  let next = questions
  let added = 0
  ids.forEach(id => {
    targets.forEach(target => {
      const question = next.find(item => item.id === id)
      if (!question || findPlacement(question, placeKey(target))) return
      const place = { ...target, activityType: target.activityType || activityType }
      place.position = nextPosition(next, place, id)
      next = replaceQuestion(next, id, item => withPlacements(item, [...getPlacements(item), place]))
      added += 1
    })
  })
  return { questions: next, added }
}

// הסרה ממקום אחד. שאלה שזה המקום היחיד שלה נמחקת
export function removeFromPlace(questions, id, key) {
  const question = questions.find(item => item.id === id)
  if (!question || !findPlacement(question, key)) return questions
  const remaining = getPlacements(question).filter(place => placeKey(place) !== key)
  if (remaining.length === 0) return questions.filter(item => item.id !== id)
  return replaceQuestion(questions, id, item => withPlacements(item, remaining))
}

// העברה ממקום למקום (בסוף הרשימה החדשה). אם השאלה כבר ביעד, רק מוסרת מהמקור
export function movePlacement(questions, id, fromKey, target) {
  const question = questions.find(item => item.id === id)
  const current = question && findPlacement(question, fromKey)
  if (!current || placeKey(target) === fromKey) return questions
  if (findPlacement(question, placeKey(target))) return removeFromPlace(questions, id, fromKey)
  const place = { grade: target.grade, subject: target.subject, level: target.level || null, activityType: current.activityType }
  place.position = nextPosition(questions, place, id)
  return replaceQuestion(questions, id, item => replacePlace(item, fromKey, place))
}

export function setPlacementActivity(questions, id, key, activityType) {
  const question = questions.find(item => item.id === id)
  const current = question && findPlacement(question, key)
  if (!current || current.activityType === activityType) return questions
  const place = { ...current, activityType }
  place.position = nextPosition(questions, place, id)
  return replaceQuestion(questions, id, item => replacePlace(item, key, place))
}

// הזזה למקום מספר toIndex (מ-0) בתוך הקבוצה. ממספרים מחדש את כל הקבוצה, כך שגם מיקומים כפולים מסתדרים
export function reorderInGroup(questions, group, id, toIndex) {
  const ordered = questionsInGroup(questions, group)
  const from = ordered.findIndex(entry => entry.question.id === id)
  if (from === -1 || toIndex < 0 || toIndex >= ordered.length) return questions
  const [moved] = ordered.splice(from, 1)
  ordered.splice(toIndex, 0, moved)

  const changes = new Map()
  ordered.forEach((entry, index) => {
    if (entry.place.position !== index + 1) changes.set(entry.question.id, { ...entry.place, position: index + 1 })
  })
  return questions.map(question => {
    const place = changes.get(question.id)
    return place ? replacePlace(question, placeKey(place), place) : question
  })
}

// שמירת שאלה מהעורך (חדשה או קיימת). places: כל המקומות; position ריק = בסוף, ולמקום קיים נשאר כמו שהיה.
// requestedIndex (מ-1) במקום מסוים מזיז את השאלה לשם
export function upsertQuestion(questions, draft, places, createId) {
  const id = draft.id || createId()
  const existing = questions.find(question => question.id === id)
  const resolved = places.map(place => {
    const previous = existing && findPlacement(existing, placeKey(place))
    const sameGroup = previous && groupKey(previous) === groupKey(place)
    return {
      ...place,
      position: sameGroup && previous.position ? previous.position : nextPosition(questions, place, id),
    }
  })
  const { requestedIndex: _ignored, placements: _old, ...fields } = draft
  const saved = withPlacements({ ...fields, id }, resolved)
  let next = existing ? replaceQuestion(questions, id, () => saved) : [...questions, saved]

  places.forEach((place, index) => {
    const wanted = Number(place.requestedIndex)
    if (!Number.isFinite(wanted) || wanted < 1) return
    const size = questionsInGroup(next, resolved[index]).length
    next = reorderInGroup(next, resolved[index], id, Math.min(Math.floor(wanted), size) - 1)
  })

  return { questions: next, id }
}

// ───── פעולות על נושאים ותתי-נושאים ─────

// מעדכן את כל המקומות שמתאימים. transform מחזיר מקום חדש, או null להסרה
function mapPlaces(questions, matches, transform) {
  const removedIds = []
  let unlinked = 0
  const next = []
  questions.forEach(original => {
    const places = getPlacements(original)
    if (!places.some(matches)) {
      next.push(original)
      return
    }
    const mapped = places.map(place => (matches(place) ? transform(place) : place)).filter(Boolean)
    if (mapped.length === 0) {
      removedIds.push(original.id)
      return
    }
    if (mapped.length < places.length) unlinked += 1
    next.push(withPlacements(original, mapped))
  })
  return { questions: next, removedIds, unlinked }
}

export function renameTopicPlaces(questions, grade, subject, nextSubject) {
  return mapPlaces(
    questions,
    place => place.grade === grade && place.subject === subject,
    place => ({ ...place, subject: nextSubject }),
  ).questions
}

export function renameSubtopicPlaces(questions, grade, subject, level, nextLevel) {
  return mapPlaces(
    questions,
    place => place.grade === grade && place.subject === subject && place.level === level,
    place => ({ ...place, level: nextLevel }),
  ).questions
}

// מחיקת נושא (level לא מוגדר) או תת-נושא. שאלה משותפת נשארת במקומות האחרים שלה
export function deletePlaces(questions, grade, subject, level) {
  return mapPlaces(
    questions,
    place => place.grade === grade && place.subject === subject && (level === undefined || place.level === (level || null)),
    () => null,
  )
}

// כשמוסיפים תת-נושא ראשון: השאלות שהיו ישירות בנושא עוברות אליו, כדי שלא ייעלמו
export function moveDirectQuestionsToSubtopic(questions, grade, subject, level) {
  return mapPlaces(
    questions,
    place => place.grade === grade && place.subject === subject && !place.level,
    place => ({ ...place, level }),
  ).questions
}

// שיוך כל שאלות הנושא לקטגוריה נוספת (אותן שאלות, מקושרות)
export function linkTopicToGrade(questions, sourceGrade, subject, targetGrade, skip = () => false) {
  let next = questions
  let added = 0
  const entries = questions.flatMap(question => getPlacements(question)
    .filter(place => place.grade === sourceGrade && place.subject === subject)
    .map(place => ({ id: question.id, place })))
  entries.sort((first, second) => (first.place.position || 0) - (second.place.position || 0))
  entries.forEach(({ id, place }) => {
    if (skip(next.find(question => question.id === id), place)) return
    const result = addPlacements(next, [id], [{ grade: targetGrade, subject, level: place.level, activityType: place.activityType }])
    next = result.questions
    added += result.added
  })
  return { questions: next, added }
}

// מבנה העץ במסך הניהול. טהור: נבנה מקטלוג הנושאים ומרשימת השאלות.
// צומת נבחר: {} = כל השאלות; { grade } = קטגוריה; { grade, subject } = נושא;
// { grade, subject, level } = תת-נושא (level: null = השאלות שבלי תת-נושא)
import { GRADES, getGradeConfig } from '../../../data/learningTracks'
import { SYSTEM_SUBJECTS } from '../../../utils/contentOps'
import { getPlacements, placeKey } from '../../../utils/placements'

export const NO_LEVEL_LABEL = 'ללא תת-נושא'

export const hasLevelKey = node => Object.prototype.hasOwnProperty.call(node, 'level')
export const nodeId = node => JSON.stringify([node.grade ?? '', node.subject ?? '', hasLevelKey(node) ? { level: node.level } : ''])

export function placeMatches(place, node) {
  if (node.grade && place.grade !== node.grade) return false
  if (node.subject && place.subject !== node.subject) return false
  if (hasLevelKey(node) && place.level !== node.level) return false
  return true
}

export function buildTree(trackCatalog, questions) {
  // ספירה ייחודית לכל צומת: שאלה שמופיעה בשני תתי-נושאים נספרת פעם אחת בנושא
  const counts = new Map()
  const withoutLevel = new Set()
  const add = (node, id) => {
    const key = nodeId(node)
    if (!counts.has(key)) counts.set(key, new Set())
    counts.get(key).add(id)
  }
  questions.forEach(question => getPlacements(question).forEach(place => {
    add({}, question.id)
    add({ grade: place.grade }, question.id)
    add({ grade: place.grade, subject: place.subject }, question.id)
    add({ grade: place.grade, subject: place.subject, level: place.level }, question.id)
    if (!place.level) withoutLevel.add(JSON.stringify([place.grade, place.subject]))
  }))
  const countOf = node => counts.get(nodeId(node))?.size || 0

  return {
    total: countOf({}),
    grades: GRADES.map(grade => ({
      grade: grade.value,
      label: grade.label,
      count: countOf({ grade: grade.value }),
      topics: (trackCatalog[grade.value] || [])
        .filter(track => !SYSTEM_SUBJECTS.has(track.subject) || countOf({ grade: grade.value, subject: track.subject }) > 0)
        .map(track => {
          const base = { grade: grade.value, subject: track.subject }
          const levels = track.levels || []
          const hasDirect = levels.length > 0 && withoutLevel.has(JSON.stringify([grade.value, track.subject]))
          return {
            ...base,
            track,
            count: countOf(base),
            subtopics: [
              ...(hasDirect ? [{ ...base, level: null, label: NO_LEVEL_LABEL, count: countOf({ ...base, level: null }) }] : []),
              ...levels.map(level => ({ ...base, level, label: level, count: countOf({ ...base, level }) })),
            ],
          }
        }),
    })),
  }
}

export function findTopic(tree, grade, subject) {
  return tree.grades.find(item => item.grade === grade)?.topics.find(item => item.subject === subject) || null
}

// אם הצומת הנבחר נעלם (נמחק או שונה שמו), חוזרים להורה הקרוב
export function resolveNode(tree, node) {
  if (!node.grade || !tree.grades.some(item => item.grade === node.grade)) return {}
  if (!node.subject) return { grade: node.grade }
  const topic = findTopic(tree, node.grade, node.subject)
  if (!topic) return { grade: node.grade }
  if (hasLevelKey(node)) {
    return topic.subtopics.some(item => item.level === node.level) ? node : { grade: node.grade, subject: node.subject }
  }
  return node
}

// המקום שאפשר לשים בו שאלה: תת-נושא, או נושא בלי תתי-נושאים. אחרת null
export function leafPlace(tree, node) {
  if (!node.subject || SYSTEM_SUBJECTS.has(node.subject)) return null
  const topic = findTopic(tree, node.grade, node.subject)
  if (!topic) return null
  if (hasLevelKey(node)) return { grade: node.grade, subject: node.subject, level: node.level }
  return topic.subtopics.length === 0 ? { grade: node.grade, subject: node.subject, level: null } : null
}

// כל המקומות שאפשר לשייך אליהם, לפי קטגוריה ונושא
export function assignableGroups(tree) {
  return tree.grades.map(grade => ({
    grade: grade.grade,
    label: grade.label,
    topics: grade.topics
      .filter(topic => !SYSTEM_SUBJECTS.has(topic.subject))
      .map(topic => ({
        subject: topic.subject,
        places: topic.subtopics.length === 0
          ? [{ grade: grade.grade, subject: topic.subject, level: null, label: topic.subject }]
          : topic.subtopics.filter(item => item.level !== null).map(item => ({ grade: grade.grade, subject: topic.subject, level: item.level, label: item.level })),
      })),
  }))
}

export function describePlace(place) {
  return [getGradeConfig(place.grade)?.label || place.grade, place.subject, place.level].filter(Boolean).join(' › ')
}

// השאלות שבצומת. place הוא המקום שאליו מתייחסות הפעולות בשורה (null כשיש כמה מקומות בתוך הצומת)
export function entriesAt(questions, node) {
  return questions.flatMap(question => {
    const places = getPlacements(question)
    const matches = places.filter(place => placeMatches(place, node))
    if (matches.length === 0) return []
    return [{ question, places, matches, place: matches.length === 1 ? matches[0] : null }]
  })
}

export function filterEntries(entries, { search = '', activity = 'all' }) {
  const needle = search.trim().toLowerCase()
  return entries.filter(entry => {
    if (activity !== 'all' && !entry.matches.some(place => place.activityType === activity)) return false
    if (!needle) return true
    return entry.question.text.toLowerCase().includes(needle)
      || (entry.question.correct_answer || []).some(answer => String(answer).toLowerCase().includes(needle))
  })
}

// לפי הסדר שבעץ: קטגוריה, נושא, תת-נושא, פעילות ואז מיקום
export function sortEntries(tree, entries, node) {
  const rank = new Map()
  let counter = 0
  tree.grades.forEach(grade => grade.topics.forEach(topic => {
    const leaves = topic.subtopics.length > 0 ? topic.subtopics : [{ grade: topic.grade, subject: topic.subject, level: null }]
    leaves.forEach(leaf => { rank.set(placeKey(leaf), counter); counter += 1 })
  }))
  const keyOf = entry => {
    const place = entry.matches[0]
    return [rank.get(placeKey(place)) ?? counter, place.activityType === 'exam' ? 1 : 0, place.position || 0]
  }
  return [...entries].sort((first, second) => {
    const a = keyOf(first)
    const b = keyOf(second)
    if (hasLevelKey(node) || leafPlace(tree, node)) return (a[1] - b[1]) || (a[2] - b[2]) || String(first.question.id).localeCompare(String(second.question.id))
    return (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]) || String(first.question.id).localeCompare(String(second.question.id))
  })
}

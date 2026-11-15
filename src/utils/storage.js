import { GRADES } from '../data/learningTracks'

const KEYS = {
  CURRENT_USER: 'kq_current_user',
  QUESTIONS: 'kq_questions',
  TRACKS: 'kq_tracks',
  QUIZ_PROGRESS: 'kq_quiz_progress',
}

function getTrackDefaults() {
  return Object.fromEntries(GRADES.map(grade => [grade.value, []]))
}

// קריאה בטוחה מ-localStorage: מגנה מפני JSON פגום כדי שהאפליקציה לא תקרוס בטעינה
function safeParse(raw, fallback) {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

// כתיבה בטוחה ל-localStorage: מחזירה false כשנגמר מקום האחסון (QuotaExceededError) במקום לזרוק בשקט
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function getQuestions() {
  return safeParse(localStorage.getItem(KEYS.QUESTIONS), null)
}

export function saveQuestions(questions) {
  return safeSetItem(KEYS.QUESTIONS, questions)
}

export function getCustomTracks() {
  const parsed = safeParse(localStorage.getItem(KEYS.TRACKS), null)
  return parsed ? { ...getTrackDefaults(), ...parsed } : getTrackDefaults()
}

export function saveCustomTracks(tracks) {
  return safeSetItem(KEYS.TRACKS, tracks)
}

export function getQuizProgressMap() {
  return safeParse(localStorage.getItem(KEYS.QUIZ_PROGRESS), {})
}

export function saveQuizProgressMap(progressMap) {
  return safeSetItem(KEYS.QUIZ_PROGRESS, progressMap)
}

export function getCurrentUser() {
  return safeParse(localStorage.getItem(KEYS.CURRENT_USER), null)
}

export function setCurrentUser(user) {
  if (user) {
    return safeSetItem(KEYS.CURRENT_USER, user)
  }

  try {
    localStorage.removeItem(KEYS.CURRENT_USER)
    return true
  } catch {
    return false
  }
}

export function getSchemaVersion() {
  const raw = localStorage.getItem(KEYS.SCHEMA_VERSION)
  const parsed = raw ? Number(raw) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

export function setSchemaVersion(version) {
  try {
    localStorage.setItem(KEYS.SCHEMA_VERSION, String(version))
    return true
  } catch {
    return false
  }
}

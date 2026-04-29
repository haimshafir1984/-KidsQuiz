import { GRADES } from '../data/learningTracks'

const KEYS = {
  USERS: 'kq_users',
  CURRENT_USER: 'kq_current_user',
  QUESTIONS: 'kq_questions',
  TRACKS: 'kq_tracks',
  QUIZ_PROGRESS: 'kq_quiz_progress',
}

function getTrackDefaults() {
  return Object.fromEntries(GRADES.map(grade => [grade.value, []]))
}

export function getQuestions() {
  const raw = localStorage.getItem(KEYS.QUESTIONS)
  return raw ? JSON.parse(raw) : null
}

export function saveQuestions(questions) {
  localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions))
}

export function getCustomTracks() {
  const raw = localStorage.getItem(KEYS.TRACKS)
  return raw ? { ...getTrackDefaults(), ...JSON.parse(raw) } : getTrackDefaults()
}

export function saveCustomTracks(tracks) {
  localStorage.setItem(KEYS.TRACKS, JSON.stringify(tracks))
}

export function getQuizProgressMap() {
  const raw = localStorage.getItem(KEYS.QUIZ_PROGRESS)
  return raw ? JSON.parse(raw) : {}
}

export function saveQuizProgressMap(progressMap) {
  localStorage.setItem(KEYS.QUIZ_PROGRESS, JSON.stringify(progressMap))
}

export function getUsers() {
  const raw = localStorage.getItem(KEYS.USERS)
  return raw ? JSON.parse(raw) : []
}

export function saveUsers(users) {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users))
}

export function getCurrentUser() {
  const raw = localStorage.getItem(KEYS.CURRENT_USER)
  return raw ? JSON.parse(raw) : null
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user))
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER)
  }
}

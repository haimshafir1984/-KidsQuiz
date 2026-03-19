import { getCatalogTracksForGrade, HOLLAND_TRACK, SUBJECT_TONES } from './subjectCatalog'

export const GRADES = [
  {
    value: 'grade-8',
    label: 'כיתה ח׳',
    shortLabel: 'ח׳',
    description: 'מסלול יסודי-מתקדם עם תרגול שפה, חשיבה, יהדות וכישורי למידה.',
    emoji: '📘',
    tone: 'bg-emerald-50 text-emerald-600',
    hover: 'hover:border-emerald-300',
  },
  {
    value: 'grade-12',
    label: 'כיתה י״ב',
    shortLabel: 'י״ב',
    description: 'מסלול בוגר וממוקד עם תרגול, מבחנים ולמידה לקראת יעדים מתקדמים.',
    emoji: '🎓',
    tone: 'bg-sky-50 text-sky-600',
    hover: 'hover:border-sky-300',
  },
  {
    value: 'thinking-challenge',
    label: 'אתגר מחשבתי',
    shortLabel: 'אתגר',
    description: 'מרחב גמיש לאתגרי חשיבה, שאלות פתוחות, אמריקאיות והשלמת משפטים בכל מבנה שתרצו.',
    emoji: '🧩',
    tone: 'bg-amber-50 text-amber-700',
    hover: 'hover:border-amber-300',
  },
]

export const LEARNING_TRACKS = {
  'grade-8': [],
  'grade-12': [],
  'thinking-challenge': [],
}

export const TEMP_IMPORTED_TRACKS = {
  'grade-8': getCatalogTracksForGrade('grade-8'),
  'grade-12': getCatalogTracksForGrade('grade-12'),
  'thinking-challenge': [],
}

export const BASE_VISIBLE_TRACKS = {
  'grade-8': [
    ...TEMP_IMPORTED_TRACKS['grade-8'],
    { subject: HOLLAND_TRACK.label, questionTypes: HOLLAND_TRACK.questionTypes, levels: [], activities: ['practice'] },
  ],
  'grade-12': [
    ...TEMP_IMPORTED_TRACKS['grade-12'],
    { subject: HOLLAND_TRACK.label, questionTypes: HOLLAND_TRACK.questionTypes, levels: [], activities: ['practice'] },
  ],
  'thinking-challenge': [],
}

export { SUBJECT_TONES }

export function getGradeConfig(grade) {
  return GRADES.find(item => item.value === grade) || null
}

export function getTracksForGrade(grade) {
  return BASE_VISIBLE_TRACKS[grade] || []
}

export function getTrack(grade, subject) {
  return getTracksForGrade(grade).find(track => track.subject === subject) || null
}

export function getLevelOptions(track) {
  return track?.levels?.length ? track.levels : ['ללא רמה']
}

export function getActivityLabel(activityType) {
  return activityType === 'exam' ? 'מבחן' : 'תרגול'
}

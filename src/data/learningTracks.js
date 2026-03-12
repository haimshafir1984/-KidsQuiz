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
]

export const LEARNING_TRACKS = {
  'grade-8': [
    { subject: 'ידע יהודי - תנ״ך', questionTypes: 'פתוחות וסגורות', levels: [], activities: ['practice'] },
    { subject: 'תפילה וברכות', questionTypes: 'פתוחות', levels: [], activities: ['practice'] },
    { subject: 'שבת', questionTypes: 'פתוחות', levels: [], activities: ['practice'] },
    { subject: 'מעגל השנה', questionTypes: 'פתוחות', levels: [], activities: ['practice'] },
    { subject: 'אינטליגנציה יהודית', questionTypes: 'פתוחות וסגורות', levels: [], activities: ['practice'] },
    { subject: 'אנלוגיות', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice'] },
    { subject: 'לשון', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice'] },
    { subject: 'הבעה והבנה', questionTypes: 'פתוחות וסגורות', levels: [], activities: ['practice'] },
    { subject: 'אוצר מילים', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
    { subject: 'הסקת מסקנות', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
    { subject: 'השלמת צורות', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice'] },
    { subject: 'מתמטיקה - היגיון', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
    { subject: 'סדרות מספרים', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice'] },
    { subject: 'אנגלית', questionTypes: 'סגורות ופתוחות', levels: ['רמה 1', 'רמה 2'], activities: ['practice'] },
    { subject: 'ראייה מרחבית', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
    { subject: 'אינטליגנציה כללית', questionTypes: 'סגורות ופתוחות', levels: [], activities: ['practice'] },
    { subject: 'שאלון אישי', questionTypes: 'שאלות פתוחות וסימון תשובה', levels: [], activities: ['practice'] },
  ],
  'grade-12': [
    { subject: 'פרקי אבות', questionTypes: 'פתוחות וגם מסוג זיווגי', levels: [], activities: ['practice'] },
    { subject: 'אנלוגיות', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2', 'רמה 3'], activities: ['practice', 'exam'] },
    { subject: 'לשון', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice', 'exam'] },
    { subject: 'הבעה והבנה', questionTypes: 'פתוחות וסגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice', 'exam'] },
    { subject: 'אוצר מילים', questionTypes: 'סגורות', levels: [], activities: ['practice', 'exam'] },
    { subject: 'הסקת מסקנות', questionTypes: 'סגורות', levels: [], activities: ['practice', 'exam'] },
    { subject: 'השלמת צורות', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice', 'exam'] },
    { subject: 'מטריצות', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice', 'exam'] },
    { subject: 'מתמטיקה - היגיון', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2', 'רמה 3'], activities: ['practice', 'exam'] },
    { subject: 'סדרות מספרים', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2', 'רמה 3'], activities: ['practice', 'exam'] },
    { subject: 'ידע כמותי', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2', 'רמה 3'], activities: ['practice', 'exam'] },
    { subject: 'גיאומטריה', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice', 'exam'] },
    { subject: 'אנגלית', questionTypes: 'סגורות ופתוחות', levels: ['רמה 1', 'רמה 2'], activities: ['practice', 'exam'] },
    { subject: 'שאלון הולנד', questionTypes: 'סימון תשובה', levels: [], activities: ['practice'] },
  ],
}

export const SUBJECT_TONES = {
  'ידע יהודי - תנ״ך': { tone: 'bg-amber-50 text-amber-600', hover: 'hover:border-amber-300', emoji: '📖' },
  'תפילה וברכות': { tone: 'bg-sky-50 text-sky-600', hover: 'hover:border-sky-300', emoji: '🙏' },
  'שבת': { tone: 'bg-violet-50 text-violet-600', hover: 'hover:border-violet-300', emoji: '🕯️' },
  'מעגל השנה': { tone: 'bg-rose-50 text-rose-600', hover: 'hover:border-rose-300', emoji: '🗓️' },
  'אינטליגנציה יהודית': { tone: 'bg-emerald-50 text-emerald-600', hover: 'hover:border-emerald-300', emoji: '🧠' },
  'אנלוגיות': { tone: 'bg-blue-50 text-blue-600', hover: 'hover:border-blue-300', emoji: '🔗' },
  'לשון': { tone: 'bg-indigo-50 text-indigo-600', hover: 'hover:border-indigo-300', emoji: '✍️' },
  'הבעה והבנה': { tone: 'bg-cyan-50 text-cyan-600', hover: 'hover:border-cyan-300', emoji: '💬' },
  'אוצר מילים': { tone: 'bg-fuchsia-50 text-fuchsia-600', hover: 'hover:border-fuchsia-300', emoji: '📝' },
  'הסקת מסקנות': { tone: 'bg-violet-50 text-violet-600', hover: 'hover:border-violet-300', emoji: '🔍' },
  'השלמת צורות': { tone: 'bg-orange-50 text-orange-600', hover: 'hover:border-orange-300', emoji: '🧩' },
  'מתמטיקה - היגיון': { tone: 'bg-slate-100 text-slate-700', hover: 'hover:border-slate-300', emoji: '➗' },
  'סדרות מספרים': { tone: 'bg-blue-50 text-blue-600', hover: 'hover:border-blue-300', emoji: '🔢' },
  'אנגלית': { tone: 'bg-emerald-50 text-emerald-600', hover: 'hover:border-emerald-300', emoji: '🇬🇧' },
  'ראייה מרחבית': { tone: 'bg-sky-50 text-sky-600', hover: 'hover:border-sky-300', emoji: '🧭' },
  'אינטליגנציה כללית': { tone: 'bg-amber-50 text-amber-600', hover: 'hover:border-amber-300', emoji: '🌐' },
  'שאלון אישי': { tone: 'bg-rose-50 text-rose-600', hover: 'hover:border-rose-300', emoji: '🪪' },
  'פרקי אבות': { tone: 'bg-amber-50 text-amber-600', hover: 'hover:border-amber-300', emoji: '📜' },
  'מטריצות': { tone: 'bg-indigo-50 text-indigo-600', hover: 'hover:border-indigo-300', emoji: '🔲' },
  'ידע כמותי': { tone: 'bg-cyan-50 text-cyan-600', hover: 'hover:border-cyan-300', emoji: '📊' },
  'גיאומטריה': { tone: 'bg-orange-50 text-orange-600', hover: 'hover:border-orange-300', emoji: '📐' },
  'שאלון הולנד': { tone: 'bg-rose-50 text-rose-600', hover: 'hover:border-rose-300', emoji: '🧭' },
}

export function getGradeConfig(grade) {
  return GRADES.find(item => item.value === grade) || null
}

export function getTracksForGrade(grade) {
  return LEARNING_TRACKS[grade] || []
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

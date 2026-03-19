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
  'grade-8': [
    { subject: 'נושא חדש - תנ"ך', questionTypes: 'פתוחות וסגורות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - פרקי אבות', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - מעגל השנה', questionTypes: 'פתוחות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - שבת', questionTypes: 'פתוחות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - תפילה וברכות', questionTypes: 'פתוחות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - דינים', questionTypes: 'פתוחות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - אינטליגנציה יהודית', questionTypes: 'פתוחות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - מילולי: אוצר מילים', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - מילולי: הבנת הנקרא', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - מילולי: השלמת משפטים', questionTypes: 'השלמת משפטים', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - מילולי: הסקת מסקנות', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - אינטליגנציה כללית', questionTypes: 'פתוחות וסגורות', levels: [], activities: ['practice'] },
    { subject: 'נושא חדש - מתמטיקה: סדרות מספרים', questionTypes: 'סגורות', levels: [], activities: ['practice'] },
  ],
  'grade-12': [
    { subject: 'נושא חדש - מילולי: אוצר מילים', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2', 'רמה 3'], activities: ['practice'] },
    { subject: 'נושא חדש - מילולי: הבנת הנקרא', questionTypes: 'סגורות', levels: ['רמה 1'], activities: ['practice'] },
    { subject: 'נושא חדש - מילולי: השלמת משפטים', questionTypes: 'השלמת משפטים', levels: ['רמה 1', 'רמה 2', 'רמה 3'], activities: ['practice'] },
    { subject: 'נושא חדש - מילולי: הסקת מסקנות', questionTypes: 'סגורות', levels: ['רמה 1'], activities: ['practice'] },
    { subject: 'נושא חדש - אינטליגנציה כללית', questionTypes: 'פתוחות וסגורות', levels: ['רמה 1', 'רמה 2', 'רמה 3'], activities: ['practice'] },
    { subject: 'נושא חדש - מתמטיקה: סדרות מספרים', questionTypes: 'סגורות', levels: ['רמה 1', 'רמה 2'], activities: ['practice'] },
  ],
  'thinking-challenge': [],
}

export const BASE_VISIBLE_TRACKS = {
  'grade-8': [
    ...TEMP_IMPORTED_TRACKS['grade-8'],
    { subject: 'שאלון הולנד', questionTypes: 'שאלון דירוג אישיותי', levels: [], activities: ['practice'] },
  ],
  'grade-12': [
    ...TEMP_IMPORTED_TRACKS['grade-12'],
    { subject: 'שאלון הולנד', questionTypes: 'שאלון דירוג אישיותי', levels: [], activities: ['practice'] },
  ],
  'thinking-challenge': [],
}

export const SUBJECT_TONES = {
  'נושא חדש - תנ"ך': { tone: 'bg-amber-50 text-amber-600', hover: 'hover:border-amber-300', emoji: '📖' },
  'נושא חדש - פרקי אבות': { tone: 'bg-orange-50 text-orange-600', hover: 'hover:border-orange-300', emoji: '📜' },
  'נושא חדש - מעגל השנה': { tone: 'bg-rose-50 text-rose-600', hover: 'hover:border-rose-300', emoji: '🗓️' },
  'נושא חדש - שבת': { tone: 'bg-violet-50 text-violet-600', hover: 'hover:border-violet-300', emoji: '🕯️' },
  'נושא חדש - תפילה וברכות': { tone: 'bg-sky-50 text-sky-600', hover: 'hover:border-sky-300', emoji: '🙏' },
  'נושא חדש - דינים': { tone: 'bg-lime-50 text-lime-700', hover: 'hover:border-lime-300', emoji: '⚖️' },
  'נושא חדש - אינטליגנציה יהודית': { tone: 'bg-emerald-50 text-emerald-600', hover: 'hover:border-emerald-300', emoji: '🧠' },
  'נושא חדש - מילולי: אוצר מילים': { tone: 'bg-fuchsia-50 text-fuchsia-600', hover: 'hover:border-fuchsia-300', emoji: '📝' },
  'נושא חדש - מילולי: הבנת הנקרא': { tone: 'bg-cyan-50 text-cyan-600', hover: 'hover:border-cyan-300', emoji: '📚' },
  'נושא חדש - מילולי: השלמת משפטים': { tone: 'bg-blue-50 text-blue-600', hover: 'hover:border-blue-300', emoji: '✍️' },
  'נושא חדש - מילולי: הסקת מסקנות': { tone: 'bg-violet-50 text-violet-600', hover: 'hover:border-violet-300', emoji: '🔍' },
  'נושא חדש - אינטליגנציה כללית': { tone: 'bg-amber-50 text-amber-600', hover: 'hover:border-amber-300', emoji: '🌐' },
  'נושא חדש - מתמטיקה: סדרות מספרים': { tone: 'bg-slate-100 text-slate-700', hover: 'hover:border-slate-300', emoji: '🔢' },
  'שאלון הולנד': { tone: 'bg-rose-50 text-rose-600', hover: 'hover:border-rose-300', emoji: '🧭' },
}

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

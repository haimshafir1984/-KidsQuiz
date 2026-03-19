const BASE_SUBJECTS = {
  tanakh: {
    label: 'תנ"ך',
    aliases: [' תנ"ך'],
    questionTypes: 'פתוחות וסגורות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-amber-50 text-amber-600',
    hover: 'hover:border-amber-300',
    emoji: '📖',
  },
  pirkeiAvot: {
    label: 'פרקי אבות',
    aliases: [' פרקי אבות'],
    questionTypes: 'סגורות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-orange-50 text-orange-600',
    hover: 'hover:border-orange-300',
    emoji: '📜',
  },
  yearlyCycle: {
    label: 'מעגל השנה',
    aliases: [' מעגל השנה'],
    questionTypes: 'פתוחות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-rose-50 text-rose-600',
    hover: 'hover:border-rose-300',
    emoji: '🗓️',
  },
  shabbat: {
    label: 'שבת',
    aliases: [' שבת'],
    questionTypes: 'פתוחות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-violet-50 text-violet-600',
    hover: 'hover:border-violet-300',
    emoji: '🕯️',
  },
  prayerBlessings: {
    label: 'תפילה וברכות',
    aliases: [' תפילה וברכות'],
    questionTypes: 'פתוחות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-sky-50 text-sky-600',
    hover: 'hover:border-sky-300',
    emoji: '🙏',
  },
  laws: {
    label: 'דינים',
    aliases: [' דינים'],
    questionTypes: 'פתוחות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-lime-50 text-lime-700',
    hover: 'hover:border-lime-300',
    emoji: '⚖️',
  },
  jewishIntelligence: {
    label: 'אינטליגנציה יהודית',
    aliases: [' אינטליגנציה יהודית'],
    questionTypes: 'פתוחות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-emerald-50 text-emerald-600',
    hover: 'hover:border-emerald-300',
    emoji: '🧠',
  },
  verbalVocabulary: {
    label: 'מילולי: אוצר מילים',
    aliases: [' מילולי: אוצר מילים'],
    questionTypes: 'סגורות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-fuchsia-50 text-fuchsia-600',
    hover: 'hover:border-fuchsia-300',
    emoji: '📝',
  },
  readingComprehension: {
    label: 'מילולי: הבנת הנקרא',
    aliases: [' מילולי: הבנת הנקרא'],
    questionTypes: 'סגורות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-cyan-50 text-cyan-600',
    hover: 'hover:border-cyan-300',
    emoji: '📚',
  },
  sentenceCompletion: {
    label: 'מילולי: השלמת משפטים',
    aliases: [' מילולי: השלמת משפטים'],
    questionTypes: 'השלמת משפטים',
    levels: [],
    activities: ['practice'],
    tone: 'bg-blue-50 text-blue-600',
    hover: 'hover:border-blue-300',
    emoji: '✍️',
  },
  conclusions: {
    label: 'מילולי: הסקת מסקנות',
    aliases: [' מילולי: הסקת מסקנות'],
    questionTypes: 'סגורות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-violet-50 text-violet-600',
    hover: 'hover:border-violet-300',
    emoji: '🔍',
  },
  generalIntelligence: {
    label: 'אינטליגנציה כללית',
    aliases: [' אינטליגנציה כללית'],
    questionTypes: 'פתוחות וסגורות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-amber-50 text-amber-600',
    hover: 'hover:border-amber-300',
    emoji: '🌐',
  },
  numberSeries: {
    label: 'מתמטיקה: סדרות מספרים',
    aliases: [' מתמטיקה: סדרות מספרים'],
    questionTypes: 'סגורות',
    levels: [],
    activities: ['practice'],
    tone: 'bg-slate-100 text-slate-700',
    hover: 'hover:border-slate-300',
    emoji: '🔢',
  },
  holland: {
    label: 'שאלון הולנד',
    aliases: [],
    questionTypes: 'שאלון דירוג אישיותי',
    levels: [],
    activities: ['practice'],
    tone: 'bg-rose-50 text-rose-600',
    hover: 'hover:border-rose-300',
    emoji: '🧭',
  },
}

export const SUBJECT_CATALOG = {
  'grade-8': [
    BASE_SUBJECTS.tanakh,
    BASE_SUBJECTS.pirkeiAvot,
    BASE_SUBJECTS.yearlyCycle,
    BASE_SUBJECTS.shabbat,
    BASE_SUBJECTS.prayerBlessings,
    BASE_SUBJECTS.laws,
    BASE_SUBJECTS.jewishIntelligence,
    BASE_SUBJECTS.verbalVocabulary,
    BASE_SUBJECTS.readingComprehension,
    BASE_SUBJECTS.sentenceCompletion,
    BASE_SUBJECTS.conclusions,
    BASE_SUBJECTS.generalIntelligence,
    BASE_SUBJECTS.numberSeries,
  ],
  'grade-12': [
    { ...BASE_SUBJECTS.verbalVocabulary, levels: ['רמה 1', 'רמה 2', 'רמה 3'] },
    { ...BASE_SUBJECTS.readingComprehension, levels: ['רמה 1'] },
    { ...BASE_SUBJECTS.sentenceCompletion, levels: ['רמה 1', 'רמה 2', 'רמה 3'] },
    { ...BASE_SUBJECTS.conclusions, levels: ['רמה 1'] },
    { ...BASE_SUBJECTS.generalIntelligence, levels: ['רמה 1', 'רמה 2', 'רמה 3'] },
    { ...BASE_SUBJECTS.numberSeries, levels: ['רמה 1', 'רמה 2'] },
  ],
  'thinking-challenge': [],
}

export const HOLLAND_TRACK = BASE_SUBJECTS.holland

const catalogEntries = Object.values(SUBJECT_CATALOG).flatMap(items => items)
const allCatalogSubjects = [...catalogEntries, BASE_SUBJECTS.holland]

export const SUBJECT_TONES = Object.fromEntries(
  allCatalogSubjects.map(subject => [
    subject.label,
    {
      tone: subject.tone,
      hover: subject.hover,
      emoji: subject.emoji,
    },
  ]),
)

const aliasPairs = allCatalogSubjects.flatMap(subject => {
  const aliases = [subject.label, ...(subject.aliases || [])]
  return aliases.map(alias => [alias, subject.label])
})

const SUBJECT_ALIAS_MAP = new Map(aliasPairs)

export function normalizeSubjectName(subject) {
  if (!subject) return subject
  const trimmedSubject = subject.trim()
  return SUBJECT_ALIAS_MAP.get(trimmedSubject) || SUBJECT_ALIAS_MAP.get(subject) || trimmedSubject
}

export function getCatalogTracksForGrade(grade) {
  return (SUBJECT_CATALOG[grade] || []).map(subject => ({
    subject: subject.label,
    questionTypes: subject.questionTypes,
    levels: [...subject.levels],
    activities: [...subject.activities],
  }))
}

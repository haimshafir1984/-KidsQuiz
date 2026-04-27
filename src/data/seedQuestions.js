import importedDemoQuestions from './importedDemoQuestions.js'
import importedChallengeQuestions from './importedChallengeQuestions.js'
import seriesCompletionQuestions from './seriesCompletionQuestions.js'
import { normalizeSubjectName } from './subjectCatalog.js'

const THINKING_CHALLENGE_SUBJECT_MAP = {
  'מילולי: אוצר מילים': 'אתגר מחשבתי: מילולי: אוצר מילים',
  'מילולי: הבנת הנקרא': 'אתגר מחשבתי: מילולי: הבנת הנקרא',
  'מילולי: השלמת משפטים': 'אתגר מחשבתי: מילולי: השלמת משפטים',
  'מילולי: הסקת מסקנות': 'אתגר מחשבתי: מילולי: הסקת מסקנות',
}

const OUTLIER_PATCHES = [
  {
    options: ['כְּסָיָה', 'נַעַל', 'אַנְפִּילָה', 'דַּרְדַּס'],
    correctAnswer: 'כְּסָיָה',
    explanation: 'שאר המילים הן סוגים של נעליים או נעלי בית. כסיה היא כפפה.',
  },
  {
    options: ['קָרְתָּה', 'פַּלְטֵר', 'בִּירָנִית', 'מִצְדָּה'],
    correctAnswer: 'קָרְתָּה',
    explanation: 'שאר המילים הן שמות נרדפים לארמון או מצודה. קרתה היא עיר.',
  },
  {
    options: ['זְמוֹרָה', 'נֵצֶר', 'חֹטֶר', 'עָלֶה'],
    correctAnswer: 'עָלֶה',
    explanation: 'שאר המילים הן שמות נרדפים לענף שצומח מהגזע.',
  },
  {
    options: ['אַשְׁלִים', 'אַדְמִית', 'אֶשְׁכָּר', 'אַלְמָגוֹר'],
    correctAnswer: 'אֶשְׁכָּר',
    explanation: 'השאר הם שמות של יישובים בארץ.',
  },
  {
    options: ['מַבּוּעַ', 'אֲפִיק', 'מַעְיָן', 'עַיִן'],
    correctAnswer: 'אֲפִיק',
    explanation: 'שאר המילים מתארות את מקור המים עצמו. אפיק הוא המסלול שבו המים זורמים.',
  },
  {
    options: ['לַהַב', 'מַאֲכֶלֶת', 'קַת', 'שֶׁלַח'],
    correctAnswer: 'קַת',
    explanation: 'שאר המילים הן שמות נרדפים לסכין או לחלק החיתוך. קת היא ידית האחיזה.',
  },
  {
    options: ['אֲסָמִים', 'מְגוּרָה', 'מַמְגּוּרָה', 'סִיס'],
    correctAnswer: 'סִיס',
    explanation: 'אסמים, מגורה וממגורה הם מחסני תבואה. סיס הוא סוג של ציפור.',
  },
]

const SHARED_OUTLIER_QUESTIONS = [
  {
    options: ['חצב', 'מרגנית', 'מרגלית', 'לוע הארי', 'כלנית'],
    correctAnswer: 'מרגלית',
    explanation: 'רק היא אינה פרח.',
  },
  {
    options: ['פיתון', 'שיפון', 'שפיפון', 'זעמן שחור', 'אפעה'],
    correctAnswer: 'שיפון',
    explanation: 'רק הוא אינו שם של נחש.',
  },
  {
    options: ['סגול', 'טורקיז', 'צהוב', 'כתום', 'ורוד', 'תכלת'],
    correctAnswer: 'צהוב',
    explanation: 'רק הוא צבע יסוד.',
  },
  {
    options: ['כדי', 'על מנת', 'למרות זאת', 'למען', 'בשביל'],
    correctAnswer: 'למרות זאת',
    explanation: 'רק הוא ביטוי של ויתור.',
  },
  {
    options: ['אדווה', 'מים', 'גל', 'נחשול'],
    correctAnswer: 'מים',
    explanation: 'השאר הן מילים המתארות תנועה מעל המים.',
  },
  {
    options: ['צמיד', 'גדול', 'ענק', 'שרשרת'],
    correctAnswer: 'גדול',
    explanation: 'השאר שמות של תכשיטים.',
  },
  {
    options: ['מחוז', 'אזור', 'חגורה', 'אבנט'],
    correctAnswer: 'מחוז',
    explanation: 'השאר מילים נרדפות לחגורה.',
  },
  {
    options: ['אלומה', 'קרן', 'זר', 'אגודה'],
    correctAnswer: 'קרן',
    explanation: 'השאר פריטים שנאספו יחד.',
  },
  {
    options: ['רם', 'נישא', 'טמיר', 'גבוה'],
    correctAnswer: 'טמיר',
    explanation: 'השאר הן מילות תיאור לגובה פיזי או למעמד רם.',
  },
  {
    options: ['ריבה', 'ממרח', 'נערה', 'עלמה'],
    correctAnswer: 'ממרח',
    explanation: 'השאר מילים נרדפות לנערה.',
  },
  {
    options: ['עמום', 'לוט', 'גלוי', 'צפון'],
    correctAnswer: 'גלוי',
    explanation: 'השאר מילים שמשמעותן הסתרה.',
  },
]

function getOptionsSignature(options = []) {
  return options.map(option => option.trim()).join('||')
}

function makeUniqueIds(items) {
  const counts = new Map()

  return items.map(question => {
    const currentCount = counts.get(question.id) || 0
    counts.set(question.id, currentCount + 1)
    if (currentCount === 0) return question
    return { ...question, id: `${question.id}-${currentCount + 1}` }
  })
}

function sanitizeQuestion(question) {
  const subject = normalizeSubjectName(question.subject)
  const sanitizedOptions = Array.isArray(question.options) ? question.options.map(option => option.trim()) : []
  const sanitizedAnswers = Array.isArray(question.correct_answer)
    ? question.correct_answer.map(answer => answer.trim())
    : []

  return {
    ...question,
    subject,
    options: sanitizedOptions,
    correct_answer: sanitizedAnswers,
  }
}

const HEADER_ONLY_TEXTS = new Set([
  'באיזה חודש?',
  'של איזה חודש המזלות האלה?',
  'המשיכי את הציטוט: המשיכי את הציטוט',
  'מי התפלל?',
  'מאיזו תפילה נלקח הציטוט',
  'על מה מברכים קודם: על מה מברכים קודם?',
  'מי חיבר את הספרים האלה?',
  'מה משותף ל: מה משותף ל:?',
])

const SUBJECT_HEADER_CONFIG = {
  'מעגל השנה': {
    headers: {
      'באיזה חודש?': 'באיזה חודש',
      'של איזה חודש המזלות האלה?': 'של איזה חודש המזלות האלה',
    },
  },
  'שבת': {
    headers: {
      'המשיכי את הציטוט: המשיכי את הציטוט': 'המשיכי את הציטוט',
    },
    prefix: 'המשיכי את הציטוט: ',
  },
  'תפילה וברכות': {
    headers: {
      'מי התפלל?': 'מי התפלל',
      'מאיזו תפילה נלקח הציטוט': 'מאיזו תפילה נלקח הציטוט',
    },
  },
  'דינים': {
    headers: {
      'על מה מברכים קודם: על מה מברכים קודם?': 'על מה מברכים קודם',
    },
    prefix: 'על מה מברכים קודם: ',
  },
  'אינטליגנציה יהודית': {
    headers: {
      'מי חיבר את הספרים האלה?': 'מי חיבר את הספרים האלה',
    },
  },
  'אינטליגנציה כללית': {
    headers: {
      'מה משותף ל: מה משותף ל:?': 'מה משותף ל',
    },
    prefix: 'מה משותף ל: ',
  },
}

const SUBJECT_PREFIX_GROUPS = {
  'תנ"ך': [
    { prefix: 'מה הקשר בין ', title: 'מה הקשר בין' },
    { prefix: 'איזה חומש נקרא ', title: 'איזה חומש נקרא' },
  ],
}

function ensureQuestionMark(text) {
  if (!text) return text
  return /[?!…]$/.test(text) ? text : `${text}?`
}

function stripPrefix(text, prefix) {
  if (!text?.startsWith(prefix)) return text
  return text.slice(prefix.length).trim()
}

export function normalizeImportedQuestionStructure(items) {
  const activeHeaders = new Map()

  return items.flatMap(question => {
    const subject = normalizeSubjectName(question.subject)
    const text = question.text?.trim() || ''
    const headerConfig = SUBJECT_HEADER_CONFIG[subject]

    if (HEADER_ONLY_TEXTS.has(text)) {
      if (headerConfig?.headers?.[text]) {
        activeHeaders.set(subject, headerConfig.headers[text])
      }
      return []
    }

    let nextQuestion = { ...question, subject }

    const prefixRule = SUBJECT_PREFIX_GROUPS[subject]?.find(rule => text.startsWith(rule.prefix))
    if (prefixRule) {
      nextQuestion = {
        ...nextQuestion,
        groupTitle: prefixRule.title,
        text: ensureQuestionMark(stripPrefix(text, prefixRule.prefix)),
      }
      return [nextQuestion]
    }

    const activeHeader = activeHeaders.get(subject)
    if (activeHeader) {
      const prefix = headerConfig?.prefix
      const trimmedText = prefix ? stripPrefix(text, prefix) : text
      nextQuestion = {
        ...nextQuestion,
        groupTitle: activeHeader,
        text: ensureQuestionMark(trimmedText),
      }
    }

    return [nextQuestion]
  })
}

const outlierPatchMap = new Map(
  OUTLIER_PATCHES.map(item => [
    getOptionsSignature(item.options),
    item,
  ]),
)

function patchOutlierQuestion(question) {
  if (question.text !== 'מה יוצא דופן?') return question

  const patch = outlierPatchMap.get(getOptionsSignature(question.options))
  if (!patch) return question

  return {
    ...question,
    correct_answer: [patch.correctAnswer],
    explanation: patch.explanation,
  }
}

function createSharedOutlierQuestion(definition, grade, subject, level, index) {
  return {
    id: `shared-outlier-${grade}-${level || 'no-level'}-${index + 1}`,
    grade,
    subject,
    level,
    activityType: 'practice',
    type: 'multiple',
    text: 'מה יוצא דופן?',
    options: definition.options,
    correct_answer: [definition.correctAnswer],
    explanation: definition.explanation,
  }
}

function buildSharedOutlierQuestions() {
  const questions = []

  SHARED_OUTLIER_QUESTIONS.forEach((definition, index) => {
    questions.push(
      createSharedOutlierQuestion(definition, 'grade-8', 'מילולי: אוצר מילים', null, index),
      createSharedOutlierQuestion(definition, 'grade-12', 'מילולי: אוצר מילים', 'רמה 1', index),
      createSharedOutlierQuestion(definition, 'thinking-challenge', 'אתגר מחשבתי: מילולי: אוצר מילים', null, index),
    )
  })

  return questions
}

function buildThinkingChallengeQuestions(items) {
  return items
    .filter(question => question.grade === 'grade-8' && THINKING_CHALLENGE_SUBJECT_MAP[question.subject])
    .map(question => ({
      ...question,
      id: `thinking-${question.id}`,
      grade: 'thinking-challenge',
      subject: THINKING_CHALLENGE_SUBJECT_MAP[question.subject],
      level: null,
    }))
}

const normalizedDemoQuestions = makeUniqueIds(
  normalizeImportedQuestionStructure(importedDemoQuestions)
    .map(sanitizeQuestion),
)
  .map(patchOutlierQuestion)

const sharedOutlierQuestions = buildSharedOutlierQuestions()
const thinkingChallengeQuestions = buildThinkingChallengeQuestions([
  ...normalizedDemoQuestions,
  ...sharedOutlierQuestions,
])

export default [
  ...normalizedDemoQuestions,
  ...sharedOutlierQuestions,
  ...importedChallengeQuestions,
  ...thinkingChallengeQuestions,
  ...seriesCompletionQuestions,
]

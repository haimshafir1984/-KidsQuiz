// בנאים משותפים לקובצי שאלות שנוצרו ממסמכי Word (תנ"ך חדש, מעגל השנה חדש וכו').
// כל תת-נושא הוא "רמה" (level) בתוך הנושא. מזהים יציבים: <קידומת>-<מפתח תת-נושא>-<מספר>.

export function createQuestionBuilders({ idPrefix, subject, levels }) {
  const counters = {}

  function nextId(level) {
    const key = Object.keys(levels).find(item => levels[item] === level)
    counters[level] = (counters[level] || 0) + 1
    return `${idPrefix}-${key}-${counters[level]}`
  }

  function base(level, extra) {
    return {
      id: nextId(level),
      grade: 'grade-8',
      subject,
      level,
      activityType: 'practice',
      ...extra,
    }
  }

  const withExplanation = explanation => (explanation ? { explanation } : {})

  return {
    // בחירה מתוך אפשרויות
    mc: (level, text, options, answer, explanation) => base(level, {
      type: 'multiple',
      text,
      options,
      correct_answer: [answer],
      ...withExplanation(explanation),
    }),

    // תשובה קצרה בטקסט; answers = התשובה הנכונה + גרסאות מקובלות
    open: (level, text, answers, explanation) => base(level, {
      type: 'open',
      text,
      options: [],
      correct_answer: Array.isArray(answers) ? answers : [answers],
      ...withExplanation(explanation),
    }),

    // "כתבי כמה": pool = מאגר פריטים (חלופות עם |), minItems = כמה נדרשים
    list: (level, text, pool, minItems, explanation, extra = {}) => base(level, {
      type: 'list',
      text,
      options: [],
      correct_answer: pool,
      minItems,
      ...extra,
      ...withExplanation(explanation),
    }),

    // שאלת הסבר: התלמיד מציג את התשובה ומדווח "ידעתי" / "לא ידעתי"
    explain: (level, text, answer) => base(level, {
      type: 'self_check',
      text,
      options: [],
      correct_answer: [answer],
    }),
  }
}

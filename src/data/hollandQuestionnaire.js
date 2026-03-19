export const HOLLAND_QUESTIONS = [
  { id: 'R1', typeCode: 'R', text: 'תיקון מכשירי חשמל או מנגנונים מכניים.' },
  { id: 'R2', typeCode: 'R', text: 'עבודה פיזית או טכנית מחוץ למשרד.' },
  { id: 'R3', typeCode: 'R', text: 'שימוש בכלי עבודה ידניים או חשמליים.' },
  { id: 'R4', typeCode: 'R', text: 'הרכבה, התקנה או תפעול של מכונות.' },
  { id: 'I1', typeCode: 'I', text: 'ניתוח נתונים או פתרון בעיות לוגיות.' },
  { id: 'I2', typeCode: 'I', text: 'מחקר מדעי או למידה של נושאים מורכבים.' },
  { id: 'I3', typeCode: 'I', text: 'עבודה עם נוסחאות, תוכנות או מודלים.' },
  { id: 'I4', typeCode: 'I', text: 'ביצוע ניסויים ובדיקת השערות.' },
  { id: 'A1', typeCode: 'A', text: 'כתיבת סיפורים, שירים או תוכן מקורי.' },
  { id: 'A2', typeCode: 'A', text: 'עיצוב חזותי, ציור או צילום.' },
  { id: 'A3', typeCode: 'A', text: 'נגינה, משחק או יצירה אמנותית.' },
  { id: 'A4', typeCode: 'A', text: 'חשיבה על רעיונות יצירתיים ופתרונות לא שגרתיים.' },
  { id: 'S1', typeCode: 'S', text: 'הדרכה, הוראה או אימון של אנשים אחרים.' },
  { id: 'S2', typeCode: 'S', text: 'עזרה לזולת ופתרון בעיות חברתיות.' },
  { id: 'S3', typeCode: 'S', text: 'תמיכה רגשית או טיפול באנשים.' },
  { id: 'S4', typeCode: 'S', text: 'עבודה בצוות ושיתוף פעולה יומיומי.' },
  { id: 'E1', typeCode: 'E', text: 'ניהול פרויקטים או הובלת צוותים.' },
  { id: 'E2', typeCode: 'E', text: 'שכנוע, מכירות או ניהול משא ומתן.' },
  { id: 'E3', typeCode: 'E', text: 'יזמות, קבלת החלטות ונטילת סיכונים.' },
  { id: 'E4', typeCode: 'E', text: 'עמידה מול קהל והשפעה על אחרים.' },
  { id: 'C1', typeCode: 'C', text: 'ארגון מידע, מסמכים וקבצים.' },
  { id: 'C2', typeCode: 'C', text: 'עבודה עם תקציבים, טבלאות או מספרים.' },
  { id: 'C3', typeCode: 'C', text: 'שמירה על נהלים, סדר ודיוק עקבי.' },
  { id: 'C4', typeCode: 'C', text: 'בדיקת פרטים קטנים ואיתור טעויות.' },
]

export const HOLLAND_SCALE = [
  { value: 0, label: 'לא מתאים לי' },
  { value: 1, label: 'מתאים מעט' },
  { value: 2, label: 'מתאים' },
  { value: 3, label: 'מתאים מאוד' },
]

export const HOLLAND_TYPES = {
  R: {
    name: 'ביצועי',
    color: 'bg-emerald-50 text-emerald-700',
    description: 'נמשך לעשייה מעשית, טכנית ומוחשית. נהנה לעבוד עם ציוד, כלים, שטח ותהליכים ברורים.',
  },
  I: {
    name: 'חקרני',
    color: 'bg-sky-50 text-sky-700',
    description: 'סקרן, אנליטי ואוהב להבין לעומק. מתחבר למחקר, נתונים, פתרון בעיות וחשיבה שיטתית.',
  },
  A: {
    name: 'אמנותי',
    color: 'bg-violet-50 text-violet-700',
    description: 'מחפש ביטוי אישי, רעיונות חדשים ויצירה. מעדיף גמישות, מקוריות ועבודה עם דמיון.',
  },
  S: {
    name: 'חברתי',
    color: 'bg-rose-50 text-rose-700',
    description: 'נהנה לעבוד עם אנשים, לעזור, להסביר וללוות. מביא הקשבה, רגישות ויכולת חיבור לאחרים.',
  },
  E: {
    name: 'יזמי',
    color: 'bg-amber-50 text-amber-700',
    description: 'אוהב להוביל, להניע ולקדם יוזמות. מתחבר להשפעה, הצגה, ניהול וקבלת החלטות.',
  },
  C: {
    name: 'מנהלתי',
    color: 'bg-slate-100 text-slate-700',
    description: 'מעדיף סדר, דיוק, ארגון ושגרה מובנית. עובד היטב עם פרטים, נהלים ומעקב קבוע.',
  },
}

export function analyzeHollandAnswers(answers) {
  const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }

  HOLLAND_QUESTIONS.forEach(question => {
    const value = Number(answers[question.id] ?? 0)
    scores[question.typeCode] += value
  })

  const sorted = Object.entries(scores).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0])
  })

  const [topCode, topScore] = sorted[0]
  const [secondCode, secondScore] = sorted[1]
  const maxPerType = HOLLAND_QUESTIONS.filter(question => question.typeCode === topCode).length * 3

  return {
    scores,
    sorted,
    topCode,
    secondCode,
    topScore,
    secondScore,
    topType: HOLLAND_TYPES[topCode],
    secondType: HOLLAND_TYPES[secondCode],
    combinedCode: `${topCode}${secondCode}`,
    maxPerType,
  }
}

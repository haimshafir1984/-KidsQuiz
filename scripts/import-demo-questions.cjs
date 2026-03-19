const fs = require('fs')

function parseDocxLines(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8')
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)]

  function decode(str = '') {
    return str
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  }

  const lines = []

  for (const match of paragraphs) {
    const paragraph = match[0].replace(/<w:tab\/>/g, '<<<TAB>>>')
    const runs = [...paragraph.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)]
    const parts = []

    for (const runMatch of runs) {
      const run = runMatch[0]
      const texts = [...run.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(item => decode(item[1]))

      if (!texts.length && run.includes('<<<TAB>>>')) {
        parts.push('\t')
        continue
      }

      if (!texts.length) continue
      parts.push(texts.join(''))
    }

    const text = parts.join('').replace(/<<<TAB>>>/g, '\t').trim()
    if (text) lines.push(text)
  }

  return lines
}

const lines = parseDocxLines('_import_questions/word/document.xml')
const placements = {
  a: [{ grade: 'grade-8', level: null }],
  a_b1: [
    { grade: 'grade-8', level: null },
    { grade: 'grade-12', level: 'רמה 1' },
  ],
  b2: [{ grade: 'grade-12', level: 'רמה 2' }],
  b3: [{ grade: 'grade-12', level: 'רמה 3' }],
}

const importedQuestions = []
const importedSummary = []
const skipped = []

function get(lineNumber) {
  return lines[lineNumber - 1]
}

function toId(parts) {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/["״']/g, '')
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeOptionPrefix(text) {
  return text.replace(/^[א-ו]\.|^\d+\./, '').trim()
}

function letterToIndex(value) {
  const letters = 'אבגדהו'
  const found = letters.indexOf(value)
  return found === -1 ? null : found
}

function parseAnswerLine(answerLine, options) {
  const line = answerLine.trim().replace(/\.$/, '')
  const textAfterColon = line.includes(':') ? line.split(':').slice(1).join(':').trim() : line
  const tokenMatch = textAfterColon.match(/^(\d+|[א-ו])(?:\.|\)|\s|-)/)

  if (tokenMatch) {
    const token = tokenMatch[1]
    const optionIndex = /^\d+$/.test(token) ? Number(token) - 1 : letterToIndex(token)
    if (optionIndex != null && options[optionIndex]) return options[optionIndex]
  }

  const inlineTokenMatch = line.match(/(\d+|[א-ו])\./)
  if (inlineTokenMatch) {
    const token = inlineTokenMatch[1]
    const optionIndex = /^\d+$/.test(token) ? Number(token) - 1 : letterToIndex(token)
    if (optionIndex != null && options[optionIndex]) return options[optionIndex]
  }

  const normalize = value => value.replace(/[.:,"״']/g, '').replace(/\s+/g, ' ').trim()
  for (const option of options) {
    if (normalize(line).includes(normalize(option))) return option
  }

  return textAfterColon.replace(/^(\d+|[א-ו])(?:\.|\)|\s|-)+/, '').trim()
}

function pushQuestion(base, placementKind) {
  for (const [index, target] of placements[placementKind].entries()) {
    importedQuestions.push({
      id: `imported-${toId([base.subject, target.grade, target.level || 'no-level', base.text, String(index)])}`,
      grade: target.grade,
      subject: base.subject,
      level: target.level,
      activityType: 'practice',
      type: base.type,
      text: base.text,
      options: base.options || [],
      correct_answer: base.correct_answer || [],
    })
  }
}

function track(subject, placementKind, count) {
  importedSummary.push({ subject, placementKind, count })
}

function addMcqRange(start, end, subject, placementKind, type = 'multiple') {
  let lineNumber = start
  let count = 0

  while (lineNumber <= end) {
    const question = get(lineNumber)?.trim()

    if (
      !question ||
      question === '-' ||
      question === 'השאלות' ||
      question === 'שאלות:' ||
      question.startsWith('הסבר')
    ) {
      lineNumber += 1
      continue
    }

    const options = []
    lineNumber += 1

    while (lineNumber <= end) {
      const current = get(lineNumber)?.trim()
      if (!current || current === '-') {
        lineNumber += 1
        continue
      }

      if (
        current.startsWith('התשובה') ||
        current.startsWith('תשובה') ||
        current.startsWith('היוצא') ||
        current.startsWith('הסבר')
      ) {
        break
      }

      options.push(normalizeOptionPrefix(current))
      lineNumber += 1
    }

    const answerLine = get(lineNumber)?.trim() || ''
    if (
      !answerLine.startsWith('התשובה') &&
      !answerLine.startsWith('תשובה') &&
      !answerLine.startsWith('היוצא')
    ) {
      skipped.push({ section: subject, reason: `חסרה תשובה לשאלה: ${question}` })
      continue
    }

    pushQuestion({
      subject,
      type,
      text: question,
      options,
      correct_answer: [parseAnswerLine(answerLine, options)],
    }, placementKind)

    count += 1
    lineNumber += 1
  }

  track(subject, placementKind, count)
}

function addTabRange(start, end, subject, placementKind, formatter) {
  let header = ''
  let count = 0

  for (let lineNumber = start; lineNumber <= end; lineNumber += 1) {
    const line = get(lineNumber)
    if (!line || line === '-') continue

    if (!line.includes('\t')) {
      header = line.trim()
      continue
    }

    const parts = line.split('\t').map(item => item.trim()).filter(Boolean)
    if (parts.length < 2) continue

    const left = parts[0]
    const right = parts[parts.length - 1]
    if (left.startsWith('תשוב')) continue

    const formatted = formatter(header, left, right)
    pushQuestion({
      subject,
      type: 'open',
      text: formatted.text,
      options: [],
      correct_answer: [formatted.answer],
    }, placementKind)
    count += 1
  }

  track(subject, placementKind, count)
}

function buildSentenceOption(stem, optionLine) {
  const fragments = optionLine.split(/[;,]/).map(item => item.trim()).filter(Boolean)
  const parts = stem.split(/_{2,}/).map(item => item.trim())
  let output = ''

  for (let index = 0; index < parts.length; index += 1) {
    output += parts[index]
    if (fragments[index]) output += `${output && !output.endsWith(' ') ? ' ' : ''}${fragments[index]}`
    if (index < parts.length - 1) output += ' '
  }

  return output.replace(/\s+/g, ' ').replace(/\s([.,!?;:])/g, '$1').trim()
}

function addSentencePairs(start, end, subject, placementKind) {
  let lineNumber = start
  let count = 0

  while (lineNumber <= end) {
    const question = get(lineNumber)?.trim()
    if (!question || question === '-') {
      lineNumber += 1
      continue
    }

    const optionRows = []
    lineNumber += 1

    while (lineNumber <= end) {
      const current = get(lineNumber)?.trim()
      if (!current || current === '-') {
        lineNumber += 1
        continue
      }

      if (current.startsWith('התשובה') || current.startsWith('תשובה')) break
      optionRows.push(current)
      lineNumber += 1
    }

    const options = optionRows.map(row => buildSentenceOption(question, row))
    const correct = parseAnswerLine(get(lineNumber).trim(), options)

    pushQuestion({
      subject,
      type: 'sentence_completion',
      text: question,
      options,
      correct_answer: [correct],
    }, placementKind)

    count += 1
    lineNumber += 1
  }

  track(subject, placementKind, count)
}

function addSentenceAdvanced(start, end, subject, placementKind) {
  let count = 0

  for (let lineNumber = start; lineNumber <= end; lineNumber += 3) {
    const question = get(lineNumber).trim()
    const rawOptions = get(lineNumber + 1)
      .split('|')
      .map(part => normalizeOptionPrefix(part.trim()))
      .filter(Boolean)
    const options = rawOptions.map(option => buildSentenceOption(question, option))
    const correct = parseAnswerLine(get(lineNumber + 2).trim(), options)

    pushQuestion({
      subject,
      type: 'sentence_completion',
      text: question,
      options,
      correct_answer: [correct],
    }, placementKind)

    count += 1
  }

  track(subject, placementKind, count)
}

function addOddOne(start, end, subject, placementKind) {
  let count = 0

  for (let lineNumber = start; lineNumber <= end; lineNumber += 1) {
    const line = get(lineNumber)?.trim()
    if (!line) continue

    let split = null
    if (line.includes('התשובה:')) split = 'התשובה:'
    if (line.includes('היוצא דופן:')) split = 'היוצא דופן:'
    if (!split) continue

    const [left, rightRaw] = line.split(split)
    const options = left.split(',').map(item => item.trim()).filter(Boolean)
    const correct = rightRaw.split('הסבר:')[0].trim().replace(/\.$/, '')

    pushQuestion({
      subject,
      type: 'multiple',
      text: 'מה יוצא דופן?',
      options,
      correct_answer: [correct],
    }, placementKind)

    count += 1
  }

  track(subject, placementKind, count)
}

function addReading(subject, placementKind) {
  const passages = [
    [
      'קטע 1: החומה הגדולה של סין',
      'החומה הגדולה של סין היא אחד המבנים המרשימים ביותר שנבנו אי-פעם על ידי בני אדם. בנייתה החלה לפני יותר מאלפיים שנה, והיא נמשכה לאורך שושלות רבות במטרה להגן על האימפריה הסינית מפני פלישות של שבטים מצפון. החומה אינה רצף אחד של אבן, אלא מערכת של חומות, מגדלי שמירה ומצודות. במהלך השנים, חלקים מהחומה נהרסו בשל פגעי הטבע או משום שאנשים מקומיים לקחו אבנים לבניית בתיהם. עם זאת, במאה ה-20 החלה ממשלת סין לשקם חלקים נרחבים מהחומה כדי לשמר אותה כאתר מורשת היסטורי. כיום, החומה הגדולה היא יעד תיירותי פופולרי מאוד, ומיליוני אנשים מכל העולם מבקרים בה בכל שנה.',
      [
        [
          'מה הייתה המטרה העיקרית של בניית החומה הגדולה?',
          [
            'ליצור יעד תיירותי שיביא הכנסות לסין',
            'להגן על סין מפני פלישה של שבטים מצפון',
            'לחבר בין ערים רחוקות בתוך האימפריה הסינית',
            'לספק עבודה לאלפי אנשים לאורך ההיסטוריה',
          ],
          'להגן על סין מפני פלישה של שבטים מצפון',
        ],
        [
          'מדוע החומה אינה נראית היום בדיוק כפי שנראתה בעבר?',
          [
            'כי הממשלה החליטה לשנות את העיצוב שלה במאה ה-20',
            'כי היא נבנתה מחומרים שלא מחזיקים מעמד שנים רבות',
            'כי היא נבנתה מחומרים שלא מחזיקים מעמד שנים רבות',
            'בגלל נזקי הטבע ושימוש באבני החומה לבנייה מקומית',
          ],
          'בגלל נזקי הטבע ושימוש באבני החומה לבנייה מקומית',
        ],
      ],
    ],
    [
      'קטע 2: דבורי הדבש וחשיבותן לטבע',
      'דבורי הדבש ממלאות תפקיד קריטי במערכת האקולוגית של כדור הארץ. מעבר לייצור דבש, הדבורים אחראיות על האבקה של פרחים וצמחים רבים. בתהליך זה, הן מעבירות אבקה מפרח לפרח, מה שמאפשר לצמחים להתרבות ולהצמיח פירות וירקות. למעשה, כשליש מהמזון שאנו אוכלים תלוי בפעילות האבקה של הדבורים. בשנים האחרונות נצפתה ירידה מדאיגה במספר הדבורים בעולם. תופעה זו נובעת ממספר סיבות, ביניהן שימוש בחומרי הדברה בחקלאות, שינויי אקלים וצמצום שטחי המחיה הטבעיים שלהן. ללא דבורים, ייצור המזון העולמי עלול להיפגע בצורה קשה, ולכן מדענים וארגוני סביבה פועלים למציאת דרכים להגנה עליהן, כמו צמצום חומרי הדברה רעילים ונטיעת צמחים המושכים דבורים.',
      [
        [
          'מהי החשיבות העיקרית של הדבורים לפי הקטע?',
          [
            'הן מייצרות דבש שמשמש מזון לבני אדם',
            'הן מאביקות צמחים המאפשרים גידול פירות וירקות',
            'הן עוזרות למדענים להבין את שינויי האקלים',
            'הן מהוות מקור מזון לחיות אחרות בטבע',
          ],
          'הן מאביקות צמחים המאפשרים גידול פירות וירקות',
        ],
        [
          'מדוע מספר הדבורים בעולם פוחת בשנים האחרונות?',
          [
            'צמצום שטחי המחיה הטבעיים ובנייה מודרנית',
            'בגלל מחסור בפרחים בגינות פרטיות',
            'כי הדבורים עוברות לחיות באזורים מיושבים פחות',
            'בשל חומרי הדברה, שינויי אקלים ואיבוד שטחי מחיה',
          ],
          'בשל חומרי הדברה, שינויי אקלים ואיבוד שטחי מחיה',
        ],
      ],
    ],
    [
      'קטע 3: גילוי הפניצילין',
      'עד תחילת המאה ה-20, מחלות זיהומיות רבות נחשבו לקטלניות ולא היה להן מרפא. הכל השתנה בשנת 1928, כאשר המדען אלכסנדר פלמינג גילה את הפניצילין. פלמינג הבחין שפטרייה מסוימת שהתפתחה בטעות באחת מצלוחיות המעבדה שלו הצליחה להרוג חיידקים מסביבה. גילוי זה הוביל לפיתוח האנטיביוטיקה הראשונה בעולם. השימוש בפניצילין הפך לנפוץ במיוחד במהלך מלחמת העולם השנייה, שם הציל את חייהם של אלפי חיילים שנפצעו בקרב. כיום, האנטיביוטיקה היא כלי מרכזי ברפואה המודרנית, אך רופאים מזהירים מפני שימוש מופרז בה. שימוש לא מבוקר עלול לגרום לחיידקים לפתח עמידות לתרופה, מה שיהפוך אותה לפחות יעילה בעתיד.',
      [
        [
          'כיצד גילה אלכסנדר פלמינג את הפניצילין?',
          [
            'בדרך מקרית, כשראה פטרייה קוטלת חיידקים במעבדתו',
            'לאחר שנים רבות של מחקר למציאת תרופה לזיהומים',
            'לאחר שגילה במעבדה שחיידקים הורגים פטריות ישנות',
            'בעקבות ניסויים שערך על חיילים פצועים במלחמת העולם השנייה',
          ],
          'בדרך מקרית, כשראה פטרייה קוטלת חיידקים במעבדתו',
        ],
        [
          'מהי הסכנה העיקרית בשימוש מופרז באנטיביוטיקה?',
          [
            'הגוף עלול לפתח רגישות יתר לפניצילין',
            'פטריות מזיקות עלולות להתפשט בבתי החולים',
            'חיידקים עלולים לפתח עמידות ולהפוך את התרופה ללא יעילה',
          ],
          'חיידקים עלולים לפתח עמידות ולהפוך את התרופה ללא יעילה',
        ],
      ],
    ],
  ]

  let count = 0

  for (const [title, passage, questions] of passages) {
    for (const [question, options, correct] of questions) {
      pushQuestion({
        subject,
        type: 'multiple',
        text: `${title}\n\n${passage}\n\nשאלה: ${question}`,
        options,
        correct_answer: [correct],
      }, placementKind)
      count += 1
    }
  }

  track(subject, placementKind, count)
}

addMcqRange(14, 55, 'נושא חדש - תנ"ך', 'a')
addTabRange(57, 90, 'נושא חדש - תנ"ך', 'a', (header, left, right) => {
  if (header === 'מי?') return { text: left, answer: right }
  if (header === 'מה הקשר בין?') return { text: `מה הקשר בין ${left}?`, answer: right }
  if (header === 'איזה חומש נקרא?') return { text: `איזה חומש נקרא "${left}"?`, answer: right }
  return { text: left, answer: right }
})
addMcqRange(93, 119, 'נושא חדש - פרקי אבות', 'a')
addTabRange(122, 152, 'נושא חדש - מעגל השנה', 'a', (header, left, right) => {
  if (header.startsWith('באיזה חודש')) return { text: `באיזה חודש ${left}?`, answer: right }
  if (header.startsWith('של איזה חודש')) return { text: `של איזה חודש המזל "${left}"?`, answer: right }
  return { text: left, answer: right }
})
addTabRange(155, 161, 'נושא חדש - שבת', 'a', (_header, left, right) => ({
  text: `המשיכי את הציטוט: ${left}`,
  answer: right,
}))
addTabRange(164, 179, 'נושא חדש - תפילה וברכות', 'a', (header, left, right) => {
  if (header.startsWith('מי התפלל')) return { text: `מי התפלל כך: ${left}?`, answer: right }
  if (header.startsWith('מאיזו תפילה')) return { text: `מאיזו תפילה נלקח הציטוט: "${left}"?`, answer: right }
  return { text: left, answer: right }
})
addTabRange(182, 188, 'נושא חדש - דינים', 'a', (_header, left, right) => ({
  text: `על מה מברכים קודם: ${left}?`,
  answer: right,
}))
addTabRange(191, 205, 'נושא חדש - אינטליגנציה יהודית', 'a', (header, left, right) => {
  if (header.startsWith('מי חיבר')) return { text: `מי חיבר את "${left}"?`, answer: right }
  if (header.startsWith('מה משותף')) return { text: `מה משותף לקבוצה: ${left}?`, answer: right }
  return { text: left, answer: right }
})
addMcqRange(210, 286, 'נושא חדש - מילולי: אוצר מילים', 'a_b1')
addMcqRange(289, 314, 'נושא חדש - מילולי: אוצר מילים', 'b2')
addMcqRange(316, 335, 'נושא חדש - מילולי: אוצר מילים', 'b3')
addOddOne(337, 347, 'נושא חדש - מילולי: אוצר מילים', 'a_b1')
addOddOne(349, 352, 'נושא חדש - מילולי: אוצר מילים', 'b2')
addOddOne(354, 356, 'נושא חדש - מילולי: אוצר מילים', 'b3')
addReading('נושא חדש - מילולי: הבנת הנקרא', 'a_b1')
addSentencePairs(411, 430, 'נושא חדש - מילולי: השלמת משפטים', 'a_b1')
addSentenceAdvanced(432, 440, 'נושא חדש - מילולי: השלמת משפטים', 'b2')
addSentenceAdvanced(442, 450, 'נושא חדש - מילולי: השלמת משפטים', 'b3')
addMcqRange(454, 472, 'נושא חדש - מילולי: הסקת מסקנות', 'a_b1')
addTabRange(476, 503, 'נושא חדש - אינטליגנציה כללית', 'a_b1', (_header, left, right) => ({
  text: `מה משותף ל: ${left}?`,
  answer: right,
}))
addMcqRange(506, 546, 'נושא חדש - אינטליגנציה כללית', 'b2')
addMcqRange(548, 559, 'נושא חדש - אינטליגנציה כללית', 'b3')
addMcqRange(577, 597, 'נושא חדש - מתמטיקה: סדרות מספרים', 'a_b1')
addMcqRange(599, 619, 'נושא חדש - מתמטיקה: סדרות מספרים', 'b2')

skipped.push(
  { section: 'מדור ג', reason: 'לבקשת המשתמש דולג בשלב זה.' },
  { section: 'נושא חדש - מילולי: אנלוגיות', reason: 'המסמך מציין שהפרק יישלח בנפרד ואין שאלות לייבוא.' },
  { section: 'נושא חדש - מילולי: הבנת הנקרא / רמה 3', reason: 'קיים פלייסהולדר בלבד ללא שאלות.' },
  { section: 'נושא חדש - מילולי: הסקת מסקנות / רמה 2', reason: 'קיים פלייסהולדר בלבד ללא שאלות.' },
  { section: 'נושא חדש - מילולי: הסקת מסקנות / רמה 3', reason: 'קיים פלייסהולדר בלבד ללא שאלות.' },
  { section: 'נושא חדש - שאלון אישי', reason: 'המסמך מציין שאין תשובות כתובות ולכן לא יובא כרגע.' },
  { section: 'נושא חדש - השלמת צורות', reason: 'קיימים פלייסהולדרים בלבד ללא שאלות.' },
  { section: 'נושא חדש - מתמטיקה: שאלות היגיון', reason: 'קיימים פלייסהולדרים בלבד ללא שאלות.' },
  { section: 'נושא חדש - מתמטיקה: סדרות מספרים / רמה 3', reason: 'קיים פלייסהולדר בלבד ללא שאלות.' },
  { section: 'נושא חדש - מתמטיקה: ידע כמותי', reason: 'קיימים פלייסהולדרים בלבד ללא שאלות.' },
  { section: 'נושא חדש - גיאומטריה', reason: 'קיימים פלייסהולדרים בלבד ללא שאלות.' },
  { section: 'נושא חדש - אנגלית', reason: 'המסמך מפנה למורה לאנגלית ואין שאלות לייבוא.' },
  { section: 'נושא חדש - ראייה מרחבית', reason: 'קיימים פלייסהולדרים בלבד ללא שאלות.' },
  { section: 'נושא חדש - השוואה בין מחרוזות', reason: 'קיימים פלייסהולדרים בלבד ללא שאלות.' },
  { section: 'נושא חדש - שאלון הולנד', reason: 'יש הוראות בלבד ללא שאלות מלאות.' },
)

const bySubject = importedSummary.reduce((acc, item) => {
  const key = `${item.subject} | ${item.placementKind}`
  acc[key] = (acc[key] || 0) + item.count
  return acc
}, {})

fs.writeFileSync(
  'src/data/importedDemoQuestions.js',
  `const importedDemoQuestions = ${JSON.stringify(importedQuestions, null, 2)}\n\nexport default importedDemoQuestions\n`,
  'utf8',
)

fs.writeFileSync(
  'docs/new-question-import-report.md',
  [
    '# דוח יבוא שאלות חדש',
    '',
    '## בוצע',
    ...Object.entries(bySubject).map(([key, count]) => `- ${key}: ${count} שאלות`),
    '',
    `סה"כ שאלות שיובאו: ${importedQuestions.length}`,
    '',
    '## דולג',
    ...skipped.map(item => `- ${item.section}: ${item.reason}`),
    '',
  ].join('\n'),
  'utf8',
)

console.log(JSON.stringify({
  imported: importedQuestions.length,
  sections: Object.keys(bySubject).length,
  skipped: skipped.length,
}, null, 2))

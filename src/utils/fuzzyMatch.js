// התאמה חכמה של תשובות פתוחות - בלי AI, פועלת גם אופליין.
// מה היא יודעת לעשות:
//  - להתעלם מניקוד, אותיות סופיות, גרשיים ופיסוק, רווחים ומקפים
//  - כתיב מלא/חסר (משה = מושה), סיומת ה/א (חנה = חנא)
//  - ה' הידיעה בתחילת מילה (נחש = הנחש)
//  - מילים נוספות בתשובת התלמיד ("שמואל הנביא" מתקבל כשהתשובה היא "שמואל")
//  - תשובה חלקית של שם (בלי "בן ..." ובלי תארים: "יהושע" מתקבל כשהתשובה היא "יהושע בן נון")
//  - מספרים במילים ובספרות (חמישים = 50, שש מאות = 600) ויחידות מידה (50 מ' = חמישים מטר)
//  - טעות הקלדה אחת במילה באורך 5-6 אותיות (וכ-20% במילים ארוכות יותר)

// רק ה' הידיעה ו-ו' החיבור: אותיות כמו ב/ל/ש עלולות להפוך מילה אחת לאחרת (בשלח / שלח)
const WORD_PREFIXES = ['ה', 'ו']

const MAX_EXTRA_WORDS = 3

// ───────────── נרמול בסיסי ─────────────

const FINAL_LETTERS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }

function baseNormalize(str) {
  return String(str ?? '')
    .normalize('NFC')
    .replace(/[֑-ׇ]/g, '') // ניקוד וטעמים
    .toLowerCase()
    .replace(/[ךםןףץ]/g, letter => FINAL_LETTERS[letter])
    .replace(/["'׳״`´’‘“”]/g, '') // גרשיים וגרש (ק"מ -> קמ)
    .replace(/[-–—_/\\]/g, ' ')
    .replace(/[.,!?():;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// מילים שאינן חלק מ"גוף" התשובה: אפשר להשמיט אותן, ואפשר להוסיף אותן, בלי לפסול את התשובה
const TITLE_WORDS = new Set([
  'רבנו', 'אבינו', 'אמנו', 'הנביא', 'הנביאה', 'המלך', 'המלכה', 'הכהן', 'השופט', 'הצדיק',
  'רבי', 'הרב', 'רב', 'ר', 'אשת', 'בן', 'בת', 'הגדול', 'הקטן', 'מלך', 'נביא', 'כהן', 'הראשון',
].map(baseNormalize))
const PATRONYMIC_WORDS = new Set(['בן', 'בת'].map(baseNormalize))
// מילות מילוי שתלמידים מוסיפים ("זה יהושע", "אני חושב שזה משה")
const FILLER_WORDS = new Set([
  'זה', 'זו', 'זאת', 'הוא', 'היא', 'היה', 'היתה', 'אני', 'חושב', 'חושבת', 'כנראה', 'אולי', 'שזה', 'שזו', 'של', 'את', 'על', 'זצל', 'עה', 'שליטא',
].map(baseNormalize))

// ───────────── מספרים במילים ─────────────

const NUMBER_WORDS = {}
function addNumberWords(value, words) {
  words.forEach(word => { NUMBER_WORDS[baseNormalize(word)] = value })
}
addNumberWords(1, ['אחד', 'אחת'])
addNumberWords(2, ['שניים', 'שתיים', 'שתים', 'שני', 'שתי'])
addNumberWords(3, ['שלושה', 'שלוש'])
addNumberWords(4, ['ארבעה', 'ארבע'])
addNumberWords(5, ['חמישה', 'חמש'])
addNumberWords(6, ['שישה', 'שש'])
addNumberWords(7, ['שבעה', 'שבע'])
addNumberWords(8, ['שמונה'])
addNumberWords(9, ['תשעה', 'תשע'])
addNumberWords(10, ['עשרה', 'עשר'])
addNumberWords(20, ['עשרים'])
addNumberWords(30, ['שלושים'])
addNumberWords(40, ['ארבעים'])
addNumberWords(50, ['חמישים'])
addNumberWords(60, ['שישים'])
addNumberWords(70, ['שבעים'])
addNumberWords(80, ['שמונים'])
addNumberWords(90, ['תשעים'])
addNumberWords(100, ['מאה'])
addNumberWords(200, ['מאתיים'])
addNumberWords(1000, ['אלף'])
addNumberWords(2000, ['אלפיים'])
const HUNDREDS_MULTIPLIER = baseNormalize('מאות')
const THOUSANDS_MULTIPLIER = baseNormalize('אלפים')

function numberWordValue(token) {
  if (token in NUMBER_WORDS) return NUMBER_WORDS[token]
  // "ושבע", "ועשרים": ו' החיבור צמודה למילה
  if (token.length > 1 && token[0] === 'ו' && token.slice(1) in NUMBER_WORDS) return NUMBER_WORDS[token.slice(1)]
  return null
}

function isNumberWordToken(token) {
  return numberWordValue(token) !== null
    || token === HUNDREDS_MULTIPLIER
    || token === THOUSANDS_MULTIPLIER
    || (token.length > 1 && token[0] === 'ו' && (token.slice(1) === HUNDREDS_MULTIPLIER || token.slice(1) === THOUSANDS_MULTIPLIER))
}

// הופכת רצף של מילות מספר למספר אחד ("שש מאות" -> 600, "מאה עשרים ושבע" -> 127)
function parseNumberRun(tokens) {
  let total = 0
  let last = 0

  tokens.forEach(rawToken => {
    const token = rawToken.length > 1 && rawToken[0] === 'ו' && isNumberWordToken(rawToken.slice(1)) && !(rawToken in NUMBER_WORDS)
      ? rawToken.slice(1)
      : rawToken

    if (token === HUNDREDS_MULTIPLIER) {
      if (last > 0 && last < 10) {
        total += last * 99
        last *= 100
      } else {
        total += 200
        last = 200
      }
      return
    }

    if (token === THOUSANDS_MULTIPLIER) {
      if (last > 0 && last < 100) {
        total += last * 999
        last *= 1000
      } else {
        total += 2000
        last = 2000
      }
      return
    }

    const value = NUMBER_WORDS[token]
    if (token === baseNormalize('אלף') && last > 0 && last < 10) {
      total += last * 999
      last *= 1000
      return
    }

    total += value
    last = value
  })

  return String(total)
}

// ───────────── יחידות מידה ─────────────

const UNIT_ALIASES = {
  m: ['מטר', 'מטרים', 'מ'],
  m2: ['מר', 'מטר רבוע', 'מטרים רבועים'],
  cm: ['סמ', 'סנטימטר', 'סנטימטרים'],
  km: ['קמ', 'קילומטר', 'קילומטרים'],
  mm: ['ממ', 'מילימטר', 'מילימטרים'],
  kg: ['קג', 'קילוגרם', 'קילו', 'קילוגרמים'],
  g: ['גרם', 'גרמים'],
  nis: ['שח', 'שקל', 'שקלים'],
  min: ['דקה', 'דקות', 'דק'],
  hour: ['שעה', 'שעות'],
  year: ['שנה', 'שנת'],
  amah: ['אמה', 'אמות'],
}

const UNIT_TOKENS = {}
const UNIT_PHRASES = [] // יחידות של שתי מילים, למשל "מטר רבוע"
Object.entries(UNIT_ALIASES).forEach(([unit, aliases]) => {
  aliases.forEach(alias => {
    const normalized = baseNormalize(alias)
    if (normalized.includes(' ')) UNIT_PHRASES.push([normalized.split(' '), unit])
    else UNIT_TOKENS[normalized] = unit
  })
})

// "מ" לבדה נחשבת מטר רק אחרי מספר, כדי לא להתבלבל עם אות שימוש
const NUMBER_ONLY_UNIT = 'מ'

// ───────────── פירוק תשובה לאסימונים ─────────────

function analyze(answer) {
  const rawTokens = baseNormalize(answer).split(' ').filter(Boolean)
  const tokens = []

  for (let index = 0; index < rawTokens.length; index += 1) {
    const token = rawTokens[index]

    // מילות מספר
    if (isNumberWordToken(token)) {
      const run = [token]
      while (index + 1 < rawTokens.length && isNumberWordToken(rawTokens[index + 1])) {
        run.push(rawTokens[index + 1])
        index += 1
      }
      tokens.push({ kind: 'num', text: parseNumberRun(run) })
      continue
    }

    // ספרות
    if (/^\d+([.,]\d+)?$/.test(token)) {
      tokens.push({ kind: 'num', text: token.replace(',', '.') })
      continue
    }

    // יחידות של שתי מילים
    const phrase = UNIT_PHRASES.find(([words]) => words.every((word, offset) => rawTokens[index + offset] === word))
    if (phrase) {
      tokens.push({ kind: 'unit', text: phrase[1] })
      index += phrase[0].length - 1
      continue
    }

    const previousIsNumber = tokens.length > 0 && tokens[tokens.length - 1].kind === 'num'
    if (token in UNIT_TOKENS && (token !== NUMBER_ONLY_UNIT || previousIsNumber)) {
      tokens.push({ kind: 'unit', text: UNIT_TOKENS[token] })
      continue
    }

    tokens.push({ kind: 'word', text: token })
  }

  return tokens
}

// ───────────── השוואת מילים ─────────────

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// סף טעויות הקלדה לפי אורך: מילה קצרה דורשת דיוק מלא (ניסן / סיוון, אחים / אחיות),
// מילה בינונית סולחת על טעות אחת, ומילה ארוכה על כ-20%
function getThreshold(length) {
  if (length <= 4) return 0
  if (length <= 6) return 1
  return Math.floor(length * 0.2)
}

function stripPrefix(word) {
  const prefix = WORD_PREFIXES.find(letter => word.startsWith(letter))
  if (prefix && word.length - 1 >= 3) return word.slice(1)
  return word
}

// מפתח השוואה: בלי ו/י (כתיב מלא וחסר) ועם סיומת ה במקום א
function spellingKey(word) {
  const withEnding = word.length > 2 && word.endsWith('א') ? `${word.slice(0, -1)}ה` : word
  const stripped = withEnding.replace(/[וי]/g, '')
  return stripped.length >= 2 ? stripped : withEnding
}

function wordsEquivalent(first, second) {
  if (first === second) return true

  const firstForms = [first, stripPrefix(first)]
  const secondForms = [second, stripPrefix(second)]

  return firstForms.some(a => secondForms.some(b => {
    if (a === b) return true
    const keyA = spellingKey(a)
    const keyB = spellingKey(b)
    if (keyA === keyB) return true
    return levenshtein(keyA, keyB) <= getThreshold(Math.min(a.length, b.length))
  }))
}

// ───────────── השוואת תשובה שלמה ─────────────

function matchesTokens(userTokens, correctTokens) {
  // מספרים: חייבים להיות זהים בדיוק
  const userNumbers = userTokens.filter(token => token.kind === 'num').map(token => token.text)
  const correctNumbers = correctTokens.filter(token => token.kind === 'num').map(token => token.text)
  if (userNumbers.length !== correctNumbers.length || userNumbers.some((value, index) => value !== correctNumbers[index])) {
    return false
  }

  // יחידות: יחידה שונה נפסלת; השמטת יחידה מותרת; יחידה מיותרת מותרת כשאין בתשובה הנכונה
  const userUnits = userTokens.filter(token => token.kind === 'unit').map(token => token.text)
  const correctUnits = correctTokens.filter(token => token.kind === 'unit').map(token => token.text)
  if (correctUnits.length > 0 && userUnits.some(unit => !correctUnits.includes(unit))) return false

  const correctWords = correctTokens.filter(token => token.kind === 'word').map(token => token.text)
  const userWords = userTokens.filter(token => token.kind === 'word').map(token => token.text)

  // תשובה שכולה מספר ויחידה
  if (correctWords.length === 0) return userWords.length === 0

  // מילים חובה: אלה שלפני "בן/בת" ושאינן תארים. אם אין כאלה, כל המילים חובה
  const patronymicIndex = correctWords.findIndex(word => PATRONYMIC_WORDS.has(word))
  const headWords = patronymicIndex > 0 ? correctWords.slice(0, patronymicIndex) : correctWords
  const required = headWords.filter(word => !TITLE_WORDS.has(word))
  const mustMatch = required.length > 0 ? required : correctWords

  const available = userWords.map((text, index) => ({ text, index }))
  const consume = word => {
    const foundIndex = available.findIndex(candidate => wordsEquivalent(candidate.text, word))
    if (foundIndex === -1) return false
    available.splice(foundIndex, 1)
    return true
  }
  const userPatronymicIndex = userWords.findIndex(word => PATRONYMIC_WORDS.has(word))

  // אם גם התלמיד וגם התשובה הנכונה כוללים שם אב ("בן X"), שם האב חייב להתאים:
  // "רבי שלמה בן מאיר" אינו "רבי שלמה בן אדרת"
  if (userPatronymicIndex !== -1 && patronymicIndex !== -1) {
    const userTail = userWords.slice(userPatronymicIndex + 1)
    const correctTail = correctWords.slice(patronymicIndex + 1)
    const tailMatches = userTail.some(word => correctTail.some(candidate => wordsEquivalent(word, candidate)))
    if (userTail.length > 0 && correctTail.length > 0 && !tailMatches) return false
  }

  if (!mustMatch.every(consume)) return false

  // שאר מילות התשובה הנכונה (תארים, "בן ...") אופציונליות, אבל אם התלמיד כתב אותן הן לא נחשבות "עודף"
  correctWords.filter(word => !mustMatch.includes(word)).forEach(consume)

  // מילים נוספות בתשובת התלמיד מותרות רק אם הן תואר, מילת מילוי, או חלק משם האב ("בן נון").
  // שם נוסף ("נדב ואביהוא" כשהתשובה "נדב") נחשב טעות.
  const unacceptableExtras = available.filter(extra => {
    if (TITLE_WORDS.has(extra.text) || FILLER_WORDS.has(extra.text)) return false
    if (userPatronymicIndex !== -1 && extra.index > userPatronymicIndex) return false
    return true
  })

  return unacceptableExtras.length === 0 && available.length <= MAX_EXTRA_WORDS
}

// בדיקה אם תשובת המשתמש תואמת אחת מהתשובות הנכונות
export function fuzzyMatch(userAnswer, correctAnswers) {
  const userTokens = analyze(userAnswer)
  if (userTokens.length === 0) return false

  const userJoined = userTokens.map(token => token.text).join(' ')

  return (correctAnswers || []).some(correct => {
    const correctTokens = analyze(correct)
    if (correctTokens.length === 0) return false

    const correctJoined = correctTokens.map(token => token.text).join(' ')
    if (userJoined === correctJoined) return true

    return matchesTokens(userTokens, correctTokens)
  })
}

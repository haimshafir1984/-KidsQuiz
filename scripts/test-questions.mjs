// בדיקות תקינות למאגר השאלות החדש וללוגיקת סוגי השאלות list ו-self_check.
// הרצה: npm run test:questions
import tanakhNew from '../src/data/tanakhNewQuestions.js'
import giNew from '../src/data/generalIntelligenceNewQuestions.js'
import yearCycleNew from '../src/data/yearCycleNewQuestions.js'
import prayerNew from '../src/data/prayerNewQuestions.js'
import shabbatNew from '../src/data/shabbatNewQuestions.js'
import pirkeiNew from '../src/data/pirkeiAvotNewQuestions.js'
import lawsNew from '../src/data/lawsNewQuestions.js'
import jewishNew from '../src/data/jewishIntelligenceNewQuestions.js'
import { evaluateQuestionAnswer, getListMinItems, SELF_CHECK_ENABLED, SELF_CHECK_KNOWN, SELF_CHECK_UNKNOWN } from '../src/utils/questionAnswers.js'

let failed = 0
function check(condition, message) {
  if (!condition) {
    failed += 1
    console.log(`✖ ${message}`)
  }
}

// ───── תקינות מבנה ─────
const all = [...tanakhNew, ...giNew, ...yearCycleNew, ...prayerNew, ...shabbatNew, ...lawsNew, ...jewishNew, ...pirkeiNew]
const ids = new Set()
all.forEach(question => {
  check(!ids.has(question.id), `מזהה כפול: ${question.id}`)
  ids.add(question.id)
  check(question.text?.trim(), `שאלה בלי טקסט: ${question.id}`)
  check(Array.isArray(question.correct_answer) && question.correct_answer.length > 0, `בלי תשובה: ${question.id}`)

  if (question.type === 'multiple') {
    check(new Set(question.options).size === question.options.length, `אפשרויות כפולות: ${question.id}`)
    check(question.options.includes(question.correct_answer[0]), `התשובה לא ברשימת האפשרויות: ${question.id} (${question.text})`)
  }

  if (question.type === 'list') {
    check(getListMinItems(question) >= 1, `minItems לא תקין: ${question.id}`)
    check(question.minItems <= question.correct_answer.length, `minItems גדול ממאגר הפריטים: ${question.id}`)
  }
})

// ───── לוגיקת list ─────
const byText = text => all.find(question => question.text === text)
const coast = byText('כתבו שמות של ערי חוף בארץ ישראל.')
check(evaluateQuestionAnswer(coast, 'חיפה\nאשדוד\nנתניה'), 'ערי חוף: שלושה פריטים בשורות')
check(evaluateQuestionAnswer(coast, 'חיפה, אשדוד, נתניה'), 'ערי חוף: פסיקים')
check(evaluateQuestionAnswer(coast, 'חיפה ואשדוד ונתניה'), 'ערי חוף: "ו" במקום פסיקים')
check(evaluateQuestionAnswer(coast, 'תל אביב, חפיה, הרצליה'), 'ערי חוף: טעות הקלדה אחת') // חפיה? אינה תקינה, אבל תל אביב והרצליה + ... ראו הערה
check(!evaluateQuestionAnswer(coast, 'חיפה, אשדוד'), 'ערי חוף: שני פריטים לא מספיקים')
check(!evaluateQuestionAnswer(coast, 'חיפה, חיפה, חיפה'), 'ערי חוף: אותו פריט שלוש פעמים לא נספר')
check(!evaluateQuestionAnswer(coast, 'ירושלים, חברון, צפת'), 'ערי חוף: ערים לא נכונות')
check(!evaluateQuestionAnswer(coast, ''), 'ערי חוף: תשובה ריקה')

const senses = byText('מהם חמשת החושים?')
check(evaluateQuestionAnswer(senses, 'ראייה, שמיעה, ריח, טעם, מישוש'), 'חמשת החושים: כולם')
check(evaluateQuestionAnswer(senses, 'ראיה שמיעה מגע טעם ריח'), 'חמשת החושים: חלופות כתיב')
check(!evaluateQuestionAnswer(senses, 'ראייה, שמיעה, ריח, טעם'), 'חמשת החושים: ארבעה לא מספיקים')

const notes = byText('כתבו את שמות תווי הנגינה.')
check(evaluateQuestionAnswer(notes, 'דו רה מי פה סול לה סי'), 'תווי נגינה: כולם')
check(!evaluateQuestionAnswer(notes, 'דו רה מי פה סול לה'), 'תווי נגינה: שישה לא מספיקים')

// ───── self_check ─────
// שאלות הסבר מוסתרות כרגע (SELF_CHECK_ENABLED), אבל הלוגיקה נבדקת על שאלה לדוגמה
const explanation = { type: 'self_check', correct_answer: ['הסבר'] }
check(evaluateQuestionAnswer(explanation, SELF_CHECK_KNOWN) === true, 'self_check: ידעתי')
check(evaluateQuestionAnswer(explanation, SELF_CHECK_UNKNOWN) === false, 'self_check: לא ידעתי')
check(SELF_CHECK_ENABLED || !all.some(question => question.type === 'self_check'), 'שאלות הסבר מוסתרות ולא אמורות להיכלל במאגר')

// ───── רשימה עם סדר ─────
const presidents = byText('סדרי לפי הסדר מיהם שלושת הנשיאים האחרונים של אמריקה.')
check(Boolean(presidents), 'שאלת הנשיאים לא נמצאה')
if (presidents) {
  check(evaluateQuestionAnswer(presidents, 'דונאלד טראמפ, ג\'ו ביידן, ברק אובמה'), 'נשיאים: סדר נכון')
  check(evaluateQuestionAnswer(presidents, 'טראמפ, ביידן, אובמה'), 'נשיאים: שמות משפחה בלבד')
  check(!evaluateQuestionAnswer(presidents, 'אובמה, ביידן, טראמפ'), 'נשיאים: סדר הפוך נפסל')
  check(!evaluateQuestionAnswer(presidents, 'טראמפ, ביידן'), 'נשיאים: שניים בלבד נפסל')
}

// ───── מיון בעלי חיים ─────
const birds = all.find(question => question.type === 'list' && question.text.endsWith('ששייכים לקבוצה: עופות.'))
check(Boolean(birds), 'שאלת העופות לא נמצאה')
if (birds) {
  check(birds.text.includes('טונה') && birds.text.includes('זמר'), 'רשימת בעלי החיים אמורה להופיע בשאלה')
  check(evaluateQuestionAnswer(birds, 'שקנאי, ינשוף, תנשמת, דוכיפת'), 'עופות: כולם')
  check(!evaluateQuestionAnswer(birds, 'שקנאי, ינשוף'), 'עופות: חלקי נפסל')
}

// ───── שאלות פתוחות מהמאגר החדש ─────
const openCheck = (text, answer, expected) => {
  const question = byText(text)
  check(Boolean(question), `שאלה לא נמצאה: ${text}`)
  if (question) check(evaluateQuestionAnswer(question, answer) === expected, `"${text}" עם "${answer}" - צפוי ${expected}`)
}
openCheck('באיזו שנה הייתה מלחמת השחרור?', '1948', true)
openCheck('באיזו שנה הייתה מלחמת השחרור?', 'תש"ח', true)
openCheck('באיזו שנה הייתה מלחמת השחרור?', '1949', false)
openCheck('מהי עיר הבירה של טורקיה?', 'אנקרה', true)
openCheck('מהי עיר הבירה של טורקיה?', 'איסטנבול', false)
openCheck('מהי עיר הבירה של סין?', 'בייג\'ינג', true)
openCheck('כמה שעות יש ביממה?', 'עשרים וארבע', true)
openCheck('כמה שעות יש ביממה?', '25', false)
openCheck('מה משותף ל: שפעת, סארס, קורונה, הרפס?', 'נגיפים', true)
openCheck('מה משותף ל: שפעת, סארס, קורונה, הרפס?', 'חיידקים', false)

// ───── מעגל השנה ותפילה: דוגמאות ─────
const sample = (pool, text, answer, expected) => {
  const question = pool.find(item => item.text === text)
  check(Boolean(question), `שאלה לא נמצאה: ${text}`)
  if (question) check(evaluateQuestionAnswer(question, answer) === expected, `"${text}" עם "${answer}" - צפוי ${expected}`)
}
sample(yearCycleNew, 'באיזה חודש נפטרה רחל אמנו?', 'חשוון', true)
sample(yearCycleNew, 'באיזה חודש נפטרה רחל אמנו?', 'מרחשוון', true)
sample(yearCycleNew, 'באיזה חודש נפטרה רחל אמנו?', 'כסלו', false)
sample(yearCycleNew, 'באיזה חודש חל פורים קטן?', 'אדר א\'', true)
sample(yearCycleNew, 'באיזה חודש חל פורים קטן?', 'ניסן', false)
sample(yearCycleNew, 'באילו חודשים חלה תענית בה"ב?', 'חשוון ואייר', true)
sample(yearCycleNew, 'באילו חודשים חלה תענית בה"ב?', 'אייר', false)
sample(yearCycleNew, 'מתי קוראים את מגילת רות?', 'בשבועות', true)
sample(yearCycleNew, 'מתי קוראים את מגילת רות?', 'בפורים', false)
sample(yearCycleNew, 'איזה הלל אומרים בפורים?', 'אין אומרים הלל', true)
sample(prayerNew, 'מי תיקן את תפילת מנחה?', 'יצחק', true)
sample(prayerNew, 'מי תיקן את תפילת מנחה?', 'אברהם', false)
sample(prayerNew, 'מאיזו תפילה (או מאיזה ספר) נלקח הציטוט: "כשם שאני רוקד כנגדך"?', 'קידוש לבנה', true)
sample(prayerNew, 'כמה ברכות יש בתפילת שמונה עשרה?', 'תשע עשרה', true)
sample(prayerNew, 'כמה ברכות יש בתפילת שמונה עשרה?', '18', false)
sample(prayerNew, 'מהם שלושת חלקי תפילת שמונה עשרה?', 'שבח, בקשה והודיה', true)
sample(prayerNew, 'מהם שלושת חלקי תפילת שמונה עשרה?', 'שבח ובקשה', false)

// ───── שבת, דינים ואינטליגנציה יהודית: דוגמאות ─────
sample(shabbatNew, 'מי חיבר את הזמר "לכה דודי"?', 'רבי שלמה אלקבץ', true)
sample(shabbatNew, 'מי חיבר את הזמר "לכה דודי"?', 'רבי יהודה הלוי', false)
sample(shabbatNew, 'מה יוצא דופן?', 'צם', true)
sample(lawsNew, 'איזו ברכה מברכים על במבה?', 'שהכל', true)
sample(jewishNew, 'מי חיבר את הספר "מסילת ישרים"?', 'הרמח"ל', true)
sample(jewishNew, 'מי חיבר את הספר "מסילת ישרים"?', 'הרמב"ם', false)
sample(jewishNew, 'באיזה תאריך נפטר: החפץ חיים?', 'כ"ד באלול', true)
sample(jewishNew, 'באיזה תאריך נפטר: החפץ חיים?', 'כ"ה באלול', false)
sample(jewishNew, 'מהו שמו המלא של: הגאון מווילנה?', 'רבי אליהו מווילנה', true)
sample(jewishNew, 'פתחו את ראשי התיבות: פרד"ס', 'פשט רמז דרש סוד', true)
sample(jewishNew, 'סדרו לפי סדר הזמנים בסדר היום היהודי: שקיעה, עלות השחר, חצות, צאת הכוכבים, הנץ החמה, בין השמשות, זריחה.', 'עלות השחר, הנץ החמה, זריחה, חצות, שקיעה, בין השמשות, צאת הכוכבים', true)
sample(jewishNew, 'סדרו לפי סדר הזמנים בסדר היום היהודי: שקיעה, עלות השחר, חצות, צאת הכוכבים, הנץ החמה, בין השמשות, זריחה.', 'שקיעה, חצות, זריחה, הנץ החמה, עלות השחר, בין השמשות, צאת הכוכבים', false)

// ───── פרקי אבות חדש ─────
sample(pirkeiNew, 'השלימו את שם החכם: ______ בן זכאי.', 'יוחנן', true)
sample(pirkeiNew, 'השלימו את שם החכם: ______ בן זכאי.', 'שמעון', false)
sample(pirkeiNew, 'כמה דורות היו מאדם ועד נח?', 'עשרה', true)
sample(pirkeiNew, 'בכמה מעלות התורה נקנית?', '48', true)
sample(pirkeiNew, 'בכמה מעלות התורה נקנית?', '24', false)
sample(pirkeiNew, 'מי אמר: "איזהו עשיר? השמח בחלקו"?', 'בן זומא', true)

console.log(failed === 0 ? `✔ כל הבדיקות עברו (${all.length} שאלות במאגרים החדשים)` : `\n${failed} בדיקות נכשלו`)
process.exit(failed === 0 ? 0 : 1)

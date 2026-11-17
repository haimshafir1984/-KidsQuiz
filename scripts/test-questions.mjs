// בדיקות תקינות למאגר השאלות החדש וללוגיקת סוגי השאלות list ו-self_check.
// הרצה: npm run test:questions
import tanakhNew from '../src/data/tanakhNewQuestions.js'
import giNew from '../src/data/generalIntelligenceNewQuestions.js'
import { evaluateQuestionAnswer, getListMinItems, SELF_CHECK_KNOWN, SELF_CHECK_UNKNOWN } from '../src/utils/questionAnswers.js'

let failed = 0
function check(condition, message) {
  if (!condition) {
    failed += 1
    console.log(`✖ ${message}`)
  }
}

// ───── תקינות מבנה ─────
const all = [...tanakhNew, ...giNew]
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
const explanation = giNew.find(question => question.type === 'self_check')
check(evaluateQuestionAnswer(explanation, SELF_CHECK_KNOWN) === true, 'self_check: ידעתי')
check(evaluateQuestionAnswer(explanation, SELF_CHECK_UNKNOWN) === false, 'self_check: לא ידעתי')

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

console.log(failed === 0 ? `✔ כל הבדיקות עברו (${all.length} שאלות במאגרים החדשים)` : `\n${failed} בדיקות נכשלו`)
process.exit(failed === 0 ? 0 : 1)

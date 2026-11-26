// המרה בין שאלה שמורה לבין מצב העורך. שדות שהעורך לא מציג (תמונה, כותרת קבוצה ועוד) נשמרים כמו שהם.
import { getPlacements } from '../../../utils/placements'

export const CHOICE_TYPES = new Set(['multiple', 'sentence_completion'])
export const OPTION_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י']
export const MAX_OPTIONS = 10
const emptyOption = () => ({ text: '', image: '', correct: false })

const asEditorPlace = place => ({ ...place, requestedIndex: '' })

export function newDraft(places = [], type = 'multiple') {
  return {
    original: {},
    type,
    text: '',
    explanation: '',
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
    unmatched: [],
    answers: [''],
    minItems: 1,
    ordered: false,
    places: places.map(place => asEditorPlace({ activityType: 'practice', ...place })),
  }
}

export function draftFromQuestion(question) {
  const isChoice = CHOICE_TYPES.has(question.type)
  const correct = [...(question.correct_answer || [])]
  const texts = question.options || []
  const marked = new Set()
  const unmatched = []
  if (isChoice) {
    correct.forEach(answer => {
      let index = texts.findIndex((text, i) => text === answer && !marked.has(i))
      if (index === -1) index = texts.findIndex((text, i) => String(text).trim() === String(answer).trim() && !marked.has(i))
      if (index === -1) unmatched.push(answer)
      else marked.add(index)
    })
  }
  const options = texts.map((text, index) => ({ text, image: question.optionImages?.[index] || '', correct: marked.has(index) }))
  while (options.length < 2) options.push(emptyOption())

  return {
    original: question,
    type: question.type,
    text: question.text || '',
    explanation: question.explanation || '',
    options: isChoice ? options : newDraft().options,
    unmatched,
    answers: !isChoice && correct.length > 0 ? correct : [''],
    minItems: question.minItems ?? 1,
    ordered: Boolean(question.ordered),
    places: getPlacements(question).map(asEditorPlace),
  }
}

// עותק נפרד: אותו תוכן ואותם מקומות, אבל שאלה חדשה שלא מתעדכנת יחד עם המקור
export function copyDraft(draft) {
  const { id: _id, placements: _places, position: _position, ...original } = draft.original
  return { ...draft, original, places: draft.places.map(place => ({ ...place, requestedIndex: '' })) }
}

export function markCorrect(draft, index) {
  return { ...draft, unmatched: [], options: draft.options.map((option, i) => ({ ...option, correct: i === index })) }
}

// מחזיר { question, places } לשמירה, או { error }
export function buildQuestion(draft) {
  const text = draft.text.trim()
  if (!text) return { error: 'יש להזין נוסח שאלה.' }
  if (draft.places.length === 0) return { error: 'יש לבחור לפחות מקום אחד שבו השאלה תופיע.' }

  const { placements: _places, optionImages: _images, minItems: _min, ordered: _ordered, ...original } = draft.original
  const question = { ...original, type: draft.type, text, explanation: draft.explanation.trim() }

  if (CHOICE_TYPES.has(draft.type)) {
    if (draft.options.some(option => !option.text.trim() && (option.image || option.correct))) {
      return { error: 'יש אפשרות מסומנת (או עם תמונה) בלי טקסט.' }
    }
    const filled = draft.options.filter(option => option.text.trim())
    if (filled.length < 2) return { error: 'יש להזין לפחות שתי אפשרויות תשובה.' }
    const correct = filled.filter(option => option.correct).map(option => option.text)
    if (correct.length === 0) return { error: 'יש לסמן את התשובה הנכונה בעיגול שליד האפשרות.' }
    question.options = filled.map(option => option.text)
    question.correct_answer = correct
    if (filled.some(option => option.image)) question.optionImages = filled.map(option => option.image)
  } else {
    const answers = draft.answers.filter(answer => answer.trim())
    if (answers.length === 0) return { error: 'יש להזין לפחות תשובה נכונה אחת.' }
    question.options = []
    question.correct_answer = answers
    if (draft.type === 'list') {
      question.minItems = Math.max(1, Number(draft.minItems) || 1)
      question.ordered = Boolean(draft.ordered)
    }
  }

  return {
    question,
    places: draft.places.map(place => ({
      grade: place.grade,
      subject: place.subject,
      level: place.level || null,
      activityType: place.activityType,
      requestedIndex: place.requestedIndex,
    })),
  }
}

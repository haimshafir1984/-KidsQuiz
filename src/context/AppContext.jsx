import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCurrentUser,
  setCurrentUser,
  getQuestions,
  saveQuestions,
  getCustomTracks,
  saveCustomTracks,
  getQuizProgressMap,
  saveQuizProgressMap,
} from '../utils/storage'
import {
  seedAdmin,
  serverFindUser,
  serverFindUserById,
  serverGetUsers,
  serverSaveUser,
  saveResult,
  getUserResults,
  checkSubscription,
  getStoredMode,
  setStoredMode,
  clearStoredMode,
} from '../utils/db'
import { API_ENABLED, api } from '../utils/api'
import seedQuestions, { normalizeImportedQuestionStructure } from '../data/seedQuestions'
import { SELF_CHECK_ENABLED } from '../utils/questionAnswers'
import { BASE_VISIBLE_TRACKS, GENERAL_EXAM_SUBJECT, GRADES } from '../data/learningTracks'
import { normalizeSubjectName } from '../data/subjectCatalog'
import { getUserDisplayName, isProfileComplete } from '../utils/userProfile'

const AppContext = createContext(null)
const GENERAL_EXAM_QUESTION_COUNT = 30
const GENERAL_EXAM_TIME_LIMIT_SECONDS = 20 * 60
const STANDARD_EXAM_TIME_LIMIT_SECONDS = 180
const HOLLAND_SUBJECT = 'שאלון הולנד'
const LEGACY_SUBJECTS = new Set([
  'ידע יהודי - תנ״ך',
  'תפילה וברכות',
  'שבת',
  'מעגל השנה',
  'אינטליגנציה יהודית',
  'אנלוגיות',
  'לשון',
  'הבעה והבנה',
  'אוצר מילים',
  'הסקת מסקנות',
  'השלמת צורות',
  'מתמטיקה - היגיון',
  'סדרות מספרים',
  'אנגלית',
  'ראייה מרחבית',
  'אינטליגנציה כללית',
  'שאלון אישי',
  'פרקי אבות',
  'מטריצות',
  'ידע כמותי',
  'גיאומטריה',
])

function getQuestionGroupKey(question) {
  return [question.grade, question.subject, question.level || 'no-level', question.activityType].join('::')
}

function ensureQuestionPositions(items) {
  const counters = new Map()
  let changed = false

  const normalized = items.map(question => {
    const groupKey = getQuestionGroupKey(question)
    const currentCount = counters.get(groupKey) || 0
    const nextPosition = currentCount + 1
    counters.set(groupKey, nextPosition)

    if (typeof question.position === 'number') {
      counters.set(groupKey, Math.max(nextPosition, question.position))
      return question
    }

    changed = true
    return { ...question, position: nextPosition }
  })

  return { normalized, changed }
}

function sortQuestionsByPosition(items) {
  return [...items].sort((first, second) => {
    const positionDiff = (first.position || 0) - (second.position || 0)
    if (positionDiff !== 0) return positionDiff
    return first.id.localeCompare(second.id)
  })
}

function getQuestionTypesLabel(types, hasVisuals = false) {
  if (hasVisuals) return 'סגורות עם תמונות'
  if (types.has('sentence_completion')) return 'השלמת משפטים'
  if (types.has('multiple') && types.has('open')) return 'פתוחות וסגורות'
  if (types.has('list') || types.has('self_check')) return 'מגוונות'
  if (types.has('multiple')) return 'סגורות'
  if (types.has('open')) return 'פתוחות'
  return 'מותאם אישית'
}

function mergeTrackCollections(baseTracks = [], questionTracks = []) {
  const merged = new Map()

  baseTracks.forEach(track => {
    merged.set(track.subject, {
      ...track,
      levels: [...(track.levels || [])],
      activities: [...(track.activities || ['practice'])],
    })
  })

  questionTracks.forEach(track => {
    const baseTrack = merged.get(track.subject)
    const questionLevels = [...(track.levels || [])]
    // נושא עם תתי-נושאים: שומרים על סדר ההגדרה ועל סוג החלוקה, ולא על מיון אלפביתי
    const keepsBaseOrder = baseTrack?.levelsKind === 'subtopic'
    const levels = keepsBaseOrder
      ? [
          ...baseTrack.levels.filter(level => questionLevels.includes(level)),
          ...questionLevels.filter(level => !baseTrack.levels.includes(level)),
        ]
      : questionLevels

    merged.set(track.subject, {
      ...track,
      ...(keepsBaseOrder ? { levelsKind: baseTrack.levelsKind } : {}),
      levels,
      activities: [...(track.activities || ['practice'])],
    })
  })

  return [...merged.values()].sort((first, second) => first.subject.localeCompare(second.subject, 'he'))
}

function normalizeQuestionSubjects(items) {
  let changed = false

  const normalized = items.map(question => {
    const normalizedSubject = normalizeSubjectName(question.subject)
    if (normalizedSubject === question.subject) return question
    changed = true
    return { ...question, subject: normalizedSubject }
  })

  return { normalized, changed }
}

function normalizeQuestionGroupTitles(items) {
  const normalized = normalizeImportedQuestionStructure(items)
  const changed = normalized.length !== items.length
    || normalized.some((question, index) => {
      const original = items[index]
      return !original
        || original.id !== question.id
        || original.text !== question.text
        || (original.groupTitle || '') !== (question.groupTitle || '')
    })

  return { normalized, changed }
}

function cloneQuestionForTarget(question, target, existingQuestions) {
  const relatedQuestions = existingQuestions.filter(existing => {
    return existing.grade === target.grade
      && existing.subject === target.subject
      && (existing.level || null) === (target.level || null)
      && existing.activityType === target.activityType
  })

  const nextPosition = relatedQuestions.length > 0
    ? Math.max(...relatedQuestions.map(item => item.position || 0)) + 1
    : 1

  return {
    ...question,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    grade: target.grade,
    subject: target.subject,
    level: target.level || null,
    activityType: target.activityType,
    position: nextPosition,
  }
}

function getQuizProgressKey({ userId, grade, subject, level = null, activityType = 'practice' }) {
  return [userId, grade, subject, level || 'no-level', activityType].join('::')
}

function getQuestionCountForSelection(questions, selection) {
  return questions.filter(question => {
    return question.grade === selection.grade
      && question.subject === selection.subject
      && (question.level || null) === (selection.level || null)
      && question.activityType === selection.activityType
  }).length
}

function shuffleItems(items) {
  const nextItems = [...items]

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]]
  }

  return nextItems
}

function getExamTimeLimitSeconds(subject, activityType) {
  if (activityType !== 'exam') return null
  return subject === GENERAL_EXAM_SUBJECT ? GENERAL_EXAM_TIME_LIMIT_SECONDS : STANDARD_EXAM_TIME_LIMIT_SECONDS
}

// מסיר את שדה הסיסמה לפני שמירת המשתמש במצב הלקוח - הסיסמה נחוצה רק בשכבת השרת המדומה
function sanitizeUser(user) {
  if (!user) return user
  const { password, ...sanitized } = user
  return sanitized
}

const SYNC_FAILED_MESSAGE = 'לא הצלחנו לשמור את השינוי בשרת. הנתונים נטענו מחדש, נסו שוב.'
const SAVE_CONCURRENCY = 5

// מריץ את הפעולות בקבוצות קטנות במקביל, כדי שעדכון של מאות שאלות לא יפתח מאות בקשות בבת אחת
async function runInBatches(tasks) {
  let allOk = true
  for (let index = 0; index < tasks.length; index += SAVE_CONCURRENCY) {
    const results = await Promise.all(tasks.slice(index, index + SAVE_CONCURRENCY).map(task => task()))
    if (results.some(result => !result.ok)) allOk = false
  }
  return allOk
}

export function AppProvider({ children }) {
  const gradeValues = useMemo(() => GRADES.map(grade => grade.value), [])

  // במצב מקוון (שרת) המשתמש נטען מהשרת לפי עוגיית ההתחברות; אחרת מה-localStorage
  const [authReady, setAuthReady] = useState(!API_ENABLED)
  const [questionsReady, setQuestionsReady] = useState(!API_ENABLED)
  const [loadError, setLoadError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [remoteResults, setRemoteResults] = useState([])
  const syncQueue = useRef(Promise.resolve())

  const [user, setUser] = useState(() => {
    if (API_ENABLED) return null
    seedAdmin()
    const currentUser = getCurrentUser()
    if (!currentUser) return null
    if (!checkSubscription(currentUser).valid) {
      setCurrentUser(null)
      clearStoredMode()
      return null
    }
    return currentUser
  })

  const [mode, setModeState] = useState(() => {
    if (API_ENABLED) return null
    const currentUser = getCurrentUser()
    if (!currentUser || !checkSubscription(currentUser).valid) return null
    return getStoredMode()
  })

  const [questions, setQuestions] = useState([])
  const [customTracks, setCustomTracks] = useState(() => getCustomTracks())
  const [quizProgressMap, setQuizProgressState] = useState(() => (API_ENABLED ? {} : getQuizProgressMap()))
  const [selectedGrade, setSelectedGrade] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState('practice')
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizResults, setQuizResults] = useState(null)
  const [activeQuizProgress, setActiveQuizProgress] = useState(null)
  const [resultsVersion, setResultsVersion] = useState(0)
  const [quizSession, setQuizSession] = useState({
    timeLimitSeconds: null,
    startedAt: null,
    deadlineAt: null,
  })
  const [hollandAnswers, setHollandAnswers] = useState({})
  const [hollandResults, setHollandResults] = useState(null)
  const [storageError, setStorageError] = useState(null)

  const trackCatalog = useMemo(() => {
    const groupedTracks = Object.fromEntries(gradeValues.map(grade => [grade, new Map()]))

    questions.forEach(question => {
      if (!question.grade || !question.subject || !groupedTracks[question.grade]) return

      const existing = groupedTracks[question.grade].get(question.subject) || {
        subject: question.subject,
        levels: new Set(),
        activities: new Set(),
        types: new Set(),
        hasVisuals: false,
      }

      if (question.level) existing.levels.add(question.level)
      existing.activities.add(question.activityType || 'practice')
      existing.types.add(question.type)
      if (question.image || question.optionImages?.length) {
        existing.hasVisuals = true
      }
      groupedTracks[question.grade].set(question.subject, existing)
    })

    const questionTracks = Object.fromEntries(
      gradeValues.map(grade => [
        grade,
        [...groupedTracks[grade].values()].map(track => ({
          subject: track.subject,
          questionTypes: getQuestionTypesLabel(track.types, track.hasVisuals),
          levels: [...track.levels].sort((first, second) => first.localeCompare(second, 'he')),
          activities: [...track.activities].sort(),
        })),
      ]),
    )

    return Object.fromEntries(
      gradeValues.map(grade => {
        const extraTracks = grade === 'grade-8' || grade === 'grade-12'
          ? [{ subject: HOLLAND_SUBJECT, questionTypes: 'שאלון דירוג אישיותי', levels: [], activities: ['practice'] }]
          : []

        return [
          grade,
          mergeTrackCollections(
            [...(BASE_VISIBLE_TRACKS[grade] || []), ...(customTracks[grade] || []), ...extraTracks],
            questionTracks[grade],
          ),
        ]
      }),
    )
  }, [customTracks, gradeValues, questions])

  const userResults = useMemo(() => {
    if (!user) return []
    if (API_ENABLED) return remoteResults.map(result => ({ ...result, source: 'online' }))
    return getUserResults(user.id)
  }, [resultsVersion, user, remoteResults])

  const savedQuizProgress = useMemo(() => {
    if (!user) return []

    return Object.values(quizProgressMap)
      .filter(item => item.userId === user.id)
      .map(item => ({
        ...item,
        questionCount: item.questionCount || getQuestionCountForSelection(questions, item),
      }))
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
  }, [questions, quizProgressMap, user])

  const STORAGE_FULL_MESSAGE = 'לא ניתן היה לשמור את השינוי - נפח האחסון המקומי מלא. מומלץ למחוק תוכן ישן או תמונות כבדות.'

  function reportPersistResult(succeeded) {
    setStorageError(succeeded ? null : STORAGE_FULL_MESSAGE)
  }

  function clearStorageError() {
    setStorageError(null)
  }

  // מצב שרת: משווים את הרשימה הקודמת לחדשה ושולחים לשרת רק מה שנוסף, השתנה או נמחק
  function syncQuestionsToServer(previousList, nextList) {
    const previousById = new Map(previousList.map(question => [question.id, question]))
    const nextById = new Map(nextList.map(question => [question.id, question]))
    const tasks = []

    const removedIds = previousList.filter(question => !nextById.has(question.id)).map(question => question.id)
    nextList.forEach(question => {
      const before = previousById.get(question.id)
      if (!before) tasks.push(() => api.post('/admin/questions', question))
      else if (JSON.stringify(before) !== JSON.stringify(question)) tasks.push(() => api.put(`/admin/questions/${encodeURIComponent(question.id)}`, question))
    })
    if (removedIds.length > 0) tasks.push(() => api.post('/admin/questions/delete', { ids: removedIds }))
    if (tasks.length === 0) return

    // פעולות נשמרות לפי הסדר, גם אם המנהל לוחץ מהר
    syncQueue.current = syncQueue.current.then(async () => {
      const allOk = await runInBatches(tasks)
      if (allOk) { setStorageError(null); return }
      setStorageError(SYNC_FAILED_MESSAGE)
      const fresh = await api.get('/questions')
      if (fresh.ok) setQuestions(fresh.data.questions)
    })
  }

  function persistQuestionsList(list) {
    if (API_ENABLED) {
      syncQuestionsToServer(questions, list)
      setQuestions(list)
      return
    }
    setQuestions(list)
    reportPersistResult(saveQuestions(list))
  }

  function persistTracks(tracks) {
    setCustomTracks(tracks)
    reportPersistResult(saveCustomTracks(tracks))
  }

  function persistQuizProgress(nextMap) {
    if (API_ENABLED) {
      // ההתקדמות נשמרת בשרת לפי משתמש, כך שאפשר להמשיך ממכשיר אחר
      Object.keys(nextMap).forEach(key => {
        if (nextMap[key] !== quizProgressMap[key]) api.put(`/progress/${encodeURIComponent(key)}`, nextMap[key])
      })
      Object.keys(quizProgressMap).forEach(key => {
        if (!(key in nextMap)) api.delete(`/progress/${encodeURIComponent(key)}`)
      })
      setQuizProgressState(nextMap)
      return
    }
    setQuizProgressState(nextMap)
    reportPersistResult(saveQuizProgressMap(nextMap))
  }

  // מצב שרת: שחזור ההתחברות מהעוגייה בעת טעינת האתר
  useEffect(() => {
    if (!API_ENABLED) return
    let cancelled = false
    api.get('/auth/me').then(response => {
      if (cancelled) return
      if (response.ok && response.data?.user) {
        setUser(response.data.user)
        setModeState('online')
      }
      setAuthReady(true)
    })
    return () => { cancelled = true }
  }, [])

  // מצב שרת: אחרי התחברות טוענים שאלות והתקדמות; כשמתנתקים מנקים את הנתונים מהזיכרון
  useEffect(() => {
    if (!API_ENABLED || !authReady) return
    if (!user) {
      setQuestions([])
      setQuizProgressState({})
      setRemoteResults([])
      setQuestionsReady(true)
      return
    }
    let cancelled = false
    setQuestionsReady(false)
    setLoadError(null)
    Promise.all([api.get('/questions'), api.get('/progress')]).then(([questionsResponse, progressResponse]) => {
      if (cancelled) return
      if (!questionsResponse.ok) {
        setLoadError(questionsResponse.error)
        setQuestionsReady(true)
        return
      }
      setQuestions(ensureQuestionPositions(questionsResponse.data.questions).normalized)
      setQuizProgressState(progressResponse.ok ? progressResponse.data.progress : {})
      setQuestionsReady(true)
    })
    return () => { cancelled = true }
  }, [user?.id, authReady, reloadToken])

  // מצב שרת: תוצאות המשתמש המחובר
  useEffect(() => {
    if (!API_ENABLED || !user) return
    let cancelled = false
    api.get('/results/me').then(response => {
      if (!cancelled && response.ok) setRemoteResults(response.data.results)
    })
    return () => { cancelled = true }
  }, [user?.id, resultsVersion])

  useEffect(() => {
    if (API_ENABLED) return
    const stored = getQuestions()

    if (stored?.length > 0) {
      const hasNewSchema = stored.every(question => question.grade && question.subject && question.activityType)

      if (!hasNewSchema) {
        const normalizedSeedQuestions = normalizeQuestionSubjects(seedQuestions).normalized
        const { normalized } = ensureQuestionPositions(normalizedSeedQuestions)
        saveQuestions(normalized)
        setQuestions(normalized)
        return
      }

      const withoutLegacyQuestions = stored.filter(question => (
        !LEGACY_SUBJECTS.has(question.subject)
        && (SELF_CHECK_ENABLED || question.type !== 'self_check')
      ))
      const storedIds = new Set(withoutLegacyQuestions.map(question => question.id))
      const missingSeedQuestions = seedQuestions.filter(question => !storedIds.has(question.id))
      const mergedQuestions = missingSeedQuestions.length > 0 ? [...withoutLegacyQuestions, ...missingSeedQuestions] : withoutLegacyQuestions
      const { normalized: subjectNormalizedQuestions, changed: subjectNamesChanged } = normalizeQuestionSubjects(mergedQuestions)
      const { normalized: titleNormalizedQuestions, changed: groupTitlesChanged } = normalizeQuestionGroupTitles(subjectNormalizedQuestions)
      const { normalized, changed } = ensureQuestionPositions(titleNormalizedQuestions)

      if (stored.length !== withoutLegacyQuestions.length || missingSeedQuestions.length > 0 || subjectNamesChanged || groupTitlesChanged || changed) {
        saveQuestions(normalized)
      }

      setQuestions(normalized)
      return
    }

    const normalizedSeedQuestions = normalizeQuestionSubjects(seedQuestions).normalized
    const titleNormalizedSeedQuestions = normalizeQuestionGroupTitles(normalizedSeedQuestions).normalized
    const { normalized } = ensureQuestionPositions(titleNormalizedSeedQuestions)
    saveQuestions(normalized)
    setQuestions(normalized)
  }, [])

  // כניסה/הרשמה מול השרת: ההרשאה, הסיסמה והמנוי נבדקים בשרת בלבד
  async function serverAuth(path, body) {
    const response = await api.post(path, body)
    if (!response.ok) return { error: response.error, expired: Boolean(response.data?.expired) }
    setModeState('online')
    setUser(response.data.user)
    return { success: true, user: response.data.user }
  }

  async function login(identifier, password) {
    if (API_ENABLED) return serverAuth('/auth/login', { identifier, password })
    const found = serverFindUser(identifier)
    if (!found || found.password !== password) return { error: 'שם משתמש או סיסמה שגויים' }
    const { valid } = checkSubscription(found)
    if (!valid) return { error: 'פג תוקף המנוי שלך', expired: true }
    clearStoredMode()
    setModeState(null)
    const sanitizedUser = sanitizeUser(found)
    setCurrentUser(sanitizedUser)
    setUser(sanitizedUser)
    return { success: true, user: sanitizedUser }
  }

  async function register(profileData) {
    if (API_ENABLED) {
      return serverAuth('/auth/register', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        city: profileData.city,
        phone: profileData.phone,
        email: profileData.email,
        password: profileData.password,
        birthDate: profileData.birthDate || '',
        acceptTerms: profileData.acceptTerms === true,
        turnstileToken: profileData.turnstileToken || '',
      })
    }
    const baseUsername = profileData.username?.trim().replace(/\s+/g, ' ') || ''
    const normalizedEmail = profileData.email?.trim().toLowerCase() || ''
    const users = serverGetUsers()
    if (!baseUsername || !profileData.password?.trim()) {
      return { error: 'יש למלא שם משתמש וסיסמה' }
    }

    if (normalizedEmail && users.find(existingUser => existingUser.email?.trim().toLowerCase() === normalizedEmail)) {
      return { error: 'כבר קיים חשבון עם כתובת המייל הזו' }
    }

    // מספר תלמידים עם אותו שם פרטי ושם משפחה יקבלו שם משתמש ייחודי במספר סידורי, במקום להיחסם מהרשמה
    function isUsernameTaken(candidate) {
      return users.some(existingUser => existingUser.username?.trim().toLowerCase() === candidate.toLowerCase())
    }

    let uniqueUsername = baseUsername
    let suffix = 2
    while (isUsernameTaken(uniqueUsername)) {
      uniqueUsername = `${baseUsername} ${suffix}`
      suffix += 1
    }

    const newUser = {
      id: crypto.randomUUID(),
      username: uniqueUsername,
      password: profileData.password,
      role: 'student',
      subscription_date: new Date().toISOString(),
      firstName: profileData.firstName?.trim() || '',
      lastName: profileData.lastName?.trim() || '',
      city: profileData.city?.trim() || '',
      birthDate: profileData.birthDate || '',
      phone: profileData.phone?.trim() || '',
      email: normalizedEmail,
    }

    serverSaveUser(newUser)
    clearStoredMode()
    setModeState(null)
    const sanitizedUser = sanitizeUser(newUser)
    setCurrentUser(sanitizedUser)
    setUser(sanitizedUser)
    return { success: true, user: sanitizedUser }
  }

  async function updateUserProfile(profileData) {
    if (!user) return { error: 'לא נמצא משתמש פעיל.' }

    if (API_ENABLED) {
      const response = await api.patch('/auth/me', profileData)
      if (!response.ok) return { error: response.error }
      setUser(response.data.user)
      return { success: true, user: response.data.user }
    }

    const fullUser = serverFindUserById(user.id) || user
    const nextUser = {
      ...fullUser,
      firstName: profileData.firstName?.trim() || '',
      lastName: profileData.lastName?.trim() || '',
      city: profileData.city?.trim() || '',
      birthDate: profileData.birthDate || '',
      phone: profileData.phone?.trim() || '',
    }

    if (!isProfileComplete(nextUser)) {
      return { error: 'יש למלא שם, שם משפחה ועיר מגורים.' }
    }

    serverSaveUser(nextUser)
    const sanitizedUser = sanitizeUser(nextUser)
    setCurrentUser(sanitizedUser)
    setUser(sanitizedUser)
    return { success: true, user: sanitizedUser }
  }

  function resetLearningFlow() {
    setSelectedGrade(null)
    setSelectedSubject(null)
    setSelectedLevel(null)
    setSelectedActivity('practice')
    setQuizQuestions([])
    setQuizResults(null)
    setActiveQuizProgress(null)
    setQuizSession({ timeLimitSeconds: null, startedAt: null, deadlineAt: null })
    setHollandAnswers({})
    setHollandResults(null)
  }

  function logout() {
    if (API_ENABLED) api.post('/auth/logout')
    setCurrentUser(null)
    setUser(null)
    clearStoredMode()
    setModeState(null)
    resetLearningFlow()
  }

  // טעינה מחדש של השאלות מהשרת (למשל אחרי שחזור שאלה שנמחקה)
  async function refreshQuestions() {
    if (!API_ENABLED) return
    const response = await api.get('/questions')
    if (response.ok) setQuestions(ensureQuestionPositions(response.data.questions).normalized)
  }

  // זכות מחיקה: מחיקת החשבון וכל הנתונים בשרת, באישור סיסמה
  async function deleteMyAccount(password) {
    if (!API_ENABLED) return { error: 'מחיקת חשבון זמינה רק באתר המקוון' }
    const response = await api.delete('/auth/me', { password })
    if (!response.ok) return { error: response.error }
    logout()
    return { success: true }
  }

  function setMode(modeValue) {
    setStoredMode(modeValue)
    setModeState(modeValue)
  }

  function addQuestion(question) {
    const relatedQuestions = questions.filter(existing => getQuestionGroupKey(existing) === getQuestionGroupKey(question))
    const nextPosition = question.position || (relatedQuestions.length > 0 ? Math.max(...relatedQuestions.map(item => item.position || 0)) + 1 : 1)
    const newQuestion = { ...question, id: `custom-${crypto.randomUUID()}`, position: nextPosition }
    const updatedQuestions = [...questions, newQuestion]
    persistQuestionsList(updatedQuestions)
    return newQuestion
  }

  function updateQuestion(id, data) {
    const currentQuestion = questions.find(question => question.id === id)
    if (!currentQuestion) return

    let updatedQuestion = { ...currentQuestion, ...data }

    const groupChanged = ['grade', 'subject', 'level', 'activityType'].some(field => {
      return (currentQuestion[field] || null) !== (updatedQuestion[field] || null)
    })

    if (groupChanged) {
      const targetGroupQuestions = questions.filter(question => {
        return question.id !== id
          && question.grade === updatedQuestion.grade
          && question.subject === updatedQuestion.subject
          && (question.level || null) === (updatedQuestion.level || null)
          && question.activityType === updatedQuestion.activityType
      })

      updatedQuestion = {
        ...updatedQuestion,
        position: targetGroupQuestions.length > 0
          ? Math.max(...targetGroupQuestions.map(question => question.position || 0)) + 1
          : 1,
      }
    }

    const updatedQuestions = questions.map(question => (question.id === id ? updatedQuestion : question))
    const { normalized } = ensureQuestionPositions(updatedQuestions)
    persistQuestionsList(normalized)
  }

  function duplicateQuestionToTargets(id, targets) {
    const sourceQuestion = questions.find(question => question.id === id)
    if (!sourceQuestion || !targets?.length) return []

    let workingQuestions = [...questions]
    const createdQuestions = []

    targets.forEach(target => {
      const alreadyExists = workingQuestions.some(question => {
        return question.grade === target.grade
          && question.subject === target.subject
          && (question.level || null) === (target.level || null)
          && question.activityType === target.activityType
          && question.text.trim() === sourceQuestion.text.trim()
      })

      if (alreadyExists) return

      const clonedQuestion = cloneQuestionForTarget(sourceQuestion, target, workingQuestions)
      workingQuestions.push(clonedQuestion)
      createdQuestions.push(clonedQuestion)
    })

    if (createdQuestions.length === 0) return []

    persistQuestionsList(workingQuestions)
    return createdQuestions
  }

  function deleteQuestion(id) {
    const updatedQuestions = questions.filter(question => question.id !== id)
    persistQuestionsList(updatedQuestions)
  }

  function deleteQuestions(ids) {
    const idSet = new Set(ids)
    const updatedQuestions = questions.filter(question => !idSet.has(question.id))
    persistQuestionsList(updatedQuestions)
  }

  function moveQuestion(id, direction) {
    const targetQuestion = questions.find(question => question.id === id)
    if (!targetQuestion) return

    const relatedQuestions = sortQuestionsByPosition(
      questions.filter(question => getQuestionGroupKey(question) === getQuestionGroupKey(targetQuestion)),
    )
    const currentIndex = relatedQuestions.findIndex(question => question.id === id)
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (nextIndex < 0 || nextIndex >= relatedQuestions.length) return

    const swappedQuestion = relatedQuestions[nextIndex]
    const updatedQuestions = questions.map(question => {
      if (question.id === targetQuestion.id) return { ...question, position: swappedQuestion.position }
      if (question.id === swappedQuestion.id) return { ...question, position: targetQuestion.position }
      return question
    })

    persistQuestionsList(updatedQuestions)
  }

  function addTrack(track) {
    const normalizedTrack = {
      id: `track-${crypto.randomUUID()}`,
      subject: track.subject.trim(),
      questionTypes: track.questionTypes.trim() || 'מותאם אישית',
      levels: track.levels || [],
      activities: track.activities?.length ? track.activities : ['practice'],
    }

    const nextTracks = {
      ...customTracks,
      [track.grade]: [...(customTracks[track.grade] || []), normalizedTrack],
    }

    persistTracks(nextTracks)
    return normalizedTrack
  }

  function assignTrackToGrade({ sourceGrade, sourceSubject, targetGrade, includeQuestions = false }) {
    const sourceTrack = (trackCatalog[sourceGrade] || []).find(track => track.subject === sourceSubject)
    if (!sourceTrack || sourceGrade === targetGrade) return { createdTrack: false, copiedQuestions: 0 }

    const targetHasTrack = (trackCatalog[targetGrade] || []).some(track => track.subject === sourceSubject)
    let nextTracks = customTracks
    let createdTrack = false

    if (!targetHasTrack) {
      const normalizedTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        subject: sourceTrack.subject,
        questionTypes: sourceTrack.questionTypes,
        levels: [...(sourceTrack.levels || [])],
        activities: [...(sourceTrack.activities || ['practice'])],
      }

      nextTracks = {
        ...customTracks,
        [targetGrade]: [...(customTracks[targetGrade] || []), normalizedTrack],
      }

      persistTracks(nextTracks)
      createdTrack = true
    }

    if (!includeQuestions) {
      return { createdTrack, copiedQuestions: 0 }
    }

    const sourceQuestions = questions.filter(question => question.grade === sourceGrade && question.subject === sourceSubject)
    if (sourceQuestions.length === 0) {
      return { createdTrack, copiedQuestions: 0 }
    }

    const targetQuestions = questions.filter(question => question.grade === targetGrade && question.subject === sourceSubject)
    let workingQuestions = [...questions]
    let copiedQuestions = 0

    sourceQuestions.forEach(question => {
      const alreadyExists = targetQuestions.some(existing => {
        return existing.text.trim() === question.text.trim()
          && (existing.level || null) === (question.level || null)
          && existing.activityType === question.activityType
      })

      if (alreadyExists) return

      const clonedQuestion = cloneQuestionForTarget(question, {
        grade: targetGrade,
        subject: sourceSubject,
        level: question.level || null,
        activityType: question.activityType,
      }, workingQuestions)

      workingQuestions.push(clonedQuestion)
      copiedQuestions += 1
    })

    if (copiedQuestions > 0) {
      persistQuestionsList(workingQuestions)
    }

    return { createdTrack, copiedQuestions }
  }

  function renameTrack(grade, currentSubject, nextSubject) {
    const trimmedSubject = nextSubject.trim()
    if (!trimmedSubject || trimmedSubject === currentSubject) return

    const updatedQuestions = questions.map(question => (
      question.grade === grade && question.subject === currentSubject
        ? { ...question, subject: trimmedSubject }
        : question
    ))

    const nextTracks = {
      ...customTracks,
      [grade]: (customTracks[grade] || []).map(track => (
        track.subject === currentSubject ? { ...track, subject: trimmedSubject } : track
      )),
    }

    persistQuestionsList(updatedQuestions)
    persistTracks(nextTracks)
  }

  function deleteTrack(grade, subject) {
    const updatedQuestions = questions.filter(question => !(question.grade === grade && question.subject === subject))
    const nextTracks = {
      ...customTracks,
      [grade]: (customTracks[grade] || []).filter(track => track.subject !== subject),
    }

    persistQuestionsList(updatedQuestions)
    persistTracks(nextTracks)

    if (selectedGrade === grade && selectedSubject === subject) {
      setSelectedSubject(null)
      setSelectedLevel(null)
      setQuizQuestions([])
      setQuizResults(null)
    }
  }

  function getSavedQuizProgress(selection) {
    if (!user) return null
    const key = getQuizProgressKey({ userId: user.id, ...selection })
    const progress = quizProgressMap[key]
    if (!progress) return null

    return {
      ...progress,
      questionCount: progress.questionCount || getQuestionCountForSelection(questions, selection),
    }
  }

  function saveQuizProgress(selection, progressData) {
    if (!user) return null

    const key = getQuizProgressKey({ userId: user.id, ...selection })
    const entry = {
      key,
      userId: user.id,
      ...selection,
      ...progressData,
      updatedAt: new Date().toISOString(),
      questionCount: progressData.questionCount || getQuestionCountForSelection(questions, selection),
    }

    const nextMap = {
      ...quizProgressMap,
      [key]: entry,
    }

    persistQuizProgress(nextMap)
    setActiveQuizProgress(entry)
    return entry
  }

  function clearQuizProgress(selection) {
    if (!user) return
    const key = getQuizProgressKey({ userId: user.id, ...selection })
    if (!quizProgressMap[key]) return

    const nextMap = { ...quizProgressMap }
    delete nextMap[key]
    persistQuizProgress(nextMap)

    if (activeQuizProgress?.key === key) {
      setActiveQuizProgress(null)
    }
  }

  function chooseGrade(grade) {
    setSelectedGrade(grade)
    setSelectedSubject(null)
    setSelectedLevel(null)
    setSelectedActivity('practice')
    setQuizQuestions([])
    setQuizResults(null)
    setActiveQuizProgress(null)
    setHollandAnswers({})
    setHollandResults(null)
  }

  function chooseSubject(subject) {
    setSelectedSubject(subject)
    setSelectedLevel(null)
    setSelectedActivity('practice')
    setQuizQuestions([])
    setQuizResults(null)
    setActiveQuizProgress(null)
    setHollandAnswers({})
    setHollandResults(null)
  }

  function prepareQuiz({ grade, subject, level = null, activityType = 'practice', restart = false }) {
    setSelectedGrade(grade)
    setSelectedSubject(subject)
    setSelectedLevel(level)
    setSelectedActivity(activityType)
    setHollandAnswers({})
    setHollandResults(null)

    const selection = { grade, subject, level, activityType }
    const savedProgress = restart ? null : getSavedQuizProgress(selection)

    const filteredQuestions = subject === GENERAL_EXAM_SUBJECT
      ? (() => {
          const allGradeQuestions = sortQuestionsByPosition(questions.filter(question => {
            return question.grade === grade
              && question.subject !== HOLLAND_SUBJECT
              && question.subject !== GENERAL_EXAM_SUBJECT
              && question.activityType === 'practice'
              // שאלות רשימה והסבר מתאימות לתרגול בלבד, לא למבחן על זמן
              && question.type !== 'list'
              && question.type !== 'self_check'
          }))

          if (savedProgress?.questionIds?.length) {
            const questionMap = new Map(allGradeQuestions.map(question => [question.id, question]))
            return savedProgress.questionIds
              .map(questionId => questionMap.get(questionId))
              .filter(Boolean)
          }

          return shuffleItems(allGradeQuestions).slice(0, GENERAL_EXAM_QUESTION_COUNT)
        })()
      : sortQuestionsByPosition(questions.filter(question => {
          const sameGrade = question.grade === grade
          const sameSubject = question.subject === subject
          const sameActivity = question.activityType === activityType
          const sameLevel = (question.level || null) === (level || null)
          return sameGrade && sameSubject && sameActivity && sameLevel
        }))

    setQuizQuestions(filteredQuestions)
    setQuizResults(null)

    if (restart) {
      clearQuizProgress(selection)
    } else {
      setActiveQuizProgress(savedProgress)
    }
    setQuizSession(
      activityType === 'exam' && savedProgress?.quizSession
        ? savedProgress.quizSession
        : {
            timeLimitSeconds: getExamTimeLimitSeconds(subject, activityType),
            startedAt: null,
            deadlineAt: null,
          },
    )

    return filteredQuestions
  }

  function beginHollandQuestionnaire(grade) {
    setSelectedGrade(grade)
    setSelectedSubject(HOLLAND_SUBJECT)
    setSelectedLevel(null)
    setSelectedActivity('practice')
    setQuizQuestions([])
    setQuizResults(null)
    setActiveQuizProgress(null)
    setQuizSession({ timeLimitSeconds: null, startedAt: null, deadlineAt: null })
    setHollandAnswers({})
    setHollandResults(null)
  }

  function updateHollandAnswer(questionId, value) {
    setHollandAnswers(previous => ({ ...previous, [questionId]: value }))
  }

  function finishHollandQuestionnaire(summary) {
    const completedAt = new Date().toISOString()
    const storedSummary = {
      ...summary,
      completedAt,
      subject: HOLLAND_SUBJECT,
      grade: selectedGrade,
    }

    setHollandResults(storedSummary)

    if (user) {
      recordResult({
        id: crypto.randomUUID(),
        userId: user.id,
        subject: HOLLAND_SUBJECT,
        age: selectedGrade,
        activityType: 'assessment',
        score: storedSummary.topScore,
        total: 12,
        answered: Object.keys(hollandAnswers).length,
        percent: Math.round((storedSummary.topScore / 12) * 100),
        topCode: storedSummary.topCode,
        secondCode: storedSummary.secondCode,
        combinedCode: storedSummary.combinedCode,
        date: completedAt,
      }, mode || 'offline')
    }
  }

  // שמירת תוצאה: בשרת במצב מקוון, אחרת ב-localStorage. אחרי השמירה מרעננים את רשימת התוצאות
  async function recordResult(result, resultMode) {
    if (API_ENABLED) {
      const response = await api.post('/results', result)
      if (!response.ok) setStorageError('לא הצלחנו לשמור את התוצאה בשרת. התוצאה לא תופיע ברשימה.')
    } else {
      reportPersistResult(saveResult(result, resultMode))
    }
    setResultsVersion(previous => previous + 1)
  }

  function beginExamSession() {
    const now = Date.now()
    const timeLimitSeconds = getExamTimeLimitSeconds(selectedSubject, selectedActivity)
    const nextSession = {
      timeLimitSeconds,
      startedAt: now,
      deadlineAt: now + ((timeLimitSeconds || 0) * 1000),
    }
    setQuizSession(nextSession)

    if (user && selectedGrade && selectedSubject) {
      saveQuizProgress(
        {
          grade: selectedGrade,
          subject: selectedSubject,
          level: selectedLevel,
          activityType: selectedActivity,
        },
        {
          currentIdx: 0,
          results: [],
          answered: false,
          selectedAnswer: null,
          isCorrect: null,
          quizSession: nextSession,
          questionCount: quizQuestions.length,
          questionIds: quizQuestions.map(question => question.id),
        },
      )
    }
  }

  function finishQuiz(results, meta = {}) {
    const totalQuestions = quizQuestions.length
    const score = results.filter(result => result.correct).length
    const percent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
    const answeredIds = new Set(results.map(result => result.question.id))
    const unansweredItems = quizQuestions
      .filter(question => !answeredIds.has(question.id))
      .map(question => ({ question, userAnswer: null, correct: false }))
    const summary = {
      items: [...results, ...unansweredItems],
      totalQuestions,
      answeredQuestions: results.length,
      correctAnswers: score,
      incorrectAnswers: totalQuestions - score,
      percent,
      timedOut: Boolean(meta.timedOut),
      secondsLeft: meta.secondsLeft ?? null,
      activityType: selectedActivity,
      subject: selectedSubject,
      grade: selectedGrade,
      level: selectedLevel,
      completedAt: new Date().toISOString(),
    }

    setQuizResults(summary)
    clearQuizProgress({
      grade: selectedGrade,
      subject: selectedSubject,
      level: selectedLevel,
      activityType: selectedActivity,
    })

    if (user) {
      recordResult({
        id: crypto.randomUUID(),
        userId: user.id,
        subject: selectedSubject,
        age: selectedGrade,
        level: selectedLevel,
        activityType: selectedActivity,
        score,
        total: totalQuestions,
        answered: results.length,
        percent,
        date: summary.completedAt,
      }, mode || 'offline')
    }
  }

  return (
    <AppContext.Provider
      value={{
        user,
        userDisplayName: getUserDisplayName(user),
        profileComplete: isProfileComplete(user),
        login,
        register,
        updateUserProfile,
        logout,
        deleteMyAccount,
        refreshQuestions,
        mode,
        setMode,
        questions,
        addQuestion,
        updateQuestion,
        duplicateQuestionToTargets,
        deleteQuestion,
        deleteQuestions,
        moveQuestion,
        trackCatalog,
        addTrack,
        assignTrackToGrade,
        renameTrack,
        deleteTrack,
        selectedGrade,
        selectedSubject,
        selectedLevel,
        selectedActivity,
        quizQuestions,
        quizResults,
        userResults,
        savedQuizProgress,
        activeQuizProgress,
        quizSession,
        hollandAnswers,
        hollandResults,
        chooseGrade,
        chooseSubject,
        setSelectedLevel,
        setSelectedActivity,
        prepareQuiz,
        getSavedQuizProgress,
        saveQuizProgress,
        clearQuizProgress,
        beginHollandQuestionnaire,
        updateHollandAnswer,
        finishHollandQuestionnaire,
        beginExamSession,
        finishQuiz,
        resetLearningFlow,
        storageError,
        clearStorageError,
        appReady: authReady && questionsReady,
        loadError,
        retryLoad: () => setReloadToken(previous => previous + 1),
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}

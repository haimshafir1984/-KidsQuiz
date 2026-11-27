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
  getSiteSettings,
  saveSiteSettings,
  getContentVersion,
  saveContentVersion,
} from '../utils/storage'
import contentFixes from '../data/contentFixes'
import { applyContentFixes, CONTENT_FIXES_VERSION } from '../utils/contentFixes'
import { normalizeSiteSettings, pickDemoQuestions } from '../utils/siteSettings'
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
import { API_ENABLED, SUBSCRIPTION_EXPIRED_EVENT, api } from '../utils/api'
import { diffTracks, findLocalOnlyTracks } from '../utils/tracksSync'
import { expandPlacements, uniqueById } from '../utils/placements'
import seedQuestions from '../data/seedQuestions'
import { SELF_CHECK_ENABLED } from '../utils/questionAnswers'
import { BASE_VISIBLE_TRACKS, GENERAL_EXAM_SUBJECT, GRADES } from '../data/learningTracks'
import { getUserDisplayName, isProfileComplete } from '../utils/userProfile'
import {
  GENERAL_EXAM_QUESTION_COUNT,
  HOLLAND_SUBJECT,
  LEGACY_SUBJECTS,
  ensureQuestionPositions,
  sortQuestionsByPosition,
  getQuestionTypesLabel,
  mergeTrackCollections,
  normalizeQuestionSubjects,
  normalizeQuestionGroupTitles,
  getQuizProgressKey,
  getQuestionCountForSelection,
  shuffleItems,
  getExamTimeLimitSeconds,
  sanitizeUser,
  SYNC_FAILED_MESSAGE,
  runInBatches,
} from './appHelpers'

const AppContext = createContext(null)
const LOCAL_TRACKS_DISMISSED_KEY = 'kq_local_tracks_dismissed'

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
  // באתר המקוון הנושאים נטענים מהשרת. מה ששמור בדפדפן מלפני כן לא נמחק, ומוצע למנהל להעלאה
  const [customTracks, setCustomTracks] = useState(() => (API_ENABLED ? {} : getCustomTracks()))
  const [localTracksDismissed, setLocalTracksDismissed] = useState(() => {
    try { return localStorage.getItem(LOCAL_TRACKS_DISMISSED_KEY) === '1' } catch { return false }
  })
  const [tracksLoaded, setTracksLoaded] = useState(false)
  const [quizProgressMap, setQuizProgressState] = useState(() => (API_ENABLED ? {} : getQuizProgressMap()))
  const [selectedGrade, setSelectedGrade] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState('practice')
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizResults, setQuizResults] = useState(null)
  const [mistakesPractice, setMistakesPractice] = useState(false)
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

  // תלמיד באתר המקוון לא רואה תתי-נושאים ריקים; מנהל (וגם מצב הדמו) רואה הכול
  const showEmptyLevels = !API_ENABLED || user?.role === 'admin'

  // צד התלמיד: שאלה שמשויכת לכמה מקומות מופיעה בכל אחד מהם. questions עצמו נשאר רשומה אחת לשאלה (לניהול)
  const placedQuestions = useMemo(() => expandPlacements(questions), [questions])

  const trackCatalog = useMemo(() => {
    const groupedTracks = Object.fromEntries(gradeValues.map(grade => [grade, new Map()]))

    placedQuestions.forEach(question => {
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
            [...(BASE_VISIBLE_TRACKS[grade] || []), ...(customTracks[grade] || []).map(track => ({ ...track, defined: true })), ...extraTracks],
            questionTracks[grade],
            { showEmptyLevels },
          ),
        ]
      }),
    )
  }, [customTracks, gradeValues, placedQuestions, showEmptyLevels])

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
        questionCount: item.questionCount || getQuestionCountForSelection(placedQuestions, item),
      }))
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
  }, [placedQuestions, quizProgressMap, user])

  const STORAGE_FULL_MESSAGE = 'לא ניתן היה לשמור את השינוי - נפח האחסון המקומי מלא. מומלץ למחוק תוכן ישן או תמונות כבדות.'

  function reportPersistResult(succeeded) {
    setStorageError(succeeded ? null : STORAGE_FULL_MESSAGE)
  }

  function clearStorageError() {
    setStorageError(null)
  }

  // מצב שרת: משווים את הרשימה הקודמת לחדשה ושולחים לשרת רק מה שנוסף, השתנה או נמחק
  function questionSyncTasks(previousList, nextList) {
    const previousById = new Map(previousList.map(question => [question.id, question]))
    const nextById = new Map(nextList.map(question => [question.id, question]))
    const tasks = []

    const removedIds = previousList.filter(question => !nextById.has(question.id)).map(question => question.id)
    nextList.forEach(question => {
      const before = previousById.get(question.id)
      if (!before) tasks.push(() => api.post('/admin/questions', question))
      else if (before !== question && JSON.stringify(before) !== JSON.stringify(question)) tasks.push(() => api.put(`/admin/questions/${encodeURIComponent(question.id)}`, question))
    })
    if (removedIds.length > 0) tasks.push(() => api.post('/admin/questions/delete', { ids: removedIds }))
    return tasks
  }

  // פעולות נשמרות לפי הסדר, גם אם המנהל לוחץ מהר. התוצאה: האם כל מה שבתור הזה נשמר
  function enqueueSave(tasks) {
    if (tasks.length === 0) return
    syncQueue.current = syncQueue.current.then(async () => {
      const allOk = await runInBatches(tasks)
      if (allOk) { setStorageError(null); return true }
      setStorageError(SYNC_FAILED_MESSAGE)
      const [fresh, freshTracks] = await Promise.all([api.get('/questions'), api.get('/tracks')])
      if (fresh.ok) setQuestions(fresh.data.questions)
      if (freshTracks.ok) setCustomTracks(freshTracks.data.tracks)
      return false
    })
  }

  // להמתנה לאישור השרת לפני הודעת הצלחה. במצב מקומי השמירה מיידית
  async function whenSaved() {
    if (!API_ENABLED) return true
    return (await syncQueue.current) !== false
  }

  // שינוי תוכן מהניהול: רשימת שאלות ו/או נושאים. נשמר כפעולה אחת, כדי שהודעת ההצלחה תשקף את כל הבקשות
  function applyContent({ questions: nextQuestions, tracks: nextTracks }) {
    const questionsChanged = Boolean(nextQuestions) && nextQuestions !== questions
    const tracksChanged = Boolean(nextTracks) && nextTracks !== customTracks

    if (API_ENABLED) {
      const tasks = []
      if (tracksChanged) {
        const { upserts, removals } = diffTracks(customTracks, nextTracks)
        tasks.push(...removals.map(item => () => api.post('/admin/tracks/delete', item)))
        tasks.push(...upserts.map(item => () => api.put('/admin/tracks', item)))
        setCustomTracks(nextTracks)
      }
      if (questionsChanged) {
        tasks.push(...questionSyncTasks(questions, nextQuestions))
        setQuestions(nextQuestions)
      }
      enqueueSave(tasks)
      return
    }

    let saved = true
    if (questionsChanged) {
      setQuestions(nextQuestions)
      saved = saveQuestions(nextQuestions) && saved
    }
    if (tracksChanged) {
      setCustomTracks(nextTracks)
      saved = saveCustomTracks(nextTracks) && saved
    }
    reportPersistResult(saved)
  }

  const localOnlyTracks = useMemo(() => {
    if (!API_ENABLED || !tracksLoaded || localTracksDismissed || user?.role !== 'admin') return []
    return findLocalOnlyTracks(getCustomTracks(), customTracks)
  }, [customTracks, localTracksDismissed, tracksLoaded, user?.role])

  async function uploadLocalTracks() {
    let allOk = true
    for (const track of localOnlyTracks) {
      const response = await api.put('/admin/tracks', { ...track, createOnly: true })
      if (!response.ok) allOk = false
    }
    const fresh = await api.get('/tracks')
    if (fresh.ok) setCustomTracks(fresh.data.tracks)
    if (!allOk) setStorageError(SYNC_FAILED_MESSAGE)
    return allOk
  }

  function dismissLocalTracks() {
    try { localStorage.setItem(LOCAL_TRACKS_DISMISSED_KEY, '1') } catch { /* אחסון חסום: ההודעה תופיע שוב */ }
    setLocalTracksDismissed(true)
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

  // באתר המקוון: תלמיד שהמנוי שלו פג נשאר מחובר, אבל בלי תוכן (השרת חוסם גם בעצמו)
  const subscriptionBlocked = Boolean(API_ENABLED && user && user.role !== 'admin' && user.subscription && !user.subscription.valid)

  // שליפה מחדש של המשתמש (אחרי חידוש מנוי, או כשהמנוי פג תוך כדי שימוש)
  async function refreshUser() {
    if (!API_ENABLED) return user
    const response = await api.get('/auth/me')
    if (!response.ok) return user
    setUser(response.data.user)
    return response.data.user
  }

  useEffect(() => {
    if (!API_ENABLED) return undefined
    const handleExpired = () => {
      api.get('/auth/me').then(response => { if (response.ok) setUser(response.data.user) })
    }
    window.addEventListener(SUBSCRIPTION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SUBSCRIPTION_EXPIRED_EVENT, handleExpired)
  }, [])

  // מצב שרת: אחרי התחברות טוענים שאלות והתקדמות; כשמתנתקים מנקים את הנתונים מהזיכרון
  useEffect(() => {
    if (!API_ENABLED || !authReady) return
    if (!user || subscriptionBlocked) {
      setQuestions([])
      setCustomTracks({})
      setTracksLoaded(false)
      setQuizProgressState({})
      setRemoteResults([])
      setQuestionsReady(true)
      return
    }
    let cancelled = false
    setQuestionsReady(false)
    setLoadError(null)
    Promise.all([api.get('/questions'), api.get('/progress'), api.get('/tracks')]).then(([questionsResponse, progressResponse, tracksResponse]) => {
      if (cancelled) return
      if (!questionsResponse.ok) {
        setLoadError(questionsResponse.error)
        setQuestionsReady(true)
        return
      }
      setQuestions(ensureQuestionPositions(questionsResponse.data.questions).normalized)
      setQuizProgressState(progressResponse.ok ? progressResponse.data.progress : {})
      setCustomTracks(tracksResponse.ok ? tracksResponse.data.tracks : {})
      setTracksLoaded(tracksResponse.ok)
      setQuestionsReady(true)
    })
    return () => { cancelled = true }
  }, [user?.id, subscriptionBlocked, authReady, reloadToken])

  // מצב שרת: תוצאות המשתמש המחובר
  useEffect(() => {
    if (!API_ENABLED || !user || subscriptionBlocked) return
    let cancelled = false
    api.get('/results/me').then(response => {
      if (!cancelled && response.ok) setRemoteResults(response.data.results)
    })
    return () => { cancelled = true }
  }, [user?.id, subscriptionBlocked, resultsVersion])

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
      const { normalized: positioned, changed } = ensureQuestionPositions(titleNormalizedQuestions)

      // תיקוני תוכן לנתונים שכבר שמורים בדפדפן: פעם אחת, ורק לשאלות שלא נערכו בניהול
      const needsContentFixes = getContentVersion() !== CONTENT_FIXES_VERSION
      const fixes = needsContentFixes ? applyContentFixes(positioned, contentFixes) : null
      const normalized = fixes ? fixes.questions : positioned
      const contentChanged = Boolean(fixes && (fixes.updated.length > 0 || fixes.removed.length > 0))

      let saved = true
      if (stored.length !== withoutLegacyQuestions.length || missingSeedQuestions.length > 0 || subjectNamesChanged || groupTitlesChanged || changed || contentChanged) {
        saved = saveQuestions(normalized)
      }
      if (needsContentFixes && saved) saveContentVersion(CONTENT_FIXES_VERSION)

      setQuestions(normalized)
      return
    }

    const normalizedSeedQuestions = normalizeQuestionSubjects(seedQuestions).normalized
    const titleNormalizedSeedQuestions = normalizeQuestionGroupTitles(normalizedSeedQuestions).normalized
    const { normalized } = ensureQuestionPositions(titleNormalizedSeedQuestions)
    if (saveQuestions(normalized)) saveContentVersion(CONTENT_FIXES_VERSION)
    setQuestions(normalized)
  }, [])

  // הגדרות האתר: באתר המקוון מהשרת (גם לפני התחברות, בשביל ההתנסות), אחרת מהדפדפן
  const [siteSettings, setSiteSettings] = useState(() => normalizeSiteSettings(API_ENABLED ? null : getSiteSettings()))
  const [remoteDemoQuestions, setRemoteDemoQuestions] = useState(null)

  useEffect(() => {
    if (!API_ENABLED) return undefined
    let cancelled = false
    api.get('/site').then(response => {
      if (cancelled || !response.ok || !response.data?.settings) return
      setSiteSettings(normalizeSiteSettings(response.data.settings))
      setRemoteDemoQuestions(response.data.demoQuestions || [])
    })
    return () => { cancelled = true }
  }, [])

  // אם השרת לא ענה, ההתנסות מוצגת מהשאלות שבקוד כדי שעמוד הפתיחה לא יישאר ריק
  const demoQuestions = useMemo(() => (
    remoteDemoQuestions ?? pickDemoQuestions(API_ENABLED ? seedQuestions : questions, siteSettings.demoQuestionIds)
  ), [remoteDemoQuestions, questions, siteSettings])

  const visibleGrades = useMemo(() => GRADES.filter(grade => !siteSettings.hiddenGrades.includes(grade.value)), [siteSettings])

  async function updateSiteSettings(next) {
    const normalized = normalizeSiteSettings(next)
    if (API_ENABLED) {
      const response = await api.put('/admin/site', normalized)
      if (!response.ok) return { error: response.error }
      setSiteSettings(normalizeSiteSettings(response.data.settings))
      const fresh = await api.get('/site')
      if (fresh.ok) setRemoteDemoQuestions(fresh.data.demoQuestions || [])
      return { success: true }
    }
    if (!saveSiteSettings(normalized)) return { error: 'לא ניתן היה לשמור: נפח האחסון המקומי מלא.' }
    setSiteSettings(normalized)
    return { success: true }
  }

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

  function getSavedQuizProgress(selection) {
    if (!user) return null
    const key = getQuizProgressKey({ userId: user.id, ...selection })
    const progress = quizProgressMap[key]
    if (!progress) return null

    return {
      ...progress,
      questionCount: progress.questionCount || getQuestionCountForSelection(placedQuestions, selection),
    }
  }

  function saveQuizProgress(selection, progressData) {
    if (!user || mistakesPractice) return null

    const key = getQuizProgressKey({ userId: user.id, ...selection })
    const entry = {
      key,
      userId: user.id,
      ...selection,
      ...progressData,
      updatedAt: new Date().toISOString(),
      questionCount: progressData.questionCount || getQuestionCountForSelection(placedQuestions, selection),
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
    setMistakesPractice(false)

    const selection = { grade, subject, level, activityType }
    const savedProgress = restart ? null : getSavedQuizProgress(selection)

    const filteredQuestions = subject === GENERAL_EXAM_SUBJECT
      ? (() => {
          // שאלה שמשויכת לכמה נושאים באותה קטגוריה נכנסת למאגר המבחן פעם אחת
          const allGradeQuestions = sortQuestionsByPosition(uniqueById(placedQuestions.filter(question => {
            return question.grade === grade
              && question.subject !== HOLLAND_SUBJECT
              && question.subject !== GENERAL_EXAM_SUBJECT
              && question.activityType === 'practice'
              // שאלות רשימה והסבר מתאימות לתרגול בלבד, לא למבחן על זמן
              && question.type !== 'list'
              && question.type !== 'self_check'
          })))

          if (savedProgress?.questionIds?.length) {
            const questionMap = new Map(allGradeQuestions.map(question => [question.id, question]))
            return savedProgress.questionIds
              .map(questionId => questionMap.get(questionId))
              .filter(Boolean)
          }

          return shuffleItems(allGradeQuestions).slice(0, GENERAL_EXAM_QUESTION_COUNT)
        })()
      : sortQuestionsByPosition(placedQuestions.filter(question => {
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

  // תרגול חוזר רק על שאלות שנענו לא נכון: ללא טיימר, ללא שמירת התקדמות וללא תוצאה חדשה
  function startMistakesPractice(wrongQuestions) {
    const list = (wrongQuestions || []).filter(Boolean)
    if (list.length === 0) return []
    setMistakesPractice(true)
    setSelectedActivity('practice')
    setQuizQuestions(list)
    setQuizResults(null)
    setActiveQuizProgress(null)
    setQuizSession({ timeLimitSeconds: null, startedAt: null, deadlineAt: null })
    return list
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
    if (!mistakesPractice) clearQuizProgress({
      grade: selectedGrade,
      subject: selectedSubject,
      level: selectedLevel,
      activityType: selectedActivity,
    })

    if (user && !mistakesPractice) {
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
        placedQuestions,
        siteSettings,
        updateSiteSettings,
        visibleGrades,
        demoQuestions,
        customTracks,
        applyContent,
        trackCatalog,
        whenSaved,
        localOnlyTracks,
        uploadLocalTracks,
        dismissLocalTracks,
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
        startMistakesPractice,
        mistakesPractice,
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
        subscriptionBlocked,
        refreshUser,
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

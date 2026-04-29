import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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
  serverGetUsers,
  serverSaveUser,
  saveResult,
  getUserResults,
  checkSubscription,
  getStoredMode,
  setStoredMode,
  clearStoredMode,
} from '../utils/db'
import seedQuestions, { normalizeImportedQuestionStructure } from '../data/seedQuestions'
import { BASE_VISIBLE_TRACKS, GRADES } from '../data/learningTracks'
import { normalizeSubjectName } from '../data/subjectCatalog'
import { getUserDisplayName, isProfileComplete } from '../utils/userProfile'

const AppContext = createContext(null)
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
    merged.set(track.subject, {
      ...track,
      levels: [...(track.levels || [])],
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

export function AppProvider({ children }) {
  const gradeValues = useMemo(() => GRADES.map(grade => grade.value), [])

  const [user, setUser] = useState(() => {
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
    const currentUser = getCurrentUser()
    if (!currentUser || !checkSubscription(currentUser).valid) return null
    return getStoredMode()
  })

  const [questions, setQuestions] = useState([])
  const [customTracks, setCustomTracks] = useState(() => getCustomTracks())
  const [quizProgressMap, setQuizProgressState] = useState(() => getQuizProgressMap())
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
    return getUserResults(user.id)
  }, [resultsVersion, user])

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

  function persistQuizProgress(nextMap) {
    setQuizProgressState(nextMap)
    saveQuizProgressMap(nextMap)
  }

  useEffect(() => {
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

      const withoutLegacyQuestions = stored.filter(question => !LEGACY_SUBJECTS.has(question.subject))
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

  function login(username, password) {
    const found = serverFindUser(username)
    if (!found || found.password !== password) return { error: 'שם משתמש או סיסמה שגויים' }
    const { valid } = checkSubscription(found)
    if (!valid) return { error: 'פג תוקף המנוי שלך', expired: true }
    clearStoredMode()
    setModeState(null)
    setCurrentUser(found)
    setUser(found)
    return { success: true, user: found }
  }

  function register(username, password) {
    const users = serverGetUsers()
    if (users.find(existingUser => existingUser.username === username)) {
      return { error: 'שם המשתמש כבר קיים' }
    }

    const newUser = {
      id: Date.now().toString(),
      username,
      password,
      role: 'student',
      subscription_date: new Date().toISOString(),
      firstName: '',
      lastName: '',
      city: '',
      birthDate: '',
      phone: '',
    }

    serverSaveUser(newUser)
    clearStoredMode()
    setModeState(null)
    setCurrentUser(newUser)
    setUser(newUser)
    return { success: true, user: newUser }
  }

  function updateUserProfile(profileData) {
    if (!user) return { error: 'לא נמצא משתמש פעיל.' }

    const nextUser = {
      ...user,
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
    setCurrentUser(nextUser)
    setUser(nextUser)
    return { success: true, user: nextUser }
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
    setCurrentUser(null)
    setUser(null)
    clearStoredMode()
    setModeState(null)
    resetLearningFlow()
  }

  function setMode(modeValue) {
    setStoredMode(modeValue)
    setModeState(modeValue)
  }

  function addQuestion(question) {
    const relatedQuestions = questions.filter(existing => getQuestionGroupKey(existing) === getQuestionGroupKey(question))
    const nextPosition = question.position || (relatedQuestions.length > 0 ? Math.max(...relatedQuestions.map(item => item.position || 0)) + 1 : 1)
    const newQuestion = { ...question, id: `custom-${Date.now()}`, position: nextPosition }
    const updatedQuestions = [...questions, newQuestion]
    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
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
    setQuestions(normalized)
    saveQuestions(normalized)
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

    setQuestions(workingQuestions)
    saveQuestions(workingQuestions)
    return createdQuestions
  }

  function deleteQuestion(id) {
    const updatedQuestions = questions.filter(question => question.id !== id)
    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
  }

  function deleteQuestions(ids) {
    const idSet = new Set(ids)
    const updatedQuestions = questions.filter(question => !idSet.has(question.id))
    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
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

    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
  }

  function addTrack(track) {
    const normalizedTrack = {
      id: `track-${Date.now()}`,
      subject: track.subject.trim(),
      questionTypes: track.questionTypes.trim() || 'מותאם אישית',
      levels: track.levels || [],
      activities: track.activities?.length ? track.activities : ['practice'],
    }

    const nextTracks = {
      ...customTracks,
      [track.grade]: [...(customTracks[track.grade] || []), normalizedTrack],
    }

    setCustomTracks(nextTracks)
    saveCustomTracks(nextTracks)
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

      setCustomTracks(nextTracks)
      saveCustomTracks(nextTracks)
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
      setQuestions(workingQuestions)
      saveQuestions(workingQuestions)
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

    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
    setCustomTracks(nextTracks)
    saveCustomTracks(nextTracks)
  }

  function deleteTrack(grade, subject) {
    const updatedQuestions = questions.filter(question => !(question.grade === grade && question.subject === subject))
    const nextTracks = {
      ...customTracks,
      [grade]: (customTracks[grade] || []).filter(track => track.subject !== subject),
    }

    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
    setCustomTracks(nextTracks)
    saveCustomTracks(nextTracks)

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

    const filteredQuestions = sortQuestionsByPosition(questions.filter(question => {
      const sameGrade = question.grade === grade
      const sameSubject = question.subject === subject
      const sameActivity = question.activityType === activityType
      const sameLevel = (question.level || null) === (level || null)
      return sameGrade && sameSubject && sameActivity && sameLevel
    }))

    setQuizQuestions(filteredQuestions)
    setQuizResults(null)
    const selection = { grade, subject, level, activityType }
    const savedProgress = restart ? null : getSavedQuizProgress(selection)
    if (restart) {
      clearQuizProgress(selection)
    } else {
      setActiveQuizProgress(savedProgress)
    }
    setQuizSession(
      activityType === 'exam' && savedProgress?.quizSession
        ? savedProgress.quizSession
        : {
            timeLimitSeconds: activityType === 'exam' ? 180 : null,
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
      saveResult({
        id: Date.now().toString(),
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
      setResultsVersion(previous => previous + 1)
    }
  }

  function beginExamSession() {
    const now = Date.now()
    const nextSession = {
      timeLimitSeconds: 180,
      startedAt: now,
      deadlineAt: now + 180000,
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
        },
      )
    }
  }

  function finishQuiz(results, meta = {}) {
    const totalQuestions = quizQuestions.length
    const score = results.filter(result => result.correct).length
    const percent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
    const summary = {
      items: results,
      totalQuestions,
      answeredQuestions: results.length,
      correctAnswers: score,
      incorrectAnswers: results.length - score,
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
      saveResult({
        id: Date.now().toString(),
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
      setResultsVersion(previous => previous + 1)
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
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}

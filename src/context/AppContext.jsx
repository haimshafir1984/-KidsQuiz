import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, setCurrentUser, getQuestions, saveQuestions } from '../utils/storage'
import {
  seedAdmin,
  serverFindUser,
  serverGetUsers,
  serverSaveUser,
  saveResult,
  checkSubscription,
  getStoredMode,
  setStoredMode,
  clearStoredMode,
} from '../utils/db'
import seedQuestions from '../data/seedQuestions'

const AppContext = createContext(null)

function shuffleQuestions(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

export function AppProvider({ children }) {
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
  const [selectedGrade, setSelectedGrade] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState('practice')
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizResults, setQuizResults] = useState(null)
  const [quizSession, setQuizSession] = useState({
    timeLimitSeconds: null,
    startedAt: null,
    deadlineAt: null,
  })

  useEffect(() => {
    const stored = getQuestions()

    if (stored?.length > 0) {
      const hasNewSchema = stored.every(question => question.grade && question.subject && question.activityType)

      if (!hasNewSchema) {
        saveQuestions(seedQuestions)
        setQuestions(seedQuestions)
        return
      }

      const storedIds = new Set(stored.map(question => question.id))
      const missingSeedQuestions = seedQuestions.filter(question => !storedIds.has(question.id))
      const mergedQuestions = missingSeedQuestions.length > 0 ? [...stored, ...missingSeedQuestions] : stored

      if (missingSeedQuestions.length > 0) {
        saveQuestions(mergedQuestions)
      }

      setQuestions(mergedQuestions)
      return
    }

    saveQuestions(seedQuestions)
    setQuestions(seedQuestions)
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
    }

    serverSaveUser(newUser)
    clearStoredMode()
    setModeState(null)
    setCurrentUser(newUser)
    setUser(newUser)
    return { success: true }
  }

  function resetLearningFlow() {
    setSelectedGrade(null)
    setSelectedSubject(null)
    setSelectedLevel(null)
    setSelectedActivity('practice')
    setQuizQuestions([])
    setQuizResults(null)
    setQuizSession({ timeLimitSeconds: null, startedAt: null, deadlineAt: null })
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
    const newQuestion = { ...question, id: `custom-${Date.now()}` }
    const updatedQuestions = [...questions, newQuestion]
    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
    return newQuestion
  }

  function updateQuestion(id, data) {
    const updatedQuestions = questions.map(question => (question.id === id ? { ...question, ...data } : question))
    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
  }

  function deleteQuestion(id) {
    const updatedQuestions = questions.filter(question => question.id !== id)
    setQuestions(updatedQuestions)
    saveQuestions(updatedQuestions)
  }

  function chooseGrade(grade) {
    setSelectedGrade(grade)
    setSelectedSubject(null)
    setSelectedLevel(null)
    setSelectedActivity('practice')
    setQuizQuestions([])
    setQuizResults(null)
  }

  function chooseSubject(subject) {
    setSelectedSubject(subject)
    setSelectedLevel(null)
    setSelectedActivity('practice')
    setQuizQuestions([])
    setQuizResults(null)
  }

  function prepareQuiz({ grade, subject, level = null, activityType = 'practice' }) {
    setSelectedGrade(grade)
    setSelectedSubject(subject)
    setSelectedLevel(level)
    setSelectedActivity(activityType)

    const filteredQuestions = questions.filter(question => {
      const sameGrade = question.grade === grade
      const sameSubject = question.subject === subject
      const sameActivity = question.activityType === activityType
      const sameLevel = (question.level || null) === (level || null)
      return sameGrade && sameSubject && sameActivity && sameLevel
    })

    const preparedQuestions = shuffleQuestions(filteredQuestions)
    setQuizQuestions(preparedQuestions)
    setQuizResults(null)
    setQuizSession({
      timeLimitSeconds: activityType === 'exam' ? 180 : null,
      startedAt: null,
      deadlineAt: null,
    })

    return preparedQuestions
  }

  function beginExamSession() {
    const now = Date.now()
    setQuizSession({
      timeLimitSeconds: 180,
      startedAt: now,
      deadlineAt: now + 180000,
    })
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
    }
  }

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        mode,
        setMode,
        questions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        selectedGrade,
        selectedSubject,
        selectedLevel,
        selectedActivity,
        quizQuestions,
        quizResults,
        quizSession,
        chooseGrade,
        chooseSubject,
        setSelectedLevel,
        setSelectedActivity,
        prepareQuiz,
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

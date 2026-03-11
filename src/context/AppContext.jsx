import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, setCurrentUser, getQuestions, saveQuestions } from '../utils/storage'
import {
  seedAdmin, serverFindUser, serverGetUsers, serverSaveUser,
  saveResult, checkSubscription,
  getStoredMode, setStoredMode, clearStoredMode,
} from '../utils/db'
import seedQuestions from '../data/seedQuestions.json'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    seedAdmin()
    const u = getCurrentUser()
    if (!u) return null
    if (!checkSubscription(u).valid) {
      setCurrentUser(null)
      clearStoredMode()
      return null
    }
    return u
  })

  const [mode, setModeState] = useState(() => {
    const u = getCurrentUser()
    if (!u || !checkSubscription(u).valid) return null
    return getStoredMode()
  })

  const [questions, setQuestions] = useState([])
  const [selectedAge, setSelectedAge] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizResults, setQuizResults] = useState(null)

  useEffect(() => {
    const stored = getQuestions()

    if (stored?.length > 0) {
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
    if (users.find(u => u.username === username)) return { error: 'שם המשתמש כבר קיים' }
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

  function logout() {
    setCurrentUser(null)
    setUser(null)
    clearStoredMode()
    setModeState(null)
    setSelectedAge(null)
    setSelectedSubject(null)
    setQuizQuestions([])
    setQuizResults(null)
  }

  function setMode(m) {
    setStoredMode(m)
    setModeState(m)
  }

  function addQuestion(q) {
    const newQ = { ...q, id: Date.now().toString() }
    const updated = [...questions, newQ]
    setQuestions(updated)
    saveQuestions(updated)
    return newQ
  }

  function updateQuestion(id, data) {
    const updated = questions.map(q => q.id === id ? { ...q, ...data } : q)
    setQuestions(updated)
    saveQuestions(updated)
  }

  function deleteQuestion(id) {
    const updated = questions.filter(q => q.id !== id)
    setQuestions(updated)
    saveQuestions(updated)
  }

  function startQuiz(age, subject) {
    setSelectedAge(age)
    setSelectedSubject(subject)
    const shuffled = [...questions.filter(q => q.age_group === age && q.subject === subject)]
      .sort(() => Math.random() - 0.5)
    setQuizQuestions(shuffled)
    setQuizResults(null)
    return shuffled
  }

  function finishQuiz(results) {
    setQuizResults(results)
    const score = results.filter(r => r.correct).length
    saveResult({
      id: Date.now().toString(),
      userId: user.id,
      subject: selectedSubject,
      age: selectedAge,
      score,
      total: results.length,
      percent: Math.round((score / results.length) * 100),
      date: new Date().toISOString(),
    }, mode || 'offline')
  }

  return (
    <AppContext.Provider value={{
      user, login, register, logout,
      mode, setMode,
      questions, addQuestion, updateQuestion, deleteQuestion,
      selectedAge, selectedSubject,
      quizQuestions, quizResults,
      startQuiz, finishQuiz,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }

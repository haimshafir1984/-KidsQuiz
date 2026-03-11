import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/shared/Header'
import WelcomePage from './pages/WelcomePage'
import AuthPage from './pages/AuthPage'
import ModePage from './pages/ModePage'
import AgeSelectPage from './pages/AgeSelectPage'
import SubjectSelectPage from './pages/SubjectSelectPage'
import QuizPage from './pages/QuizPage'
import SummaryPage from './pages/SummaryPage'
import AdminPage from './pages/AdminPage'

function AuthRoute({ children }) {
  const { user } = useApp()
  return user ? children : <Navigate to="/welcome" replace />
}

function ModeRoute({ children }) {
  const { user, mode } = useApp()
  if (!user) return <Navigate to="/welcome" replace />
  if (!mode) return <Navigate to="/mode" replace />
  return children
}

function AppRoutes() {
  const { user, mode } = useApp()

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route
            path="/welcome"
            element={user ? <Navigate to={mode ? '/age' : '/mode'} replace /> : <WelcomePage />}
          />
          <Route
            path="/auth"
            element={user ? <Navigate to={mode ? '/age' : '/mode'} replace /> : <AuthPage />}
          />
          <Route path="/mode" element={<AuthRoute><ModePage /></AuthRoute>} />
          <Route path="/age" element={<ModeRoute><AgeSelectPage /></ModeRoute>} />
          <Route path="/subject" element={<ModeRoute><SubjectSelectPage /></ModeRoute>} />
          <Route path="/quiz" element={<ModeRoute><QuizPage /></ModeRoute>} />
          <Route path="/summary" element={<ModeRoute><SummaryPage /></ModeRoute>} />
          <Route path="/admin" element={<AuthRoute><AdminPage /></AuthRoute>} />
          <Route
            path="*"
            element={<Navigate to={!user ? '/welcome' : !mode ? '/mode' : '/age'} replace />}
          />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}

import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/shared/Header'
import WelcomePage from './pages/WelcomePage'
import AuthPage from './pages/AuthPage'
import ModePage from './pages/ModePage'
import AgeSelectPage from './pages/AgeSelectPage'
import SubjectSelectPage from './pages/SubjectSelectPage'
import TrackSelectPage from './pages/TrackSelectPage'
import ExamIntroPage from './pages/ExamIntroPage'
import QuizPage from './pages/QuizPage'
import SummaryPage from './pages/SummaryPage'
import AdminPage from './pages/AdminPage'
import OfflineDownloadPage from './pages/OfflineDownloadPage'
import DesktopLicensePage from './pages/DesktopLicensePage'
import { getLicenseStatus, getRuntimeInfo } from './utils/runtime'

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

function DesktopGate({ desktopState, children }) {
  const location = useLocation()

  if (desktopState.loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="edu-card max-w-lg text-center">
          <div className="text-4xl">🖥️</div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-950">טוענים את סביבת העבודה המקומית</h1>
          <p className="mt-2 text-slate-600">בודקים תצורת דסקטופ ורישיון מקומי לפני המשך העבודה.</p>
        </div>
      </div>
    )
  }

  if (desktopState.isDesktop && !desktopState.license.valid && location.pathname !== '/desktop-license') {
    return <Navigate to="/desktop-license" replace />
  }

  if (!desktopState.isDesktop && location.pathname === '/desktop-license') {
    return <Navigate to="/welcome" replace />
  }

  return children
}

function AppRoutes() {
  const { user, mode } = useApp()
  const [desktopState, setDesktopState] = useState({
    loading: true,
    isDesktop: false,
    runtime: null,
    license: { valid: true, required: false },
  })

  async function refreshDesktopState() {
    const [runtime, license] = await Promise.all([getRuntimeInfo(), getLicenseStatus()])
    setDesktopState({
      loading: false,
      isDesktop: runtime.isDesktop,
      runtime,
      license,
    })
  }

  useEffect(() => {
    refreshDesktopState().catch(() => {
      setDesktopState({
        loading: false,
        isDesktop: false,
        runtime: null,
        license: { valid: true, required: false },
      })
    })
  }, [])

  return (
    <DesktopGate desktopState={desktopState}>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
          <Routes>
            <Route
              path="/welcome"
              element={user ? <Navigate to={mode ? '/age' : '/mode'} replace /> : <WelcomePage />}
            />
            <Route
              path="/auth"
              element={user ? <Navigate to={mode ? '/age' : '/mode'} replace /> : <AuthPage />}
            />
            <Route
              path="/desktop-license"
              element={<DesktopLicensePage licenseStatus={desktopState.license} onRefresh={refreshDesktopState} />}
            />
            <Route path="/mode" element={<AuthRoute><ModePage /></AuthRoute>} />
            <Route path="/offline-download" element={<AuthRoute><OfflineDownloadPage /></AuthRoute>} />
            <Route path="/age" element={<ModeRoute><AgeSelectPage /></ModeRoute>} />
            <Route path="/subject" element={<ModeRoute><SubjectSelectPage /></ModeRoute>} />
            <Route path="/track" element={<ModeRoute><TrackSelectPage /></ModeRoute>} />
            <Route path="/exam-intro" element={<ModeRoute><ExamIntroPage /></ModeRoute>} />
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
    </DesktopGate>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}

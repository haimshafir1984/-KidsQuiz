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
import HollandQuestionnairePage from './pages/HollandQuestionnairePage'
import HollandResultPage from './pages/HollandResultPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import OfflineDownloadPage from './pages/OfflineDownloadPage'
import DesktopLicensePage from './pages/DesktopLicensePage'
import { getLicenseStatus, getRuntimeInfo } from './utils/runtime'
import { API_ENABLED } from './utils/api'
import { AccessibilityPage, LegalFooter, PrivacyPage, TermsPage } from './pages/LegalPages'

function AuthRoute({ children }) {
  const { user } = useApp()
  return user ? children : <Navigate to="/welcome" replace />
}

// מסך הניהול: במצב שרת נפתח רק לחשבון מנהל (גם השרת בודק הרשאה בכל פעולה). בדמו המקומי נשאר פתוח לכל משתמש מחובר
function AdminRoute({ children }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/welcome" replace />
  if (API_ENABLED && user.role !== 'admin') return <Navigate to="/age" replace />
  return children
}

function ModeRoute({ children }) {
  const { user, mode, profileComplete } = useApp()
  if (!user) return <Navigate to="/welcome" replace />
  if (user.role !== 'admin' && !profileComplete) return <Navigate to="/profile" replace />
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
          <h1 className="mt-4 text-2xl font-bold text-slate-950">טוענים את סביבת העבודה המקומית</h1>
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
  const { user, mode, profileComplete, appReady, loadError, retryLoad } = useApp()
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
          {!appReady ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <p className="text-lg font-semibold text-slate-600">טוענים...</p>
            </div>
          ) : loadError ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="edu-card max-w-lg text-center">
                <h1 className="text-2xl font-bold text-slate-950">לא הצלחנו לטעון את הנתונים</h1>
                <p className="mt-2 text-slate-600">{loadError}</p>
                <button type="button" onClick={retryLoad} className="btn-primary mt-5">נסו שוב</button>
              </div>
            </div>
          ) : (
          <Routes>
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="/welcome" element={user ? <Navigate to={user.role !== 'admin' && !profileComplete ? '/profile' : mode ? '/age' : '/mode'} replace /> : <WelcomePage />} />
            <Route path="/auth" element={user ? <Navigate to={user.role !== 'admin' && !profileComplete ? '/profile' : mode ? '/age' : '/mode'} replace /> : <AuthPage />} />
            <Route path="/desktop-license" element={<DesktopLicensePage licenseStatus={desktopState.license} onRefresh={refreshDesktopState} />} />
            <Route path="/mode" element={<AuthRoute><ModePage /></AuthRoute>} />
            <Route path="/profile" element={<AuthRoute><ProfilePage /></AuthRoute>} />
            <Route path="/offline-download" element={<AuthRoute><OfflineDownloadPage /></AuthRoute>} />
            <Route path="/age" element={<ModeRoute><AgeSelectPage /></ModeRoute>} />
            <Route path="/subject" element={<ModeRoute><SubjectSelectPage /></ModeRoute>} />
            <Route path="/track" element={<ModeRoute><TrackSelectPage /></ModeRoute>} />
            <Route path="/exam-intro" element={<ModeRoute><ExamIntroPage /></ModeRoute>} />
            <Route path="/quiz" element={<ModeRoute><QuizPage /></ModeRoute>} />
            <Route path="/summary" element={<ModeRoute><SummaryPage /></ModeRoute>} />
            <Route path="/holland-questionnaire" element={<ModeRoute><HollandQuestionnairePage /></ModeRoute>} />
            <Route path="/holland-result" element={<ModeRoute><HollandResultPage /></ModeRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*" element={<Navigate to={!user ? '/welcome' : user.role !== 'admin' && !profileComplete ? '/profile' : !mode ? '/mode' : '/age'} replace />} />
          </Routes>
          )}
        </main>
        <LegalFooter />
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

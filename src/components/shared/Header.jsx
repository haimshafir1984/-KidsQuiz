import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, GraduationCap, Home, LogOut, Menu, UserCircle2, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getGradeConfig } from '../../data/learningTracks'

export default function Header() {
  const { user, userDisplayName, mode, logout, selectedGrade, selectedSubject } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // סוגרים את התפריט בכל מעבר בין מסכים
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  if (!user) return null

  const gradeLabel = getGradeConfig(selectedGrade)?.label
  const isAdmin = user.role === 'admin'

  function handleLogout() {
    logout()
    navigate('/welcome')
  }

  function handleLogoClick() {
    navigate(mode ? '/age' : '/mode')
  }

  function handleBack() {
    navigate(-1)
  }

  const links = [
    {
      label: 'דף הבית',
      path: '/age',
      icon: Home,
      activePaths: ['/age', '/subject', '/track', '/exam-intro', '/quiz', '/summary', '/holland-questionnaire', '/holland-result'],
    },
    { label: 'האזור האישי שלי', path: '/profile', icon: GraduationCap, activePaths: ['/profile'] },
    // בשלב הדמו הנתיב /admin פתוח לכל משתמש מחובר, אבל הקישור מוצג רק למנהל
    ...(isAdmin ? [{ label: 'ניהול', path: '/admin', icon: UserCircle2, activePaths: ['/admin'] }] : []),
  ]

  const showBackButton = !['/welcome', '/age'].includes(location.pathname)

  function renderLinks(className) {
    return links.map(link => {
      const Icon = link.icon
      const isActive = link.activePaths.includes(location.pathname)

      return (
        <button
          key={link.path}
          onClick={() => navigate(link.path)}
          className={`${className} ${
            isActive
              ? 'border border-blue-200 bg-blue-50 text-blue-700'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Icon className="h-5 w-5" />
          {link.label}
        </button>
      )
    })
  }

  return (
    <div className="mx-auto mb-6 mt-3 w-full max-w-6xl px-3 sm:mb-10 sm:mt-4 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-8 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {showBackButton && (
              <button onClick={handleBack} className="btn-muted px-3 py-2 text-base sm:px-4">
                <ArrowRight className="h-5 w-5" />
                חזרה
              </button>
            )}

            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 text-right transition-colors duration-200 hover:text-blue-700"
              aria-label="מעבר לדף הבית"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white sm:h-12 sm:w-12">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="text-xl font-bold text-slate-950 sm:text-2xl">
                מערכת<span className="text-blue-600">למידה</span>
              </div>
            </button>
          </div>

          {/* מסך רחב: ניווט פתוח */}
          <div className="hidden items-center gap-3 lg:flex">
            <nav className="flex items-center gap-2">
              {renderLinks('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base font-semibold transition-all duration-200')}
            </nav>

            <div className="text-right">
              <div className="text-base font-semibold text-slate-900">{userDisplayName}</div>
              <div className="text-sm text-slate-600">
                {[gradeLabel, selectedSubject].filter(Boolean).join(' | ') || (isAdmin ? 'מנהל מערכת' : '')}
              </div>
            </div>

            <button onClick={handleLogout} className="btn-muted px-4 py-2 text-base">
              <LogOut className="h-5 w-5" />
              יציאה
            </button>
          </div>

          {/* טלפון וטאבלט: כפתור תפריט אחד */}
          <button
            onClick={() => setMenuOpen(open => !open)}
            className="btn-secondary px-4 py-2 text-base lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            תפריט
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="mt-3 space-y-2 border-t border-slate-100 pt-3 lg:hidden">
            <div className="px-1 text-right">
              <div className="text-lg font-bold text-slate-900">{userDisplayName}</div>
              {isAdmin && <div className="text-sm text-slate-600">מנהל מערכת</div>}
            </div>
            <nav className="flex flex-col gap-2">
              {renderLinks('flex w-full items-center gap-3 rounded-lg px-4 py-3 text-lg font-semibold transition-all duration-200')}
            </nav>
            <button onClick={handleLogout} className="btn-muted w-full justify-start px-4 py-3 text-lg">
              <LogOut className="h-5 w-5" />
              יציאה מהמערכת
            </button>
          </div>
        )}
      </header>
    </div>
  )
}

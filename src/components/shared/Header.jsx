import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, GraduationCap, LogOut, UserCircle2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getGradeConfig } from '../../data/learningTracks'

function ModeBadge({ mode }) {
  if (!mode) return null

  return (
    <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex ${
      mode === 'online' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'
    }`}>
      {mode === 'online' ? 'מחובר' : 'מקומי'}
    </span>
  )
}

export default function Header() {
  const { user, userDisplayName, mode, logout, selectedGrade, selectedSubject } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  if (!user) return null

  const gradeLabel = getGradeConfig(selectedGrade)?.label

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
    { label: 'בחירת כיתה', path: '/age', icon: BookOpen },
    { label: 'אזור אישי', path: '/profile', icon: GraduationCap },
    { label: 'ניהול', path: '/admin', icon: UserCircle2 },
  ]

  const showBackButton = !['/welcome', '/age'].includes(location.pathname)

  return (
    <div className="mx-auto mb-10 mt-4 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {showBackButton && (
                <button onClick={handleBack} className="btn-muted px-4 py-2 text-sm">
                  <ArrowRight className="h-4 w-4" />
                  חזרה
                </button>
              )}

              <button
                onClick={handleLogoClick}
                className="flex items-center gap-3 text-right transition-colors duration-200 hover:text-blue-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-950 sm:text-2xl">
                    מערכת<span className="text-blue-600">למידה</span>
                  </div>
                  <div className="hidden text-sm text-slate-600 sm:block">מסלולים, רמות, תרגול ומבחנים באותו ממשק</div>
                </div>
              </button>
            </div>

            <button onClick={handleLogout} className="btn-muted px-4 py-2 text-sm lg:hidden">
              <LogOut className="h-4 w-4" />
              התנתק
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <nav className="flex flex-wrap items-center gap-2">
              {links.map(link => {
                const Icon = link.icon

                return (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                      location.pathname === link.path
                        ? 'border border-blue-200 bg-blue-50 text-blue-700'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <ModeBadge mode={mode} />

              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{userDisplayName}</div>
                <div className="text-xs text-slate-600">
                  {[gradeLabel, selectedSubject].filter(Boolean).join(' | ') || (user.role === 'admin' ? 'מנהל מערכת' : 'לומד פעיל')}
                </div>
              </div>

              <button onClick={handleLogout} className="btn-muted hidden px-4 py-2 text-sm lg:inline-flex">
                <LogOut className="h-4 w-4" />
                התנתק
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}

import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getGradeConfig } from '../../data/learningTracks'

function ModeBadge({ mode }) {
  if (!mode) return null

  return (
    <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex ${
      mode === 'online' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'
    }`}>
      {mode === 'online' ? 'מחובר 🌐' : 'מקומי 💾'}
    </span>
  )
}

export default function Header() {
  const { user, mode, logout, selectedGrade, selectedSubject } = useApp()
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
    { label: 'בחירת כיתה 📚', path: '/age' },
    { label: 'ניהול 👤', path: '/admin' },
  ]

  const showBackButton = !['/welcome', '/age'].includes(location.pathname)

  return (
    <div className="mx-auto mb-10 mt-4 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-100 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-sm sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {showBackButton && (
              <button onClick={handleBack} className="btn-muted px-4 py-2 text-sm">
                חזרה ↩️
              </button>
            )}

            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 text-right transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                ✨
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-950 sm:text-2xl">
                  מערכת<span className="text-blue-600">למידה</span>
                </div>
                <div className="hidden text-sm text-slate-600 sm:block">מסלולים, רמות, תרגול ומבחנים באותו ממשק</div>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-2 md:flex">
              {links.map(link => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                      location.pathname === link.path
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-50 hover:shadow-lg'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
            </nav>

            <ModeBadge mode={mode} />

            <div className="hidden text-right lg:block">
              <div className="text-sm font-semibold text-slate-900">{user.username}</div>
              <div className="text-xs text-slate-600">
                {[gradeLabel, selectedSubject].filter(Boolean).join(' | ') || (user.role === 'admin' ? 'מנהל מערכת' : 'לומד פעיל')}
              </div>
            </div>

            <button onClick={handleLogout} className="btn-muted px-4 py-2 text-sm">
              התנתק 🚪
            </button>
          </div>
        </div>
      </header>
    </div>
  )
}

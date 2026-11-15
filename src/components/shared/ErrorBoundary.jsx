import { Component } from 'react'
import { AlertOctagon, RotateCcw, Trash2 } from 'lucide-react'

const STORAGE_PREFIX = 'kq_'

function resetLocalData() {
  Object.keys(localStorage)
    .filter(key => key.startsWith(STORAGE_PREFIX))
    .forEach(key => localStorage.removeItem(key))
  window.location.reload()
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('שגיאה לא צפויה באפליקציה:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <section className="edu-card max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertOctagon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">קרתה תקלה בלתי צפויה</h1>
          <p className="mt-3 leading-7 text-slate-600">
            אפשר לנסות לרענן את הדף. אם התקלה חוזרת, איפוס הנתונים המקומיים בדרך כלל פותר את הבעיה
            (הפעולה תמחק שאלות, הגדרות ותוצאות שנשמרו במכשיר הזה בלבד).
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
              <RotateCcw className="h-4 w-4" />
              רענון הדף
            </button>
            <button type="button" onClick={resetLocalData} className="btn-danger">
              <Trash2 className="h-4 w-4" />
              איפוס נתונים מקומיים
            </button>
          </div>
        </section>
      </div>
    )
  }
}

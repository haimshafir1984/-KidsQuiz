import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOfflinePackageInfo, isDesktopRuntime } from '../utils/runtime'
import { useApp } from '../context/AppContext'

const DEFAULT_FILE_NAME = 'KidsQuizOfflineSetup.exe'
const DOWNLOAD_URL = import.meta.env.VITE_OFFLINE_DOWNLOAD_URL || ''

function getDownloadFileName(url) {
  if (!url) return DEFAULT_FILE_NAME

  try {
    const normalizedUrl = new URL(url, window.location.href)
    const pathnameParts = normalizedUrl.pathname.split('/').filter(Boolean)
    return pathnameParts[pathnameParts.length - 1] || DEFAULT_FILE_NAME
  } catch {
    return DEFAULT_FILE_NAME
  }
}

export default function OfflineDownloadPage() {
  const navigate = useNavigate()
  const { setMode } = useApp()
  const [packageInfo, setPackageInfo] = useState({ productName: 'KidsQuiz Offline', outputDirectory: 'release' })
  const [downloadStarted, setDownloadStarted] = useState(false)
  const desktop = isDesktopRuntime()
  const downloadFileName = useMemo(() => getDownloadFileName(DOWNLOAD_URL), [])

  useEffect(() => {
    getOfflinePackageInfo().then(setPackageInfo).catch(() => {})
  }, [])

  useEffect(() => {
    if (desktop || !DOWNLOAD_URL || downloadStarted) return

    const timer = window.setTimeout(() => {
      const link = document.createElement('a')
      link.href = DOWNLOAD_URL
      link.download = downloadFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setDownloadStarted(true)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [desktop, downloadFileName, downloadStarted])

  function handleContinueOnline() {
    setMode('online')
    navigate('/age')
  }

  function handleDownloadAgain() {
    if (!DOWNLOAD_URL) return

    const link = document.createElement('a')
    link.href = DOWNLOAD_URL
    link.download = downloadFileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setDownloadStarted(true)
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm ring-1 ring-slate-100">
          מצב עבודה אופליין ל-Windows 💾
        </div>
        <h1 className="section-title">גרסת Desktop להורדה והתקנה</h1>
        <p className="section-subtitle mt-3">
          לחיצה על מצב אופליין תוריד את תוכנת Windows למחשב. אחרי סיום ההורדה יש לפתוח את קובץ ההתקנה,
          להשלים התקנה קצרה, ואז לעבוד מקומית גם בלי אינטרנט.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="edu-card space-y-5 text-right">
          <h2 className="text-2xl font-extrabold text-slate-950">אותה מערכת, רק מקומית</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'אותו UI של המערכת הקיימת',
              'עבודה מלאה ללא אינטרנט',
              'שמירת נתונים מקומית על המחשב',
              'טעינת קובץ רישיון מקומי בעת הצורך',
            ].map(item => (
              <div key={item} className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                {item}
              </div>
            ))}
          </div>

          {desktop ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-lg font-bold text-emerald-700">האפליקציה כבר רצה מקומית</div>
              <p className="mt-2 text-sm leading-6 text-emerald-700">
                זוהתה סביבת Desktop. אפשר להמשיך ישירות לעבודה אופליין מתוך האפליקציה המקומית.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => navigate('/age')} className="btn-primary">
                  המשך באפליקציה המקומית
                </button>
                <button onClick={handleContinueOnline} className="btn-muted">
                  חזרה למצב אונליין בדפדפן
                </button>
              </div>
            </div>
          ) : DOWNLOAD_URL ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-lg font-bold text-blue-700">ההורדה התחילה</div>
              <p className="mt-2 text-sm leading-6 text-blue-700">
                קובץ ההתקנה יורד למחשב שלך. לאחר סיום ההורדה יש לפתוח את הקובץ מתיקיית ההורדות ולהשלים התקנה.
                מטעמי אבטחת דפדפן לא ניתן להפעיל EXE אוטומטית בלי לחיצה שלך.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button onClick={handleDownloadAgain} className="btn-primary">
                  הורדה מחדש של תוכנת Windows
                </button>
                <button onClick={handleContinueOnline} className="btn-muted">
                  להמשיך כרגע באונליין
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <div className="text-lg font-bold text-red-700">קישור ההורדה לא הוגדר</div>
              <p className="mt-2 text-sm leading-6 text-red-700">
                כדי להפעיל הורדת אופליין, יש להגדיר ב-Render את המשתנה VITE_OFFLINE_DOWNLOAD_URL לקובץ בשם {DEFAULT_FILE_NAME}.
              </p>
              <div className="mt-4">
                <button onClick={handleContinueOnline} className="btn-muted">
                  להמשיך כרגע באונליין
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="edu-card text-right">
          <h2 className="text-2xl font-extrabold text-slate-950">מה המשתמש צריך לעשות?</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>1. ללחוץ על כפתור האופליין.</li>
            <li>2. להמתין שהקובץ ירד לתיקיית ההורדות במחשב.</li>
            <li>3. לפתוח את `{downloadFileName}` ולהתקין.</li>
            <li>4. להפעיל את האפליקציה מהמחשב ולעבוד מקומית, גם בלי אינטרנט.</li>
          </ol>

          <div className="mt-5 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-500">קישור התקנה פעיל</div>
            <div className="mt-2 break-all font-mono text-sm text-slate-800">{DOWNLOAD_URL || 'לא הוגדר עדיין'}</div>
            <div className="mt-3 text-xs text-slate-500">שם קובץ צפוי: {DEFAULT_FILE_NAME}</div>
            <div className="mt-1 text-xs text-slate-500">פלט build מקומי: {packageInfo.outputDirectory}</div>
          </div>
        </aside>
      </section>
    </div>
  )
}

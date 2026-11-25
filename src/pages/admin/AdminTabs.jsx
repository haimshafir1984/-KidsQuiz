import { Download, Plus } from 'lucide-react'

export function TabButton({ active, label, count, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-slate-500 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count != null && (
        <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

export function SummaryHeader({ activeTab, onNewQuestion, onExport }) {
  return (
    <section className="edu-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-slate-950">מסך ניהול</h1>
          <p className="mt-2 text-base text-slate-700">
            כאן מנהלים את השאלות, הנושאים והתלמידים.
          </p>
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-base font-semibold text-amber-800 lg:hidden">
            מומלץ לנהל מהמחשב. בטלפון הטבלאות רחבות וצריך לגלול הצידה.
          </p>
        </div>

        {activeTab === 'questions' && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onExport} className="btn-secondary">
              <Download className="h-4 w-4" />
              ייצוא כל השאלות לקובץ
            </button>
            <button type="button" onClick={onNewQuestion} className="btn-primary">
              <Plus className="h-4 w-4" />
              שאלה חדשה
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

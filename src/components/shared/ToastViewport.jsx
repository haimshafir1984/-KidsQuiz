import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const TOAST_TONES = {
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertTriangle,
  },
  info: {
    box: 'border-blue-200 bg-blue-50 text-blue-800',
    icon: Info,
  },
  error: {
    box: 'border-red-200 bg-red-50 text-red-800',
    icon: AlertTriangle,
  },
}

export default function ToastViewport({ toasts, onDismiss }) {
  useEffect(() => {
    if (!toasts?.length) return undefined

    const timers = toasts.map(toast => window.setTimeout(() => onDismiss(toast.id), toast.duration || 3000))
    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [onDismiss, toasts])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[130] flex flex-col items-center gap-3 px-4">
      {toasts.map(toast => {
        const tone = TOAST_TONES[toast.type] || TOAST_TONES.info
        const Icon = tone.icon

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-md rounded-2xl border px-4 py-3 shadow-lg ${tone.box}`}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded-full p-1 text-current/70 transition hover:bg-white/70"
                aria-label="סגירת התראה"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-start justify-end gap-3 text-right">
                <div>
                  {toast.title && <div className="text-sm font-bold">{toast.title}</div>}
                  <div className="text-sm leading-6">{toast.message}</div>
                </div>
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

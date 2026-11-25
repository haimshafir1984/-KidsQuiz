import { X } from 'lucide-react'
import { useDialogA11y } from '../../components/shared/useDialogA11y'

export function Drawer({ open, title, subtitle, onClose, children }) {
  const dialogRef = useDialogA11y(open, onClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/40" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-drawer-title"
        className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-slate-50 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={onClose} className="btn-muted px-3 py-2">
              <X className="h-4 w-4" />
              סגירה
            </button>
            <div className="text-right">
              <h2 id="admin-drawer-title" className="text-xl font-bold text-slate-950">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
            </div>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

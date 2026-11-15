import { useDialogA11y } from './useDialogA11y'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useDialogA11y(open, onCancel)

  if (!open) return null

  const confirmClass = tone === 'danger' ? 'btn-danger' : 'btn-primary'

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 py-6"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="text-xl font-bold text-slate-950">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-start">
          <button type="button" onClick={onConfirm} className={confirmClass}>
            {confirmLabel}
          </button>
          <button type="button" onClick={onCancel} className="btn-muted">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

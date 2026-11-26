import { useState } from 'react'
import { useDialogA11y } from '../../../components/shared/useDialogA11y'
import { GRADES } from '../../../data/learningTracks'
import { API_ENABLED } from '../../../utils/api'
import PlacePicker from './PlacePicker'

export function Modal({ title, onClose, children, footer }) {
  const ref = useDialogA11y(true, onClose)
  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/45 p-3" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-right shadow-modal"
        onClick={event => event.stopPropagation()}
      >
        <h3 className="px-5 pb-2 pt-4 text-xl font-bold text-slate-950">{title}</h3>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">{children}</div>
        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>
      </div>
    </div>
  )
}

const cancelButton = onClose => <button type="button" onClick={onClose} className="btn-muted">ביטול</button>

export function PickPlacesDialog({ title, hint, groups, multiple = true, lockedKeys, confirmLabel, onConfirm, onClose }) {
  const [chosen, setChosen] = useState([])
  const [activityType, setActivityType] = useState('practice')
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn-primary disabled:opacity-40" disabled={chosen.length === 0} onClick={() => onConfirm(chosen, activityType)}>
            {confirmLabel}{multiple ? ` (${chosen.length})` : ''}
          </button>
          {cancelButton(onClose)}
        </>
      )}
    >
      {hint && <p className="mb-2 text-sm text-slate-600">{hint}</p>}
      <PlacePicker groups={groups} multiple={multiple} lockedKeys={lockedKeys} chosen={chosen} onChange={setChosen} />
      {multiple && (
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          להוסיף במקומות החדשים בתור
          <select value={activityType} onChange={event => setActivityType(event.target.value)} className="input-field w-auto">
            <option value="practice">תרגול</option>
            <option value="exam">מבחן</option>
          </select>
        </label>
      )}
    </Modal>
  )
}

export function RenameDialog({ title, current, error, onConfirm, onClose }) {
  const [name, setName] = useState(current)
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn-primary" onClick={() => onConfirm(name)}>שמירה</button>
          {cancelButton(onClose)}
        </>
      )}
    >
      <form onSubmit={event => { event.preventDefault(); onConfirm(name) }}>
        <input value={name} onChange={event => setName(event.target.value)} className="input-field" aria-label="שם חדש" />
      </form>
      {error && <p role="alert" className="mt-2 font-semibold text-red-600">{error}</p>}
      <p className="mt-2 text-sm text-slate-600">השאלות עוברות לשם החדש. תלמיד שנמצא באמצע תרגול כאן יתחיל אותו מחדש, ותוצאות קודמות נשארות תחת השם הישן.</p>
    </Modal>
  )
}

export function DeleteNodeDialog({ name, removedCount, unlinkedCount, requireName, onConfirm, onClose }) {
  const [typed, setTyped] = useState('')
  const ready = !requireName || typed.trim() === name.trim()
  return (
    <Modal
      title={`מחיקת "${name}"`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn-danger disabled:opacity-40" disabled={!ready} onClick={onConfirm}>מחיקה</button>
          {cancelButton(onClose)}
        </>
      )}
    >
      <p className="text-base text-slate-700">שאלות שמופיעות רק כאן ויימחקו: <b>{removedCount}</b>.</p>
      {unlinkedCount > 0 && <p className="text-base text-slate-700">שאלות משותפות שיוסרו מכאן ויישארו במקומות האחרים שלהן: <b>{unlinkedCount}</b>.</p>}
      {removedCount > 0 && (
        <p className="mt-1 text-sm text-slate-500">{API_ENABLED ? 'אפשר לשחזר שאלות שנמחקו, אחת-אחת, בלשונית "שחזור ויומן".' : 'בגרסה הזו אי אפשר לשחזר שאלות שנמחקו.'}</p>
      )}
      {requireName && (
        <label className="mt-3 block text-sm font-semibold text-slate-700">
          כדי לאשר, הקלידו את השם: {name}
          <input value={typed} onChange={event => setTyped(event.target.value)} className="input-field mt-1" autoComplete="off" />
        </label>
      )}
    </Modal>
  )
}

// entries: שורות שנבחרו להסרה. canUnlink: כמה מהן אפשר להסיר מהמקום הזה בלבד
export function RemoveQuestionsDialog({ entries, onRemoveHere, onDeleteAll, onClose }) {
  const single = entries.length === 1
  const shared = entries.filter(entry => entry.places.length > 1).length
  const canUnlink = shared > 0 && entries.every(entry => entry.place)
  return (
    <Modal
      title={single ? 'להסיר את השאלה?' : `להסיר ${entries.length} שאלות?`}
      onClose={onClose}
      footer={(
        <>
          {canUnlink && <button type="button" className="btn-primary" onClick={onRemoveHere}>הסרה מכאן בלבד</button>}
          <button type="button" className="btn-danger" onClick={onDeleteAll}>{shared > 0 ? 'מחיקה מכל המקומות' : 'מחיקה'}</button>
          {cancelButton(onClose)}
        </>
      )}
    >
      {single && <p className="text-base font-bold text-slate-900">{entries[0].question.text}</p>}
      {shared > 0 && (
        <p className="mt-2 text-base text-slate-700">
          {single ? `השאלה מופיעה ב-${entries[0].places.length} מקומות.` : `${shared} מהשאלות מופיעות בכמה מקומות.`}
          {canUnlink ? ' "הסרה מכאן בלבד" משאירה שאלה משותפת בשאר המקומות שלה, ומוחקת שאלה שזה המקום היחיד שלה.' : ''}
        </p>
      )}
      <p className="mt-2 text-sm text-slate-500">
        {API_ENABLED ? 'שאלה שנמחקה אפשר לשחזר בלשונית "שחזור ויומן".' : 'בגרסה הזו המחיקה סופית, והשאלה נעלמת גם מהשימוש באופליין.'}
      </p>
    </Modal>
  )
}

export function AssignTopicDialog({ topic, onConfirm, onClose }) {
  const targets = GRADES.filter(grade => grade.value !== topic.grade)
  const [targetGrade, setTargetGrade] = useState(targets[0]?.value || '')
  const [includeQuestions, setIncludeQuestions] = useState(true)
  return (
    <Modal
      title={`שיוך הנושא "${topic.subject}" לקטגוריה`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn-primary" onClick={() => onConfirm(targetGrade, includeQuestions)}>ביצוע שיוך</button>
          {cancelButton(onClose)}
        </>
      )}
    >
      <label className="block text-sm font-semibold text-slate-700">
        קטגוריית יעד
        <select value={targetGrade} onChange={event => setTargetGrade(event.target.value)} className="input-field mt-1">
          {targets.map(grade => <option key={grade.value} value={grade.value}>{grade.label}</option>)}
        </select>
      </label>
      <label className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-700">
        <input type="checkbox" className="h-5 w-5" checked={includeQuestions} onChange={event => setIncludeQuestions(event.target.checked)} />
        לשייך גם את השאלות
      </label>
      {includeQuestions && <p className="mt-1 text-sm text-slate-600">אלה אותן שאלות בשני המקומות: תיקון באחד מתעדכן גם בשני.</p>}
    </Modal>
  )
}

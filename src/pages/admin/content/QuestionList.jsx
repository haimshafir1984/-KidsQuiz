import { useState } from 'react'
import { ArrowDown, ArrowUp, FolderInput, Link2, Pencil, Trash2 } from 'lucide-react'
import { placeKey } from '../../../utils/placements'
import { describePlace } from './treeModel'

const TYPE_LABELS = {
  multiple: 'אמריקאית',
  open: 'פתוחה',
  sentence_completion: 'השלמת משפטים',
  list: 'רשימה',
  self_check: 'הסבר',
}
const activityLabel = activity => (activity === 'exam' ? 'מבחן' : 'תרגול')
const rowButton = 'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-30'

function PlacesList({ places, onGoTo }) {
  return (
    <div className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-sm">
      <div className="font-bold text-violet-900">השאלה מופיעה ב:</div>
      <ul>
        {places.map(place => (
          <li key={placeKey(place)}>
            <button type="button" onClick={() => onGoTo(place)} className="text-right text-blue-700 underline">
              {describePlace(place)} ({activityLabel(place.activityType)})
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// entries כבר מסוננות וממוינות. order: מידע לחצים (רק בתת-נושא), או null
export default function QuestionList({ entries, showPath, order, selectedIds, onToggleSelect, onReorder, onEdit, onAssign, onMove, onRemove, onToggleActivity, onGoTo }) {
  const [openPlaces, setOpenPlaces] = useState(null)
  let previousActivity = null
  const mixed = new Set(entries.map(entry => entry.matches[0].activityType)).size > 1

  return (
    <ul className="edu-card divide-y divide-slate-100 overflow-hidden p-0">
      {entries.map(entry => {
        const { question, places, place } = entry
        const shown = entry.matches[0]
        const position = order?.get(question.id)
        const heading = order && mixed && shown.activityType !== previousActivity ? activityLabel(shown.activityType) : null
        previousActivity = shown.activityType

        return (
          <li key={question.id}>
            {heading && <div className="bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">{heading}</div>}
            <div className="flex flex-wrap items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                className="mt-2 h-5 w-5 shrink-0"
                checked={selectedIds.has(question.id)}
                onChange={() => onToggleSelect(question.id)}
                aria-label={`בחירת השאלה: ${question.text}`}
              />
              {order && (
                <div className="flex shrink-0 flex-col items-center">
                  <button type="button" className="p-1 text-slate-600 disabled:opacity-25" disabled={!position || position.index === 0} onClick={() => onReorder(question.id, position.group, position.index - 1)} aria-label="הזזת השאלה למעלה">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-500">{position ? position.index + 1 : ''}</span>
                  <button type="button" className="p-1 text-slate-600 disabled:opacity-25" disabled={!position || position.index === position.size - 1} onClick={() => onReorder(question.id, position.group, position.index + 1)} aria-label="הזזת השאלה למטה">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="min-w-0 flex-1 basis-48 text-right">
                {question.groupTitle && <div className="text-xs font-bold text-slate-500">{question.groupTitle}</div>}
                <div className="line-clamp-2 break-words text-base font-bold text-slate-900" title={question.text}>{question.text}</div>
                <div className="line-clamp-1 text-sm text-slate-500">תשובה: {(question.correct_answer || []).join(' / ')}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{TYPE_LABELS[question.type] || question.type}</span>
                  {place ? (
                    <button
                      type="button"
                      onClick={() => onToggleActivity(entry)}
                      title={`לחיצה משנה ל${activityLabel(place.activityType === 'exam' ? 'practice' : 'exam')}`}
                      className={`rounded-full border px-2.5 py-1 ${place.activityType === 'exam' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}
                    >
                      {activityLabel(place.activityType)}
                    </button>
                  ) : null}
                  {places.length > 1 && (
                    <button type="button" onClick={() => setOpenPlaces(openPlaces === question.id ? null : question.id)} aria-expanded={openPlaces === question.id} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-violet-800">
                      <Link2 className="h-3.5 w-3.5" />
                      מופיעה ב-{places.length} מקומות
                    </button>
                  )}
                  {showPath && <span className="font-medium text-slate-500">{describePlace(shown)}</span>}
                </div>
                {openPlaces === question.id && <PlacesList places={places} onGoTo={onGoTo} />}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={rowButton} onClick={() => onEdit(question)}><Pencil className="h-4 w-4" />עריכה</button>
                <button type="button" className={rowButton} onClick={() => onAssign(question)}><Link2 className="h-4 w-4" />שיוך</button>
                {place && <button type="button" className={rowButton} onClick={() => onMove(entry)}><FolderInput className="h-4 w-4" />העברה</button>}
                <button type="button" className={`${rowButton} text-red-600`} onClick={() => onRemove([entry])}><Trash2 className="h-4 w-4" />הסרה</button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

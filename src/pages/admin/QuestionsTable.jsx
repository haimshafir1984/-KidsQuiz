import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { getGradeConfig } from '../../data/learningTracks'

export function BulkActionsBar({ selectedCount, onDeleteSelected, onClear }) {
  if (selectedCount === 0) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-right text-sm font-semibold text-blue-800">
          {selectedCount} שאלות נבחרו
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onDeleteSelected} className="btn-danger px-4 py-2 text-sm">
            <Trash2 className="h-4 w-4" />
            מחיקת הנבחרות
          </button>
          <button type="button" onClick={onClear} className="btn-secondary px-4 py-2 text-sm">
            ניקוי בחירה
          </button>
        </div>
      </div>
    </div>
  )
}

export function InlineQuestionsTable({
  questions,
  selectedIds,
  onToggleSelect,
  onToggleSelectPage,
  onMove,
  onDelete,
  onEdit,
  onQuickUpdate,
  trackCatalog,
}) {
  const [editingCell, setEditingCell] = useState(null)
  const pageSelected = questions.length > 0 && questions.every(question => selectedIds.has(question.id))

  function getTracksForGrade(grade) {
    return trackCatalog[grade] || []
  }

  function getTrackForSubject(grade, subject) {
    return getTracksForGrade(grade).find(track => track.subject === subject) || null
  }

  function closeEditingCell() {
    setEditingCell(null)
  }

  function updateSubject(question, nextSubject) {
    const targetTrack = getTrackForSubject(question.grade, nextSubject)
    const nextLevels = targetTrack?.levels || []
    const nextActivities = targetTrack?.activities || ['practice']

    onQuickUpdate(question.id, {
      subject: nextSubject,
      level: nextLevels.length === 0
        ? null
        : nextLevels.includes(question.level)
          ? question.level
          : nextLevels[0],
      activityType: nextActivities.includes(question.activityType)
        ? question.activityType
        : nextActivities[0],
    })

    closeEditingCell()
  }

  function updateLevel(question, nextLevel) {
    onQuickUpdate(question.id, { level: nextLevel === 'no-level' ? null : nextLevel })
    closeEditingCell()
  }

  function updateActivity(question, nextActivity) {
    onQuickUpdate(question.id, { activityType: nextActivity })
    closeEditingCell()
  }

  function renderInlineSelect({ value, options, onChange, ariaLabel }) {
    return (
      <select
        autoFocus
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={closeEditingCell}
        className="input-field h-10 min-w-[140px] py-2 text-sm"
        aria-label={ariaLabel}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    )
  }

  return (
    <section className="edu-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-right text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={pageSelected}
                  onChange={() => onToggleSelectPage(pageSelected)}
                  aria-label="בחירת כל השאלות בעמוד"
                />
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700">שאלה</th>
              <th className="px-4 py-3 font-semibold text-slate-700">נושא</th>
              <th className="px-4 py-3 font-semibold text-slate-700">רמה</th>
              <th className="px-4 py-3 font-semibold text-slate-700">סוג</th>
              <th className="px-4 py-3 font-semibold text-slate-700">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {questions.map(question => {
              const gradeLabel = getGradeConfig(question.grade)?.label || question.grade
              const gradeTracks = getTracksForGrade(question.grade)
              const currentTrack = getTrackForSubject(question.grade, question.subject)
              const subjectOptions = gradeTracks.map(track => ({ value: track.subject, label: track.subject }))
              const levelOptions = currentTrack?.levels?.length
                ? currentTrack.levels.map(level => ({ value: level, label: level }))
                : [{ value: 'no-level', label: 'ללא רמה' }]
              const activityOptions = (currentTrack?.activities?.length ? currentTrack.activities : ['practice', 'exam']).map(activity => ({
                value: activity,
                label: activity === 'exam' ? 'מבחן' : 'תרגול',
              }))
              const activityLabel = question.activityType === 'exam' ? 'מבחן' : 'תרגול'

              return (
                <tr key={question.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(question.id)}
                      onChange={() => onToggleSelect(question.id)}
                      aria-label={`בחירת השאלה: ${question.text}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[520px]">
                      {question.groupTitle && (
                        <div className="mb-1 text-xs font-bold text-slate-500">{question.groupTitle}</div>
                      )}
                      <div className="line-clamp-2 font-semibold text-slate-900" title={question.text}>{question.text}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        תשובה: {question.correct_answer.join(' / ')} | {gradeLabel}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {editingCell?.id === question.id && editingCell?.field === 'subject'
                      ? renderInlineSelect({
                        value: question.subject,
                        options: subjectOptions,
                        onChange: value => updateSubject(question, value),
                        ariaLabel: 'בחירת נושא',
                      })
                      : (
                        <button
                          type="button"
                          onClick={() => setEditingCell({ id: question.id, field: 'subject' })}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          {question.subject}
                        </button>
                      )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {editingCell?.id === question.id && editingCell?.field === 'level'
                      ? renderInlineSelect({
                        value: question.level || 'no-level',
                        options: levelOptions,
                        onChange: value => updateLevel(question, value),
                        ariaLabel: 'בחירת רמה',
                      })
                      : (
                        <button
                          type="button"
                          onClick={() => setEditingCell({ id: question.id, field: 'level' })}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                        >
                          {question.level || 'ללא רמה'}
                        </button>
                      )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {editingCell?.id === question.id && editingCell?.field === 'activity'
                      ? renderInlineSelect({
                        value: question.activityType,
                        options: activityOptions,
                        onChange: value => updateActivity(question, value),
                        ariaLabel: 'בחירת סוג פעילות',
                      })
                      : (
                        <button
                          type="button"
                          onClick={() => setEditingCell({ id: question.id, field: 'activity' })}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                            question.activityType === 'exam'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          {activityLabel}
                        </button>
                      )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-start gap-3 text-slate-500">
                      <button
                        type="button"
                        title="מחיקה"
                        aria-label="מחיקת השאלה"
                        onClick={() => onDelete(question.id)}
                        className="rounded-md p-2 text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="עריכה"
                        aria-label="עריכת השאלה"
                        onClick={() => onEdit(question)}
                        className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="הזזה למטה"
                        aria-label="הזזת השאלה למטה"
                        onClick={() => onMove(question.id, 'down')}
                        className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="הזזה למעלה"
                        aria-label="הזזת השאלה למעלה"
                        onClick={() => onMove(question.id, 'up')}
                        className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

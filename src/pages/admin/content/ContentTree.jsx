import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, Copy, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { SYSTEM_SUBJECTS } from '../../../utils/contentOps'
import { nodeId } from './treeModel'

const INDENT = ['', 'ms-4', 'ms-10']

function IconButton({ label, icon: Icon, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md bg-white p-1.5 transition hover:bg-slate-100 disabled:opacity-30 ${danger ? 'text-red-600' : 'text-slate-600'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

const miniButton = 'inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50'

// שדה הוספה בתוך העץ. נשאר פתוח אחרי הוספה, כדי להוסיף כמה ברצף
function InlineAdd({ placeholder, indent, onAdd, onCancel }) {
  const [value, setValue] = useState('')
  return (
    <form
      className={`my-1 flex gap-1 ${indent}`}
      onSubmit={event => {
        event.preventDefault()
        if (onAdd(value)) setValue('')
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={event => setValue(event.target.value)}
        onKeyDown={event => { if (event.key === 'Escape') onCancel() }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 rounded-lg border-2 border-blue-500 px-3 py-1.5 text-base"
      />
      <button type="submit" className="btn-primary px-3 py-1.5 text-sm">הוספה</button>
      <button type="button" onClick={onCancel} className="rounded-md p-1.5 text-slate-500" aria-label="ביטול ההוספה">
        <X className="h-4 w-4" />
      </button>
    </form>
  )
}

function Row({ depth, label, count, selected, expandable, expanded, onToggle, onSelect, actions }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-1 rounded-lg px-1 py-1 ${INDENT[depth]} ${selected ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
      {expandable ? (
        <button type="button" onClick={onToggle} className="p-1 text-slate-500" aria-label={expanded ? `סגירת ${label}` : `פתיחת ${label}`} aria-expanded={expanded}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      ) : <span className="w-6 text-center text-slate-400" aria-hidden="true">•</span>}
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={`min-w-0 flex-1 break-words py-1 text-right ${depth === 0 ? 'text-base font-extrabold' : depth === 1 ? 'text-base font-bold' : 'text-sm font-medium'} text-slate-900`}
      >
        {label}
      </button>
      <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">{count}</span>
      {/* כפתורי הפעולה מופיעים בשורה נפרדת רק במקום שנבחר, כדי שהשמות לא ייחתכו */}
      {selected && actions && <div className="flex w-full flex-wrap items-center gap-1 pb-1 ps-7 pt-1">{actions}</div>}
    </div>
  )
}

export default function ContentTree({ tree, selected, expanded, onToggle, onSelect, onAddTopic, onAddSubtopic, onMoveSubtopic, onRename, onDelete, onAssignTopic }) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(null)
  const needle = search.trim().toLowerCase()
  const matches = text => !needle || text.toLowerCase().includes(needle)
  const selectedId = nodeId(selected)

  function startAdding(node) {
    setAdding(nodeId(node))
    if (!expanded.has(nodeId(node))) onToggle(node)
  }

  return (
    <nav className="edu-card flex max-h-[70vh] flex-col overflow-hidden p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]" aria-label="עץ הנושאים">
      <label className="relative mb-2 block">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={event => setSearch(event.target.value)} className="input-field pr-10" placeholder="חיפוש נושא או תת-נושא" />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Row depth={0} label="כל השאלות" count={tree.total} selected={selectedId === nodeId({})} expandable={false} onSelect={() => onSelect({})} />

        {tree.grades.map(grade => {
          const gradeNode = { grade: grade.grade }
          const topics = grade.topics.filter(topic => matches(topic.subject) || topic.subtopics.some(item => matches(item.label)))
          if (needle && topics.length === 0) return null
          const gradeOpen = Boolean(needle) || expanded.has(nodeId(gradeNode))

          return (
            <div key={grade.grade}>
              <Row
                depth={0}
                label={grade.label}
                count={grade.count}
                selected={selectedId === nodeId(gradeNode)}
                expandable
                expanded={gradeOpen}
                onToggle={() => onToggle(gradeNode)}
                onSelect={() => onSelect(gradeNode)}
                actions={(
                  <button type="button" className={miniButton} onClick={() => startAdding(gradeNode)}>
                    <Plus className="h-3.5 w-3.5" />נושא
                  </button>
                )}
              />
              {adding === nodeId(gradeNode) && (
                <InlineAdd placeholder="שם הנושא החדש" indent="ms-4" onCancel={() => setAdding(null)} onAdd={name => {
                  const added = onAddTopic(grade.grade, name)
                  if (added) setAdding(null)
                  return added
                }} />
              )}

              {gradeOpen && topics.map(topic => {
                const topicNode = { grade: topic.grade, subject: topic.subject }
                const topicOpen = Boolean(needle) || expanded.has(nodeId(topicNode))
                const system = SYSTEM_SUBJECTS.has(topic.subject)
                const realLevels = topic.subtopics.filter(item => item.level !== null)
                const subtopics = topic.subtopics.filter(item => matches(item.label) || matches(topic.subject))

                return (
                  <div key={topic.subject}>
                    <Row
                      depth={1}
                      label={topic.subject}
                      count={topic.count}
                      selected={selectedId === nodeId(topicNode)}
                      expandable={topic.subtopics.length > 0}
                      expanded={topicOpen}
                      onToggle={() => onToggle(topicNode)}
                      onSelect={() => onSelect(topicNode)}
                      actions={system ? null : (
                        <>
                          <button type="button" className={miniButton} onClick={() => startAdding(topicNode)}>
                            <Plus className="h-3.5 w-3.5" />תת-נושא
                          </button>
                          <button type="button" className={miniButton} onClick={() => onAssignTopic(topicNode)}>
                            <Copy className="h-3.5 w-3.5" />שיוך לקטגוריה
                          </button>
                          <IconButton label="שינוי שם הנושא" icon={Pencil} onClick={() => onRename(topicNode)} />
                          <IconButton label="מחיקת הנושא" icon={Trash2} danger onClick={() => onDelete(topicNode)} />
                        </>
                      )}
                    />
                    {topicOpen && subtopics.map(sub => {
                      const subNode = { grade: sub.grade, subject: sub.subject, level: sub.level }
                      const index = realLevels.findIndex(item => item.level === sub.level)
                      return (
                        <Row
                          key={sub.level ?? 'no-level'}
                          depth={2}
                          label={sub.label}
                          count={sub.count}
                          selected={selectedId === nodeId(subNode)}
                          expandable={false}
                          onSelect={() => onSelect(subNode)}
                          actions={system ? null : sub.level === null ? (
                            <IconButton label="מחיקת השאלות שבלי תת-נושא" icon={Trash2} danger onClick={() => onDelete(subNode)} />
                          ) : (
                            <>
                              <IconButton label="הזזת תת-הנושא למעלה" icon={ArrowUp} disabled={index === 0} onClick={() => onMoveSubtopic(subNode, 'up')} />
                              <IconButton label="הזזת תת-הנושא למטה" icon={ArrowDown} disabled={index === realLevels.length - 1} onClick={() => onMoveSubtopic(subNode, 'down')} />
                              <IconButton label="שינוי שם תת-הנושא" icon={Pencil} onClick={() => onRename(subNode)} />
                              <IconButton label="מחיקת תת-הנושא" icon={Trash2} danger onClick={() => onDelete(subNode)} />
                            </>
                          )}
                        />
                      )
                    })}
                    {adding === nodeId(topicNode) && (
                      <InlineAdd placeholder="שם תת-הנושא" indent="ms-10" onCancel={() => setAdding(null)} onAdd={name => onAddSubtopic(topic.grade, topic.subject, name)} />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

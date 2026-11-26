import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { useApp } from '../../../context/AppContext'
import { API_ENABLED } from '../../../utils/api'
import { getGradeConfig } from '../../../data/learningTracks'
import {
  addSubtopic, addTopic, assignTopicToGrade, deleteSubtopic, deleteTopic, moveSubtopic, renameSubtopic, renameTopic,
} from '../../../utils/contentOps'
import {
  addPlacements, getPlacements, movePlacement, placeKey, questionsInGroup, removeFromPlace, reorderInGroup,
  setPlacementActivity, upsertQuestion,
} from '../../../utils/placements'
import { Drawer } from '../AdminDrawer'
import { PAGE_SIZE } from '../adminShared'
import ContentTree from './ContentTree'
import QuestionList from './QuestionList'
import QuestionEditor from './QuestionEditor'
import { AssignTopicDialog, DeleteNodeDialog, PickPlacesDialog, RemoveQuestionsDialog, RenameDialog } from './ContentDialogs'
import { copyDraft, draftFromQuestion, newDraft } from './questionDraft'
import {
  NO_LEVEL_LABEL, assignableGroups, buildTree, entriesAt, filterEntries, findTopic, hasLevelKey, leafPlace, nodeId, resolveNode, sortEntries,
} from './treeModel'

const nodeName = node => (hasLevelKey(node) ? node.level ?? NO_LEVEL_LABEL : node.subject || (node.grade ? getGradeConfig(node.grade)?.label : 'כל השאלות'))

// newQuestionSignal: עולה בכל לחיצה על "שאלה חדשה" בראש המסך
export default function ContentTab({ pushToast, newQuestionSignal }) {
  const { questions, customTracks, trackCatalog, applyContent, whenSaved } = useApp()
  const [selected, setSelected] = useState({})
  const [expanded, setExpanded] = useState(() => new Set())
  const [search, setSearch] = useState('')
  const [activity, setActivity] = useState('all')
  const [page, setPage] = useState(1)
  const [checked, setChecked] = useState(() => new Set())
  const [dialog, setDialog] = useState(null)
  const [editor, setEditor] = useState(null)
  const editorCounter = useRef(0)
  const savingRef = useRef(false)

  const tree = useMemo(() => buildTree(trackCatalog, questions), [trackCatalog, questions])
  const node = useMemo(() => resolveNode(tree, selected), [tree, selected])
  const groups = useMemo(() => assignableGroups(tree), [tree])
  const leaf = leafPlace(tree, node)
  const allEntries = useMemo(() => entriesAt(questions, node), [questions, node])
  const filtered = useMemo(() => sortEntries(tree, filterEntries(allEntries, { search, activity }), node), [tree, allEntries, search, activity, node])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageEntries = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const checkedEntries = filtered.filter(entry => checked.has(entry.question.id))
  const pageChecked = pageEntries.length > 0 && pageEntries.every(entry => checked.has(entry.question.id))

  // מספר סידורי לכל שאלה בתוך הקבוצה שלה (תרגול ומבחן נספרים בנפרד), לפי כל השאלות ולא רק המסוננות
  const order = useMemo(() => {
    if (!leaf) return null
    const result = new Map()
    ;['practice', 'exam'].forEach(activityType => {
      const group = { ...leaf, activityType }
      const entries = questionsInGroup(questions, group)
      entries.forEach((entry, index) => result.set(entry.question.id, { index, size: entries.length, group }))
    })
    return result
  }, [questions, leaf?.grade, leaf?.subject, leaf?.level])

  function select(next) {
    setSelected(next)
    setChecked(new Set())
    setPage(1)
    setSearch('')
    setExpanded(previous => {
      const result = new Set(previous)
      if (next.grade) result.add(nodeId({ grade: next.grade }))
      if (next.subject) result.add(nodeId({ grade: next.grade, subject: next.subject }))
      return result
    })
  }

  function toggle(target) {
    setExpanded(previous => {
      const result = new Set(previous)
      const key = nodeId(target)
      if (result.has(key)) result.delete(key)
      else result.add(key)
      return result
    })
  }

  // הודעת הצלחה רק אחרי שהשרת אישר. כשהשמירה נכשלת מוצגת הודעת השגיאה
  async function commit(changes, message, type = 'success', title = 'שמירה בוצעה') {
    applyContent(changes)
    const saved = await whenSaved()
    if (saved) pushToast(message, type, title)
    return saved
  }

  const state = { questions, customTracks, trackCatalog }
  const warn = message => pushToast(message, 'warning', 'לא בוצע')

  function handleAddTopic(grade, name) {
    const result = addTopic(state, grade, name)
    if (result.error) { warn(result.error); return false }
    select({ grade, subject: result.name })
    commit(result, API_ENABLED ? 'הנושא נשמר. תלמידים יראו אותו אחרי שתהיה בו שאלה.' : 'הנושא נוסף.', 'success', 'נושא חדש')
    return true
  }

  function handleAddSubtopic(grade, subject, name) {
    const result = addSubtopic(state, grade, subject, name)
    if (result.error) { warn(result.error); return false }
    select({ grade, subject, level: result.name })
    commit(result, result.movedCount > 0 ? `תת-הנושא נוסף, ו-${result.movedCount} שאלות של הנושא עברו אליו.` : 'תת-הנושא נוסף.')
    return true
  }

  function handleMoveSubtopic(target, direction) {
    commit(moveSubtopic(state, target.grade, target.subject, target.level, direction), 'סדר תתי-הנושאים עודכן.')
  }

  function handleRename(target, name) {
    const isSubtopic = hasLevelKey(target)
    const result = isSubtopic
      ? renameSubtopic(state, target.grade, target.subject, target.level, name)
      : renameTopic(state, target.grade, target.subject, name)
    if (result.error) { setDialog({ type: 'rename', node: target, error: result.error }); return }
    setDialog(null)
    if (!result.name) return
    select(isSubtopic ? { ...target, level: result.name } : { grade: target.grade, subject: result.name })
    commit(result, 'השם עודכן.')
  }

  function planDelete(target) {
    return hasLevelKey(target) ? deleteSubtopic(state, target.grade, target.subject, target.level) : deleteTopic(state, target.grade, target.subject)
  }

  function handleDeleteNode(target) {
    const result = planDelete(target)
    setDialog(null)
    select(hasLevelKey(target) ? { grade: target.grade, subject: target.subject } : { grade: target.grade })
    commit(result, 'המחיקה בוצעה.', 'warning', 'מחיקה הושלמה')
  }

  function handleAssignTopic(topic, targetGrade, includeQuestions) {
    const result = assignTopicToGrade(state, topic.grade, topic.subject, targetGrade, includeQuestions)
    setDialog(null)
    if (result.error) { warn(result.error); return }
    commit(result, includeQuestions ? `הנושא שויך, ו-${result.added} שאלות מקושרות אליו.` : 'הנושא שויך לקטגוריה בלי שאלות.', 'success', 'שיוך הושלם')
  }

  function handleAssignQuestions(ids, targets, activityType) {
    const result = addPlacements(questions, ids, targets, activityType)
    setDialog(null)
    if (result.added === 0) { warn('השאלות כבר משויכות למקומות שנבחרו.'); return }
    setChecked(new Set())
    commit({ questions: result.questions }, result.added === 1 ? 'נוסף שיוך אחד.' : `נוספו ${result.added} שיוכים.`, 'success', 'שיוך הושלם')
  }

  function handleMoveQuestions(entries, target) {
    const next = entries.reduce((list, entry) => movePlacement(list, entry.question.id, placeKey(entry.place), target), questions)
    setDialog(null)
    if (next === questions) { warn('השאלות כבר נמצאות במקום שנבחר.'); return }
    setChecked(new Set())
    commit({ questions: next }, entries.length === 1 ? 'השאלה הועברה.' : `${entries.length} שאלות הועברו.`)
  }

  function handleRemoveHere(entries) {
    const next = entries.reduce((list, entry) => removeFromPlace(list, entry.question.id, placeKey(entry.place)), questions)
    setDialog(null)
    setChecked(new Set())
    commit({ questions: next }, 'ההסרה בוצעה.', 'warning', 'מחיקה הושלמה')
  }

  function handleDeleteQuestions(entries) {
    const ids = new Set(entries.map(entry => entry.question.id))
    setDialog(null)
    setChecked(new Set())
    commit({ questions: questions.filter(question => !ids.has(question.id)) }, ids.size === 1 ? 'השאלה נמחקה.' : `${ids.size} שאלות נמחקו.`, 'warning', 'מחיקה הושלמה')
  }

  function handleToggleActivity(entry) {
    const nextActivity = entry.place.activityType === 'exam' ? 'practice' : 'exam'
    commit(
      { questions: setPlacementActivity(questions, entry.question.id, placeKey(entry.place), nextActivity) },
      nextActivity === 'exam' ? 'השאלה עברה למבחן.' : 'השאלה עברה לתרגול.',
    )
  }

  function handleReorder(id, group, toIndex) {
    commit({ questions: reorderInGroup(questions, group, id, toIndex) }, 'הסדר עודכן.')
  }

  function openEditor(draft, title) {
    editorCounter.current += 1
    setEditor({ key: editorCounter.current, draft, title })
  }

  const openNewQuestion = () => openEditor(newDraft(leaf ? [leaf] : []), 'הוספת שאלה חדשה')

  // הכפתור "שאלה חדשה" נמצא בכותרת המסך, מחוץ לרכיב הזה
  const seenSignal = useRef(newQuestionSignal)
  useEffect(() => {
    if (newQuestionSignal === seenSignal.current) return
    seenSignal.current = newQuestionSignal
    openNewQuestion()
  }, [newQuestionSignal])

  async function handleSaveQuestion({ question, places }, addAnother) {
    // הטופס נשאר פתוח עד לאישור, ולכן מונעים שמירה כפולה
    if (savingRef.current) return false
    savingRef.current = true
    const isEdit = Boolean(question.id)
    const result = upsertQuestion(questions, question, places, () => `custom-${crypto.randomUUID()}`)
    const where = places.length > 1 ? ` היא מופיעה ב-${places.length} מקומות.` : ''
    const saved = await commit({ questions: result.questions }, `${isEdit ? 'השאלה עודכנה.' : 'השאלה נשמרה.'}${where}`)
    savingRef.current = false
    // כשלא נשמר, הטופס נשאר פתוח עם מה שהוקלד כדי לנסות שוב
    if (saved && !addAnother) setEditor(null)
    return saved
  }

  const topic = node.subject ? findTopic(tree, node.grade, node.subject) : null
  const crumbs = [node.grade && getGradeConfig(node.grade)?.label, hasLevelKey(node) && node.subject].filter(Boolean).join(' › ')
  const summary = [
    `${allEntries.length} שאלות`,
    topic && !hasLevelKey(node) && topic.subtopics.length > 0 ? `${topic.subtopics.filter(item => item.level !== null).length} תתי-נושאים` : '',
    topic && !hasLevelKey(node) ? topic.track.questionTypes : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      <ContentTree
        tree={tree}
        selected={node}
        expanded={expanded}
        onToggle={toggle}
        onSelect={select}
        onAddTopic={handleAddTopic}
        onAddSubtopic={handleAddSubtopic}
        onMoveSubtopic={handleMoveSubtopic}
        onRename={target => setDialog({ type: 'rename', node: target })}
        onDelete={target => setDialog({ type: 'deleteNode', node: target, plan: planDelete(target) })}
        onAssignTopic={target => setDialog({ type: 'assignTopic', node: target })}
      />

      <div className="flex min-w-0 flex-col gap-3">
        <section className="edu-card p-4 text-right">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {crumbs && <div className="text-sm text-slate-500">{crumbs}</div>}
              <h2 className="break-words text-xl font-bold text-slate-950">{nodeName(node)}</h2>
              <div className="text-sm text-slate-600">{summary}</div>
            </div>
            {leaf ? (
              <button type="button" onClick={openNewQuestion} className="btn-primary">
                <Plus className="h-4 w-4" />
                שאלה כאן
              </button>
            ) : node.subject && topic?.subtopics.length > 0 ? (
              <p className="text-sm text-slate-500">להוספת שאלה בוחרים תת-נושא בעץ.</p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} className="input-field pr-10" placeholder="חיפוש בנוסח השאלה או בתשובה" />
            </label>
            <select value={activity} onChange={event => { setActivity(event.target.value); setPage(1) }} className="input-field w-auto" aria-label="סינון לפי פעילות">
              <option value="all">כל הפעילויות</option>
              <option value="practice">תרגול</option>
              <option value="exam">מבחן</option>
            </select>
            {(search || activity !== 'all') && (
              <button type="button" onClick={() => { setSearch(''); setActivity('all'); setPage(1) }} className="btn-secondary">ניקוי חיפוש</button>
            )}
          </div>

          {pageEntries.length > 0 && (
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={pageChecked}
                onChange={() => setChecked(previous => {
                  const next = new Set(previous)
                  pageEntries.forEach(entry => (pageChecked ? next.delete(entry.question.id) : next.add(entry.question.id)))
                  return next
                })}
              />
              בחירת כל השאלות בעמוד
            </label>
          )}
        </section>

        {checkedEntries.length > 0 && (
          <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 shadow-float">
            <span className="flex-1 text-right text-sm font-bold text-blue-900">{checkedEntries.length} שאלות נבחרו</span>
            <button type="button" onClick={() => setDialog({ type: 'assign', entries: checkedEntries })} className="btn-primary px-3 py-2 text-sm">שיוך</button>
            {checkedEntries.every(entry => entry.place) && (
              <button type="button" onClick={() => setDialog({ type: 'move', entries: checkedEntries })} className="btn-secondary px-3 py-2 text-sm">העברה</button>
            )}
            <button type="button" onClick={() => setDialog({ type: 'remove', entries: checkedEntries })} className="btn-danger px-3 py-2 text-sm">מחיקה</button>
            <button type="button" onClick={() => setChecked(new Set())} className="btn-muted px-3 py-2 text-sm">ניקוי בחירה</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="edu-card p-8 text-center text-slate-500">
            {allEntries.length > 0 ? 'לא נמצאו שאלות בהתאם לחיפוש.' : 'אין כאן שאלות עדיין. אפשר להוסיף שאלה חדשה, או לשייך לכאן שאלה קיימת ממקום אחר.'}
          </div>
        ) : (
          <QuestionList
            entries={pageEntries}
            showPath={!leaf}
            order={order}
            selectedIds={checked}
            onToggleSelect={id => setChecked(previous => {
              const next = new Set(previous)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })}
            onReorder={handleReorder}
            onEdit={question => openEditor(draftFromQuestion(question), 'עריכת שאלה')}
            onAssign={question => setDialog({ type: 'assign', entries: [{ question, places: getPlacements(question) }] })}
            onMove={entry => setDialog({ type: 'move', entries: [entry] })}
            onRemove={entries => setDialog({ type: 'remove', entries })}
            onToggleActivity={handleToggleActivity}
            onGoTo={place => select({ grade: place.grade, subject: place.subject, ...(place.level || findTopic(tree, place.grade, place.subject)?.subtopics.length ? { level: place.level } : {}) })}
          />
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <div>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} מתוך {filtered.length}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="btn-muted px-3 py-2 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />קודם
              </button>
              <span className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700">עמוד {currentPage} מתוך {totalPages}</span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} className="btn-muted px-3 py-2 disabled:opacity-40">
                הבא<ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        {leaf && filtered.length > 1 && <p className="text-right text-sm text-slate-500">סדר השאלות נשמר לכל מקום בנפרד.</p>}
      </div>

      {dialog?.type === 'rename' && (
        <RenameDialog
          title={hasLevelKey(dialog.node) ? 'שינוי שם תת-הנושא' : 'שינוי שם הנושא'}
          current={nodeName(dialog.node)}
          error={dialog.error}
          onConfirm={name => handleRename(dialog.node, name)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'deleteNode' && (
        <DeleteNodeDialog
          name={nodeName(dialog.node)}
          removedCount={dialog.plan.removedCount}
          unlinkedCount={dialog.plan.unlinkedCount}
          requireName={dialog.plan.removedCount + dialog.plan.unlinkedCount > 0}
          onConfirm={() => handleDeleteNode(dialog.node)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'assignTopic' && (
        <AssignTopicDialog topic={dialog.node} onConfirm={(grade, include) => handleAssignTopic(dialog.node, grade, include)} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'assign' && (
        <PickPlacesDialog
          title={dialog.entries.length === 1 ? 'שיוך השאלה למקומות נוספים' : `שיוך ${dialog.entries.length} שאלות`}
          hint="אפשר לסמן כמה מקומות, גם בקטגוריות שונות. אלה אותן שאלות בכל המקומות."
          groups={groups}
          lockedKeys={dialog.entries.length === 1 ? new Set(dialog.entries[0].places.map(placeKey)) : undefined}
          confirmLabel="שיוך"
          onConfirm={(targets, activityType) => handleAssignQuestions(dialog.entries.map(entry => entry.question.id), targets, activityType)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'move' && (
        <PickPlacesDialog
          title={dialog.entries.length === 1 ? 'העברת השאלה' : `העברת ${dialog.entries.length} שאלות`}
          hint="השאלה עוברת מהמקום הנוכחי למקום שתבחרו. שיוכים למקומות אחרים לא משתנים."
          groups={groups}
          multiple={false}
          lockedKeys={dialog.entries.length === 1 ? new Set([placeKey(dialog.entries[0].place)]) : undefined}
          confirmLabel="העברה"
          onConfirm={targets => handleMoveQuestions(dialog.entries, targets[0])}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'remove' && (
        <RemoveQuestionsDialog
          entries={dialog.entries}
          onRemoveHere={() => handleRemoveHere(dialog.entries)}
          onDeleteAll={() => handleDeleteQuestions(dialog.entries)}
          onClose={() => setDialog(null)}
        />
      )}

      <Drawer
        open={Boolean(editor)}
        title={editor?.title || ''}
        subtitle={API_ENABLED ? 'השאלה נשמרת בשרת ומופיעה לכל המשתמשים.' : 'השאלה נשמרת במחשב הזה ופועלת גם באופליין.'}
        onClose={() => setEditor(null)}
      >
        {editor && (
          <QuestionEditor
            key={editor.key}
            initialDraft={editor.draft}
            groups={groups}
            onSave={handleSaveQuestion}
            onCancel={() => setEditor(null)}
            onDuplicate={draft => openEditor(copyDraft(draft), 'עותק חדש של שאלה')}
          />
        )}
      </Drawer>
    </div>
  )
}

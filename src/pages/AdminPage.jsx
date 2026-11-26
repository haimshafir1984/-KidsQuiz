import { useEffect, useMemo, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, Users, BookCopy, FileQuestion, History } from 'lucide-react'
import { useApp } from '../context/AppContext'
import AdminUsers from './AdminUsers'
import AdminActivity from './AdminActivity'
import { API_ENABLED } from '../utils/api'
import { GRADES } from '../data/learningTracks'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import ToastViewport from '../components/shared/ToastViewport'
import { useAdminStats } from '../utils/adminData'
import { PAGE_SIZE, createQuestionDraft, createToast } from './admin/adminShared'
import { TabButton, SummaryHeader } from './admin/AdminTabs'
import { TopicsTab, TopicForm } from './admin/TopicsTab'
import { QuestionForm } from './admin/QuestionForm'
import { Drawer } from './admin/AdminDrawer'
import { BulkActionsBar, InlineQuestionsTable } from './admin/QuestionsTable'
import LocalTracksNotice from './admin/LocalTracksNotice'

export default function AdminPage() {
  const {
    questions,
    addQuestion,
    updateQuestion,
    duplicateQuestionToTargets,
    deleteQuestion,
    deleteQuestions,
    moveQuestion,
    trackCatalog,
    addTrack,
    assignTrackToGrade,
    renameTrack,
    deleteTrack,
    storageError,
    clearStorageError,
    whenSaved,
    localOnlyTracks,
    uploadLocalTracks,
    dismissLocalTracks,
  } = useApp()
  const savingRef = useRef(false)

  const [activeTab, setActiveTab] = useState('questions')
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [drawerQuestion, setDrawerQuestion] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null })

  function pushToast(message, type = 'info', title = '') {
    setToasts(previous => [...previous, createToast(message, type, title)])
  }

  function dismissToast(id) {
    setToasts(previous => previous.filter(toast => toast.id !== id))
  }

  function requestConfirmation({ title, message, onConfirm }) {
    setConfirmState({ open: true, title, message, onConfirm })
  }

  function closeConfirmation() {
    setConfirmState({ open: false, title: '', message: '', onConfirm: null })
  }

  useEffect(() => {
    if (!storageError) return
    setToasts(previous => [...previous, { ...createToast(storageError, 'error', 'שגיאת שמירה'), duration: 7000 }])
    clearStorageError()
  }, [storageError])

  const topicsCount = useMemo(
    () => Object.values(trackCatalog).flatMap(items => items).length,
    [trackCatalog],
  )

  const adminStats = useAdminStats()
  const usersCount = useMemo(() => adminStats.users.filter(user => user.role !== 'admin').length, [adminStats.users])

  const availableSubjects = useMemo(() => {
    const subjects = gradeFilter === 'all'
      ? Object.values(trackCatalog).flatMap(tracks => tracks.map(track => track.subject))
      : (trackCatalog[gradeFilter] || []).map(track => track.subject)

    return [...new Set(subjects)].sort((first, second) => first.localeCompare(second, 'he'))
  }, [gradeFilter, trackCatalog])

  useEffect(() => {
    if (subjectFilter !== 'all' && !availableSubjects.includes(subjectFilter)) {
      setSubjectFilter('all')
    }
  }, [availableSubjects, subjectFilter])

  // רמות / תתי-נושאים קיימים בנושא שנבחר (בסדר ההגדרה בקטלוג, ואחר כך כל השאר)
  const availableLevels = useMemo(() => {
    if (subjectFilter === 'all') return []

    const inQuestions = new Set(
      questions
        .filter(question => question.subject === subjectFilter && (gradeFilter === 'all' || question.grade === gradeFilter))
        .map(question => question.level)
        .filter(Boolean),
    )
    const catalogOrder = Object.values(trackCatalog)
      .flatMap(tracks => tracks)
      .find(track => track.subject === subjectFilter)?.levels || []

    return [
      ...catalogOrder.filter(level => inQuestions.has(level)),
      ...[...inQuestions].filter(level => !catalogOrder.includes(level)),
    ]
  }, [gradeFilter, questions, subjectFilter, trackCatalog])

  useEffect(() => {
    if (levelFilter !== 'all' && !availableLevels.includes(levelFilter)) {
      setLevelFilter('all')
    }
  }, [availableLevels, levelFilter])

  const filteredQuestions = useMemo(() => {
    return questions
      .filter(question => {
        const matchesGrade = gradeFilter === 'all' || question.grade === gradeFilter
        const matchesSubject = subjectFilter === 'all' || question.subject === subjectFilter
        const matchesActivity = activityFilter === 'all' || question.activityType === activityFilter
        const matchesLevel = levelFilter === 'all' || question.level === levelFilter
        const matchesSearch = !searchQuery.trim()
          || question.text.toLowerCase().includes(searchQuery.toLowerCase())
          || question.correct_answer.some(answer => answer.toLowerCase().includes(searchQuery.toLowerCase()))

        return matchesGrade && matchesSubject && matchesActivity && matchesLevel && matchesSearch
      })
      .sort((first, second) => {
        if (first.grade !== second.grade) return first.grade.localeCompare(second.grade)
        if (first.subject !== second.subject) return first.subject.localeCompare(second.subject, 'he')
        if ((first.level || '') !== (second.level || '')) return (first.level || '').localeCompare(second.level || '', 'he')
        return (first.position || 0) - (second.position || 0)
      })
  }, [activityFilter, gradeFilter, levelFilter, questions, searchQuery, subjectFilter])

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE))

  useEffect(() => {
    setPage(previous => Math.min(previous, totalPages))
  }, [totalPages])

  const pagedQuestions = filteredQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setSelectedIds(previous => {
      const next = new Set([...previous].filter(id => filteredQuestions.some(question => question.id === id)))
      return next
    })
  }, [filteredQuestions])

  function handleToggleSelect(id) {
    setSelectedIds(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleToggleSelectPage(allSelected) {
    setSelectedIds(previous => {
      const next = new Set(previous)
      pagedQuestions.forEach(question => {
        if (allSelected) next.delete(question.id)
        else next.add(question.id)
      })
      return next
    })
  }

  // הודעת הצלחה רק אחרי שהשרת אישר. כשהשמירה נכשלת מוצגת הודעת השגיאה (storageError)
  async function toastWhenSaved(message, type = 'success', title = 'שמירה בוצעה') {
    const saved = await whenSaved()
    if (saved) pushToast(message, type, title)
    return saved
  }

  async function handleSave(questionData) {
    // הטופס נשאר פתוח עד לאישור, ולכן מונעים שמירה כפולה
    if (savingRef.current) return
    savingRef.current = true
    const isEdit = Boolean(drawerQuestion?.id)
    if (isEdit) updateQuestion(drawerQuestion.id, questionData)
    else addQuestion(questionData)

    const saved = await toastWhenSaved(
      isEdit ? 'השאלה עודכנה.' : (API_ENABLED ? 'השאלה נשמרה.' : 'השאלה נוספה למאגר המקומי.'),
      'success',
      isEdit ? 'שמירה בוצעה' : 'שאלה חדשה',
    )
    savingRef.current = false
    // כשלא נשמר, הטופס נשאר פתוח עם מה שהוקלד כדי לנסות שוב
    if (saved) setDrawerQuestion(null)
  }

  function handleQuickEdit(question) {
    setDrawerQuestion(question)
  }

  function handleOpenNewQuestion(grade, subject) {
    setDrawerQuestion(createQuestionDraft(trackCatalog, grade, subject))
  }

  function handleDeleteQuestion(id) {
    requestConfirmation({
      title: 'מחיקת שאלה',
      message: API_ENABLED
        ? 'השאלה תוסר מהאתר. אפשר לשחזר אותה בלשונית "שחזור ויומן". להמשיך?'
        : 'השאלה תימחק מהמאגר המקומי ותיעלם גם מהשימוש באופליין. להמשיך?',
      onConfirm: () => {
        deleteQuestion(id)
        setSelectedIds(previous => {
          const next = new Set(previous)
          next.delete(id)
          return next
        })
        toastWhenSaved('השאלה נמחקה.', 'warning', 'מחיקה הושלמה')
        closeConfirmation()
      },
    })
  }

  function handleDeleteSelected() {
    requestConfirmation({
      title: 'מחיקת שאלות נבחרות',
      message: API_ENABLED
        ? `יוסרו ${selectedIds.size} שאלות מהאתר. אפשר לשחזר אותן בלשונית "שחזור ויומן". להמשיך?`
        : `יימחקו ${selectedIds.size} שאלות מהמאגר המקומי. להמשיך?`,
      onConfirm: () => {
        deleteQuestions([...selectedIds])
        setSelectedIds(new Set())
        toastWhenSaved('השאלות שנבחרו נמחקו.', 'warning', 'מחיקה קבוצתית')
        closeConfirmation()
      },
    })
  }

  function handleLinkQuestion(target) {
    if (!drawerQuestion?.id) return
    const created = duplicateQuestionToTargets(drawerQuestion.id, [target])

    if (created.length === 0) {
      pushToast('השאלה כבר קיימת ביעד שבחרת.', 'warning', 'ללא שינוי')
      return
    }

    toastWhenSaved('נוסף שיוך חדש לשאלה.', 'success', 'שיוך הושלם')
  }

  function handleAddTopic(trackData) {
    addTrack(trackData)
    setShowTopicForm(false)
    toastWhenSaved(API_ENABLED ? 'הנושא נשמר. תלמידים יראו אותו אחרי שתהיה בו שאלה.' : 'הנושא נוסף והמערכת שמרה אותו מקומית.', 'success', 'נושא חדש')
  }

  function handleRenameTopic(grade, currentSubject, nextSubject) {
    if (!nextSubject.trim()) {
      pushToast('יש להזין שם נושא חדש.', 'warning', 'שדה חסר')
      return
    }

    renameTrack(grade, currentSubject, nextSubject)
    toastWhenSaved('שם הנושא עודכן.')
  }

  function handleDeleteTopic(grade, subject) {
    requestConfirmation({
      title: 'מחיקת נושא',
      message: API_ENABLED
        ? `הנושא "${subject}" וכל השאלות שבו יוסרו מהאתר. את השאלות אפשר לשחזר אחת-אחת בלשונית "שחזור ויומן". להמשיך?`
        : `הנושא "${subject}" וכל השאלות שבו יימחקו מהמאגר המקומי. להמשיך?`,
      onConfirm: () => {
        deleteTrack(grade, subject)
        toastWhenSaved('הנושא נמחק.', 'warning', 'מחיקה הושלמה')
        closeConfirmation()
      },
    })
  }

  function handleAssignTopicToGrade(payload) {
    const { createdTrack, copiedQuestions } = assignTrackToGrade(payload)

    if (!createdTrack && copiedQuestions === 0) {
      pushToast('לא בוצע שינוי. ייתכן שהנושא כבר קיים בקטגוריה שנבחרה.', 'warning', 'ללא שינוי')
      return
    }

    if (payload.includeQuestions) {
      toastWhenSaved(`הנושא שויך ונוספו ${copiedQuestions} שאלות לקטגוריה החדשה.`, 'success', 'שיוך הושלם')
      return
    }

    toastWhenSaved('הנושא שויך לקטגוריה החדשה ללא שכפול שאלות.', 'success', 'שיוך הושלם')
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kidsquiz-questions-export.json'
    link.click()
    URL.revokeObjectURL(url)
    pushToast('קובץ השאלות נשמר במחשב.', 'success', 'ייצוא בוצע')
  }

  return (
    <div className="flex flex-col gap-5">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onCancel={closeConfirmation}
        onConfirm={confirmState.onConfirm || closeConfirmation}
      />

      <SummaryHeader
        activeTab={activeTab}
        onNewQuestion={() => handleOpenNewQuestion()}
        onExport={handleExport}
      />

      <div className="flex flex-wrap items-center border-b border-slate-200">
        <TabButton
          active={activeTab === 'questions'}
          label="שאלות"
          count={questions.length}
          icon={FileQuestion}
          onClick={() => setActiveTab('questions')}
        />
        <TabButton
          active={activeTab === 'topics'}
          label="נושאים"
          count={topicsCount}
          icon={BookCopy}
          onClick={() => setActiveTab('topics')}
        />
        <TabButton
          active={activeTab === 'users'}
          label="משתמשים"
          count={usersCount}
          icon={Users}
          onClick={() => setActiveTab('users')}
        />
        {API_ENABLED && (
          <TabButton
            active={activeTab === 'activity'}
            label="שחזור ויומן"
            icon={History}
            onClick={() => setActiveTab('activity')}
          />
        )}
      </div>

      {activeTab === 'users' && <AdminUsers stats={adminStats} />}
      {activeTab === 'activity' && <AdminActivity />}

      {activeTab === 'topics' && (
        <>
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowTopicForm(previous => !previous)} className="btn-primary">
              <Plus className="h-4 w-4" />
              {showTopicForm ? 'סגירת הוספת נושא' : 'הוספת נושא'}
            </button>
          </div>

          {showTopicForm && (
            <TopicForm
              onSave={handleAddTopic}
              onCancel={() => setShowTopicForm(false)}
              onError={message => pushToast(message, 'warning', 'שדה חסר')}
            />
          )}

          <LocalTracksNotice
            tracks={localOnlyTracks}
            onUpload={async () => {
              if (await uploadLocalTracks()) pushToast('הנושאים הועלו לשרת.', 'success', 'שמירה בוצעה')
            }}
            onDismiss={dismissLocalTracks}
          />

          <TopicsTab
            trackCatalog={trackCatalog}
            onRename={handleRenameTopic}
            onDelete={handleDeleteTopic}
            onAddQuestion={handleOpenNewQuestion}
            onAssign={handleAssignTopicToGrade}
          />
        </>
      )}

      {activeTab === 'questions' && (
        <>
          <section className="space-y-4 lg:sticky lg:top-4 lg:z-20">
            <div className="edu-card p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <label className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    className="input-field pr-10"
                    placeholder="חיפוש בנוסח השאלה או בתשובה"
                  />
                </label>
                <select value={gradeFilter} onChange={event => setGradeFilter(event.target.value)} className="input-field">
                  <option value="all">כל הקטגוריות</option>
                  {GRADES.map(grade => (
                    <option key={grade.value} value={grade.value}>{grade.label}</option>
                  ))}
                </select>
                <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="input-field">
                  <option value="all">כל הנושאים</option>
                  {availableSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                {availableLevels.length > 0 && (
                  <select value={levelFilter} onChange={event => setLevelFilter(event.target.value)} className="input-field">
                    <option value="all">כל התתי-נושאים / הרמות</option>
                    {availableLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                )}
                <select value={activityFilter} onChange={event => setActivityFilter(event.target.value)} className="input-field">
                  <option value="all">כל הפעילויות</option>
                  <option value="practice">תרגול</option>
                  <option value="exam">מבחן</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setGradeFilter('all')
                    setSubjectFilter('all')
                    setActivityFilter('all')
                    setLevelFilter('all')
                  }}
                  className="btn-secondary"
                >
                  איפוס
                </button>
              </div>
            </div>

            <BulkActionsBar
              selectedCount={selectedIds.size}
              onDeleteSelected={handleDeleteSelected}
              onClear={() => setSelectedIds(new Set())}
            />
          </section>

          {filteredQuestions.length === 0 ? (
            <div className="edu-card p-8 text-center text-slate-500">לא נמצאו שאלות בהתאם לסינון שנבחר.</div>
          ) : (
            <>
              <InlineQuestionsTable
                questions={pagedQuestions}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectPage={handleToggleSelectPage}
                onMove={moveQuestion}
                onDelete={handleDeleteQuestion}
                onEdit={handleQuickEdit}
                onQuickUpdate={updateQuestion}
                trackCatalog={trackCatalog}
              />

              <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredQuestions.length)} מתוך {filteredQuestions.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(previous => Math.max(1, previous - 1))}
                    disabled={page === 1}
                    className="btn-muted px-3 py-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    קודם
                  </button>
                  <span className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700">
                    עמוד {page} מתוך {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(previous => Math.min(totalPages, previous + 1))}
                    disabled={page === totalPages}
                    className="btn-muted px-3 py-2 disabled:opacity-40"
                  >
                    הבא
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Drawer
        open={Boolean(drawerQuestion)}
        title={drawerQuestion?.id ? 'עריכה מלאה של שאלה' : 'הוספת שאלה חדשה'}
        subtitle={drawerQuestion?.id
          ? 'כאן אפשר לעדכן ניסוח, מיקום, רמה, שיוכים נוספים והסבר משוב.'
          : (API_ENABLED ? 'השאלה נשמרת בשרת ומופיעה לכל המשתמשים.' : 'הטופס שומר את כל הנתונים במאגר המקומי כדי שיעבדו גם באופליין.')}
        onClose={() => setDrawerQuestion(null)}
      >
        {drawerQuestion && (
          <QuestionForm
            initialQuestion={drawerQuestion}
            trackCatalog={trackCatalog}
            onSave={handleSave}
            onCancel={() => setDrawerQuestion(null)}
            onLinkQuestion={handleLinkQuestion}
            onError={message => pushToast(message, 'warning', 'שדה חסר')}
          />
        )}
      </Drawer>
    </div>
  )
}

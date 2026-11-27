import { useEffect, useMemo, useState } from 'react'
import { Users, BookCopy, History, Settings } from 'lucide-react'
import { useApp } from '../context/AppContext'
import AdminUsers from './AdminUsers'
import AdminActivity from './AdminActivity'
import { API_ENABLED } from '../utils/api'
import ToastViewport from '../components/shared/ToastViewport'
import { useAdminStats } from '../utils/adminData'
import { createToast } from './admin/adminShared'
import { TabButton, SummaryHeader } from './admin/AdminTabs'
import ContentTab from './admin/content/ContentTab'
import LocalTracksNotice from './admin/LocalTracksNotice'
import SiteSettingsTab from './admin/SiteSettingsTab'

export default function AdminPage() {
  const { questions, storageError, clearStorageError, localOnlyTracks, uploadLocalTracks, dismissLocalTracks } = useApp()

  const [activeTab, setActiveTab] = useState('content')
  const [newQuestionSignal, setNewQuestionSignal] = useState(0)
  const [toasts, setToasts] = useState([])

  function pushToast(message, type = 'info', title = '') {
    setToasts(previous => [...previous, createToast(message, type, title)])
  }

  function dismissToast(id) {
    setToasts(previous => previous.filter(toast => toast.id !== id))
  }

  useEffect(() => {
    if (!storageError) return
    setToasts(previous => [...previous, { ...createToast(storageError, 'error', 'שגיאת שמירה'), duration: 7000 }])
    clearStorageError()
  }, [storageError])

  const adminStats = useAdminStats()
  const usersCount = useMemo(() => adminStats.users.filter(user => user.role !== 'admin').length, [adminStats.users])

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

      <SummaryHeader
        activeTab={activeTab}
        onNewQuestion={() => setNewQuestionSignal(previous => previous + 1)}
        onExport={handleExport}
      />

      <div className="flex flex-wrap items-center border-b border-slate-200">
        <TabButton
          active={activeTab === 'content'}
          label="נושאים ושאלות"
          count={questions.length}
          icon={BookCopy}
          onClick={() => setActiveTab('content')}
        />
        <TabButton
          active={activeTab === 'users'}
          label="משתמשים"
          count={usersCount}
          icon={Users}
          onClick={() => setActiveTab('users')}
        />
        <TabButton
          active={activeTab === 'settings'}
          label="הגדרות האתר"
          icon={Settings}
          onClick={() => setActiveTab('settings')}
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
      {activeTab === 'settings' && <SiteSettingsTab pushToast={pushToast} />}

      {/* לשונית התוכן נשארת טעונה, כדי שהמקום בעץ לא יאבד במעבר בין לשוניות */}
      <div className={activeTab === 'content' ? 'flex flex-col gap-4' : 'hidden'}>
        <LocalTracksNotice
          tracks={localOnlyTracks}
          onUpload={async () => {
            if (await uploadLocalTracks()) pushToast('הנושאים הועלו לשרת.', 'success', 'שמירה בוצעה')
          }}
          onDismiss={dismissLocalTracks}
        />
        <ContentTab pushToast={pushToast} newQuestionSignal={newQuestionSignal} />
      </div>
    </div>
  )
}

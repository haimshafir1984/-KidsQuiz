import { GRADES } from '../../data/learningTracks'

export const PAGE_SIZE = 25

// ברירת המחדל לשאלה היא תרגול (רשימת הפעילויות ממוינת, ו-exam מופיע בה ראשון)
export function defaultActivity(track) {
  const activities = track?.activities || []
  return activities.includes('practice') ? 'practice' : activities[0] || 'practice'
}

export function createQuestionDraft(trackCatalog, grade, subject) {
  const fallbackGrade = grade || GRADES[0]?.value || 'grade-8'
  const availableTracks = trackCatalog[fallbackGrade] || []
  const activeTrack = availableTracks.find(track => track.subject === subject) || availableTracks[0]

  return {
    text: '',
    type: 'multiple',
    options: ['', '', '', ''],
    correct_answer: [''],
    grade: fallbackGrade,
    subject: activeTrack?.subject || '',
    level: activeTrack?.levels?.[0] || null,
    activityType: defaultActivity(activeTrack),
    // ריק = בסוף הרשימה (נקבע בשמירה)
    position: '',
    explanation: '',
  }
}

export function createToast(message, type = 'info', title = '') {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
    title,
    duration: 3200,
  }
}

import { useState } from 'react'
import { getGradeConfig } from '../../data/learningTracks'

// נושאים שנוצרו בעבר ונשמרו רק בדפדפן הזה. המנהל מחליט אם להעלות אותם לשרת
export default function LocalTracksNotice({ tracks, onUpload, onDismiss }) {
  const [busy, setBusy] = useState(false)
  if (!tracks.length) return null

  async function handleUpload() {
    setBusy(true)
    await onUpload()
    setBusy(false)
  }

  return (
    <section className="rounded-card border-2 border-amber-300 bg-amber-50 p-5 text-right" role="status">
      <h3 className="text-lg font-bold text-amber-900">יש {tracks.length} נושאים ששמורים רק בדפדפן הזה</h3>
      <p className="mt-1 text-base text-amber-900">הם לא מופיעים אצל מנהלים אחרים. אפשר להעלות אותם לשרת.</p>
      <ul className="mt-2 list-inside list-disc text-base text-amber-900">
        {tracks.map(track => (
          <li key={`${track.grade}::${track.subject}`}>{track.subject} ({getGradeConfig(track.grade)?.label || track.grade})</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={handleUpload} disabled={busy} className="btn-primary px-4 py-2 text-sm">
          {busy ? 'מעלים...' : 'העלאה לשרת'}
        </button>
        <button type="button" onClick={onDismiss} className="btn-muted px-4 py-2 text-sm">לא להעלות, ולא להציג שוב</button>
      </div>
    </section>
  )
}

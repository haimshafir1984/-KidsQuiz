// עזרים לסנכרון נושאים שנוצרו בניהול מול השרת. מבנה: { [קטגוריה]: [נושא, ...] }

function flatten(map) {
  const entries = new Map()
  for (const [grade, tracks] of Object.entries(map || {})) {
    for (const track of tracks || []) {
      if (!track?.subject) continue
      entries.set(`${grade}::${track.subject}`, {
        grade,
        subject: track.subject,
        questionTypes: track.questionTypes || '',
        levels: track.levels || [],
        activities: track.activities || ['practice'],
      })
    }
  }
  return entries
}

// ההפרש בין שתי רשימות: מה לשמור בשרת ומה למחוק
export function diffTracks(previous, next) {
  const before = flatten(previous)
  const after = flatten(next)
  const upserts = [...after].filter(([key, track]) => JSON.stringify(before.get(key)) !== JSON.stringify(track)).map(([, track]) => track)
  const removals = [...before].filter(([key]) => !after.has(key)).map(([, track]) => ({ grade: track.grade, subject: track.subject }))
  return { upserts, removals }
}

// נושאים ששמורים רק בדפדפן ואינם בשרת (נוצרו לפני שהנושאים נשמרו בשרת)
export function findLocalOnlyTracks(localTracks, serverTracks) {
  const onServer = flatten(serverTracks)
  return [...flatten(localTracks)].filter(([key]) => !onServer.has(key)).map(([, track]) => track)
}

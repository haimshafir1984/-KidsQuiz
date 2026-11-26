import { useState } from 'react'
import { placeKey } from '../../../utils/placements'

// בחירת מקומות. multiple: כמה תיבות סימון; אחרת בחירה יחידה. lockedKeys: מקומות שכבר משויכים
export default function PlacePicker({ groups, multiple = true, lockedKeys = new Set(), chosen, onChange }) {
  const [search, setSearch] = useState('')
  const needle = search.trim().toLowerCase()
  const chosenKeys = new Set(chosen.map(placeKey))

  function toggle(place) {
    const target = { grade: place.grade, subject: place.subject, level: place.level }
    if (!multiple) return onChange([target])
    return onChange(chosenKeys.has(placeKey(target)) ? chosen.filter(item => placeKey(item) !== placeKey(target)) : [...chosen, target])
  }

  const visible = groups
    .map(grade => ({
      ...grade,
      topics: grade.topics
        .map(topic => ({
          ...topic,
          places: topic.places.filter(place => !needle || place.label.toLowerCase().includes(needle) || topic.subject.toLowerCase().includes(needle)),
        }))
        .filter(topic => topic.places.length > 0),
    }))
    .filter(grade => grade.topics.length > 0)

  const item = (place, indent) => {
    const key = placeKey(place)
    const locked = lockedKeys.has(key)
    return (
      <label key={key} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${indent} ${locked ? 'text-slate-400' : 'cursor-pointer hover:bg-blue-50'}`}>
        <input
          type={multiple ? 'checkbox' : 'radio'}
          className="h-5 w-5 shrink-0"
          name="place-picker"
          checked={(multiple && locked) || chosenKeys.has(key)}
          disabled={locked}
          onChange={() => toggle(place)}
        />
        <span className="text-base">{place.label}{locked ? (multiple ? ' (כבר משויכת)' : ' (המקום הנוכחי)') : ''}</span>
      </label>
    )
  }

  return (
    <div>
      <input value={search} onChange={event => setSearch(event.target.value)} className="input-field" placeholder="חיפוש נושא או תת-נושא" aria-label="חיפוש נושא או תת-נושא" />
      <div className="mt-2 max-h-[45vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 text-right">
        {visible.length === 0 && <p className="p-3 text-slate-500">לא נמצאו תוצאות.</p>}
        {visible.map(grade => (
          <div key={grade.grade} className="mb-2">
            <div className="px-1 py-1 text-base font-extrabold text-slate-900">{grade.label}</div>
            {grade.topics.map(topic => (
              topic.places.length === 1 && topic.places[0].level === null
                ? item(topic.places[0], 'ms-3')
                : (
                  <div key={topic.subject}>
                    <div className="ms-3 mt-1 text-sm font-bold text-slate-600">{topic.subject}</div>
                    {topic.places.map(place => item(place, 'ms-8'))}
                  </div>
                )
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

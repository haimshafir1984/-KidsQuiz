// צלילי משוב קצרים לתשובה נכונה/שגויה. נוצרים בקוד (Web Audio) - בלי קבצי שמע, ולכן עובדים גם באופליין.
// הצליל שקט במכוון, ואפשר לכבות אותו (נשמר במכשיר).

const SOUND_KEY = 'kq_sound_enabled'
const VOLUME = 0.07

let audioContext = null

export function isSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0')
  } catch {
    // אין גישה לאחסון - מתעלמים
  }
}

function getContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioContext) audioContext = new Ctx()
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

// צליל בודד עם עלייה וירידה רכות (בלי "נקישה" בתחילה ובסוף)
function tone(ctx, { frequency, start, duration, type = 'sine' }) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  const t0 = ctx.currentTime + start

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, t0)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(VOLUME, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(t0)
  oscillator.stop(t0 + duration + 0.02)
}

export function playFeedbackSound(isCorrect) {
  if (!isSoundEnabled()) return

  try {
    const ctx = getContext()
    if (!ctx) return

    if (isCorrect) {
      // שני צלילים עולים ובהירים
      tone(ctx, { frequency: 659, start: 0, duration: 0.14 })
      tone(ctx, { frequency: 880, start: 0.12, duration: 0.22 })
    } else {
      // שני צלילים נמוכים ויורדים, רכים יותר
      tone(ctx, { frequency: 262, start: 0, duration: 0.16, type: 'triangle' })
      tone(ctx, { frequency: 196, start: 0.14, duration: 0.26, type: 'triangle' })
    }
  } catch {
    // לא מפילים את החידון בגלל שמע
  }
}

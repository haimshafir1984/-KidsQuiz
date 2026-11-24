import { useEffect, useRef } from 'react'

// אימות Cloudflare Turnstile (נגד הרשמות אוטומטיות). מוצג רק כשמוגדר VITE_TURNSTILE_SITE_KEY.
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptPromise = null
function loadScript() {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = resolve
      script.onerror = () => { scriptPromise = null; reject(new Error('turnstile load failed')) }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

// onToken(token) נקרא כשהאימות עבר, ו-onToken('') כשהאימות פג
export default function Turnstile({ onToken, resetKey = 0 }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined
    let widgetId = null
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !containerRef.current) return
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: 'he',
        callback: token => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }).catch(() => onToken(''))
    return () => {
      cancelled = true
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [onToken, resetKey])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={containerRef} className="flex justify-center sm:col-span-2" />
}

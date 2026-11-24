// אימות Cloudflare Turnstile בצד השרת. פעיל רק כשמוגדר TURNSTILE_SECRET.
import { config } from './config.js'

export async function verifyTurnstileToken(token, ip) {
  if (!config.turnstileSecret) return true
  if (typeof token !== 'string' || !token || token.length > 2048) return false
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: config.turnstileSecret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    })
    const result = await response.json()
    return result.success === true
  } catch {
    // כשל בשירות האימות: חוסמים (עדיף לא לאפשר הרשמה מאשר לעקוף את ההגנה)
    return false
  }
}

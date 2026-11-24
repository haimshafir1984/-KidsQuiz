// הגבלת ניסיונות כניסה בזיכרון (מופע שרת יחיד): לפי "כתובת + חשבון" ולפי חשבון בלבד.
// נועדה לעצור ניחוש סיסמאות בלי לחסום כיתה שלמה שיושבת מאחורי כתובת אחת.

export function createAttemptLimiter({ maxPerIpAccount = 8, maxPerAccount = 50, windowMs = 15 * 60 * 1000 } = {}) {
  const failures = new Map() // מפתח -> רשימת זמני כישלון

  function recent(key, now) {
    const list = (failures.get(key) || []).filter(time => now - time < windowMs)
    if (list.length > 0) failures.set(key, list)
    else failures.delete(key)
    return list
  }

  return {
    // האם מותר לנסות כעת
    isBlocked(ip, account, now = Date.now()) {
      return recent(`${ip}|${account}`, now).length >= maxPerIpAccount
        || recent(`*|${account}`, now).length >= maxPerAccount
    },
    recordFailure(ip, account, now = Date.now()) {
      for (const key of [`${ip}|${account}`, `*|${account}`]) {
        const list = recent(key, now)
        list.push(now)
        failures.set(key, list)
      }
      // מונע גדילה אין-סופית של הזיכרון
      if (failures.size > 50000) failures.clear()
    },
    recordSuccess(ip, account) {
      failures.delete(`${ip}|${account}`)
    },
  }
}

// כתובת הלקוח האמיתית: Cloudflare מוסיף CF-Connecting-IP; בלעדיו משתמשים בכתובת החיבור
export function clientIp(request) {
  const header = request.headers['cf-connecting-ip']
  return (typeof header === 'string' && header) ? header : request.ip
}

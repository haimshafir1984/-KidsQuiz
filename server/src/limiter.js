import { BlockList, isIP } from 'node:net'
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

// טווחי הכתובות של Cloudflare (https://www.cloudflare.com/ips/). משתנים לעיתים נדירות
const CLOUDFLARE_RANGES = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
  '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
]
const cloudflare = new BlockList()
for (const range of CLOUDFLARE_RANGES) {
  const [address, prefix] = range.split('/')
  cloudflare.addSubnet(address, Number(prefix), address.includes(':') ? 'ipv6' : 'ipv4')
}

export function isCloudflareAddress(address) {
  const plain = String(address || '').replace(/^::ffff:/i, '')
  const family = isIP(plain)
  return family !== 0 && cloudflare.check(plain, family === 6 ? 'ipv6' : 'ipv4')
}

// הכתובת שהתחברה בפועל לשרת הפרוקסי (Traefik מוסיף אותה בסוף X-Forwarded-For), או כתובת החיבור עצמו
function connectingPeer(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',').pop().trim()
  return request.socket?.remoteAddress || request.ip
}

// כתובת הלקוח האמיתית. Cloudflare מוסיף CF-Connecting-IP.
// במצב קפדני (TRUST_CLOUDFLARE_ONLY) מאמינים לכותרת רק כשהחיבור הגיע מכתובת של Cloudflare;
// אחרת מי שניגש ישירות לשרת (בלי Cloudflare) יכול לזייף אותה ולעקוף את ההגבלות.
export function clientIp(request) {
  const header = request.headers['cf-connecting-ip']
  const hasHeader = typeof header === 'string' && header
  if (!request.server?.cloudflareOnly) return hasHeader ? header : request.ip
  const peer = connectingPeer(request)
  return hasHeader && isCloudflareAddress(peer) ? header : peer
}

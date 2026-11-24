# ה-CSP כאן מחמיר מזה שב-index.html (בלי unsafe-eval); הדפדפן אוכף את שניהם.
# frame-ancestors עובד רק ככותרת (בתגית meta הוא מתעלם), ולכן נדרש כאן נגד clickjacking.
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

# שרת ה-API (KidsQuiz)

Node.js + Fastify + PostgreSQL. מחליף בהדרגה את ה-localStorage של הדמו (חשבונות, שאלות, תוצאות, התקדמות). הפריסה והסביבה: `docs/PRODUCTION_INFRA.md`.

## הרצה מקומית
```bash
cd server
npm install
# בסיס נתונים מקומי (פעם אחת): createdb kidsquiz_dev
npm run migrate                 # יוצר/מעדכן טבלאות
npm run import:questions        # טוען את השאלות מ-src/data (בטוח להרצה חוזרת)
npm run seed:admins -- --email you@example.com --first שם   # יוצר מנהל (הסיסמה נשאלת בטרמינל)
npm start                       # http://localhost:3000/api/health
npm test                        # נדרש בסיס נתונים kidsquiz_test (TEST_DATABASE_URL לשינוי)
```

## משתני סביבה
| משתנה | הערה |
|---|---|
| `DATABASE_URL` | חובה בפרודקשן |
| `PUBLIC_URL` | כתובת האתר (בדיקת מקור בקשות) |
| `PORT` | ברירת מחדל 3000 |
| `TRIAL_DAYS` | תקופת ניסיון בהרשמה (180) |
| `SESSION_DAYS` | תוקף התחברות תלמיד (30) |
| `ADMIN_SESSION_DAYS` | תוקף התחברות מנהל (7) |
| `TURNSTILE_SECRET` | אופציונלי. כשמוגדר, הרשמה דורשת אימות Cloudflare Turnstile |

## עקרונות
- סיסמאות מוצפנות ב-scrypt; אסימון ההתחברות נשמר מגובב בלבד, בעוגייה `HttpOnly`.
- מנהלים נוצרים רק בסקריפט `seed:admins`, לא דרך ההרשמה. כל נתיב `/api/admin/*` בודק תפקיד בשרת.
- הגנת CSRF בבדיקת `Origin`; הגבלת קצב לפי כתובת אמיתית (`CF-Connecting-IP`), ונעילה זמנית אחרי ניסיונות כניסה כושלים (8 לכל כתובת+חשבון, 50 לחשבון מכל הכתובות, ב-15 דקות).
- שם המשתמש נוצר בשרת בלבד. הרשמה דורשת אישור תנאים (נשמר מתי ובאיזו גרסה), ומנוי שפג מנתק גם התחברות קיימת.
- זכות עיון ומחיקה: `GET /api/auth/me/export`, `DELETE /api/auth/me` (באישור סיסמה), ולמנהל `GET /api/admin/users/:id/export` ו-`DELETE /api/admin/users/:id`.
- תשובות ה-API נשלחות עם `Cache-Control: no-store`.
- שינויי שאלות ומשתמשים על ידי מנהל נרשמים ב-`audit_log`; מחיקת שאלה היא "רכה" וניתנת לשחזור.
- מנוי: השדה `subscription_status` הוא נקודת החיבור לחברת הסליקה (עדיין לא מחובר לתשלום).

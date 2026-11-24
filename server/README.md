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
| `SESSION_DAYS` | תוקף התחברות (30) |

## עקרונות
- סיסמאות מוצפנות ב-scrypt; אסימון ההתחברות נשמר מגובב בלבד, בעוגייה `HttpOnly`.
- מנהלים נוצרים רק בסקריפט `seed:admins`, לא דרך ההרשמה. כל נתיב `/api/admin/*` בודק תפקיד בשרת.
- הגנת CSRF בבדיקת `Origin`; הגבלת קצב על כניסה והרשמה.
- שינויי שאלות ומשתמשים על ידי מנהל נרשמים ב-`audit_log`; מחיקת שאלה היא "רכה" וניתנת לשחזור.
- מנוי: השדה `subscription_status` הוא נקודת החיבור לחברת הסליקה (עדיין לא מחובר לתשלום).

# פריסה ב-Dokploy (Contabo VPS)

האפליקציה היא SPA סטטית (Vite + React) ללא backend - כל הנתונים ב-localStorage.
הפריסה: `Dockerfile` רב-שלבי (בנייה ב-node, הגשה ב-nginx עם SPA fallback).

## דרישות
- VPS ב-Contabo עם Dokploy מותקן (פורטים 80/443/3000 פתוחים)
- דומיין/תת-דומיין עם רשומת A לכתובת ה-IP של ה-VPS

## שלבים
1. ב-Dokploy: Project חדש → **Create Service → Application**.
2. Source: **GitHub** (חיבור GitHub App) או Git ציבורי → `https://github.com/haimshafir1984/-KidsQuiz`, Branch `main`.
3. Build Type: **Dockerfile** (Docker File: `Dockerfile`, Context Path: `.`).
4. Environment (נדרש בזמן build!): `VITE_OFFLINE_DOWNLOAD_URL=<קישור להורדת KidsQuizOfflineSetup.exe>`
   - ב-Dokploy יש להוסיף אותו גם תחת **Build Args** כדי שיגיע ל-`ARG` ב-Dockerfile.
   - אם משאירים ריק, מסך "הורדת אופליין" יציג "קישור לא הוגדר".
5. Domains: הוסף דומיין, Container Port `80`, HTTPS פעיל (Let's Encrypt).
6. Deploy. מומלץ להפעיל **Auto Deploy** (Webhook) לפריסה אוטומטית בכל push ל-`main`.

## בדיקה מקומית (אם Docker מותקן)
```bash
docker build -t kidsquiz .
docker run --rm -p 8080:80 kidsquiz
```

## הערות
- קובץ ה-EXE (כ-288MB) לא חלק מהקונטיינר (`public/downloads` מוחרג). לארח ב-GitHub Releases ולהצביע עליו דרך `VITE_OFFLINE_DOWNLOAD_URL`.
- ה-CSP ב-`index.html` מאפשר `connect-src 'self'` בלבד; אם יתווסף backend - לעדכן.
- הנתונים בדפדפן בלבד, ולכן מעבר שרת לא מעביר משתמשים/תוצאות קיימים (הם נשארים ב-localStorage של כל מכשיר, ותחת הדומיין הישן).

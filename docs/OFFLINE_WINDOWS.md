# Offline Windows Build

## מצב קיים
- הפרונט מבוסס React + Vite + Tailwind.
- ה-UI הקיים נשמר ללא כפילות, ועטוף בתוך Electron.
- נתוני משתמש, שאלות ותוצאות נשמרים מקומית דרך localStorage של Chromium.
- רישוי מקומי נשמר בקובץ `license.json` תחת תיקיית `userData` של Electron.

## קבצים חדשים
- `electron/main.cjs`
- `electron/preload.cjs`
- `src/utils/runtime.js`
- `src/pages/OfflineDownloadPage.jsx`
- `src/pages/DesktopLicensePage.jsx`
- `scripts/generate-license.mjs`

## קבצים שעודכנו
- `package.json`
- `src/App.jsx`
- `src/main.jsx`
- `src/pages/ModePage.jsx`

## PowerShell
### הרצה מקומית של גרסת Desktop
```powershell
npm install
npm run desktop
```

### Build לקובץ התקנה של Windows
```powershell
npm install
npm run dist:win
```

### Build לתיקיית unpacked בלבד
```powershell
npm install
npm run desktop:pack
```

### יצירת קובץ רישיון
```powershell
npm run license:generate -- --customerName="School A" --customerId="SCH-001" --startDate="2026-03-12" --endDate="2026-09-12" --seats=25 --out="release\licenses\school-a.json"
```

## תוצרי build
- תיקיית build: `release`
- Installer ל-Windows: בתוך `release`
- רישיון לדוגמה: בתוך `release\licenses`

## בדיקות מומלצות
1. להריץ `npm run build`
2. להריץ `npm run desktop`
3. לבדוק שנפתחת אפליקציית Electron
4. לבדוק שמסך רישיון מופיע אם אין קובץ רישיון
5. לייבא רישיון ולוודא שניתן להמשיך למסכי המערכת
6. להריץ `npm run dist:win` ולוודא שנוצר installer ב-`release`

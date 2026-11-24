# KidsQuiz — תיעוד פרויקט

## סקירה כללית
אפליקציית חידון אינטראקטיבית ללמידה ותרגול (הכנה למבחני כניסה לסמינר, מבחני תי"ל, ואתגר מחשבתי), בנויה עם React (Vite) + Tailwind CSS, וזמינה גם כאפליקציית דסקטופ (Electron) לעבודה אופליין.
כל ה-UI, הערות הקוד והתשובות שלך **חייבים להיות בעברית**.

**שלב הפרויקט:** דמו. מסך הניהול (`/admin`) פתוח במכוון לכל משתמש מחובר, ללא הגבלת תפקיד, כדי להקל על הצגת המערכת ללקוחות. אין backend אמיתי - כל הנתונים נשמרים ב-localStorage בדפדפן/במכשיר.

---

## מבנה תיקיות

```
KidsQuiz/
├── index.html                    # נקודת כניסה HTML עם dir="rtl" ו-CSP
├── package.json
├── vite.config.js
├── tailwind.config.js            # טוקנים: radius/shadow/אנימציות
├── postcss.config.js
├── Dockerfile / nginx.conf / .dockerignore  # פריסה ב-Dokploy (build ב-node, הגשה ב-nginx)
├── CLAUDE.md / AGENTS.md         # קובץ זה (זהים)
├── docs/                          # דוחות QA, עיצוב ותיעוד נלווה
├── electron/
│   ├── main.cjs                  # תהליך ראשי + בדיקת רישיון אופליין
│   └── preload.cjs               # גישור contextBridge ל-desktopAPI
├── scripts/
│   ├── generate-license.mjs      # יצירת קובץ רישיון לגרסת האופליין
│   └── import-demo-questions.cjs
└── src/
    ├── main.jsx                  # אתחול React + Router (Browser/Hash) + ErrorBoundary
    ├── App.jsx                   # ניתוב ראשי + AuthRoute/ModeRoute/DesktopGate
    ├── index.css                 # ייבוא פונט מקומי + Tailwind + סגנונות גלובליים
    │
    ├── context/
    │   └── AppContext.jsx        # ניהול מצב גלובלי (Auth, שאלות, מסלולים, חידון, הולנד)
    │
    ├── utils/
    │   ├── api.js                # לקוח ה-API (מצב שרת, VITE_USE_API)
    │   ├── adminData.js          # נתוני משתמשים/תוצאות למסך הניהול (שרת או מקומי)
    │   ├── storage.js            # גישה ל-localStorage (שאלות, מסלולים, התקדמות) + safeParse
    │   ├── db.js                 # שכבת "ServerDB/LocalDB" מדומה: משתמשים, תוצאות, מנוי
    │   ├── fuzzyMatch.js         # Levenshtein distance עם סף מדורג להתאמת תשובות פתוחות
    │   ├── runtime.js            # זיהוי סביבת דסקטופ (window.desktopAPI) וסטטוס רישיון
    │   ├── userProfile.js        # שם תצוגה ובדיקת שלמות פרופיל
    │   └── sounds.js             # צלילי משוב לתשובה נכונה/שגויה (Web Audio, בלי קבצים; כיבוי נשמר ב-kq_sound_enabled)
    │
    ├── data/
    │   ├── seedQuestions.js      # איחוד כל מאגרי השאלות + נרמול מבנה/נושאים
    │   ├── learningTracks.js     # הגדרת הקטגוריות (GRADES) והמסלולים הבסיסיים
    │   ├── subjectCatalog.js     # קטלוג נושאים לכל קטגוריה (צבע, אימוג'י, סוגי שאלות)
    │   ├── tanakhNewQuestions.js     # נושא "תנך חדש" (grade-8): תתי-נושאים כ-levels, נוצר מ-תנך.docx
    │   ├── importedDemoQuestions.js / importedChallengeQuestions.js / seriesCompletionQuestions.js
    │   └── hollandQuestionnaire.js  # שאלון הולנד (RIASEC) לכיתות ח'/י"ב
    │
    ├── components/
    │   └── shared/
    │       ├── Header.jsx           # כותרת עם ניווט, מצב חיבור וכפתור יציאה
    │       ├── ErrorBoundary.jsx    # תפיסת קריסות + איפוס נתונים מקומיים
    │       ├── ConfirmDialog.jsx    # מודאל אישור נגיש (role=dialog, Escape, focus-trap)
    │       ├── ToastViewport.jsx    # הודעות מסך זמניות (success/warning/info/error)
    │       ├── useDialogA11y.js     # הוק שיתופי לנגישות מודאלים
    │       └── DemoPresentation.jsx # מצגת הדגמה בעמוד הפתיחה
    │
    └── pages/
        ├── WelcomePage.jsx       # עמוד נחיתה עם מצגת הדגמה
        ├── AuthPage.jsx          # כניסה / הרשמה
        ├── ModePage.jsx          # בחירת מצב עבודה (מקוון/מקומי)
        ├── ProfilePage.jsx       # השלמת/עדכון פרופיל אישי
        ├── AgeSelectPage.jsx     # בחירת קטגוריה (GRADES)
        ├── SubjectSelectPage.jsx # בחירת נושא בתוך הקטגוריה
        ├── TrackSelectPage.jsx   # בחירת רמה + סוג פעילות (תרגול/מבחן)
        ├── ExamIntroPage.jsx     # מסך פתיחה למבחן מתוזמן
        ├── QuizPage.jsx          # מסך חידון (שאלה בודדת / מבחן כללי מרובה-עמודים)
        ├── SummaryPage.jsx       # סיכום תוצאות, פילוח לפי נושא, טעויות
        ├── HollandQuestionnairePage.jsx / HollandResultPage.jsx  # שאלון אישיותי
        ├── AdminPage.jsx         # פאנל ניהול: שאלות / נושאים / משתמשים
        ├── AdminUsers.jsx        # טבלת משתמשים ותוצאות (מוצג בתוך AdminPage)
        ├── OfflineDownloadPage.jsx / DesktopLicensePage.jsx  # הורדת גרסת אופליין ורישיון
```

---

## ניתוב (React Router v6)

| נתיב                     | רכיב                   | הגנה                              |
|--------------------------|------------------------|------------------------------------|
| `/welcome`                | WelcomePage            | ציבורי                             |
| `/auth`                   | AuthPage               | ציבורי                             |
| `/desktop-license`        | DesktopLicensePage     | רק בגרסת דסקטופ ללא רישיון תקין    |
| `/mode`                    | ModePage               | מחובר                              |
| `/profile`                 | ProfilePage            | מחובר                              |
| `/offline-download`       | OfflineDownloadPage    | מחובר                              |
| `/age`                     | AgeSelectPage          | מחובר + פרופיל מלא + מצב עבודה נבחר |
| `/subject`                 | SubjectSelectPage      | כנ"ל                               |
| `/track`                   | TrackSelectPage        | כנ"ל                               |
| `/exam-intro`              | ExamIntroPage          | כנ"ל                               |
| `/quiz`                    | QuizPage               | כנ"ל                               |
| `/summary`                 | SummaryPage            | כנ"ל                               |
| `/holland-questionnaire`   | HollandQuestionnairePage | כנ"ל                              |
| `/holland-result`          | HollandResultPage      | כנ"ל                               |
| `/admin`                   | AdminPage              | מחובר בלבד (ללא הגבלת תפקיד - ר' הערת שלב הדמו למעלה) |

`ModeRoute` דורש: משתמש מחובר → פרופיל מלא (שם פרטי, שם משפחה, עיר) אם לא אדמין → מצב עבודה (online/offline) נבחר.
**זרימת כניסה/הרשמה:** אחרי כניסה או הרשמה מוצלחת מוגדר מצב העבודה אוטומטית (`online` באתר, `offline` בדסקטופ) והמשתמש עובר ישר ל-`/age`. מסך `/mode` נשאר קיים אך לא חלק מהזרימה; קישור להורדת גרסת האופליין נמצא בתחתית `/age`. טופס ההרשמה: שם פרטי, שם משפחה, עיר, סיסמה (עם כפתור הצגה), מייל, טלפון (לא חובה); שם המשתמש נוצר אוטומטית ומוצג למשתמש. בטלפון עמודת השיווק מוסתרת והטופס מופיע ראשון.

**נגישות ושימושיות (קהל חרדי עם ידע מחשב מועט):** גודל בסיס 17px, שדות 18px, ניסוחים פשוטים בלי מונחים טכניים. סרגל עליון בטלפון = שורה אחת עם כפתור "תפריט"; קישור "ניהול" מוצג רק למנהל (הנתיב `/admin` עדיין פתוח בשלב הדמו). במסך החידון אין כותרת ענקית (השאלה והתשובות נראות מיד), המשוב דביק בתחתית, ובתשובה שגויה מסומנת גם התשובה הנכונה. מסך הנושאים מקובץ לקבוצות (מבחן מסכם / יהדות / שפה / חשיבה / שאלונים). נושא עם רמות ופעילות אחת (תרגול) מתחיל בלחיצה על הרמה. בראש `/age` מוצג באנר "להמשיך מאיפה שעצרתי". במסך הניהול: סינון לפי תת-נושא/רמה, טבלת תלמידים עם פרטי קשר, חיפוש וייצוא CSV.

`DesktopGate` מפנה לעדכון רישיון כשהאפליקציה רצה כדסקטופ ללא רישיון תקין.

---

## סכמת שאלה

```js
{
  id: 'string (unique)',
  text: 'string — טקסט השאלה',
  type: 'multiple | open | sentence_completion | list | self_check',
  options: ['string', ...],          // רלוונטי ל-multiple/sentence_completion
  optionImages: ['url', ...],        // אופציונלי, תמונה לכל אפשרות
  image: 'url',                      // אופציונלי, תמונת השאלה עצמה
  correct_answer: ['string', ...],    // מערך תשובות מקובלות
  explanation: 'string',             // אופציונלי, מוצג במסך התשובה (גם בטעות)
  groupTitle: 'string',              // אופציונלי, כותרת משנה לקבוצת שאלות
  grade: 'grade-8 | grade-12 | thinking-challenge',
  subject: 'string',                 // שם הנושא (ר' subjectCatalog.js)
  level: 'string | null',            // רמת קושי בתוך הנושא, אם קיימת
  activityType: 'practice | exam',
  position: 'number',                // סדר הצגה בתוך קבוצת (grade, subject, level, activityType)
}
```

---

## LocalStorage — מפתחות

| מפתח               | תוכן                                          | קובץ אחראי |
|---------------------|-----------------------------------------------|------------|
| `kq_current_user`   | המשתמש המחובר (ללא שדה סיסמה)                 | storage.js |
| `kq_questions`      | מערך כל השאלות                                | storage.js |
| `kq_tracks`         | נושאים מותאמים אישית שנוספו דרך הניהול         | storage.js |
| `kq_quiz_progress`  | מפת התקדמות שמורה לפי משתמש/מסלול              | storage.js |
| `kq_server_db`      | משתמשים + תוצאות במצב "מקוון" (שרת מדומה)      | db.js      |
| `kq_local_db`       | תוצאות במצב "מקומי/אופליין"                   | db.js      |
| `kq_mode`           | מצב עבודה שנבחר (online/offline)              | db.js      |

> בטעינה ראשונה: אם `kq_questions` ריק, נטענות שאלות מ-`seedQuestions.js` (שמאחד את כל קובצי `data/imported*` ו-`seriesCompletionQuestions`).
> כל קריאה/כתיבה עוברת דרך `safeParse`/`safeSetItem` כדי לשרוד JSON פגום וחריגת נפח אחסון (QuotaExceededError) בלי לקרוס.

---

## לוגיקת התאמה חכמה לתשובות פתוחות (fuzzyMatch.js)

- בלי AI ובלי שרת, עובד גם באופליין. הבדיקות: `npm run test:fuzzy` (`scripts/test-fuzzy.mjs`) - להריץ אחרי כל שינוי.
- נרמול: ניקוד, אותיות סופיות, גרשיים ופיסוק, מקפים. כתיב מלא/חסר (ו/י), סיומת ה/א, ה' הידיעה בתחילת מילה.
- מילים: מילים חובה הן אלה שלפני "בן/בת" ושאינן תארים (אשת, הנביא, המלך, רבנו...). תארים, מילות מילוי ושם האב ("בן נון") אופציונליים אצל התלמיד; שם נוסף נפסל ("נדב ואביהוא" כשהתשובה "נדב").
- שם אב: כששני הצדדים כוללים "בן X", שם האב חייב להתאים ("רבי שלמה בן מאיר" אינו "רבי שלמה בן אדרת"); בלי שם אב אצל התלמיד - מתקבל.
- טעויות הקלדה: עד 4 אותיות - מדויק בלבד; 5-6 - טעות אחת; מעל - כ-20%.
- מספרים ויחידות: מילות מספר הופכות לספרות (שש מאות = 600), יחידות מנורמלות (מ' / מטר, ק"מ). מספר חייב להיות זהה, יחידה שונה נפסלת (מ"ר != מטר), השמטת יחידה מותרת.
- ניסוחים שונים לגמרי עדיין צריך להוסיף ידנית כתשובות נוספות בניהול.

---

## AppContext — API עיקרי

```js
const {
  // Auth (המשתמש הנשמר במצב הלקוח אינו כולל שדה סיסמה)
  user, userDisplayName, profileComplete,
  login(identifier, password), register(profileData), updateUserProfile(profileData), logout(),
  mode, setMode(mode),
  // שאלות ומסלולים (CRUD לניהול)
  questions, addQuestion(q), updateQuestion(id, data), duplicateQuestionToTargets(id, targets),
  deleteQuestion(id), deleteQuestions(ids), moveQuestion(id, direction),
  trackCatalog, addTrack(track), assignTrackToGrade(...), renameTrack(...), deleteTrack(...),
  storageError, clearStorageError,   // התראה כשנכשלה שמירה (למשל נפח אחסון מלא)
  // חידון
  selectedGrade, selectedSubject, selectedLevel, selectedActivity,
  quizQuestions, quizResults, userResults, savedQuizProgress, activeQuizProgress, quizSession,
  chooseGrade(grade), chooseSubject(subject), prepareQuiz({...}), beginExamSession(), finishQuiz(results, meta),
  getSavedQuizProgress(selection), saveQuizProgress(selection, data), clearQuizProgress(selection),
  // שאלון הולנד
  hollandAnswers, hollandResults, beginHollandQuestionnaire(grade), updateHollandAnswer(id, value), finishHollandQuestionnaire(summary),
} = useApp()
```

---

## הרצת הפרויקט

```bash
# 1. התקנת תלויות
npm install

# 2. הרצה בסביבת פיתוח (דפדפן)
npm run dev

# 3. בניה לייצור
npm run build

# 4. תצוגה מקדימה של גרסת ייצור
npm run preview

# 5. הרצה כאפליקציית דסקטופ (Electron)
npm run desktop

# 6. יצירת קובץ רישיון לגרסת אופליין
npm run license:generate -- --customerName="שם הלקוח"
```

---

## פריסה (Dokploy על Contabo)

האתר סטטי בלבד. פריסה דרך `Dockerfile` (ר' `docs/DEPLOY_DOKPLOY.md`). המשתנה `VITE_OFFLINE_DOWNLOAD_URL` נאפה בזמן build ולכן חייב להיות מוגדר גם כ-Build Arg. הפריסה הישנה (Render) הוחלפה.

---

## גרסת דסקטופ (Electron) ורישיון אופליין

- `window.desktopAPI` (נחשף דרך `preload.cjs`) קיים רק בגרסת הדסקטופ; `runtime.js` בודק את קיומו.
- הרישיון (`license.json`) נחתם ב-HMAC ונבדק ב-`electron/main.cjs`; תוקף ברירת מחדל 180 יום מהפעלה ראשונה.
- אבטחה: CSP מוגדר ב-`index.html`, וחלון ה-Electron חוסם פתיחת חלונות חדשים וניווט לכתובות חיצוניות (`setWindowOpenHandler` + `will-navigate`).

---

## סוגי שאלות חדשים: list ו-self_check

- `list` ("כתבי כמה"): `correct_answer` הוא מאגר פריטים מקובלים (חלופות עם `|`, למשל `גלבוע|הר הגלבוע`), `minItems` הוא כמה פריטים נדרשים. התלמיד כותב שורה לכל פריט או בפסיקים.
- `self_check` (הסבר): `correct_answer[0]` הוא ההסבר המלא; התלמיד מציג אותו ומדווח "ידעתי" / "לא ידעתי".
- `list` תומך גם ב-`ordered: true` (הסדר חשוב; הפריטים במאגר בסדר הנכון).
- `self_check` פעיל. אפשר להסתיר אותו שוב ב-`SELF_CHECK_ENABLED = false` (`questionAnswers.js`): השאלות נשארות בקוד אבל לא נטענות, ומוסרות גם מנתונים שכבר נשמרו בדפדפן.
- שניהם לתרגול בלבד (מוחרגים מהמבחן הכללי). הלוגיקה ב-`src/utils/questionAnswers.js`, בדיקות: `npm run test:questions`.
- הנושאים "תנך חדש", "אינטליגנציה כללית חדש", "מעגל השנה חדש", "תפילה וברכות חדש", "שבת חדש", "דינים חדש", "אינטליגנציה יהודית חדש" ו"פרקי אבות חדש" (grade-8) נוצרו ממסמכי Word: `tanakhNewQuestions.js`, `generalIntelligenceNewQuestions.js`, `yearCycleNewQuestions.js`, `prayerNewQuestions.js`, `shabbatNewQuestions.js`, `lawsNewQuestions.js`, `jewishIntelligenceNewQuestions.js`, `pirkeiAvotNewQuestions.js` (ב-`src/data/`). בתחילת מסך הנושאים של grade-8 כל הנושאים שנקראים "... חדש" מקובצים תחת "נושאים חדשים" (לפי הסיומת "חדש" בשם). שלושת האחרונים בנויים עם הבנאים המשותפים ב-`questionBuilders.js` (`mc`, `open`, `list`, `explain`). כל תת-נושא הוא `level` בסדר ההגדרה.

---

## נושאים עם תתי-נושאים (levelsKind)

נושא שמוגדר ב-`subjectCatalog.js` עם `levelsKind: 'subtopic'` מציג את ה-`levels` שלו כ"תתי-נושאים" (בסדר ההגדרה, לא אלפביתי) במקום "רמות קושי". כך בנוי "תנך חדש" (15 תתי-נושאים). שאלות נטענות לפי `id` יציב (`tanakh-new-<קטגוריה>-<מספר>`) ולכן מתמזגות גם ל-localStorage קיים.

---

## הוספת שאלות חדשות

**דרך ממשק הניהול (מומלץ):**
1. לחץ על "ניהול" בכותרת
2. בטאב "שאלות" לחץ "שאלה חדשה", או "שאלה" ליד נושא ספציפי בטאב "נושאים"
3. מלא את הפרטים ושמור

**דרך הקוד:**
הוסף שאלות לאחד מקובצי `src/data/imported*.js` או `seriesCompletionQuestions.js` - ייטענו בפעם הבאה שה-LocalStorage ריק, ויתמזגו עם שאלות קיימות לפי `id`.

---

## סגנון ועיצוב

- כיוון: RTL (right-to-left) בכל האפליקציה
- ספריית עיצוב: Tailwind CSS v3, אייקונים מ-`lucide-react`
- פונט: Assistant, טעון מקומית דרך `@fontsource/assistant` (ללא תלות באינטרנט - נדרש לגרסת האופליין)
- טיפוגרפיה: `font-bold` לכל הכותרות; `font-extrabold` שמור רק ל-hero של מסך החידון ולנוסח השאלה עצמו
- טוקנים ב-`tailwind.config.js`: `rounded-card`/`rounded-card-lg` לפינות, `shadow-card`/`shadow-float`/`shadow-modal` לצללים, ואנימציות `pop`/`shake`/`fade-slide-in`/`confetti-fall` (מכבדות `prefers-reduced-motion`)
- כיתות עזר ב-`index.css`: `.btn-primary` (פעולה ראשית), `.btn-secondary` (משנית עם גבול), `.btn-muted` (שקופה, טקסט בלבד), `.btn-danger`, `.edu-card`, `.edu-card-quiz`, `.input-field`
- מודאלים (Drawer, ConfirmDialog, פאנל משתמש) נגישים דרך ה-hook המשותף `useDialogA11y`: `role="dialog"`, סגירה ב-Escape, focus-trap ושחזור פוקוס

---

## מצב שרת (VITE_USE_API) ושרת ה-API

- `server/` הוא שרת Fastify + PostgreSQL (ר' `server/README.md`). האתר עובד מולו רק כשנבנה עם `VITE_USE_API=true`; בלי הדגל (או בגרסת דסקטופ) הכול נשאר localStorage כמו בדמו.
- `src/utils/api.js` הוא לקוח ה-API (`API_ENABLED`, `api.get/post/put/patch/delete`, לא זורק שגיאות). `AppContext` במצב שרת: משחזר התחברות מ-`/auth/me`, טוען שאלות והתקדמות אחרי כניסה, שומר תוצאות ב-`/results`, ושינויי שאלות במסך הניהול נשלחים לשרת כהפרש בין הרשימה הקודמת לחדשה (`syncQuestionsToServer`). `login/register/updateUserProfile` אסינכרוניות.
- `/admin` נפתח רק למשתמש עם `role === 'admin'` במצב שרת (`AdminRoute` ב-`App.jsx`); השרת בודק הרשאה בכל פעולה. מנהלים נוצרים רק בסקריפט `seed:admins`. אין עדיין שחזור סיסמה במייל: מנהל מאפס סיסמה במסך המשתמשים.
- נתוני משתמשים ותוצאות למסך הניהול דרך `useAdminStats` (`src/utils/adminData.js`).
- אבטחה ופרטיות (שרת): שם משתמש נוצר בשרת בלבד; הגבלת קצב לפי `CF-Connecting-IP` + נעילה זמנית אחרי כניסות כושלות (`server/src/limiter.js`); מנוי שפג מנתק גם התחברות קיימת; Turnstile אופציונלי (`TURNSTILE_SECRET` / `VITE_TURNSTILE_SITE_KEY`); זכות עיון ומחיקה (`PrivacyControls.jsx`, `userData.js`); הסכמה לתנאים נשמרת (מיגרציה 002).
- ניהול במצב שרת: ניהול מנויים, חסימה, מחיקה וייצוא תלמיד ב-`AdminUsers.jsx`; שחזור שאלות ויומן ב-`AdminActivity.jsx`. דפי `/terms` `/privacy` `/accessibility` ב-`LegalPages.jsx` (טיוטה עד אישור הלקוחה, `LEGAL_DRAFT`).
- כותרות אבטחה של האתר ב-`security-headers.inc` (נכללות בכל `location` ב-`nginx.conf`, כי `add_header` ב-location מבטל כותרות שהוגדרו ב-server).
- פריסה והגדרות Dokploy: `docs/DOKPLOY_API_SETUP.md`, תשתית כללית: `docs/PRODUCTION_INFRA.md`.

---

## תכניות לעתיד

- [ ] backend אמיתי לאימות, מנויים ותוצאות (כרגע הכול מדומה ב-localStorage)
- [ ] הגבלת גישה למסך הניהול לפי תפקיד (מתוכנן לאחר שלב הדמו)
- [ ] פיצול `AppContext.jsx` ו-`AdminPage.jsx` הגדולים למודולים נפרדים
- [ ] בדיקות אוטומטיות (Vitest) ו-lint ב-CI
- [ ] מערכת ניקוד ולוח מובילים
- [ ] סטטיסטיקות למידה לאורך זמן

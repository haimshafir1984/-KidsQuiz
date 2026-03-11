# KidsQuiz — תיעוד פרויקט

## סקירה כללית
אפליקציית חידון אינטראקטיבית לילדים, בנויה עם React (Vite) + Tailwind CSS.
כל ה-UI, הערות הקוד והתשובות שלך **חייבים להיות בעברית**.

---

## מבנה תיקיות

```
KidsQuiz/
├── index.html                    # נקודת כניסה HTML עם dir="rtl"
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── CLAUDE.md                     # קובץ זה
└── src/
    ├── main.jsx                  # אתחול React + BrowserRouter
    ├── App.jsx                   # ניתוב ראשי + ProtectedRoute
    ├── index.css                 # Tailwind + סגנונות גלובליים
    │
    ├── context/
    │   └── AppContext.jsx        # ניהול מצב גלובלי (Auth, שאלות, חידון)
    │
    ├── utils/
    │   ├── storage.js            # גישה ל-LocalStorage (משתמשים, שאלות)
    │   └── fuzzyMatch.js        # Levenshtein distance להתאמה מטושטשת
    │
    ├── data/
    │   └── seedQuestions.json   # 15 שאלות לדוגמה
    │
    ├── components/
    │   └── shared/
    │       └── Header.jsx       # כותרת עם כפתור ניהול + יציאה
    │
    └── pages/
        ├── AuthPage.jsx         # כניסה / הרשמה
        ├── AgeSelectPage.jsx    # בחירת כיתה (א-ג / ד-ו)
        ├── SubjectSelectPage.jsx # בחירת נושא
        ├── QuizPage.jsx         # מסך חידון (שאלה אחת בכל פעם)
        ├── SummaryPage.jsx      # סיכום תוצאות + טעויות
        └── AdminPage.jsx        # פאנל ניהול CRUD לשאלות
```

---

## ניתוב (React Router v6)

| נתיב       | רכיב               | הגנה        |
|------------|-------------------|-------------|
| `/auth`    | AuthPage          | ציבורי      |
| `/age`     | AgeSelectPage     | מחובר       |
| `/subject` | SubjectSelectPage | מחובר       |
| `/quiz`    | QuizPage          | מחובר       |
| `/summary` | SummaryPage       | מחובר       |
| `/admin`   | AdminPage         | מחובר       |

---

## סכמת שאלה

```json
{
  "id": "string (unique)",
  "text": "string — טקסט השאלה",
  "type": "multiple | open",
  "options": ["string", ...],       // רלוונטי ל-multiple בלבד
  "correct_answer": ["string", ...], // מערך תשובות מקובלות
  "age_group": "1-3 | 4-6",
  "subject": "תנ\"ך | חשבון | הסקת מסקנות | לשון | ידע כללי"
}
```

---

## LocalStorage — מפתחות

| מפתח              | תוכן                          |
|-------------------|-------------------------------|
| `kq_users`        | מערך משתמשים (id, username, password, role) |
| `kq_current_user` | אובייקט המשתמש הנוכחי          |
| `kq_questions`    | מערך כל השאלות                 |

> בטעינה ראשונה: אם `kq_questions` ריק, נטענות שאלות מ-`seedQuestions.json`

---

## לוגיקת התאמה מטושטשת (fuzzyMatch.js)

- אלגוריתם: **Levenshtein Distance**
- ניקוי: `trim() + toLowerCase() + collapse whitespace`
- סף: `max(2, floor(correctAnswer.length * 0.2))`
- כלומר: שאלה עם תשובה בת 10 תווים — מקבלת עד 2 שגיאות

---

## AppContext — API עיקרי

```js
const {
  // Auth
  user, login(u,p), register(u,p), logout(),
  // שאלות (CRUD לאדמין)
  questions, addQuestion(q), updateQuestion(id, data), deleteQuestion(id),
  // חידון
  selectedAge, selectedSubject,
  quizQuestions, quizResults,
  startQuiz(age, subject),  // מחזיר מערך שאלות מסוננות ומעורבבות
  finishQuiz(results),
} = useApp()
```

---

## הרצת הפרויקט

```bash
# 1. התקנת תלויות
npm install

# 2. הרצה בסביבת פיתוח
npm run dev

# 3. בניה לייצור
npm run build

# 4. תצוגה מקדימה של גרסת ייצור
npm run preview
```

---

## הוספת שאלות חדשות

**דרך ממשק הניהול (מומלץ):**
1. לחץ על "⚙️ ניהול" בכותרת
2. לחץ "➕ שאלה חדשה"
3. מלא את הפרטים ושמור

**דרך הקוד:**
הוסף לקובץ `src/data/seedQuestions.json` — יטען בפעם הבאה שה-LocalStorage ריק.

---

## סגנון ועיצוב

- כיוון: RTL (right-to-left) בכל האפליקציה
- ספריית עיצוב: Tailwind CSS v3
- פלטת צבעים: סגול ראשי, צהוב לכפתורים, ירוק/אדום לפידבק
- אנימציות: `bounceIn`, `shake`, `pop` — מוגדרות ב-`tailwind.config.js`
- כיתות עזר ב-`index.css`: `.btn-primary`, `.btn-secondary`, `.card`, `.input-field`

---

## תכניות לעתיד

- [ ] גישה מבוססת תפקיד (admin vs student)
- [ ] עטיפה כ-PWA/אפליקציה לאופליין
- [ ] מערכת ניקוד ולוח מובילים
- [ ] תמיכה בשאלות עם תמונות
- [ ] סטטיסטיקות למידה לאורך זמן

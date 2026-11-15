// התאמה מטושטשת - סולח על שגיאות הקלדה קטנות ורווחים

// חישוב מרחק לוונשטיין בין שתי מחרוזות
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// ניקוי מחרוזת: הסרת רווחים מיותרים, המרה לאותיות קטנות
function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/["'׳״`]/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/[.,!?():]/g, ' ')
    .replace(/\s+/g, ' ')
}

// בודקת אם מחרוזת מייצגת מספר בלבד (כולל שברים עשרוניים עם נקודה או פסיק)
function isNumeric(str) {
  return /^-?\d+([.,]\d+)?$/.test(str)
}

// סף מדורג לפי אורך התשובה הנכונה: ככל שהתשובה קצרה יותר, כך יש לדרוש התאמה מדויקת יותר
function getThreshold(length) {
  if (length <= 3) return 0
  if (length <= 6) return 1
  return Math.floor(length * 0.2)
}

// בדיקה אם תשובת המשתמש תואמת אחת מהתשובות הנכונות
export function fuzzyMatch(userAnswer, correctAnswers) {
  const cleaned = normalize(userAnswer)
  if (!cleaned) return false

  return correctAnswers.some(correct => {
    const cleanedCorrect = normalize(correct)
    // התאמה מדויקת
    if (cleaned === cleanedCorrect) return true
    // תשובות מספריות - השוואה מדויקת בלבד, בלי סובלנות למרחק
    if (isNumeric(cleanedCorrect) || isNumeric(cleaned)) return false
    // חישוב מרחק
    const dist = levenshtein(cleaned, cleanedCorrect)
    const threshold = getThreshold(cleanedCorrect.length)
    return dist <= threshold
  })
}

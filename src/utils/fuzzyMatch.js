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
  return str.trim().toLowerCase().replace(/\s+/g, ' ')
}

// בדיקה אם תשובת המשתמש תואמת אחת מהתשובות הנכונות
// סף: מרחק עד 2 תווים, או עד 20% מאורך התשובה (הגדול מביניהם)
export function fuzzyMatch(userAnswer, correctAnswers) {
  const cleaned = normalize(userAnswer)
  if (!cleaned) return false

  return correctAnswers.some(correct => {
    const cleanedCorrect = normalize(correct)
    // התאמה מדויקת
    if (cleaned === cleanedCorrect) return true
    // חישוב מרחק
    const dist = levenshtein(cleaned, cleanedCorrect)
    const threshold = Math.max(2, Math.floor(cleanedCorrect.length * 0.2))
    return dist <= threshold
  })
}

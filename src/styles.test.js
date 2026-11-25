import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

// מבטיח שכל מחלקת study-* שמשתמשים בה בקוד מוגדרת ב-index.css (ושלא מורכבת בזמן ריצה, כי אז Tailwind מסיר אותה)
const SRC = join(process.cwd(), 'src')
const css = readFileSync(join(SRC, 'index.css'), 'utf8')

function listFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

describe('מחלקות "דף לימוד"', () => {
  const used = new Set()
  for (const file of listFiles(SRC).filter(path => /\.(jsx|js)$/.test(path) && !/\.test\./.test(path))) {
    for (const match of readFileSync(file, 'utf8').matchAll(/\bstudy-[a-z]+(?:--[a-z]+)?\b/g)) used.add(match[0])
  }

  test('נמצאו מחלקות בשימוש', () => {
    expect(used.size).toBeGreaterThan(8)
  })

  test.each([...used])('%s מוגדרת ב-index.css', name => {
    expect(css).toContain(`.${name}`)
  })

  test('אין הרכבה דינמית של שמות study-', () => {
    const offenders = listFiles(SRC)
      .filter(path => /\.jsx$/.test(path))
      .filter(path => /study-[a-z]+--\$\{/.test(readFileSync(path, 'utf8')))
    expect(offenders).toEqual([])
  })
})

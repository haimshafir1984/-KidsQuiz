import { describe, expect, test } from 'vitest'
import { formatAgorot, parseShekels } from './money'

describe('סכומים', () => {
  test.each([['49.90', 4990], ['240', 24000], ['0.5', 50], [' 12 ', 1200], ['19.99', 1999]])('%s -> %i אגורות', (text, agorot) => {
    expect(parseShekels(text)).toBe(agorot)
  })

  test.each(['', '0', '-5', '12.345', 'abc', '1e3', '12,5', null])('קלט לא תקין: %s', text => {
    expect(parseShekels(text)).toBeNull()
  })

  test('תצוגה בשקלים', () => {
    expect(formatAgorot(24000)).toBe('240 ₪')
    expect(formatAgorot(4990)).toBe('49.90 ₪')
    expect(formatAgorot(undefined)).toBe('')
  })
})

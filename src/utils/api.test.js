import { afterEach, describe, expect, test, vi } from 'vitest'
import { api } from './api'

afterEach(() => vi.unstubAllGlobals())

function mockFetch(response) {
  vi.stubGlobal('fetch', vi.fn(async () => response))
}

describe('api.download', () => {
  test('מפענח שם קובץ בעברית מהכותרת', async () => {
    const name = encodeURIComponent('דנה_כהן_2026-11-25.xlsx')
    mockFetch({
      ok: true,
      headers: new Headers({ 'Content-Disposition': `attachment; filename="student.xlsx"; filename*=UTF-8''${name}` }),
      blob: async () => new Blob(['x']),
    })
    const result = await api.download('/admin/users/1/export?format=xlsx')
    expect(result.ok).toBe(true)
    expect(result.fileName).toBe('דנה_כהן_2026-11-25.xlsx')
  })

  test('שגיאת שרת מחזירה הודעה בעברית ולא זורקת', async () => {
    mockFetch({ ok: false, json: async () => ({ error: 'אין הרשאה' }) })
    expect(await api.download('/x')).toEqual({ ok: false, error: 'אין הרשאה' })
  })

  test('כשל רשת מחזיר הודעת חיבור', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const result = await api.download('/x')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/אין חיבור/)
  })
})

describe('api.get', () => {
  test('שגיאה בגוף התשובה מוחזרת בשדה error', async () => {
    mockFetch({ ok: false, status: 403, json: async () => ({ error: 'חשבונך חסום. יש לפנות למנהל המערכת' }) })
    const result = await api.get('/auth/me')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('חשבונך חסום. יש לפנות למנהל המערכת')
  })
})

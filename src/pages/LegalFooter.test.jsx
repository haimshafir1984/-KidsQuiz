import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LegalFooter } from './LegalPages'

const renderFooter = () => render(<MemoryRouter><LegalFooter /></MemoryRouter>)

describe('קרדיט בתחתית האתר', () => {
  afterEach(() => {
    cleanup()
    delete window.desktopAPI
  })

  test('באתר: קישור ל-flowsbiz שנפתח בלשונית חדשה ובטוחה', () => {
    renderFooter()
    const link = screen.getByRole('link', { name: /flowsbiz/ })
    expect(link.getAttribute('href')).toBe('https://flowsbiz.com/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  test('בגרסת הדסקטופ: טקסט בלבד, בלי קישור חסום', () => {
    window.desktopAPI = {}
    renderFooter()
    expect(screen.queryByRole('link', { name: /flowsbiz/ })).toBeNull()
    expect(screen.getByText(/אתר זה נבנה/).textContent).toContain('flowsbiz')
  })
})

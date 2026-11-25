import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useDialogA11y } from './useDialogA11y'

// מודאל שבו onClose הוא פונקציה חדשה בכל רינדור (כמו ב-AdminUsers), ושדה טקסט שמרנדר מחדש בכל הקלדה
function Panel({ onEscape }) {
  const [value, setValue] = useState('')
  const ref = useDialogA11y(true, () => onEscape())
  return (
    <div ref={ref} role="dialog" aria-label="חלון">
      <button type="button">סגירה</button>
      <input aria-label="סיסמה חדשה" value={value} onChange={event => setValue(event.target.value)} />
    </div>
  )
}

describe('useDialogA11y', () => {
  test('הקלדה בשדה בתוך מודאל לא מחזירה את המיקוד לכפתור הראשון (באג איפוס הסיסמה)', async () => {
    const user = userEvent.setup()
    render(<Panel onEscape={() => {}} />)
    const input = screen.getByLabelText('סיסמה חדשה')
    await user.click(input)
    await user.keyboard('Fresh-Pass-88')
    expect(input).toHaveValue('Fresh-Pass-88')
    expect(input).toHaveFocus()
  })

  test('Escape סוגר, ו-Tab נשאר בתוך המודאל', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    render(<Panel onEscape={onEscape} />)
    await user.tab()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement)
    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
  })
})

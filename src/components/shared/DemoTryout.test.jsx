import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import DemoTryout from './DemoTryout'

const questions = [
  { id: 'a1', subject: 'תנך', level: 'מקומות', type: 'open', text: 'היכן נפטרה שרה?', correct_answer: ['חברון'] },
  { id: 'a2', subject: 'תנך', level: 'אנשים', type: 'multiple', text: 'מי בנה תיבה?', options: ['נח', 'משה'], correct_answer: ['נח'] },
  { id: 'b1', subject: 'ידע כללי', level: 'כללי', type: 'open', text: 'כמה שעות ביממה?', correct_answer: ['24'] },
]

describe('חלון ההתנסות', () => {
  afterEach(cleanup)

  test('בוחרים נושא ותת-נושא, ורק השאלות שלהם מוצגות', () => {
    render(<DemoTryout questions={questions} onClose={() => {}} />)
    expect(screen.getByText('היכן נפטרה שרה?')).toBeTruthy()
    expect(screen.queryByText('מי בנה תיבה?')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'אנשים' }))
    expect(screen.getByText('מי בנה תיבה?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ידע כללי' }))
    expect(screen.getByText('כמה שעות ביממה?')).toBeTruthy()
  })

  test('משוב לתשובה שגויה ולתשובה נכונה, וספירה בתחתית', () => {
    render(<DemoTryout questions={questions} onClose={() => {}} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ירושלים' } })
    fireEvent.click(screen.getByRole('button', { name: 'בדיקה' }))
    expect(screen.getByRole('status').textContent).toContain('התשובה הנכונה: חברון')
    fireEvent.click(screen.getByRole('button', { name: 'אנשים' }))
    fireEvent.click(screen.getByRole('button', { name: 'נח' }))
    fireEvent.click(screen.getByRole('button', { name: 'בדיקה' }))
    expect(screen.getByRole('status').textContent).toContain('נכון מאוד')
    expect(screen.getByText('עניתם נכון על 1 מתוך 2.')).toBeTruthy()
  })

  test('Escape סוגר', () => {
    const onClose = vi.fn()
    render(<DemoTryout questions={questions} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

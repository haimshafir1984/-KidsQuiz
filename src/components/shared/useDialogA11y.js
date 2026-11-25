import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// נגישות בסיסית למודאלים: סגירה ב-Escape, מיקוד ראשוני, ולכידת Tab בתוך המודאל
export function useDialogA11y(open, onClose) {
  const containerRef = useRef(null)
  // onClose נשמר ב-ref: אחרת פונקציה חדשה בכל רינדור (למשל בכל הקלדה בשדה) מפעילה מחדש את האפקט
  // ומחזירה את המיקוד לכפתור הראשון, ולכן אי אפשר היה להקליד בשדות בתוך המודאל
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const firstFocusable = containerRef.current?.querySelector(FOCUSABLE_SELECTOR)
    firstFocusable?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab' || !containerRef.current) return

      const focusableElements = containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open])

  return containerRef
}

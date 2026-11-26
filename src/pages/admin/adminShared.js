export const PAGE_SIZE = 25

export function createToast(message, type = 'info', title = '') {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
    title,
    duration: 3200,
  }
}

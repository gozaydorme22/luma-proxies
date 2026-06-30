type ToastType = 'success' | 'error' | 'info'
export type ToastData = { id: number; message: string; type: ToastType }

const listeners = new Set<(t: ToastData) => void>()
let counter = 0

export function toast(message: string, type: ToastType = 'info') {
  const id = ++counter
  listeners.forEach(fn => fn({ id, message, type }))
}

export function subscribeToast(fn: (t: ToastData) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

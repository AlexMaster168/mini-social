import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  kind: 'success' | 'error'
  text: string
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let nextId = 1

  function push(kind: Toast['kind'], text: string) {
    const id = nextId++
    toasts.value.push({ id, kind, text })
    setTimeout(() => dismiss(id), 4000)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return {
    toasts,
    success: (text: string) => push('success', text),
    error: (error: unknown) =>
      push('error', error instanceof Error ? error.message : 'Что-то пошло не так'),
    dismiss,
  }
})

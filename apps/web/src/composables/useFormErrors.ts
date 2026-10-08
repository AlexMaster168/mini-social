import { ref } from 'vue'
import { ApiError } from '@/api/client'

/** Splits an API error into per-field messages and a general form message. */
export function useFormErrors() {
  const fieldErrors = ref<Record<string, string>>({})
  const formError = ref('')

  function reset() {
    fieldErrors.value = {}
    formError.value = ''
  }

  function apply(error: unknown) {
    reset()
    if (error instanceof ApiError && error.details) {
      for (const [field, messages] of Object.entries(error.details)) {
        if (messages?.[0]) fieldErrors.value[field] = messages[0]
      }
    }
    if (Object.keys(fieldErrors.value).length === 0) {
      formError.value = error instanceof Error ? error.message : 'Что-то пошло не так'
    }
  }

  return { fieldErrors, formError, reset, apply }
}

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, ApiError } from '@/api/client'
import type { Me } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Me | null>(null)
  const initialized = ref(false)
  let pending: Promise<void> | null = null

  const isAuthenticated = computed(() => user.value !== null)

  /** Loads the current session once; safe to call from every navigation. */
  function init(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    pending ??= api.auth
      .me()
      .then(({ user: me }) => {
        user.value = me
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) throw error
        user.value = null
      })
      .finally(() => {
        initialized.value = true
        pending = null
      })
    return pending
  }

  async function login(login: string, password: string) {
    user.value = (await api.auth.login({ login, password })).user
  }

  async function register(payload: Parameters<typeof api.auth.register>[0]) {
    user.value = (await api.auth.register(payload)).user
  }

  async function logout() {
    try {
      await api.auth.logout()
    } finally {
      user.value = null
    }
  }

  function setUser(me: Me | null) {
    user.value = me
  }

  return { user, initialized, isAuthenticated, init, login, register, logout, setUser }
})

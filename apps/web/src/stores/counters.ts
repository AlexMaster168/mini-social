import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'

const POLL_INTERVAL = 15_000

export const useCountersStore = defineStore('counters', () => {
  const notifications = ref(0)
  const messages = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  async function refresh() {
    try {
      const counters = await api.notifications.counters()
      notifications.value = counters.notifications
      messages.value = counters.messages
    } catch {
      // Badges are best-effort; the next poll will retry.
    }
  }

  function start() {
    if (timer) return
    void refresh()
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_INTERVAL)
  }

  function stop() {
    clearInterval(timer)
    timer = undefined
    notifications.value = 0
    messages.value = 0
  }

  return { notifications, messages, refresh, start, stop }
})

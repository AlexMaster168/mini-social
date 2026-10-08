import '@fontsource-variable/inter'
import './styles/main.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { setUnauthorizedHandler } from './api/client'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { applyStoredTheme } from './composables/useTheme'

applyStoredTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)

// The session expired or was revoked: drop it and send the user to the login page.
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated) return
  auth.setUser(null)
  void router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

app.mount('#app')

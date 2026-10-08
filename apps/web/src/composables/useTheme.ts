import { ref } from 'vue'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'mini-social:theme'

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

const theme = ref<Theme>('light')

export function applyStoredTheme() {
  theme.value = storedTheme() ?? systemTheme()
  document.documentElement.dataset.theme = theme.value
}

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme.value
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      // Private mode: the choice just won't persist.
    }
  }
  return { theme, toggle }
}

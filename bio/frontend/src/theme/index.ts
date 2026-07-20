import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'chargaff-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function detectTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return media.matches ? 'dark' : 'light'
}

export const theme = ref<Theme>(detectTheme())

function applyTheme(value: Theme) {
  document.documentElement.classList.toggle('dark', value === 'dark')
}

watch(theme, applyTheme, { immediate: true })

// Follow the OS preference until the user makes an explicit choice.
media.addEventListener('change', (event) => {
  if (localStorage.getItem(STORAGE_KEY) === null) theme.value = event.matches ? 'dark' : 'light'
})

export function setTheme(value: Theme) {
  theme.value = value
  localStorage.setItem(STORAGE_KEY, value)
}

export function toggleTheme() {
  setTheme(theme.value === 'dark' ? 'light' : 'dark')
}

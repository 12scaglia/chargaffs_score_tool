import { createI18n } from 'vue-i18n'
import it from './locales/it'
import en from './locales/en'

export type SupportedLocale = 'it' | 'en'
export const SUPPORTED_LOCALES: SupportedLocale[] = ['it', 'en']
const STORAGE_KEY = 'chargaff-locale'

function detectLocale(): SupportedLocale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'it' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { it, en },
})

export function setLocale(locale: SupportedLocale) {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale
}

document.documentElement.lang = i18n.global.locale.value

export default i18n

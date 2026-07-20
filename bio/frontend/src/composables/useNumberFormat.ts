import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const INTL_LOCALES: Record<string, string> = { it: 'it-IT', en: 'en-US' }

export function useNumberFormat() {
  const { locale } = useI18n()
  const intlLocale = computed(() => INTL_LOCALES[locale.value] ?? 'en-US')

  function formatNumber(value: number): string {
    return value.toLocaleString(intlLocale.value)
  }

  return { intlLocale, formatNumber }
}

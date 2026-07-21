<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, setLocale, type SupportedLocale } from '@/i18n'

const { locale, t } = useI18n()

function onChange(event: Event) {
  setLocale((event.target as HTMLSelectElement).value as SupportedLocale)
}
</script>

<template>
  <select
    :value="locale"
    data-testid="language-select"
    :aria-label="t('language.label')"
    class="rounded-md border-0 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
    @change="onChange"
  >
    <option v-for="code in SUPPORTED_LOCALES" :key="code" :value="code">{{ t(`language.${code}`) }}</option>
  </select>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { theme, toggleTheme } from '@/theme'

const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    :aria-label="theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')"
    :title="theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')"
    class="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700"
    @click="toggleTheme()"
  >
    <svg v-if="theme === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path
        stroke-linecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
      />
    </svg>
  </button>
</template>

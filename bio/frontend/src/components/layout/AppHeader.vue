<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher.vue'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()
</script>

<template>
  <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-center gap-2">
      <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ t('app.title') }}</span>
      <span class="text-sm text-slate-500 dark:text-slate-400">{{ t('app.subtitle') }}</span>
    </div>
    <div class="flex items-center gap-3">
      <div v-if="store.sequenceInfo" class="truncate text-xs text-slate-400 dark:text-slate-500">
        {{ store.sequenceInfo.filename }} · {{ t('app.windowLabel') }} {{ formatNumber(store.windowSize) }} bp
      </div>
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  </header>
</template>

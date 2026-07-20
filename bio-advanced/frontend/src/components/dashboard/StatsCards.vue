<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const cards = computed(() => {
  const stats = store.statistics
  if (!stats) return []
  return [
    { label: t('stats.segments'), value: formatNumber(stats.total_windows) },
    { label: t('stats.meanScore'), value: stats.mean.toFixed(4) },
    { label: t('stats.median'), value: stats.median.toFixed(4) },
    { label: t('stats.min'), value: stats.min.toFixed(4) },
    { label: t('stats.max'), value: stats.max.toFixed(4) },
    { label: t('stats.stdDev'), value: stats.std_dev.toFixed(4) },
  ]
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    <div v-for="card in cards" :key="card.label" class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ card.label }}</p>
      <p class="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{{ card.value }}</p>
    </div>
  </div>
</template>

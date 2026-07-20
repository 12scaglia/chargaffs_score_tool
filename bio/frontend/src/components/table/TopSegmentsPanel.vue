<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useExport } from '@/composables/useExport'
import type { TopSegmentsFilter } from '@/types/analysis'

const store = useAnalysisStore()
const { exportCsv, exportJson } = useExport()
const { t } = useI18n()

const FILTERS = computed<{ value: TopSegmentsFilter; label: string }[]>(() => [
  { value: 'top10-best', label: t('topSegments.top10Best') },
  { value: 'top10-worst', label: t('topSegments.top10Worst') },
  { value: 'top50-best', label: t('topSegments.top50Best') },
  { value: 'top50-worst', label: t('topSegments.top50Worst') },
])

function toggleFilter(filter: TopSegmentsFilter) {
  store.setTopFilter(store.activeTopFilter === filter ? null : filter)
}

function currentIndices(): number[] | undefined {
  return store.activeTopFilter ? store.topIndices(store.activeTopFilter) : undefined
}

function onExportCsv() {
  if (!store.data) return
  exportCsv(store.data, 'chargaff_results.csv', currentIndices())
}

function onExportJson() {
  if (!store.data) return
  exportJson(store.data, 'chargaff_results.json', currentIndices())
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="filter in FILTERS"
        :key="filter.value"
        type="button"
        class="rounded-md px-3 py-1.5 text-xs font-medium ring-1 transition-colors"
        :class="
          store.activeTopFilter === filter.value
            ? 'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500'
            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
        "
        @click="toggleFilter(filter.value)"
      >
        {{ filter.label }}
      </button>
      <button
        v-if="store.activeTopFilter"
        type="button"
        class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        @click="store.setTopFilter(null)"
      >
        {{ t('topSegments.showAll') }}
      </button>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        @click="onExportCsv"
      >
        {{ t('topSegments.exportCsv') }}
      </button>
      <button
        type="button"
        class="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        @click="onExportJson"
      >
        {{ t('topSegments.exportJson') }}
      </button>
    </div>
  </div>
</template>

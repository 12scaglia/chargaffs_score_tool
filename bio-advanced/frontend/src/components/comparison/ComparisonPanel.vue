<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore, useComparisonStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'
import FastaUploader from '@/components/upload/FastaUploader.vue'
import ComparisonChart from '@/components/comparison/ComparisonChart.vue'

const store = useAnalysisStore()
const comparisonStore = useComparisonStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const enabled = ref(false)

const canAnalyze = computed(() => comparisonStore.selectedFile !== null && !comparisonStore.isLoading)

function meanGcPercent(target: typeof store): number | null {
  const d = target.data
  if (!d || d.score.length === 0) return null
  let gc = 0
  let total = 0
  for (let i = 0; i < d.score.length; i++) {
    gc += d.G[i] + d.C[i]
    total += d.A[i] + d.T[i] + d.G[i] + d.C[i]
  }
  return total > 0 ? (gc / total) * 100 : null
}

const comparisonRows = computed(() => {
  if (!store.hasResults || !comparisonStore.hasResults) return []
  const aScore = store.statistics?.mean ?? null
  const bScore = comparisonStore.statistics?.mean ?? null
  const aGc = meanGcPercent(store)
  const bGc = meanGcPercent(comparisonStore)
  return [
    { label: t('stats.meanScore'), a: aScore?.toFixed(4) ?? '—', b: bScore?.toFixed(4) ?? '—' },
    { label: t('comparison.meanGc'), a: aGc !== null ? `${aGc.toFixed(2)}%` : '—', b: bGc !== null ? `${bGc.toFixed(2)}%` : '—' },
    { label: t('stats.segments'), a: formatNumber(store.totalWindows), b: formatNumber(comparisonStore.totalWindows) },
  ]
})

async function runComparison() {
  comparisonStore.setWindowSize(store.windowSize)
  comparisonStore.setStepSize(store.stepSize)
  await comparisonStore.runAnalysis()
}
</script>

<template>
  <div class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('comparison.title') }}</h3>
      <label class="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <input v-model="enabled" type="checkbox" class="h-3.5 w-3.5 rounded" />
        {{ t('comparison.enable') }}
      </label>
    </div>

    <div v-if="enabled" class="mt-4 space-y-4">
      <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ t('comparison.hint') }}</p>

      <FastaUploader :store="comparisonStore" />

      <button
        type="button"
        class="w-full rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:disabled:bg-slate-700"
        :disabled="!canAnalyze"
        @click="runComparison"
      >
        <span v-if="comparisonStore.isLoading">{{ t('sidebar.analyzing') }} {{ comparisonStore.uploadProgress }}%</span>
        <span v-else>{{ t('comparison.analyze') }}</span>
      </button>

      <p v-if="comparisonStore.error" class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900/50">
        {{ comparisonStore.error }}
      </p>

      <template v-if="comparisonStore.hasResults">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[360px] text-left text-xs">
            <thead class="text-slate-400 dark:text-slate-500">
              <tr>
                <th class="pb-2 pr-3 font-medium"></th>
                <th class="pb-2 pr-3 font-medium">{{ t('comparison.genomeA') }}</th>
                <th class="pb-2 font-medium">{{ t('comparison.genomeB') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in comparisonRows" :key="row.label" class="border-t border-slate-100 dark:border-slate-800">
                <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{{ row.label }}</td>
                <td class="py-1.5 pr-3 font-medium text-slate-800 dark:text-slate-100">{{ row.a }}</td>
                <td class="py-1.5 font-medium text-slate-800 dark:text-slate-100">{{ row.b }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="height: 280px">
          <ComparisonChart :primary="store" :comparison="comparisonStore" />
        </div>
      </template>
    </div>
  </div>
</template>

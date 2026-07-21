<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useSkewAnalysis, oriTerOverlayVisible } from '@/composables/useSkewAnalysis'
import { useNumberFormat } from '@/composables/useNumberFormat'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const { oriTerCandidates } = useSkewAnalysis(store)

function focus(index: number) {
  store.selectSegment(index)
}
</script>

<template>
  <div v-if="oriTerCandidates" class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('oriTer.title') }}</h3>
      <label class="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <input v-model="oriTerOverlayVisible" type="checkbox" class="h-3.5 w-3.5 rounded" />
        {{ t('oriTer.showOnChart') }}
      </label>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        class="rounded-md bg-sky-50 p-3 text-left ring-1 ring-sky-200 transition-colors hover:bg-sky-100 dark:bg-sky-900/20 dark:ring-sky-900/50 dark:hover:bg-sky-900/30"
        @click="focus(oriTerCandidates.origin.index)"
      >
        <p class="text-xs font-medium text-sky-700 dark:text-sky-400">{{ t('oriTer.origin') }}</p>
        <p class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ formatNumber(oriTerCandidates.origin.bp) }} bp</p>
      </button>
      <button
        type="button"
        class="rounded-md bg-orange-50 p-3 text-left ring-1 ring-orange-200 transition-colors hover:bg-orange-100 dark:bg-orange-900/20 dark:ring-orange-900/50 dark:hover:bg-orange-900/30"
        @click="focus(oriTerCandidates.terminus.index)"
      >
        <p class="text-xs font-medium text-orange-700 dark:text-orange-400">{{ t('oriTer.terminus') }}</p>
        <p class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ formatNumber(oriTerCandidates.terminus.bp) }} bp</p>
      </button>
    </div>

    <p class="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">{{ t('oriTer.disclaimer') }}</p>
  </div>
</template>

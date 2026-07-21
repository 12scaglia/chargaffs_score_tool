<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'

const PERMUTATION_OPTIONS = [50, 100, 200, 500] as const

const store = useAnalysisStore()
const { t } = useI18n()

const nPermutations = ref<number>(100)

function run() {
  store.runSignificance(nPermutations.value)
}
</script>

<template>
  <div class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('significance.title') }}</h3>
      <div class="flex items-center gap-2">
        <select
          v-model.number="nPermutations"
          class="rounded-md border-0 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
        >
          <option v-for="n in PERMUTATION_OPTIONS" :key="n" :value="n">{{ n }} {{ t('significance.permutations') }}</option>
        </select>
        <button
          type="button"
          class="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:disabled:bg-slate-700"
          :disabled="store.significanceLoading"
          @click="run"
        >
          <span v-if="store.significanceLoading">{{ t('significance.running') }}</span>
          <span v-else>{{ t('significance.runButton') }}</span>
        </button>
      </div>
    </div>

    <p v-if="!store.significance && !store.significanceLoading" class="text-xs text-slate-400 dark:text-slate-500">
      {{ t('significance.help') }}
    </p>

    <p v-if="store.significanceError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ store.significanceError }}</p>

    <div v-if="store.significance" class="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ t('significance.observedScore') }}</p>
        <p class="mt-1 text-base font-bold text-slate-800 dark:text-slate-100">{{ store.significance.observed_mean_score.toFixed(4) }}</p>
      </div>
      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ t('significance.permutedMean') }}</p>
        <p class="mt-1 text-base font-bold text-slate-800 dark:text-slate-100">
          {{ store.significance.permuted_mean.toFixed(4) }} ± {{ store.significance.permuted_std.toFixed(4) }}
        </p>
      </div>
      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ t('significance.zScore') }}</p>
        <p class="mt-1 text-base font-bold text-slate-800 dark:text-slate-100">{{ store.significance.z_score.toFixed(3) }}</p>
      </div>
      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ t('significance.pValue') }}</p>
        <p class="mt-1 text-base font-bold text-slate-800 dark:text-slate-100">{{ store.significance.p_value.toFixed(4) }}</p>
      </div>
      <div class="flex items-center rounded-md p-3" :class="store.significance.is_significant ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-slate-50 dark:bg-slate-800'">
        <p
          class="text-xs font-semibold"
          :class="store.significance.is_significant ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'"
        >
          {{ store.significance.is_significant ? t('significance.significant') : t('significance.notSignificant') }}
        </p>
      </div>
    </div>
  </div>
</template>

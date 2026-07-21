<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalysisStore } from '@/stores/analysis'
import type { FetchSource } from '@/types/analysis'

const { store } = defineProps<{ store: AnalysisStore }>()
const { t } = useI18n()

const source = ref<FetchSource>('ncbi')
const accession = ref('')
const species = ref('')
const wholeSequence = ref(false)
const localError = ref<string | null>(null)

const looksLikeStableId = computed(() => /^ENS/i.test(accession.value.trim()))
const canFetch = computed(() => accession.value.trim().length > 0 && store.windowSize > 0 && !store.isLoading)

function submit() {
  localError.value = null
  const trimmedAccession = accession.value.trim()
  if (!trimmedAccession) {
    localError.value = t('fetch.errorMissingAccession')
    return
  }
  if (source.value === 'ensembl' && !species.value.trim() && !looksLikeStableId.value) {
    localError.value = t('fetch.errorMissingSpecies')
    return
  }
  store.runFetch(source.value, trimmedAccession, species.value.trim() || undefined, wholeSequence.value)
}
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('fetch.sourceLabel') }}</label>
    <select
      v-model="source"
      class="mb-3 w-full rounded-md border-0 bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
    >
      <option value="ncbi">{{ t('fetch.sourceNcbi') }}</option>
      <option value="ensembl">{{ t('fetch.sourceEnsembl') }}</option>
    </select>

    <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{{ t('fetch.accessionLabel') }}</label>
    <input
      v-model="accession"
      type="text"
      :placeholder="source === 'ncbi' ? t('fetch.accessionPlaceholderNcbi') : t('fetch.accessionPlaceholderEnsembl')"
      class="mb-3 w-full rounded-md border-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
    />

    <template v-if="source === 'ensembl'">
      <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{{ t('fetch.speciesLabel') }}</label>
      <input
        v-model="species"
        type="text"
        :disabled="looksLikeStableId"
        :placeholder="t('fetch.speciesPlaceholder')"
        class="mb-1 w-full rounded-md border-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
      />
      <p class="mb-3 text-[11px] text-slate-400 dark:text-slate-500">{{ t('fetch.speciesHelp') }}</p>
    </template>

    <label class="mb-3 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
      <input v-model="wholeSequence" type="checkbox" class="mt-0.5 h-3.5 w-3.5 rounded" />
      <span>
        {{ t('fetch.wholeSequence') }}
        <span class="block text-[11px] text-slate-400 dark:text-slate-500">{{ t('fetch.wholeSequenceHint') }}</span>
      </span>
    </label>

    <button
      type="button"
      class="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:disabled:bg-slate-700"
      :disabled="!canFetch"
      @click="submit"
    >
      <span v-if="store.isLoading">{{ t('fetch.fetching') }}</span>
      <span v-else>{{ t('fetch.fetchButton') }}</span>
    </button>

    <p v-if="localError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ localError }}</p>
    <p v-else-if="store.error" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ store.error }}</p>

    <div v-if="store.sequenceInfo" class="mt-3 space-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
      <p><span class="font-medium text-slate-600 dark:text-slate-300">{{ t('upload.sequenceId') }}:</span> {{ store.sequenceInfo.sequence_id }}</p>
      <p><span class="font-medium text-slate-600 dark:text-slate-300">{{ t('upload.length') }}:</span> {{ store.sequenceInfo.total_length.toLocaleString() }} bp</p>
    </div>
  </div>
</template>

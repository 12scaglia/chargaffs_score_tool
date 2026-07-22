<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const sourceLabel = computed(() => {
  if (store.lastOrigin === 'fetch' && store.lastFetchSource) {
    return store.lastFetchSource.source === 'ncbi' ? t('fetch.sourceNcbi') : t('fetch.sourceEnsembl')
  }
  return null
})

/** Well-known public URL patterns for viewing the fetched record on its
 * source site — only shown for fetch-based results, since an uploaded
 * file has no such canonical page. Uses the accession at the same position
 * as the active record — holds as long as each fetched accession resolves
 * to exactly one FASTA record, true for the gene/region lookups this
 * feature targets. */
const sourceUrl = computed(() => {
  const src = store.lastFetchSource
  if (store.lastOrigin !== 'fetch' || !src) return null
  const accession = src.accessions[store.activeRecordIndex] ?? src.accessions[0]
  if (!accession) return null
  if (src.source === 'ncbi') return `https://www.ncbi.nlm.nih.gov/nuccore/${encodeURIComponent(accession)}`
  return src.species
    ? `https://www.ensembl.org/${encodeURIComponent(src.species)}/Location/View?r=${encodeURIComponent(accession)}`
    : `https://www.ensembl.org/id/${encodeURIComponent(accession)}`
})
</script>

<template>
  <div v-if="store.sequenceInfo" class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ store.sequenceInfo.sequence_id }}</h3>
          <span
            v-if="sourceLabel"
            class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            {{ sourceLabel }}
          </span>
        </div>
        <p v-if="store.sequenceInfo.description" class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ store.sequenceInfo.description }}
        </p>
        <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ formatNumber(store.sequenceInfo.total_length) }} bp</p>
      </div>
      <a
        v-if="sourceUrl"
        :href="sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        {{ t('sequenceInfo.viewSource') }}
      </a>
    </div>
  </div>
</template>

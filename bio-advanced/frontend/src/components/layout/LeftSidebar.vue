<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import FastaUploader from '@/components/upload/FastaUploader.vue'
import AccessionFetcher from '@/components/upload/AccessionFetcher.vue'
import WindowSizeSelector from '@/components/controls/WindowSizeSelector.vue'
import AnnotationsPanel from '@/components/annotations/AnnotationsPanel.vue'

const store = useAnalysisStore()
const { t } = useI18n()

const sourceMode = ref<'upload' | 'accession'>('upload')

// Keeps the tab in sync when results come from a source other than what's
// currently selected — e.g. loading a fetch-based session while the
// "Upload file" tab is active.
watch(
  () => store.lastOrigin,
  (origin) => {
    if (origin === 'fetch') sourceMode.value = 'accession'
    else if (origin === 'upload') sourceMode.value = 'upload'
  },
)

const canAnalyze = computed(() => store.selectedFile !== null && store.windowSize > 0 && !store.isLoading)
</script>

<template>
  <aside class="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div class="flex rounded-md bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
      <button
        type="button"
        class="flex-1 rounded px-3 py-1.5 font-medium transition-colors"
        :class="sourceMode === 'upload' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'"
        @click="sourceMode = 'upload'"
      >
        {{ t('fetch.tabUpload') }}
      </button>
      <button
        type="button"
        class="flex-1 rounded px-3 py-1.5 font-medium transition-colors"
        :class="sourceMode === 'accession' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'"
        @click="sourceMode = 'accession'"
      >
        {{ t('fetch.tabAccession') }}
      </button>
    </div>

    <FastaUploader v-if="sourceMode === 'upload'" :store="store" />
    <AccessionFetcher v-else :store="store" />

    <WindowSizeSelector />
    <AnnotationsPanel />

    <template v-if="sourceMode === 'upload'">
      <button
        type="button"
        class="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:disabled:bg-slate-700"
        :disabled="!canAnalyze"
        @click="store.runAnalysis()"
      >
        <span v-if="store.isLoading">{{ t('sidebar.analyzing') }} {{ store.uploadProgress }}%</span>
        <span v-else>{{ t('sidebar.analyze') }}</span>
      </button>

      <div v-if="store.isLoading" class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div class="h-full bg-emerald-500 transition-all" :style="{ width: `${store.uploadProgress}%` }" />
      </div>

      <p v-if="store.error" class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900/50">
        {{ store.error }}
      </p>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import FastaUploader from '@/components/upload/FastaUploader.vue'
import WindowSizeSelector from '@/components/controls/WindowSizeSelector.vue'
import AnnotationsPanel from '@/components/annotations/AnnotationsPanel.vue'

const store = useAnalysisStore()
const { t } = useI18n()

const canAnalyze = computed(() => store.selectedFile !== null && store.windowSize > 0 && !store.isLoading)
</script>

<template>
  <aside class="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <FastaUploader />
    <WindowSizeSelector />
    <AnnotationsPanel />

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
  </aside>
</template>

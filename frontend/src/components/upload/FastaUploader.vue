<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'

const ALLOWED_EXTENSIONS = ['.fasta', '.fa', '.fna']

const { store } = defineProps<{ store: AnalysisStore }>()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const isDragging = ref(false)
const localError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

function isValidExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function handleFile(file: File) {
  if (!isValidExtension(file.name)) {
    localError.value = t('upload.invalidExtension', { extensions: ALLOWED_EXTENSIONS.join(', ') })
    store.setFile(null)
    return
  }
  localError.value = null
  store.setFile(file)
}

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) handleFile(file)
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function clearFile() {
  store.setFile(null)
  localError.value = null
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('upload.label') }}</label>

    <div
      v-if="store.pendingRestoreFilename"
      class="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-900/50"
    >
      <p class="font-semibold">{{ t('session.restoreFilePrompt') }}</p>
      <p class="mt-0.5">{{ t('session.restoreFilePromptDetail', { filename: store.pendingRestoreFilename }) }}</p>
    </div>

    <div
      class="cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors"
      :class="
        isDragging
          ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900/30'
          : 'border-slate-300 bg-slate-50 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500'
      "
      @click="fileInput?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".fasta,.fa,.fna"
        class="hidden"
        @change="onInputChange"
      />
      <p class="text-sm text-slate-600 dark:text-slate-300">{{ t('upload.dragText') }} <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ t('upload.browse') }}</span></p>
      <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ t('upload.formats') }}</p>
    </div>

    <div v-if="store.selectedFile" class="mt-3 flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <div class="min-w-0">
        <p class="truncate font-medium text-slate-800 dark:text-slate-100">{{ store.selectedFile.name }}</p>
        <p class="text-xs text-slate-400 dark:text-slate-500">{{ formatBytes(store.selectedFile.size) }}</p>
      </div>
      <button class="ml-2 shrink-0 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400" :title="t('upload.remove')" @click.stop="clearFile">
        ✕
      </button>
    </div>

    <p v-if="localError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ localError }}</p>

    <div v-if="store.sequenceInfo" class="mt-3 space-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
      <p><span class="font-medium text-slate-600 dark:text-slate-300">{{ t('upload.sequenceId') }}:</span> {{ store.sequenceInfo.sequence_id }}</p>
      <p><span class="font-medium text-slate-600 dark:text-slate-300">{{ t('upload.length') }}:</span> {{ formatNumber(store.sequenceInfo.total_length) }} bp</p>
    </div>
  </div>
</template>

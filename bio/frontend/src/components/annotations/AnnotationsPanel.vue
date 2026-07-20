<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnnotationsStore } from '@/stores/annotations'
import { useAnnotationOverlay } from '@/composables/useAnnotationOverlay'
import { useAnalysisStore } from '@/stores/analysis'
import { requestRegionFocus } from '@/composables/useRegionFocus'
import { ANNOTATION_CATEGORIES, ANNOTATION_COLORS } from '@/types/analysis'
import type { Annotation, AnnotationCategory } from '@/types/analysis'

const ALLOWED_EXTENSIONS = ['.bed', '.gff', '.gff3', '.gtf', '.txt']

const store = useAnnotationsStore()
const analysisStore = useAnalysisStore()
const { overlayRegions } = useAnnotationOverlay()
const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const localError = ref<string | null>(null)

const showManualForm = ref(false)
const editingId = ref<string | null>(null)
const manualName = ref('')
const manualStart = ref<number | null>(null)
const manualEnd = ref<number | null>(null)
const manualCategory = ref<AnnotationCategory>('centromere')

const overlayById = computed(() => new Map(overlayRegions.value.map((r) => [r.annotation.id, r])))

function isValidExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

async function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  if (!isValidExtension(file.name)) {
    localError.value = t('annotations.invalidExtension', { extensions: ALLOWED_EXTENSIONS.join(', ') })
    return
  }
  localError.value = null
  await store.loadFromFile(file)
}

function resetForm() {
  showManualForm.value = false
  editingId.value = null
  manualName.value = ''
  manualStart.value = null
  manualEnd.value = null
  manualCategory.value = 'centromere'
}

function toggleAddForm() {
  if (showManualForm.value) {
    resetForm()
  } else {
    editingId.value = null
    manualName.value = ''
    manualStart.value = null
    manualEnd.value = null
    showManualForm.value = true
  }
}

function startEdit(region: Annotation) {
  editingId.value = region.id
  manualName.value = region.name
  manualStart.value = region.start
  manualEnd.value = region.end
  manualCategory.value = region.category
  showManualForm.value = true
  localError.value = null
}

function viewRegion(region: Annotation) {
  const overlay = overlayById.value.get(region.id)
  if (!overlay) return
  analysisStore.selectSegment(overlay.startIndex)
  requestRegionFocus(overlay.startIndex, overlay.endIndex)
}

function submitManual() {
  localError.value = null
  const name = manualName.value.trim()
  if (!name) {
    localError.value = t('annotations.errorName')
    return
  }
  if (manualStart.value === null || manualEnd.value === null || manualStart.value <= 0 || manualEnd.value < manualStart.value) {
    localError.value = t('annotations.errorCoords')
    return
  }
  if (editingId.value) {
    store.update(editingId.value, { name, start: manualStart.value, end: manualEnd.value, category: manualCategory.value })
  } else {
    store.addManual(name, manualStart.value, manualEnd.value, manualCategory.value)
  }
  resetForm()
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <label class="block text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('annotations.title') }}</label>
      <button v-if="store.regions.length > 0" type="button" class="text-xs text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400" @click="store.clear()">
        {{ t('annotations.clear') }}
      </button>
    </div>

    <div
      class="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition-colors hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500"
      @click="fileInput?.click()"
    >
      <input ref="fileInput" type="file" accept=".bed,.gff,.gff3,.gtf,.txt" class="hidden" @change="onInputChange" />
      <p class="text-xs text-slate-600 dark:text-slate-300">{{ t('annotations.uploadLabel') }}</p>
      <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{{ t('annotations.uploadHint') }}</p>
    </div>

    <button
      type="button"
      class="mt-2 w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      @click="toggleAddForm"
    >
      {{ showManualForm ? t('annotations.cancel') : t('annotations.addManual') }}
    </button>

    <form v-if="showManualForm" class="mt-2 space-y-2 rounded-md bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700" @submit.prevent="submitManual">
      <input v-model="manualName" type="text" :placeholder="t('annotations.namePlaceholder')" class="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
      <div class="grid grid-cols-2 gap-2">
        <input v-model.number="manualStart" type="number" min="1" :placeholder="t('annotations.startPlaceholder')" class="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
        <input v-model.number="manualEnd" type="number" min="1" :placeholder="t('annotations.endPlaceholder')" class="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
      </div>
      <select v-model="manualCategory" class="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
        <option v-for="cat in ANNOTATION_CATEGORIES" :key="cat" :value="cat">{{ t(`annotations.categories.${cat}`) }}</option>
      </select>
      <button type="submit" class="w-full rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500">
        {{ editingId ? t('annotations.save') : t('annotations.add') }}
      </button>
    </form>

    <p v-if="localError || store.error" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ localError || store.error }}</p>

    <ul v-if="store.regions.length > 0" class="mt-3 max-h-48 space-y-1 overflow-y-auto">
      <li
        v-for="region in store.regions"
        :key="region.id"
        class="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
      >
        <div class="flex min-w-0 items-center gap-1.5">
          <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: ANNOTATION_COLORS[region.category] }" />
          <span class="truncate font-medium text-slate-700 dark:text-slate-200" :title="region.name">{{ region.name }}</span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            class="text-slate-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:text-emerald-400"
            :disabled="!overlayById.has(region.id)"
            :title="t('annotations.view')"
            @click="viewRegion(region)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button class="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200" :title="t('annotations.edit')" @click="startEdit(region)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button class="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400" :title="t('annotations.remove')" @click="store.remove(region.id)">✕</button>
        </div>
      </li>
    </ul>
  </div>
</template>

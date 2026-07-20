<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'
import { WINDOW_SIZE_PRESETS } from '@/types/analysis'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const isCustom = ref(!(WINDOW_SIZE_PRESETS as readonly number[]).includes(store.windowSize))
const customValue = ref<number>(isCustom.value ? store.windowSize : 1000)

const activePreset = computed(() => (isCustom.value ? null : store.windowSize))

function selectPreset(size: number) {
  isCustom.value = false
  store.setWindowSize(size)
}

function selectCustom() {
  isCustom.value = true
  store.setWindowSize(customValue.value)
}

watch(customValue, (value) => {
  if (isCustom.value && value > 0) store.setWindowSize(value)
})

// Sliding window: null step (default) means "no overlap", step == windowSize.
const overlapEnabled = ref(store.stepSize !== null)
const stepValue = ref<number>(store.stepSize ?? Math.max(1, Math.floor(store.windowSize / 2)))

function toggleOverlap(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  overlapEnabled.value = enabled
  store.setStepSize(enabled ? stepValue.value : null)
}

watch(stepValue, (value) => {
  if (overlapEnabled.value && value > 0) store.setStepSize(value)
})
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('windowSize.label') }}</label>

    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="preset in WINDOW_SIZE_PRESETS"
        :key="preset"
        type="button"
        class="rounded-md px-2 py-1.5 text-xs font-medium ring-1 transition-colors"
        :class="
          activePreset === preset
            ? 'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500'
            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
        "
        @click="selectPreset(preset)"
      >
        {{ formatNumber(preset) }}
      </button>
    </div>

    <div class="mt-3 flex items-center gap-2">
      <button
        type="button"
        class="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium ring-1 transition-colors"
        :class="
          isCustom
            ? 'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500'
            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
        "
        @click="selectCustom"
      >
        {{ t('windowSize.custom') }}
      </button>
      <input
        v-model.number="customValue"
        type="number"
        min="1"
        step="1"
        :placeholder="t('windowSize.placeholder')"
        class="w-full rounded-md border-0 bg-white px-2 py-1.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
        @focus="selectCustom"
      />
    </div>

    <div class="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
      <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        <input type="checkbox" :checked="overlapEnabled" class="h-3.5 w-3.5 rounded" @change="toggleOverlap" />
        {{ t('windowSize.overlap') }}
      </label>
      <div v-if="overlapEnabled" class="mt-2 flex items-center gap-2">
        <span class="shrink-0 text-xs text-slate-400 dark:text-slate-500">{{ t('windowSize.step') }}</span>
        <input
          v-model.number="stepValue"
          type="number"
          min="1"
          :max="store.windowSize"
          class="w-full rounded-md border-0 bg-white px-2 py-1.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
        />
      </div>
      <p class="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{{ t('windowSize.overlapHint') }}</p>
    </div>
  </div>
</template>

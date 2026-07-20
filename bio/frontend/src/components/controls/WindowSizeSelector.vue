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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'
import { useAnnotationOverlay } from '@/composables/useAnnotationOverlay'
import { getCategoryColor } from '@/types/analysis'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const { overlayRegions } = useAnnotationOverlay()

const segmentAnnotations = computed(() => {
  const idx = store.selectedIndex
  if (idx === null) return []
  return overlayRegions.value.filter((r) => idx >= r.startIndex && idx <= r.endIndex)
})

function scoreColorClass(score: number): string {
  if (score >= 0.95) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 0.85) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
</script>

<template>
  <aside class="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('detail.title') }}</h2>

    <div v-if="!store.selectedSegment" class="text-sm text-slate-400 dark:text-slate-500">
      {{ t('detail.empty') }}
    </div>

    <div v-else class="space-y-4">
      <div>
        <p class="text-xs text-slate-400 dark:text-slate-500">{{ t('detail.index') }}</p>
        <p class="text-sm font-medium text-slate-800 dark:text-slate-100">#{{ store.selectedSegment.index + 1 }}</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <p class="text-xs text-slate-400 dark:text-slate-500">{{ t('detail.start') }}</p>
          <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ formatNumber(store.selectedSegment.start) }}</p>
        </div>
        <div>
          <p class="text-xs text-slate-400 dark:text-slate-500">{{ t('detail.end') }}</p>
          <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ formatNumber(store.selectedSegment.end) }}</p>
        </div>
      </div>

      <div v-if="segmentAnnotations.length > 0">
        <p class="mb-1.5 text-xs text-slate-400 dark:text-slate-500">{{ t('detail.annotations') }}</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="entry in segmentAnnotations"
            :key="entry.annotation.id"
            class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            :style="{ color: getCategoryColor(entry.annotation.category), backgroundColor: `${getCategoryColor(entry.annotation.category)}1f` }"
          >
            {{ entry.annotation.name }}
          </span>
        </div>
      </div>

      <div>
        <p class="mb-2 text-xs text-slate-400 dark:text-slate-500">{{ t('detail.baseCounts') }}</p>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div class="rounded-md bg-slate-50 py-2 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <p class="text-xs text-slate-400 dark:text-slate-500">A</p>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ store.selectedSegment.A }}</p>
          </div>
          <div class="rounded-md bg-slate-50 py-2 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <p class="text-xs text-slate-400 dark:text-slate-500">T</p>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ store.selectedSegment.T }}</p>
          </div>
          <div class="rounded-md bg-slate-50 py-2 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <p class="text-xs text-slate-400 dark:text-slate-500">G</p>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ store.selectedSegment.G }}</p>
          </div>
          <div class="rounded-md bg-slate-50 py-2 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <p class="text-xs text-slate-400 dark:text-slate-500">C</p>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ store.selectedSegment.C }}</p>
          </div>
        </div>
      </div>

      <div>
        <p class="text-xs text-slate-400 dark:text-slate-500">{{ t('detail.gcPercent') }}</p>
        <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ store.selectedSegment.gcPercent.toFixed(2) }}%</p>
      </div>

      <div class="rounded-md bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <p class="text-xs text-slate-400 dark:text-slate-500">{{ t('detail.score') }}</p>
        <p class="text-2xl font-bold" :class="scoreColorClass(store.selectedSegment.score)">
          {{ store.selectedSegment.score.toFixed(4) }}
        </p>
      </div>
    </div>
  </aside>
</template>

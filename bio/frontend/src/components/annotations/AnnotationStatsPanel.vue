<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useAnnotationOverlay } from '@/composables/useAnnotationOverlay'
import { useNumberFormat } from '@/composables/useNumberFormat'
import { requestRegionFocus } from '@/composables/useRegionFocus'
import { ANNOTATION_CATEGORIES, ANNOTATION_COLORS } from '@/types/analysis'
import type { AnnotationCategory } from '@/types/analysis'

const store = useAnalysisStore()
const { overlayRegions } = useAnnotationOverlay()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const categoryFilter = ref<AnnotationCategory | 'all'>('all')

type SortKey = 'category' | 'regionScore' | 'globalScore'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const rows = computed(() => {
  const globalMean = store.statistics?.mean ?? null
  const mapped = overlayRegions.value
    .filter((r) => categoryFilter.value === 'all' || r.annotation.category === categoryFilter.value)
    .map((r) => {
      const delta = globalMean !== null && r.regionMeanScore !== null ? r.regionMeanScore - globalMean : null
      return { ...r, globalMean, delta }
    })

  const dir = sortDir.value === 'asc' ? 1 : -1

  if (sortKey.value === 'category') {
    return mapped.sort((a, b) => dir * t(`annotations.categories.${a.annotation.category}`).localeCompare(t(`annotations.categories.${b.annotation.category}`)))
  }
  if (sortKey.value === 'regionScore') {
    return mapped.sort((a, b) => dir * ((a.regionMeanScore ?? -Infinity) - (b.regionMeanScore ?? -Infinity)))
  }
  if (sortKey.value === 'globalScore') {
    return mapped.sort((a, b) => dir * ((a.globalMean ?? -Infinity) - (b.globalMean ?? -Infinity)))
  }
  return mapped.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
})

function focusRegion(startIndex: number, endIndex: number) {
  store.selectSegment(startIndex)
  requestRegionFocus(startIndex, endIndex)
}
</script>

<template>
  <div v-if="overlayRegions.length > 0" class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('annotationStats.title') }}</h3>
      <select
        v-model="categoryFilter"
        class="rounded-md border-0 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
      >
        <option value="all">{{ t('annotationStats.allCategories') }}</option>
        <option v-for="cat in ANNOTATION_CATEGORIES" :key="cat" :value="cat">{{ t(`annotations.categories.${cat}`) }}</option>
      </select>
    </div>

    <p v-if="rows.length === 0" class="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
      {{ t('annotationStats.noResults') }}
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[520px] text-left text-xs">
        <thead class="text-slate-400 dark:text-slate-500">
          <tr>
            <th class="pb-2 pr-3 font-medium">{{ t('annotationStats.region') }}</th>
            <th class="pb-2 pr-3 font-medium">
              <button type="button" class="inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300" @click="toggleSort('category')">
                {{ t('annotationStats.category') }}
                <span class="flex flex-col leading-none text-[8px]">
                  <span :class="sortKey === 'category' && sortDir === 'asc' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'">▲</span>
                  <span :class="sortKey === 'category' && sortDir === 'desc' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'">▼</span>
                </span>
              </button>
            </th>
            <th class="pb-2 pr-3 font-medium">{{ t('annotationStats.bp') }}</th>
            <th class="pb-2 pr-3 font-medium">
              <button type="button" class="inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300" @click="toggleSort('regionScore')">
                {{ t('annotationStats.regionScore') }}
                <span class="flex flex-col leading-none text-[8px]">
                  <span :class="sortKey === 'regionScore' && sortDir === 'asc' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'">▲</span>
                  <span :class="sortKey === 'regionScore' && sortDir === 'desc' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'">▼</span>
                </span>
              </button>
            </th>
            <th class="pb-2 pr-3 font-medium">
              <button type="button" class="inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300" @click="toggleSort('globalScore')">
                {{ t('annotationStats.globalScore') }}
                <span class="flex flex-col leading-none text-[8px]">
                  <span :class="sortKey === 'globalScore' && sortDir === 'asc' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'">▲</span>
                  <span :class="sortKey === 'globalScore' && sortDir === 'desc' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'">▼</span>
                </span>
              </button>
            </th>
            <th class="pb-2 font-medium">{{ t('annotationStats.delta') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.annotation.id"
            class="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            @click="focusRegion(row.startIndex, row.endIndex)"
          >
            <td class="py-1.5 pr-3">
              <span class="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" :style="{ backgroundColor: ANNOTATION_COLORS[row.annotation.category] }" />
              {{ row.annotation.name }}
            </td>
            <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{{ t(`annotations.categories.${row.annotation.category}`) }}</td>
            <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{{ formatNumber(row.annotation.start) }}–{{ formatNumber(row.annotation.end) }}</td>
            <td class="py-1.5 pr-3 font-medium text-slate-800 dark:text-slate-100">{{ row.regionMeanScore?.toFixed(4) ?? '—' }}</td>
            <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{{ row.globalMean?.toFixed(4) ?? '—' }}</td>
            <td class="py-1.5 font-semibold" :class="(row.delta ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
              <span v-if="row.delta !== null">{{ row.delta >= 0 ? '▲' : '▼' }} {{ Math.abs(row.delta).toFixed(4) }}</span>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

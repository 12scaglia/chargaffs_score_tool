<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useAnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'

const GRID_COLS = 'grid-cols-[56px_100px_100px_56px_56px_56px_56px_72px_84px]'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const scrollParent = ref<HTMLDivElement | null>(null)

/** Row indices to display, in order: either every window (default) or a
 * Top-N filter selection from TopSegmentsPanel. Only an index array is
 * built eagerly — actual row data is only ever denormalized for the
 * handful of rows visible in the viewport (see `visibleRows`). */
const indices = computed(() => {
  if (store.activeTopFilter) return store.topIndices(store.activeTopFilter)
  return Array.from({ length: store.totalWindows }, (_, i) => i)
})

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: indices.value.length,
    getScrollElement: () => scrollParent.value,
    estimateSize: () => 30,
    overscan: 12,
  })),
)

const visibleRows = computed(() =>
  rowVirtualizer.value
    .getVirtualItems()
    .map((virtualRow) => ({
      virtualRow,
      row: store.getSegment(indices.value[virtualRow.index]),
    }))
    .filter((entry) => entry.row !== null),
)

function scoreClass(score: number): string {
  if (score >= 0.95) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 0.85) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
</script>

<template>
  <div class="flex h-full flex-col">
    <h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
      {{ t('table.title') }}
      <span class="ml-1 font-normal text-slate-400 dark:text-slate-500">({{ formatNumber(indices.length) }} {{ t('table.rows') }})</span>
    </h3>

    <div :class="['grid', GRID_COLS, 'gap-1 border-b border-slate-200 pb-1.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400']">
      <span>{{ t('table.rank') }}</span><span>{{ t('table.start') }}</span><span>{{ t('table.end') }}</span><span>A</span><span>T</span><span>G</span><span>C</span
      ><span>{{ t('table.gc') }}</span><span>{{ t('table.score') }}</span>
    </div>

    <div ref="scrollParent" class="relative flex-1 overflow-y-auto">
      <div :style="{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }">
        <div
          v-for="entry in visibleRows"
          :key="entry.virtualRow.index"
          :class="[
            'absolute left-0 top-0 grid w-full cursor-pointer items-center gap-1 border-b border-slate-100 text-xs hover:bg-emerald-50 dark:border-slate-800 dark:hover:bg-emerald-900/30',
            GRID_COLS,
            { 'bg-emerald-50 dark:bg-emerald-900/30': store.selectedIndex === entry.row!.index },
          ]"
          :style="{ transform: `translateY(${entry.virtualRow.start}px)`, height: `${entry.virtualRow.size}px` }"
          @click="store.selectSegment(entry.row!.index)"
        >
          <span>{{ entry.virtualRow.index + 1 }}</span>
          <span>{{ formatNumber(entry.row!.start) }}</span>
          <span>{{ formatNumber(entry.row!.end) }}</span>
          <span>{{ entry.row!.A }}</span>
          <span>{{ entry.row!.T }}</span>
          <span>{{ entry.row!.G }}</span>
          <span>{{ entry.row!.C }}</span>
          <span>{{ entry.row!.gcPercent.toFixed(1) }}%</span>
          <span :class="scoreClass(entry.row!.score)">{{ entry.row!.score.toFixed(4) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

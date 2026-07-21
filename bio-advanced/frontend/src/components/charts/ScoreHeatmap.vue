<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EChartsOption } from 'echarts'
import '@/services/echarts-setup'
import { useSyncedChart } from '@/composables/useSyncedChart'
import { useAnnotationOverlay } from '@/composables/useAnnotationOverlay'
import { useNumberFormat } from '@/composables/useNumberFormat'
import { useChartTheme } from '@/composables/useChartTheme'
import { useAnalysisStore } from '@/stores/analysis'
import { downloadDataUri } from '@/utils/download'

const store = useAnalysisStore()
const el = ref<HTMLDivElement | null>(null)
const chartState = useSyncedChart(el)
const { markAreaData } = useAnnotationOverlay()
const { t, locale } = useI18n()
const { formatNumber } = useNumberFormat()
const { isDark, colors } = useChartTheme()

function buildOption(): EChartsOption | null {
  const d = store.data
  if (!d) return null
  const n = d.score.length
  const categories = new Array<number>(n)
  const values = new Array<[number, number, number]>(n)
  for (let i = 0; i < n; i++) {
    categories[i] = i
    values[i] = [i, 1, d.score[i]]
  }

  const c = colors.value

  return {
    grid: { left: 8, right: 60, top: 16, bottom: 40, containLabel: false },
    tooltip: {
      trigger: 'item',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText },
      formatter: (params: any) => {
        const idx = params.data[0] as number
        return [
          `${t('chart.index')}: ${idx + 1}`,
          `${t('chart.start')}: ${formatNumber(d.start[idx])}`,
          `${t('chart.end')}: ${formatNumber(d.end[idx])}`,
          `${t('chart.scoreValue')}: ${d.score[idx].toFixed(4)}`,
        ].join('<br/>')
      },
    },
    visualMap: {
      type: 'continuous',
      min: 0,
      max: 1,
      dimension: 2,
      calculable: false,
      orient: 'vertical',
      right: 4,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 90,
      text: ['1.0', '0.0'],
      textStyle: { fontSize: 10, color: c.axisLabel },
      inRange: { color: isDark.value ? ['#dc2626', '#facc15', '#22c55e'] : ['#dc2626', '#facc15', '#16a34a'] },
    },
    xAxis: {
      type: 'category',
      data: categories,
      show: false,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      show: false,
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 14,
        bottom: 4,
        fillerColor: c.dataZoomFill,
        borderColor: c.dataZoomBorder,
        handleStyle: { color: c.dataZoomHandle },
        textStyle: { color: c.axisLabel },
      },
    ],
    series: [
      {
        type: 'bar',
        name: 'Chargaff Score',
        data: values,
        encode: { x: 0, y: 1 },
        barWidth: '100%',
        barGap: '0%',
        large: true,
        largeThreshold: 5000,
        itemStyle: { borderWidth: 0 },
        markLine:
          store.selectedIndex !== null
            ? {
                symbol: 'none',
                silent: true,
                lineStyle: { color: isDark.value ? '#e2e8f0' : '#0f172a', width: 2, type: 'solid' },
                data: [{ xAxis: store.selectedIndex }],
              }
            : { data: [] },
        markArea: {
          silent: true,
          data: markAreaData.value as any,
        },
      },
    ],
  }
}

function render() {
  const option = buildOption()
  if (!chartState.chart || !option) return
  // `large: true` bar rendering can leave stale unpainted cells behind after
  // a programmatic dataZoom (see useRegionFocus) is followed by a notMerge
  // rebuild back to the full range — force a clean repaint.
  chartState.chart.clear()
  chartState.chart.setOption(option, { notMerge: true })
}

function updateHighlight() {
  if (!chartState.chart || !store.data) return
  chartState.chart.setOption({
    series: [
      {
        markLine:
          store.selectedIndex !== null
            ? { data: [{ xAxis: store.selectedIndex }] }
            : { data: [] },
      },
    ],
  })
}

onMounted(() => {
  render()
  chartState.chart?.on('click', (params: any) => {
    if (Array.isArray(params.data)) {
      store.selectSegment(params.data[0] as number)
    }
  })
})

watch(() => store.data, render)
watch(() => store.selectedIndex, updateHighlight)
watch(markAreaData, render)
watch(locale, render)
watch(isDark, render)

function exportPng() {
  const uri = chartState.chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: isDark.value ? '#0f172a' : '#ffffff' })
  if (uri) downloadDataUri(uri, 'chargaff_heatmap.png')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('heatmap.title') }}</h3>
      <button
        type="button"
        class="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        @click="exportPng"
      >
        {{ t('chart.exportPng') }}
      </button>
    </div>
    <div ref="el" class="min-h-[140px] flex-1" />
  </div>
</template>

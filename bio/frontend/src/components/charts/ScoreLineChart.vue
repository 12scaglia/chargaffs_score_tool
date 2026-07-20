<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EChartsOption } from 'echarts'
import '@/services/echarts-setup'
import { useSyncedChart } from '@/composables/useSyncedChart'
import { useAnnotationOverlay } from '@/composables/useAnnotationOverlay'
import { useNumberFormat } from '@/composables/useNumberFormat'
import { useChartTheme } from '@/composables/useChartTheme'
import { regionFocusRequest, regionToZoomPercent } from '@/composables/useRegionFocus'
import { useAnalysisStore } from '@/stores/analysis'

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
  const values = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    categories[i] = i
    values[i] = d.score[i]
  }

  const c = colors.value

  return {
    grid: { left: 48, right: 24, top: 24, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText },
      formatter: (paramsList: any) => {
        const params = Array.isArray(paramsList) ? paramsList[0] : paramsList
        const idx = params.dataIndex as number
        return [
          `${t('chart.index')}: ${idx + 1}`,
          `${t('chart.start')}: ${formatNumber(d.start[idx])}`,
          `${t('chart.end')}: ${formatNumber(d.end[idx])}`,
          `${t('chart.scoreValue')}: ${d.score[idx].toFixed(4)}`,
        ].join('<br/>')
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      name: t('chart.segmentIndex'),
      nameLocation: 'middle',
      nameGap: 28,
      axisLabel: { formatter: (val: string) => formatNumber(d.start[Number(val)] ?? 0), color: c.axisLabel },
      axisLine: { lineStyle: { color: c.splitLine } },
      nameTextStyle: { color: c.axisLabel },
    },
    yAxis: {
      type: 'value',
      name: t('chart.score'),
      min: 0,
      max: 1,
      axisLabel: { color: c.axisLabel },
      splitLine: { lineStyle: { color: c.splitLine } },
      nameTextStyle: { color: c.axisLabel },
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
        type: 'line',
        name: 'Chargaff Score',
        data: values,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { color: isDark.value ? '#34d399' : '#059669', width: 1.5 },
        areaStyle: { color: isDark.value ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.08)' },
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
    if (typeof params.dataIndex === 'number') {
      store.selectSegment(params.dataIndex)
    }
  })
})

watch(() => store.data, render)
watch(() => store.selectedIndex, updateHighlight)
watch(markAreaData, render)
watch(locale, render)
watch(isDark, render)
watch(regionFocusRequest, (req) => {
  if (!req || !chartState.chart || !store.data) return
  const { start, end } = regionToZoomPercent(req.startIndex, req.endIndex, store.totalWindows)
  chartState.chart.dispatchAction({ type: 'dataZoom', start, end })
})
</script>

<template>
  <div class="flex h-full flex-col">
    <h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('chart.title') }}</h3>
    <div ref="el" class="min-h-[220px] flex-1" />
  </div>
</template>

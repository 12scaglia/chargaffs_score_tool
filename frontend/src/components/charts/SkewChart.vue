<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EChartsOption } from 'echarts'
import '@/services/echarts-setup'
import { useSyncedChart } from '@/composables/useSyncedChart'
import { useAnnotationOverlay } from '@/composables/useAnnotationOverlay'
import { useNumberFormat } from '@/composables/useNumberFormat'
import { useChartTheme } from '@/composables/useChartTheme'
import { useSkewAnalysis, oriTerOverlayVisible } from '@/composables/useSkewAnalysis'
import { useAnalysisStore } from '@/stores/analysis'
import { downloadDataUri } from '@/utils/download'

const store = useAnalysisStore()
const el = ref<HTMLDivElement | null>(null)
const chartState = useSyncedChart(el)
const { markAreaData } = useAnnotationOverlay()
const { t, locale } = useI18n()
const { formatNumber } = useNumberFormat()
const { isDark, colors } = useChartTheme()
const { cumulativeGcSkew, cumulativeAtSkew, oriTerCandidates } = useSkewAnalysis(store)

const mode = ref<'instant' | 'cumulative'>('instant')

const gcColor = computed(() => (isDark.value ? '#38bdf8' : '#0284c7'))
const atColor = computed(() => (isDark.value ? '#fb923c' : '#ea580c'))

function buildOption(): EChartsOption | null {
  const d = store.data
  if (!d) return null
  const n = d.score.length
  const categories = new Array<number>(n)
  for (let i = 0; i < n; i++) categories[i] = i

  const gcValues = mode.value === 'instant' ? d.gc_skew : cumulativeGcSkew.value
  const atValues = mode.value === 'instant' ? d.at_skew : cumulativeAtSkew.value

  const c = colors.value
  const candidates = oriTerOverlayVisible.value ? oriTerCandidates.value : null

  const oriTerMarkLineData = candidates
    ? [
        { xAxis: candidates.origin.index, label: { formatter: t('oriTer.originShort') } },
        { xAxis: candidates.terminus.index, label: { formatter: t('oriTer.terminusShort') } },
      ]
    : []

  return {
    grid: { left: 52, right: 24, top: 32, bottom: 40 },
    legend: {
      top: 0,
      textStyle: { color: c.axisLabel, fontSize: 11 },
      data: [t('skew.gcSkew'), t('skew.atSkew')],
    },
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
          `${t('skew.gcSkew')}: ${gcValues[idx]?.toFixed(4) ?? '—'}`,
          `${t('skew.atSkew')}: ${atValues[idx]?.toFixed(4) ?? '—'}`,
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
      name: mode.value === 'instant' ? t('skew.instantAxis') : t('skew.cumulativeAxis'),
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
        name: t('skew.gcSkew'),
        data: gcValues,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { color: gcColor.value, width: 1.5 },
        markArea: { silent: true, data: markAreaData.value as any },
        markLine:
          oriTerMarkLineData.length > 0
            ? {
                symbol: 'none',
                silent: true,
                lineStyle: { color: isDark.value ? '#e2e8f0' : '#0f172a', width: 1.5, type: 'dashed' },
                label: { color: c.axisLabel, fontSize: 10 },
                data: oriTerMarkLineData,
              }
            : { data: [] },
      },
      {
        type: 'line',
        name: t('skew.atSkew'),
        data: atValues,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { color: atColor.value, width: 1.5 },
      },
    ],
  }
}

function render() {
  const option = buildOption()
  if (!chartState.chart || !option) return
  chartState.chart.setOption(option, { notMerge: true })
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
watch(markAreaData, render)
watch(locale, render)
watch(isDark, render)
watch(mode, render)
watch(oriTerOverlayVisible, render)
watch(oriTerCandidates, render)

function exportPng() {
  const uri = chartState.chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: isDark.value ? '#0f172a' : '#ffffff' })
  if (uri) downloadDataUri(uri, 'chargaff_skew.png')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('skew.title') }}</h3>
      <div class="flex gap-1">
        <button
          type="button"
          class="rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition-colors"
          :class="
            mode === 'instant'
              ? 'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500'
              : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
          "
          @click="mode = 'instant'"
        >
          {{ t('skew.instant') }}
        </button>
        <button
          type="button"
          class="rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition-colors"
          :class="
            mode === 'cumulative'
              ? 'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500'
              : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
          "
          @click="mode = 'cumulative'"
        >
          {{ t('skew.cumulative') }}
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="exportPng"
        >
          {{ t('chart.exportPng') }}
        </button>
      </div>
    </div>
    <div ref="el" class="min-h-[220px] flex-1" />
  </div>
</template>

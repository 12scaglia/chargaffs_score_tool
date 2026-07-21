<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EChartsOption } from 'echarts'
import '@/services/echarts-setup'
import { useSyncedChart } from '@/composables/useSyncedChart'
import { useNumberFormat } from '@/composables/useNumberFormat'
import { useChartTheme } from '@/composables/useChartTheme'
import type { AnalysisStore } from '@/stores/analysis'
import { downloadDataUri } from '@/utils/download'

const { primary, comparison } = defineProps<{ primary: AnalysisStore; comparison: AnalysisStore }>()

const el = ref<HTMLDivElement | null>(null)
const chartState = useSyncedChart(el, { sync: false })
const { t, locale } = useI18n()
const { formatNumber } = useNumberFormat()
const { isDark, colors } = useChartTheme()

const metric = ref<'score' | 'gcSkew'>('score')

function seriesData(store: AnalysisStore): [number, number][] {
  const d = store.data
  if (!d) return []
  const values = metric.value === 'score' ? d.score : d.gc_skew
  return values.map((value, index) => [index, value])
}

function buildOption(): EChartsOption | null {
  if (!primary.data && !comparison.data) return null
  const c = colors.value
  const label = metric.value === 'score' ? t('chart.score') : t('skew.gcSkew')

  return {
    grid: { left: 52, right: 24, top: 32, bottom: 40 },
    legend: {
      top: 0,
      textStyle: { color: c.axisLabel, fontSize: 11 },
      data: [primary.filename ?? t('comparison.genomeA'), comparison.filename ?? t('comparison.genomeB')],
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText },
      valueFormatter: (value: any) => (typeof value === 'number' ? value.toFixed(4) : String(value)),
    },
    xAxis: {
      type: 'value',
      name: t('chart.segmentIndex'),
      nameLocation: 'middle',
      nameGap: 28,
      axisLabel: { color: c.axisLabel, formatter: (v: number) => formatNumber(v) },
      axisLine: { lineStyle: { color: c.splitLine } },
      nameTextStyle: { color: c.axisLabel },
    },
    yAxis: {
      type: 'value',
      name: label,
      axisLabel: { color: c.axisLabel },
      splitLine: { lineStyle: { color: c.splitLine } },
      nameTextStyle: { color: c.axisLabel },
    },
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'slider', xAxisIndex: 0, height: 14, bottom: 4, textStyle: { color: c.axisLabel } }],
    series: [
      {
        type: 'line',
        name: primary.filename ?? t('comparison.genomeA'),
        data: seriesData(primary),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { color: isDark.value ? '#34d399' : '#059669', width: 1.5 },
      },
      {
        type: 'line',
        name: comparison.filename ?? t('comparison.genomeB'),
        data: seriesData(comparison),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { color: isDark.value ? '#c084fc' : '#9333ea', width: 1.5 },
      },
    ],
  }
}

function render() {
  const option = buildOption()
  if (!chartState.chart || !option) return
  chartState.chart.setOption(option, { notMerge: true })
}

onMounted(render)

watch(() => primary.data, render)
watch(() => comparison.data, render)
watch(metric, render)
watch(locale, render)
watch(isDark, render)

function exportPng() {
  const uri = chartState.chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: isDark.value ? '#0f172a' : '#ffffff' })
  if (uri) downloadDataUri(uri, 'chargaff_comparison.png')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('comparison.chartTitle') }}</h3>
      <div class="flex gap-1">
        <button
          type="button"
          class="rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition-colors"
          :class="
            metric === 'score'
              ? 'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500'
              : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
          "
          @click="metric = 'score'"
        >
          {{ t('chart.score') }}
        </button>
        <button
          type="button"
          class="rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition-colors"
          :class="
            metric === 'gcSkew'
              ? 'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500'
              : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
          "
          @click="metric = 'gcSkew'"
        >
          {{ t('skew.gcSkew') }}
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

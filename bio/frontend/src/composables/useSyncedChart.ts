import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import type { ECharts } from 'echarts/core'
import echarts from '@/services/echarts-setup'

/** Shared group id so the heatmap's and the line chart's dataZoom stay
 * synchronized via ECharts' native `connect` mechanism. */
const SYNC_GROUP = 'chargaff-dashboard'

export function useSyncedChart(elRef: Ref<HTMLElement | null>) {
  const state: { chart: ECharts | null } = { chart: null }
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (!elRef.value) return
    const chart = echarts.init(elRef.value)
    chart.group = SYNC_GROUP
    echarts.connect(SYNC_GROUP)
    state.chart = chart

    resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(elRef.value)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    state.chart?.dispose()
    state.chart = null
  })

  return state
}

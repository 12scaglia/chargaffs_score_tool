import { computed } from 'vue'
import { theme } from '@/theme'

/** Colors for ECharts option pieces that Tailwind's `dark:` variant can't
 * reach (canvas-rendered text, axis lines, tooltip chrome). */
export function useChartTheme() {
  const isDark = computed(() => theme.value === 'dark')

  const colors = computed(() => ({
    axisLabel: isDark.value ? '#94a3b8' : '#64748b',
    splitLine: isDark.value ? '#1e293b' : '#e2e8f0',
    tooltipBg: isDark.value ? '#1e293b' : '#ffffff',
    tooltipBorder: isDark.value ? '#334155' : '#e2e8f0',
    tooltipText: isDark.value ? '#e2e8f0' : '#0f172a',
    dataZoomFill: isDark.value ? '#1e293b' : '#f1f5f9',
    dataZoomBorder: isDark.value ? '#334155' : '#cbd5e1',
    dataZoomHandle: isDark.value ? '#64748b' : '#94a3b8',
  }))

  return { isDark, colors }
}

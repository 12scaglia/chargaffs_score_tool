import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useAnnotationOverlay } from '@/composables/useAnnotationOverlay'
import { downloadBlob } from '@/utils/download'
import { formatCategoryLabel, isBaseCategory } from '@/types/analysis'

/** Generates a self-contained Markdown report from the current analysis
 * state: global stats, significance (if computed), annotation/region
 * scores (if any), and the active Top-N segment selection (if any). Text
 * only, no embedded chart images — avoids coupling this composable to the
 * independent chart component instances just to grab their PNGs. */
export function useMarkdownReport() {
  const store = useAnalysisStore()
  const { overlayRegions } = useAnnotationOverlay()
  const { t } = useI18n()

  function categoryLabel(category: string): string {
    return isBaseCategory(category) ? t(`annotations.categories.${category}`) : formatCategoryLabel(category)
  }

  function generateReport(): string {
    const lines: string[] = []
    const info = store.sequenceInfo
    const stats = store.statistics

    lines.push(`# ${t('report.title')}`, '')
    if (info) {
      lines.push(
        `- **${t('upload.sequenceId')}:** ${info.sequence_id}`,
        ...(info.description ? [`- **Description:** ${info.description}`] : []),
        `- **File:** ${info.filename}`,
        `- **${t('upload.length')}:** ${info.total_length.toLocaleString()} bp`,
        `- **${t('app.windowLabel')}:** ${store.windowSize.toLocaleString()} bp`,
        `- **Generated:** ${new Date().toISOString()}`,
        '',
      )
    }

    if (stats) {
      lines.push(
        `## ${t('report.sectionStats')}`,
        '',
        `| ${t('stats.segments')} | ${t('stats.meanScore')} | ${t('stats.median')} | ${t('stats.min')} | ${t('stats.max')} | ${t('stats.stdDev')} |`,
        '|---|---|---|---|---|---|',
        `| ${stats.total_windows} | ${stats.mean.toFixed(4)} | ${stats.median.toFixed(4)} | ${stats.min.toFixed(4)} | ${stats.max.toFixed(4)} | ${stats.std_dev.toFixed(4)} |`,
        '',
      )
    }

    if (store.significance) {
      const sig = store.significance
      lines.push(
        `## ${t('report.sectionSignificance')}`,
        '',
        `| ${t('significance.observedScore')} | ${t('significance.permutedMean')} | ${t('significance.zScore')} | ${t('significance.pValue')} | ${t('significance.permutations')} |`,
        '|---|---|---|---|---|',
        `| ${sig.observed_mean_score.toFixed(4)} | ${sig.permuted_mean.toFixed(4)} ± ${sig.permuted_std.toFixed(4)} | ${sig.z_score.toFixed(3)} | ${sig.p_value.toFixed(4)} | ${sig.n_permutations} |`,
        '',
        `**${sig.is_significant ? t('significance.significant') : t('significance.notSignificant')}**`,
        '',
      )
    }

    if (overlayRegions.value.length > 0) {
      const globalMean = stats?.mean ?? null
      lines.push(
        `## ${t('report.sectionAnnotations')}`,
        '',
        `| ${t('annotationStats.region')} | ${t('annotationStats.category')} | ${t('annotationStats.regionScore')} | ${t('annotationStats.globalScore')} | ${t('annotationStats.delta')} |`,
        '|---|---|---|---|---|',
        ...overlayRegions.value.map((r) => {
          const delta = globalMean !== null && r.regionMeanScore !== null ? r.regionMeanScore - globalMean : null
          return `| ${r.annotation.name} | ${categoryLabel(r.annotation.category)} | ${r.regionMeanScore?.toFixed(4) ?? '—'} | ${globalMean?.toFixed(4) ?? '—'} | ${delta?.toFixed(4) ?? '—'} |`
        }),
        '',
      )
    }

    if (store.activeTopFilter) {
      const indices = store.topIndices(store.activeTopFilter)
      lines.push(
        `## ${t('report.sectionTopSegments')} (${t(`topSegments.${store.activeTopFilter.replace(/-(\w)/, (_, c) => c.toUpperCase())}`)})`,
        '',
        `| ${t('table.rank')} | ${t('table.start')} | ${t('table.end')} | ${t('table.gc')} | ${t('table.score')} |`,
        '|---|---|---|---|---|',
        ...indices.map((idx, rank) => {
          const segment = store.getSegment(idx)
          if (!segment) return ''
          return `| ${rank + 1} | ${segment.start} | ${segment.end} | ${segment.gcPercent.toFixed(2)}% | ${segment.score.toFixed(4)} |`
        }),
        '',
      )
    }

    return lines.join('\n')
  }

  function downloadReport() {
    const name = store.filename ? store.filename.replace(/\.[^.]+$/, '') : 'analysis'
    downloadBlob(generateReport(), `chargaff_report_${name}.md`, 'text/markdown;charset=utf-8')
  }

  return { generateReport, downloadReport }
}

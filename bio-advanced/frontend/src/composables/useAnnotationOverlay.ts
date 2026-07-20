import { computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysis'
import { useAnnotationsStore } from '@/stores/annotations'
import { ANNOTATION_COLORS } from '@/types/analysis'
import type { Annotation } from '@/types/analysis'

/** Binary search: indice della finestra il cui [start,end] contiene bp,
 * o la finestra più vicina se bp cade fuori dal range coperto. */
function bpToIndex(starts: number[], ends: number[], bp: number): number {
  let lo = 0
  let hi = starts.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (bp < starts[mid]) hi = mid - 1
    else if (bp > ends[mid]) lo = mid + 1
    else return mid
  }
  return Math.min(Math.max(lo, 0), starts.length - 1)
}

export interface OverlayRegion {
  annotation: Annotation
  startIndex: number
  endIndex: number
  regionMeanScore: number | null
}

/** Beyond this many regions, ECharts markArea rendering (draw + hit-test per
 * region on every interaction) gets sluggish and the labels overlap into
 * unreadable clutter anyway — cap what's drawn on the charts while the
 * table/list below still show every parsed region. */
const MAX_CHART_MARK_AREAS = 300

/** Sovrappone le annotazioni (centromeri, telomeri, ecc.) alle finestre calcolate,
 * convertendo coordinate bp -> indice di finestra e calcolando lo score medio
 * nella regione, da confrontare con la media globale. */
export function useAnnotationOverlay() {
  const analysisStore = useAnalysisStore()
  const annotationsStore = useAnnotationsStore()

  const overlayRegions = computed<OverlayRegion[]>(() => {
    const d = analysisStore.data
    if (!d || d.start.length === 0) return []
    return annotationsStore.regions.map((annotation) => {
      const a = bpToIndex(d.start, d.end, annotation.start)
      const b = bpToIndex(d.start, d.end, annotation.end)
      const startIndex = Math.min(a, b)
      const endIndex = Math.max(a, b)
      let sum = 0
      for (let i = startIndex; i <= endIndex; i++) sum += d.score[i]
      const count = endIndex - startIndex + 1
      return { annotation, startIndex, endIndex, regionMeanScore: count > 0 ? sum / count : null }
    })
  })

  const markAreaData = computed(() =>
    overlayRegions.value.slice(0, MAX_CHART_MARK_AREAS).map((r) => {
      const color = ANNOTATION_COLORS[r.annotation.category]
      return [
        {
          xAxis: r.startIndex,
          itemStyle: { color, opacity: 0.14 },
          label: { formatter: r.annotation.name, position: 'insideTop', fontSize: 10, color },
        },
        { xAxis: r.endIndex },
      ]
    }),
  )

  return { overlayRegions, markAreaData }
}

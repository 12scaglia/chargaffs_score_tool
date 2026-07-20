import { computed, ref } from 'vue'
import type { AnalysisStore } from '@/stores/analysis'

/** Shared across OriTerPanel and the charts (module-scope singleton, same
 * pattern as theme/i18n): whether the predicted origin/terminus markers are
 * overlaid on ScoreLineChart / SkewChart. */
export const oriTerOverlayVisible = ref(false)

export interface OriTerCandidate {
  index: number
  bp: number
  cumulativeSkew: number
}

export interface OriTerCandidates {
  origin: OriTerCandidate
  terminus: OriTerCandidate
}

function cumulativeSum(values: number[] | undefined): number[] {
  if (!values || values.length === 0) return []
  const result = new Array<number>(values.length)
  let running = 0
  for (let i = 0; i < values.length; i++) {
    running += values[i]
    result[i] = running
  }
  return result
}

/** Running cumulative GC-skew/AT-skew (Z-curve) for the given store's active
 * record, plus a heuristic origin/terminus-of-replication prediction: the
 * global minimum and maximum of the cumulative GC-skew curve. This is the
 * classic bacterial-genome heuristic (skew changes sign at ori/ter) — most
 * meaningful for genomes with a single circular replicon; treat it as a
 * starting hypothesis, not a definitive call, for more complex genomes. */
export function useSkewAnalysis(store: AnalysisStore) {
  const cumulativeGcSkew = computed(() => cumulativeSum(store.data?.gc_skew))
  const cumulativeAtSkew = computed(() => cumulativeSum(store.data?.at_skew))

  const oriTerCandidates = computed<OriTerCandidates | null>(() => {
    const cum = cumulativeGcSkew.value
    const d = store.data
    if (!d || cum.length === 0) return null

    let minIdx = 0
    let maxIdx = 0
    for (let i = 1; i < cum.length; i++) {
      if (cum[i] < cum[minIdx]) minIdx = i
      if (cum[i] > cum[maxIdx]) maxIdx = i
    }

    const toCandidate = (index: number): OriTerCandidate => ({
      index,
      bp: d.start[index],
      cumulativeSkew: cum[index],
    })

    // Convention: leading-strand GC-skew is typically positive after origin,
    // negative after terminus in bacteria, so the cumulative curve troughs
    // near the origin and peaks near the terminus.
    return { origin: toCandidate(minIdx), terminus: toCandidate(maxIdx) }
  })

  return { cumulativeGcSkew, cumulativeAtSkew, oriTerCandidates }
}

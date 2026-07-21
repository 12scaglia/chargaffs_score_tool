import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAnalysisStore } from '@/stores/analysis'
import type { AnalyzeResponse } from '@/types/analysis'

function makeResponse(scores: number[]): AnalyzeResponse {
  const n = scores.length
  return {
    filename: 'sample.fasta',
    window_size: 100,
    step_size: 100,
    records: [
      {
        sequence_info: { sequence_id: 'seq1', description: '', total_length: n * 100 },
        statistics: { mean: 0, median: 0, min: 0, max: 0, std_dev: 0, total_windows: n },
        data: {
          start: scores.map((_, i) => i * 100),
          end: scores.map((_, i) => (i + 1) * 100),
          A: scores.map(() => 25),
          T: scores.map(() => 25),
          G: scores.map(() => 25),
          C: scores.map(() => 25),
          score: scores,
          gc_skew: scores.map(() => 0),
          at_skew: scores.map(() => 0),
        },
      },
    ],
  }
}

describe('useAnalysisStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applyResponse resets selection/significance state left over from a previous run', () => {
    const store = useAnalysisStore()
    store.selectSegment(3)
    store.setTopFilter('top10-best')
    store.significance = {
      observed_mean_score: 1,
      permuted_mean: 1,
      permuted_std: 0,
      z_score: 0,
      p_value: 1,
      n_permutations: 100,
      is_significant: false,
    }

    store.applyResponse(makeResponse([1, 2, 3]))

    expect(store.selectedIndex).toBeNull()
    expect(store.activeTopFilter).toBeNull()
    expect(store.significance).toBeNull()
    expect(store.filename).toBe('sample.fasta')
    expect(store.records).toHaveLength(1)
  })

  it('setActiveRecord also resets significance (a p-value from another record would be stale)', () => {
    const store = useAnalysisStore()
    store.applyResponse({
      ...makeResponse([1]),
      records: [...makeResponse([1]).records, ...makeResponse([2]).records],
    })
    store.significance = {
      observed_mean_score: 1,
      permuted_mean: 1,
      permuted_std: 0,
      z_score: 0,
      p_value: 1,
      n_permutations: 100,
      is_significant: false,
    }

    store.setActiveRecord(1)

    expect(store.activeRecordIndex).toBe(1)
    expect(store.significance).toBeNull()
  })

  it('topIndices sorts descending for a "best" filter and ascending for a "worst" filter', () => {
    const store = useAnalysisStore()
    store.applyResponse(makeResponse([0.5, -0.2, 0.9, -0.8, 0.1]))

    expect(store.topIndices('top10-best')).toEqual([2, 0, 4, 1, 3])
    expect(store.topIndices('top10-worst')).toEqual([3, 1, 4, 0, 2])
  })

  it('setFile marks the origin as upload and clears any pending session-restore prompt', () => {
    const store = useAnalysisStore()
    store.pendingRestoreFilename = 'old.fasta'

    store.setFile(new File(['>x\nATGC'], 'new.fasta'))

    expect(store.lastOrigin).toBe('upload')
    expect(store.pendingRestoreFilename).toBeNull()
  })
})

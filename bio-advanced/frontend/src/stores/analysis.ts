import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { analyzeFasta, extractApiErrorMessage } from '@/services/api'
import i18n from '@/i18n'
import type { AnalyzeResponse, SegmentRow, SequenceResult, Statistics, TopSegmentsFilter, WindowData } from '@/types/analysis'

/** Factory so the same store shape can be instantiated twice: the primary
 * analysis slot and an independent comparison slot (see useComparisonStore),
 * without duplicating this ~150 lines. */
function createAnalysisStore(id: string) {
  return defineStore(id, () => {
    // --- State -----------------------------------------------------------
    const selectedFile = ref<File | null>(null)
    const windowSize = ref<number>(1000)
    /** null = no overlap (step == windowSize); set to enable sliding windows. */
    const stepSize = ref<number | null>(null)

    const filename = ref<string | null>(null)
    // shallowRef: replaced wholesale per analysis run, large parallel arrays
    // inside are never mutated in place, so deep reactivity would be pure overhead.
    const records = shallowRef<SequenceResult[]>([])
    const activeRecordIndex = ref(0)

    const isLoading = ref(false)
    const uploadProgress = ref(0)
    const error = ref<string | null>(null)

    const selectedIndex = ref<number | null>(null)
    const activeTopFilter = ref<TopSegmentsFilter | null>(null)

    // --- Getters -----------------------------------------------------------
    const activeRecord = computed<SequenceResult | null>(() => records.value[activeRecordIndex.value] ?? null)
    const data = computed<WindowData | null>(() => activeRecord.value?.data ?? null)
    const statistics = computed<Statistics | null>(() => activeRecord.value?.statistics ?? null)
    const sequenceInfo = computed(() => {
      const rec = activeRecord.value
      if (!rec || filename.value === null) return null
      return {
        filename: filename.value,
        sequence_id: rec.sequence_info.sequence_id,
        total_length: rec.sequence_info.total_length,
      }
    })

    const hasResults = computed(() => records.value.length > 0)
    const totalWindows = computed(() => data.value?.score.length ?? 0)

    function getSegment(index: number): SegmentRow | null {
      const d = data.value
      if (!d || index < 0 || index >= d.score.length) return null
      const a = d.A[index]
      const t = d.T[index]
      const g = d.G[index]
      const c = d.C[index]
      const n = a + t + g + c
      return {
        index,
        start: d.start[index],
        end: d.end[index],
        A: a,
        T: t,
        G: g,
        C: c,
        gcPercent: n > 0 ? ((g + c) / n) * 100 : 0,
        score: d.score[index],
        gcSkew: d.gc_skew[index],
        atSkew: d.at_skew[index],
      }
    }

    /** Sorted window indices for a "top N best/worst" filter. Returns
     * indices only (not denormalized rows) to stay cheap even with
     * millions of windows. */
    function topIndices(filter: TopSegmentsFilter): number[] {
      const d = data.value
      if (!d) return []
      const n = d.score.length
      const indices = Array.from({ length: n }, (_, i) => i)
      const worst = filter.endsWith('worst')
      indices.sort((i, j) => (worst ? d.score[i] - d.score[j] : d.score[j] - d.score[i]))
      const count = filter.startsWith('top10') ? 10 : 50
      return indices.slice(0, count)
    }

    const selectedSegment = computed(() => (selectedIndex.value === null ? null : getSegment(selectedIndex.value)))

    // --- Actions -----------------------------------------------------------
    function setFile(file: File | null) {
      selectedFile.value = file
      error.value = null
    }

    function setWindowSize(size: number) {
      windowSize.value = size
    }

    function setStepSize(size: number | null) {
      stepSize.value = size
    }

    function selectSegment(index: number | null) {
      selectedIndex.value = index
    }

    function setTopFilter(filter: TopSegmentsFilter | null) {
      activeTopFilter.value = filter
    }

    function setActiveRecord(index: number) {
      if (index < 0 || index >= records.value.length) return
      activeRecordIndex.value = index
      selectedIndex.value = null
      activeTopFilter.value = null
    }

    function applyResponse(response: AnalyzeResponse) {
      filename.value = response.filename
      records.value = response.records
      activeRecordIndex.value = 0
      selectedIndex.value = null
      activeTopFilter.value = null
    }

    async function runAnalysis() {
      if (!selectedFile.value) {
        error.value = i18n.global.t('sidebar.selectFileFirst')
        return
      }
      isLoading.value = true
      uploadProgress.value = 0
      error.value = null
      try {
        const effectiveStep = stepSize.value ?? windowSize.value
        const response = await analyzeFasta(selectedFile.value, windowSize.value, effectiveStep, (percent) => {
          uploadProgress.value = percent
        })
        applyResponse(response)
      } catch (err) {
        error.value = extractApiErrorMessage(err)
      } finally {
        isLoading.value = false
      }
    }

    function reset() {
      selectedFile.value = null
      filename.value = null
      records.value = []
      activeRecordIndex.value = 0
      selectedIndex.value = null
      activeTopFilter.value = null
      error.value = null
      uploadProgress.value = 0
    }

    return {
      selectedFile,
      windowSize,
      stepSize,
      filename,
      records,
      activeRecordIndex,
      sequenceInfo,
      statistics,
      data,
      isLoading,
      uploadProgress,
      error,
      selectedIndex,
      activeTopFilter,
      hasResults,
      totalWindows,
      selectedSegment,
      getSegment,
      topIndices,
      setFile,
      setWindowSize,
      setStepSize,
      selectSegment,
      setTopFilter,
      setActiveRecord,
      runAnalysis,
      reset,
    }
  })
}

export const useAnalysisStore = createAnalysisStore('analysis')
export const useComparisonStore = createAnalysisStore('comparison')

export type AnalysisStore = ReturnType<typeof useAnalysisStore>

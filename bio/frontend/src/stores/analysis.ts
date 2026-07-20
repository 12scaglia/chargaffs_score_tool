import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { analyzeFasta, extractApiErrorMessage } from '@/services/api'
import i18n from '@/i18n'
import type { AnalyzeResponse, SegmentRow, SequenceInfo, Statistics, TopSegmentsFilter, WindowData } from '@/types/analysis'

export const useAnalysisStore = defineStore('analysis', () => {
  // --- State -----------------------------------------------------------
  const selectedFile = ref<File | null>(null)
  const windowSize = ref<number>(1000)

  const sequenceInfo = ref<SequenceInfo | null>(null)
  const statistics = ref<Statistics | null>(null)
  // shallowRef: the parallel arrays inside are large and replaced wholesale,
  // never mutated in place, so deep reactivity would be pure overhead.
  const data = shallowRef<WindowData | null>(null)

  const isLoading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<string | null>(null)

  const selectedIndex = ref<number | null>(null)
  const activeTopFilter = ref<TopSegmentsFilter | null>(null)

  // --- Getters -----------------------------------------------------------
  const hasResults = computed(() => data.value !== null)
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

  function selectSegment(index: number | null) {
    selectedIndex.value = index
  }

  function setTopFilter(filter: TopSegmentsFilter | null) {
    activeTopFilter.value = filter
  }

  function applyResponse(response: AnalyzeResponse) {
    sequenceInfo.value = response.sequence_info
    statistics.value = response.statistics
    data.value = response.data
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
      const response = await analyzeFasta(selectedFile.value, windowSize.value, (percent) => {
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
    sequenceInfo.value = null
    statistics.value = null
    data.value = null
    selectedIndex.value = null
    activeTopFilter.value = null
    error.value = null
    uploadProgress.value = 0
  }

  return {
    selectedFile,
    windowSize,
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
    selectSegment,
    setTopFilter,
    runAnalysis,
    reset,
  }
})

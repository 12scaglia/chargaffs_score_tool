import { ref } from 'vue'

export interface RegionFocusRequest {
  startIndex: number
  endIndex: number
  nonce: number
}

/** Shared across annotation panels and ScoreLineChart (module-scope
 * singleton, same pattern as theme/i18n): requests the synced chart group
 * to zoom/pan onto a given window-index range. */
export const regionFocusRequest = ref<RegionFocusRequest | null>(null)

let counter = 0
export function requestRegionFocus(startIndex: number, endIndex: number) {
  counter += 1
  regionFocusRequest.value = { startIndex, endIndex, nonce: counter }
}

/** Percent-based dataZoom range [start,end] (0-100) for a category axis of
 * `total` equally-spaced points, bracketing [startIndex,endIndex] with a
 * small margin so the region isn't flush against the viewport edges. */
export function regionToZoomPercent(startIndex: number, endIndex: number, total: number): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 100 }
  const span = endIndex - startIndex + 1
  const pad = Math.max(1, Math.round(span * 0.15))
  const from = Math.max(0, startIndex - pad)
  const to = Math.min(total - 1, endIndex + pad)
  return { start: (from / total) * 100, end: ((to + 1) / total) * 100 }
}

import type { WindowData } from '@/types/analysis'

const CSV_HEADER = ['Rank', 'Start', 'End', 'A', 'T', 'G', 'C', 'GC%', 'Score']

function gcPercent(g: number, c: number, n: number): number {
  return n > 0 ? ((g + c) / n) * 100 : 0
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Export a window dataset as CSV/JSON. When `indices` is omitted, every
 * window in `data` is exported in order; otherwise only the given indices
 * (e.g. a Top-N filter selection), in the given order. Built with array
 * joins rather than string concatenation to stay linear even for large
 * exports. */
export function useExport() {
  function toRows(data: WindowData, indices?: number[]): string[][] {
    const order = indices ?? Array.from({ length: data.score.length }, (_, i) => i)
    return order.map((i, rank) => {
      const n = data.A[i] + data.T[i] + data.G[i] + data.C[i]
      return [
        String(rank + 1),
        String(data.start[i]),
        String(data.end[i]),
        String(data.A[i]),
        String(data.T[i]),
        String(data.G[i]),
        String(data.C[i]),
        gcPercent(data.G[i], data.C[i], n).toFixed(2),
        data.score[i].toFixed(6),
      ]
    })
  }

  function exportCsv(data: WindowData, filename = 'chargaff_results.csv', indices?: number[]) {
    const rows = toRows(data, indices)
    const lines = [CSV_HEADER.join(','), ...rows.map((row) => row.join(','))]
    downloadBlob(lines.join('\n'), filename, 'text/csv;charset=utf-8')
  }

  function exportJson(data: WindowData, filename = 'chargaff_results.json', indices?: number[]) {
    const order = indices ?? Array.from({ length: data.score.length }, (_, i) => i)
    const rows = order.map((i, rank) => ({
      rank: rank + 1,
      start: data.start[i],
      end: data.end[i],
      A: data.A[i],
      T: data.T[i],
      G: data.G[i],
      C: data.C[i],
      gcPercent: Number(gcPercent(data.G[i], data.C[i], data.A[i] + data.T[i] + data.G[i] + data.C[i]).toFixed(2)),
      score: data.score[i],
    }))
    downloadBlob(JSON.stringify(rows, null, 2), filename, 'application/json')
  }

  return { exportCsv, exportJson }
}

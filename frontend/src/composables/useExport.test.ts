import { describe, expect, it, vi } from 'vitest'
import { useExport } from '@/composables/useExport'
import type { WindowData } from '@/types/analysis'

const downloadBlob = vi.fn()
vi.mock('@/utils/download', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}))

const data: WindowData = {
  start: [0, 100],
  end: [100, 200],
  A: [30, 10],
  T: [20, 10],
  G: [25, 10],
  C: [25, 20],
  score: [0.123456, -0.654321],
  gc_skew: [0.01, -0.02],
  at_skew: [0.03, -0.04],
}

describe('useExport', () => {
  it('exportCsv builds one header row plus one row per window, in order', () => {
    const { exportCsv } = useExport()
    exportCsv(data, 'out.csv')

    expect(downloadBlob).toHaveBeenCalledOnce()
    const [content, filename, mimeType] = downloadBlob.mock.calls[0]
    const lines = (content as string).split('\n')

    expect(filename).toBe('out.csv')
    expect(mimeType).toBe('text/csv;charset=utf-8')
    expect(lines).toHaveLength(3) // header + 2 windows
    expect(lines[0]).toBe('Rank,Start,End,A,T,G,C,GC%,Score')
    expect(lines[1]).toBe('1,0,100,30,20,25,25,50.00,0.123456')
    expect(lines[2]).toBe('2,100,200,10,10,10,20,60.00,-0.654321')
  })

  it('exportCsv honors a custom index order/subset (e.g. a Top-N selection)', () => {
    const { exportCsv } = useExport()
    exportCsv(data, 'top.csv', [1, 0])

    const [content] = downloadBlob.mock.calls.at(-1)!
    const lines = (content as string).split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('1,100,200,10,10,10,20,60.00,-0.654321') // rank 1 = original index 1
    expect(lines[2]).toBe('2,0,100,30,20,25,25,50.00,0.123456') // rank 2 = original index 0
  })

  it('exportJson mirrors the same rows as structured objects', () => {
    const { exportJson } = useExport()
    exportJson(data, 'out.json')

    const [content, filename, mimeType] = downloadBlob.mock.calls.at(-1)!
    const rows = JSON.parse(content as string)

    expect(filename).toBe('out.json')
    expect(mimeType).toBe('application/json')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ rank: 1, start: 0, end: 100, score: 0.123456 })
  })
})

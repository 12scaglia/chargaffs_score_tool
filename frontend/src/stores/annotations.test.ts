import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAnnotationsStore } from '@/stores/annotations'

describe('useAnnotationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addManual mints a fresh id each time and appends to regions', () => {
    const store = useAnnotationsStore()
    store.addManual('RegionA', 100, 400, 'centromere')
    store.addManual('RegionB', 1000, 2000, 'gene')

    expect(store.regions).toHaveLength(2)
    expect(store.regions[0].id).not.toBe(store.regions[1].id)
    expect(store.regions[0].source).toBe('manual')
    expect(store.regions[1]).toMatchObject({ name: 'RegionB', start: 1000, end: 2000, category: 'gene' })
  })

  it('restore preserves the given id/source instead of minting a new one', () => {
    const store = useAnnotationsStore()
    store.restore({ id: 'from-session-1', name: 'ori', start: 1, end: 1000, category: 'centromere', source: 'manual' })

    expect(store.regions).toHaveLength(1)
    expect(store.regions[0].id).toBe('from-session-1')
  })

  it('remove filters out only the matching id', () => {
    const store = useAnnotationsStore()
    store.addManual('A', 1, 10, 'gene')
    store.addManual('B', 20, 30, 'gene')
    const idToRemove = store.regions[0].id

    store.remove(idToRemove)

    expect(store.regions).toHaveLength(1)
    expect(store.regions[0].name).toBe('B')
  })

  it('update merges the given fields onto the matching region only', () => {
    const store = useAnnotationsStore()
    store.addManual('A', 1, 10, 'gene')
    store.addManual('B', 20, 30, 'gene')
    const [first, second] = store.regions

    store.update(first.id, { name: 'A-renamed', start: 1, end: 15, category: 'centromere' })

    expect(store.regions[0]).toMatchObject({ name: 'A-renamed', end: 15, category: 'centromere' })
    expect(store.regions[1]).toMatchObject({ name: second.name, end: second.end })
  })

  it('clear empties regions and resets error', () => {
    const store = useAnnotationsStore()
    store.addManual('A', 1, 10, 'gene')
    store.error = 'some previous error'

    store.clear()

    expect(store.regions).toHaveLength(0)
    expect(store.error).toBeNull()
  })
})

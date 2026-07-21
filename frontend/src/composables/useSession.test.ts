import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import i18n from '@/i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useAnnotationsStore } from '@/stores/annotations'
import { useSession } from '@/composables/useSession'

/** useSession() calls useI18n(), which only works inside an active Vue
 * component setup() — mount a throwaway host component that just captures
 * the composable's return value, then assert against that. Composables that
 * only need Pinia (useAnalysisStore/useAnnotationsStore) don't need this;
 * only the useI18n() dependency does. */
function mountSession() {
  let api!: ReturnType<typeof useSession>
  const Host = defineComponent({
    setup() {
      api = useSession()
      return () => h('div')
    },
  })
  mount(Host, { global: { plugins: [i18n] } })
  return api
}

describe('useSession', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('buildSessionFile returns null when nothing has been analyzed yet', () => {
    const { buildSessionFile } = mountSession()
    expect(buildSessionFile()).toBeNull()
  })

  it('buildSessionFile captures window/step size, top filter and annotations for an upload-based run', () => {
    const analysis = useAnalysisStore()
    const annotations = useAnnotationsStore()
    analysis.filename = 'genome.fasta'
    analysis.lastOrigin = 'upload'
    analysis.setWindowSize(500)
    analysis.setStepSize(250)
    analysis.setTopFilter('top50-worst')
    annotations.addManual('ori', 1, 1000, 'centromere')

    const { buildSessionFile } = mountSession()
    const session = buildSessionFile()

    expect(session?.source).toEqual({ kind: 'upload', filename: 'genome.fasta' })
    expect(session?.windowSize).toBe(500)
    expect(session?.stepSize).toBe(250)
    expect(session?.activeTopFilter).toBe('top50-worst')
    expect(session?.annotations).toHaveLength(1)
  })

  it('buildSessionFile captures the fetch source (including wholeSequence) for an accession-based run', () => {
    const analysis = useAnalysisStore()
    analysis.filename = 'NC_005816.1.fasta'
    analysis.lastOrigin = 'fetch'
    analysis.lastFetchSource = { source: 'ncbi', accession: 'NC_005816.1', wholeSequence: true }

    const { buildSessionFile } = mountSession()
    const session = buildSessionFile()

    expect(session?.source).toEqual({
      kind: 'fetch',
      source: 'ncbi',
      accession: 'NC_005816.1',
      wholeSequence: true,
    })
  })
})

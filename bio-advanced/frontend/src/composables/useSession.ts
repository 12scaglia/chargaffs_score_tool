import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useAnnotationsStore } from '@/stores/annotations'
import { downloadBlob } from '@/utils/download'
import type { SessionFile } from '@/types/analysis'

const SESSION_VERSION = 1

/** Local session snapshot (export/import as a .json file). See SessionFile
 * for why WindowData is never embedded and why "load" branches on how the
 * original analysis was produced (upload vs fetch-by-accession) — a
 * browser can't restore a File handle from JSON, so an upload-based
 * session can only prompt the user to re-select the file. */
export function useSession() {
  const store = useAnalysisStore()
  const annotationsStore = useAnnotationsStore()
  const { t } = useI18n()

  function buildSessionFile(): SessionFile | null {
    const source =
      store.lastOrigin === 'fetch' && store.lastFetchSource
        ? { kind: 'fetch' as const, ...store.lastFetchSource }
        : store.filename
          ? { kind: 'upload' as const, filename: store.filename }
          : null
    if (!source) return null

    return {
      version: SESSION_VERSION,
      savedAt: new Date().toISOString(),
      windowSize: store.windowSize,
      stepSize: store.stepSize,
      activeTopFilter: store.activeTopFilter,
      annotations: annotationsStore.regions,
      source,
    }
  }

  function downloadSession(filename = 'chargaff_session.json') {
    const session = buildSessionFile()
    if (!session) return
    downloadBlob(JSON.stringify(session, null, 2), filename, 'application/json')
  }

  async function loadSessionFile(file: File) {
    let session: SessionFile
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (parsed.version !== SESSION_VERSION) throw new Error('unsupported version')
      session = parsed as SessionFile
    } catch {
      store.error = t('session.loadError')
      return
    }

    store.setWindowSize(session.windowSize)
    store.setStepSize(session.stepSize)
    store.setTopFilter(session.activeTopFilter)
    annotationsStore.clear()
    for (const annotation of session.annotations) annotationsStore.restore(annotation)

    if (session.source.kind === 'fetch') {
      await store.runFetch(session.source.source, session.source.accession, session.source.species)
    } else {
      store.pendingRestoreFilename = session.source.filename
    }
  }

  return { buildSessionFile, downloadSession, loadSessionFile }
}

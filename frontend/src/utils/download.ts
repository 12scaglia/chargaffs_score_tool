/** Triggers a browser download of in-memory string content. */
export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Triggers a browser download from a data URI (e.g. ECharts' getDataURL()
 * output) — no Blob needed, the URI already carries the encoded content. */
export function downloadDataUri(dataUri: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUri
  link.download = filename
  link.click()
}

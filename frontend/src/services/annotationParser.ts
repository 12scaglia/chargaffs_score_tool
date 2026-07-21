import type { Annotation, AnnotationCategory } from '@/types/analysis'

let counter = 0
function nextId(): string {
  counter += 1
  return `ann-${Date.now()}-${counter}`
}

/** Safety net for whole-genome annotation files (a comprehensive GTF can have
 * millions of lines): caps how many regions a single upload can add, so
 * parsing stays fast and the region list/table/chart overlay stay
 * renderable. Parsing stops as soon as the cap is reached. */
export const MAX_REGIONS_PER_FILE = 2000

function guessCategory(label: string): AnnotationCategory {
  const l = label.toLowerCase()
  if (l.includes('centromer')) return 'centromere'
  if (l.includes('telomer')) return 'telomere'
  if (l.includes('gene') || l.includes('cds') || l.includes('exon') || l.includes('mrna')) return 'gene'
  return 'custom'
}

/** Categoria per una riga GFF3/GTF: per le feature di tipo "gene" usa il biotype
 * (gene_type/gene_biotype, es. "protein_coding"/"lncRNA") quando presente — più
 * informativo del generico "gene". Per le altre feature (exon, CDS, transcript,
 * UTR, ecc.) usa direttamente il tipo così com'è nel file: le categorie disponibili
 * nel filtro riflettono quello che il file contiene, invece di un elenco fisso. */
function categoryFromGffLine(type: string, attrs: string): AnnotationCategory {
  const lowerType = type.toLowerCase()
  if (lowerType.includes('centromer')) return 'centromere'
  if (lowerType.includes('telomer')) return 'telomere'
  if (lowerType === 'gene') {
    const biotypeMatch = attrs.match(/gene_type[= ]"?([^;"]+)"?/i) || attrs.match(/gene_biotype[= ]"?([^;"]+)"?/i)
    return biotypeMatch?.[1]?.trim().toLowerCase() || 'gene'
  }
  return lowerType || 'custom'
}

/** BED: coordinate 0-based, end esclusivo -> convertite in 1-based inclusive
 * per essere confrontabili con WindowData.start/end. */
export function parseBed(text: string): Annotation[] {
  const regions: Annotation[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    if (regions.length >= MAX_REGIONS_PER_FILE) break
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('track') || line.startsWith('browser')) continue
    const cols = line.split('\t')
    if (cols.length < 3) continue
    const startBed = Number(cols[1])
    const endBed = Number(cols[2])
    if (!Number.isFinite(startBed) || !Number.isFinite(endBed)) continue
    const label = cols[3]?.trim() ?? ''
    regions.push({
      id: nextId(),
      name: label || `regione-${regions.length + 1}`,
      start: startBed + 1,
      end: endBed,
      category: guessCategory(label),
      source: 'file',
    })
  }
  return regions
}

/** GFF3/GTF: coordinate già 1-based inclusive, nessuna conversione necessaria.
 * Ogni riga con un tipo di feature valido viene importata (nessun filtro fisso su
 * gene/centromero/telomero): la categoria è dedotta dinamicamente dal contenuto
 * della riga stessa (vedi categoryFromGffLine), così un file con solo righe "exon"
 * o con geni di biotype diversi (lncRNA, protein_coding, ...) espone quelle stesse
 * categorie nel filtro invece di un elenco fisso. MAX_REGIONS_PER_FILE resta il
 * limite di sicurezza per i GTF completi con milioni di righe. */
export function parseGff(text: string): Annotation[] {
  const regions: Annotation[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    if (regions.length >= MAX_REGIONS_PER_FILE) break
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const cols = line.split('\t')
    if (cols.length < 5) continue
    const type = (cols[2] || '').trim()
    if (!type) continue
    const start = Number(cols[3])
    const end = Number(cols[4])
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    const attrs = cols[8] ?? ''
    // Try gene_name (GTF) first, then Name= (GFF3), then ID= as last resort.
    // \b before Name/ID keeps this from matching "id"/"name" inside a
    // different key like "gene_id" or "transcript_name".
    const nameMatch =
      attrs.match(/gene_name[= ]"?([^;"]+)"?/i) ||
      attrs.match(/\bName[= ]"?([^;"]+)"?/i) ||
      attrs.match(/\bID[= ]"?([^;"]+)"?/i)
    const label = nameMatch?.[1]?.trim() ?? type
    regions.push({
      id: nextId(),
      name: label,
      start,
      end,
      category: categoryFromGffLine(type, attrs),
      source: 'file',
    })
  }
  return regions
}

function splitTxtLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((s) => s.trim()).filter(Boolean)
  if (line.includes(',')) return line.split(',').map((s) => s.trim()).filter(Boolean)
  return line.split(/\s+/).filter(Boolean)
}

/** Elenco libero di geni con posizione, una riga per gene:
 * `nome  start  [end]  [categoria]` (tab, virgola o spazi come separatore).
 * Se `end` è assente la regione è puntiforme (start == end). La categoria è
 * il token così com'è (qualunque valore, non solo quelle di base — stessa
 * logica dinamica del parser GFF/GTF); se assente si assume `gene`. Questo
 * è il formato pensato apposta per liste semplici di geni da confrontare
 * con lo score di Chargaff. */
export function parseTxt(text: string): Annotation[] {
  const regions: Annotation[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    if (regions.length >= MAX_REGIONS_PER_FILE) break
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const cols = splitTxtLine(line)
    if (cols.length < 2) continue

    const name = cols[0]
    const second = Number(cols[1])
    const third = cols[2] !== undefined ? Number(cols[2]) : NaN

    let start: number
    let end: number
    let categoryToken: string | undefined
    if (Number.isFinite(second) && Number.isFinite(third)) {
      start = second
      end = third
      categoryToken = cols[3]
    } else if (Number.isFinite(second)) {
      start = second
      end = second
      categoryToken = cols[2]
    } else {
      continue
    }

    if (!(start > 0) || !(end > 0)) continue
    if (end < start) [start, end] = [end, start]

    const normalizedToken = categoryToken?.trim().toLowerCase()
    const category: AnnotationCategory = normalizedToken || 'gene'

    regions.push({ id: nextId(), name, start, end, category, source: 'file' })
  }
  return regions
}

export function parseAnnotationFile(filename: string, text: string): Annotation[] {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.gff') || lower.endsWith('.gff3') || lower.endsWith('.gtf')) return parseGff(text)
  if (lower.endsWith('.txt')) return parseTxt(text)
  return parseBed(text)
}

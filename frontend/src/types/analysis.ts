export interface SequenceInfo {
  sequence_id: string
  description: string
  total_length: number
}

export interface Statistics {
  mean: number
  median: number
  min: number
  max: number
  std_dev: number
  total_windows: number
}

/** Structure-of-Arrays: parallel arrays, one entry per window/segment. */
export interface WindowData {
  start: number[]
  end: number[]
  A: number[]
  T: number[]
  G: number[]
  C: number[]
  score: number[]
  gc_skew: number[]
  at_skew: number[]
}

/** One FASTA record (chromosome/contig) worth of analysis results. */
export interface SequenceResult {
  sequence_info: SequenceInfo
  statistics: Statistics
  data: WindowData
}

export interface AnalyzeResponse {
  filename: string
  window_size: number
  step_size: number
  records: SequenceResult[]
}

export const WINDOW_SIZE_PRESETS = [50, 100, 200, 500, 1000, 5000, 10000, 25000] as const

export type FetchSource = 'ncbi' | 'ensembl'

export interface FetchRequest {
  source: FetchSource
  accessions: string[]
  species?: string
  window_size: number
  step_size?: number | null
  whole_sequence?: boolean
}

export interface SignificanceRequest {
  source: FetchSource
  accessions: string[]
  species?: string
  window_size: number
  step_size?: number | null
  n_permutations: number
  record_index: number
}

export interface SignificanceResponse {
  observed_mean_score: number
  permuted_mean: number
  permuted_std: number
  z_score: number
  p_value: number
  n_permutations: number
  is_significant: boolean
}

/** Region of biological interest (centromero, telomero, gene, ecc.) da sovrapporre ai grafici.
 * Non è un enum chiuso: i file GFF/GTF possono portare qualunque valore (tipo di
 * feature come "exon"/"CDS", oppure biotype come "lncRNA"/"protein_coding") e queste
 * categorie vengono scoperte dinamicamente dal contenuto del file, non da una lista fissa. */
export type AnnotationCategory = string

/** Categorie di base offerte nel form di inserimento manuale (dove non c'è un file
 * da cui dedurre la categoria). Le categorie scoperte dai file possono essere altre. */
export const BASE_ANNOTATION_CATEGORIES = ['centromere', 'telomere', 'gene', 'custom'] as const
export type BaseAnnotationCategory = (typeof BASE_ANNOTATION_CATEGORIES)[number]

/** @deprecated usa BASE_ANNOTATION_CATEGORIES — mantenuto per compatibilità con il form manuale. */
export const ANNOTATION_CATEGORIES: readonly string[] = BASE_ANNOTATION_CATEGORIES

export interface Annotation {
  id: string
  name: string
  /** Coordinate 1-based inclusive, coerenti con WindowData.start/end. */
  start: number
  end: number
  category: AnnotationCategory
  source: 'file' | 'manual'
}

export const ANNOTATION_COLORS: Record<BaseAnnotationCategory, string> = {
  centromere: '#7c3aed',
  telomere: '#0ea5e9',
  gene: '#f97316',
  custom: '#64748b',
}

export function isBaseCategory(category: string): category is BaseAnnotationCategory {
  return (BASE_ANNOTATION_CATEGORIES as readonly string[]).includes(category)
}

/** Palette per le categorie scoperte dinamicamente dai file (non presenti in ANNOTATION_COLORS).
 * Assegnazione stabile per sessione: la prima categoria dinamica incontrata prende il primo
 * colore libero, così due categorie diverse restano visivamente distinguibili tra loro. */
const DYNAMIC_PALETTE = ['#f43f5e', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16', '#f59e0b', '#14b8a6', '#a855f7']
const dynamicColorCache = new Map<string, string>()

export function getCategoryColor(category: AnnotationCategory): string {
  if (isBaseCategory(category)) return ANNOTATION_COLORS[category]
  let color = dynamicColorCache.get(category)
  if (!color) {
    color = DYNAMIC_PALETTE[dynamicColorCache.size % DYNAMIC_PALETTE.length]
    dynamicColorCache.set(category, color)
  }
  return color
}

/** Etichetta leggibile per una categoria: tradotta per quelle di base, altrimenti
 * formattata a partire dal valore grezzo trovato nel file (es. "protein_coding" -> "Protein coding"). */
export function formatCategoryLabel(category: AnnotationCategory): string {
  return category
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export type TopSegmentsFilter = 'top10-best' | 'top10-worst' | 'top50-best' | 'top50-worst'

/** Local session snapshot (export/import as a .json file, no server storage).
 * Never embeds WindowData (large, regenerable) — "load" either re-fetches
 * (accession-based sessions) or prompts the user to re-select the original
 * file (upload-based sessions, since browsers can't restore a File handle
 * from JSON for security reasons). */
export interface SessionFile {
  version: 1
  savedAt: string
  windowSize: number
  stepSize: number | null
  activeTopFilter: TopSegmentsFilter | null
  annotations: Annotation[]
  source:
    | { kind: 'upload'; filename: string }
    | { kind: 'fetch'; source: FetchSource; accessions: string[]; species?: string; wholeSequence?: boolean }
}

/** A single denormalized segment row, derived from WindowData for table/detail display. */
export interface SegmentRow {
  index: number
  start: number
  end: number
  A: number
  T: number
  G: number
  C: number
  gcPercent: number
  score: number
  gcSkew: number
  atSkew: number
}

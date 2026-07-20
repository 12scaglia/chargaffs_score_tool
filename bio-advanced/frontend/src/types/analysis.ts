export interface SequenceInfo {
  sequence_id: string
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

/** Region of biological interest (centromero, telomero, gene, ecc.) da sovrapporre ai grafici. */
export type AnnotationCategory = 'centromere' | 'telomere' | 'gene' | 'custom'

export interface Annotation {
  id: string
  name: string
  /** Coordinate 1-based inclusive, coerenti con WindowData.start/end. */
  start: number
  end: number
  category: AnnotationCategory
  source: 'file' | 'manual'
}

export const ANNOTATION_CATEGORIES: AnnotationCategory[] = ['centromere', 'telomere', 'gene', 'custom']

export const ANNOTATION_COLORS: Record<AnnotationCategory, string> = {
  centromere: '#7c3aed',
  telomere: '#0ea5e9',
  gene: '#f97316',
  custom: '#64748b',
}

export type TopSegmentsFilter = 'top10-best' | 'top10-worst' | 'top50-best' | 'top50-worst'

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

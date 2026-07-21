import { describe, expect, it } from 'vitest'
import { formatCategoryLabel, getCategoryColor, isBaseCategory } from '@/types/analysis'

describe('isBaseCategory', () => {
  it('recognizes the 4 base categories and rejects anything else', () => {
    expect(isBaseCategory('centromere')).toBe(true)
    expect(isBaseCategory('telomere')).toBe(true)
    expect(isBaseCategory('gene')).toBe(true)
    expect(isBaseCategory('custom')).toBe(true)
    expect(isBaseCategory('lncrna')).toBe(false)
    expect(isBaseCategory('exon')).toBe(false)
  })
})

describe('formatCategoryLabel', () => {
  it('title-cases raw category values from files, replacing separators with spaces', () => {
    expect(formatCategoryLabel('protein_coding')).toBe('Protein Coding')
    expect(formatCategoryLabel('exon')).toBe('Exon')
    expect(formatCategoryLabel('lncrna')).toBe('Lncrna')
    expect(formatCategoryLabel('long-non-coding')).toBe('Long Non Coding')
  })
})

describe('getCategoryColor', () => {
  it('returns the same color every time for a repeated dynamic category, and a different one for a new category', () => {
    const first = getCategoryColor('mirna_test_a')
    const again = getCategoryColor('mirna_test_a')
    const other = getCategoryColor('pseudogene_test_b')

    expect(again).toBe(first)
    expect(other).not.toBe(first)
  })

  it('uses the fixed palette color for base categories, not the dynamic one', () => {
    expect(getCategoryColor('gene')).toBe('#f97316')
    expect(getCategoryColor('centromere')).toBe('#7c3aed')
  })
})

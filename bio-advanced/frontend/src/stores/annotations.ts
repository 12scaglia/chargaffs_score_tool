import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Annotation, AnnotationCategory } from '@/types/analysis'
import { MAX_REGIONS_PER_FILE, parseAnnotationFile } from '@/services/annotationParser'
import i18n from '@/i18n'

export const useAnnotationsStore = defineStore('annotations', () => {
  const regions = ref<Annotation[]>([])
  const error = ref<string | null>(null)

  async function loadFromFile(file: File) {
    error.value = null
    let text: string
    try {
      text = await file.text()
    } catch {
      error.value = i18n.global.t('annotations.errorFileRead')
      return
    }
    const parsed = parseAnnotationFile(file.name, text)
    if (parsed.length === 0) {
      error.value = i18n.global.t('annotations.errorFileEmpty')
      return
    }
    regions.value = [...regions.value, ...parsed]
    if (parsed.length >= MAX_REGIONS_PER_FILE) {
      error.value = i18n.global.t('annotations.truncated', { max: MAX_REGIONS_PER_FILE })
    }
  }

  function addManual(name: string, start: number, end: number, category: AnnotationCategory) {
    error.value = null
    regions.value = [
      ...regions.value,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        start,
        end,
        category,
        source: 'manual',
      },
    ]
  }

  function update(id: string, updates: { name: string; start: number; end: number; category: AnnotationCategory }) {
    error.value = null
    regions.value = regions.value.map((region) => (region.id === id ? { ...region, ...updates } : region))
  }

  function remove(id: string) {
    regions.value = regions.value.filter((r) => r.id !== id)
  }

  function clear() {
    regions.value = []
    error.value = null
  }

  return { regions, error, loadFromFile, addManual, update, remove, clear }
})

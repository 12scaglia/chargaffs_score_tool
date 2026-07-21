import axios from 'axios'
import i18n from '@/i18n'
import type { AnalyzeResponse, FetchRequest, SignificanceRequest, SignificanceResponse } from '@/types/analysis'

const apiClient = axios.create({
  baseURL: '/api',
})

export async function analyzeFasta(
  file: File,
  windowSize: number,
  stepSize: number,
  onUploadProgress?: (percent: number) => void,
): Promise<AnalyzeResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<AnalyzeResponse>('/analyze', formData, {
    params: { window_size: windowSize, step_size: stepSize },
    onUploadProgress: (event) => {
      if (!onUploadProgress || !event.total) return
      onUploadProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
  return response.data
}

export async function fetchByAccession(payload: FetchRequest): Promise<AnalyzeResponse> {
  const response = await apiClient.post<AnalyzeResponse>('/fetch', payload)
  return response.data
}

export async function computeSignificance(
  file: File,
  windowSize: number,
  stepSize: number,
  nPermutations: number,
  recordIndex: number,
): Promise<SignificanceResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<SignificanceResponse>('/significance', formData, {
    params: { window_size: windowSize, step_size: stepSize, n_permutations: nPermutations, record_index: recordIndex },
  })
  return response.data
}

export async function computeSignificanceByAccession(payload: SignificanceRequest): Promise<SignificanceResponse> {
  const response = await apiClient.post<SignificanceResponse>('/fetch/significance', payload)
  return response.data
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get<{ status: string }>('/health')
    return response.data.status === 'ok'
  } catch {
    return false
  }
}

export function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((item) => item.msg ?? JSON.stringify(item)).join(', ')
    }
    if (error.code === 'ERR_NETWORK') return i18n.global.t('errors.network')
    return error.message
  }
  return error instanceof Error ? error.message : i18n.global.t('errors.unknown')
}

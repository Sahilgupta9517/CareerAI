import { supabase } from '@/lib/supabase'

export type ResumeExtractResult = {
  filename: string
  fileSize: number
  pageCount: number
  characterCount: number
  text: string
}

const isExtractResult = (value: unknown): value is ResumeExtractResult => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.filename === 'string'
    && typeof candidate.fileSize === 'number'
    && typeof candidate.pageCount === 'number'
    && typeof candidate.characterCount === 'number'
    && typeof candidate.text === 'string'
}

const errorFromBody = (value: unknown, fallback: string) => {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') return value.error
  return fallback
}

const extractViaLocalService = async (file: File) => {
  const response = await fetch('/api/resume/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'X-Filename': encodeURIComponent(file.name),
    },
    body: file,
  })
  const payload: unknown = await response.json().catch(() => null)
  return { response, payload }
}

const extractViaSupabase = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file, file.name)
  const { data, error } = await supabase.functions.invoke('resume-extract', { body: formData })
  if (error) {
    const context = (error as { context?: Response }).context
    if (context) {
      const payload: unknown = await context.json().catch(() => null)
      throw new Error(errorFromBody(payload, error.message || 'The resume processing service could not complete this request.'))
    }
    throw new Error(error.message || 'The resume processing service could not complete this request.')
  }
  if (!isExtractResult(data)) throw new Error('The resume processing service returned an incomplete result.')
  return data
}

export const extractResumeOnServer = async (file: File): Promise<ResumeExtractResult> => {
  try {
    const { response, payload } = await extractViaLocalService(file)
    if (response.status === 404) return extractViaSupabase(file)
    if (!response.ok) {
      throw new Error(errorFromBody(payload, response.status === 413
        ? 'This PDF is larger than 5 MB. Choose a smaller resume file.'
        : 'The resume processing service could not complete this request.'))
    }
    if (!isExtractResult(payload)) throw new Error('The resume processing service returned an incomplete result.')
    return payload
  } catch (error) {
    if (error instanceof TypeError) {
      try {
        return await extractViaSupabase(file)
      } catch {
        throw new Error('We could not reach the resume processing service. Please try again.')
      }
    }
    throw error
  }
}

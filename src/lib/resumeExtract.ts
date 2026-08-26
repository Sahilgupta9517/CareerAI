import { supabase } from '@/lib/supabase'
import { parseResumeText } from '@/lib/resumeParser'

export type ResumeExtractResult = {
  filename: string
  fileSize: number
  pageCount: number
  characterCount: number
  text: string
}

export type PersistedResume = ResumeExtractResult & {
  id: number
  extractedText: string
  structuredResume: ReturnType<typeof parseResumeText>
  createdAt: string
  overallScore: number | null
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
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) throw new Error('Your session has expired. Please sign in again.')
  const response = await fetch('/api/resume/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'X-Filename': encodeURIComponent(file.name),
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: file,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok && payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    console.error('[resume/extract] local extraction failed', { status: response.status, error: payload.error })
  }
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

export const persistResumeExtraction = async (result: ResumeExtractResult) => {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Your session has expired. Please sign in again.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')

  const structuredResume = parseResumeText(result.text)
  const insertPayload = {
    user_id: userData.user.id,
    profile_id: profile.id,
    filename: result.filename,
    file_size: result.fileSize,
    page_count: result.pageCount,
    character_count: result.characterCount,
    extracted_text: result.text,
    structured_resume: structuredResume,
    overall_score: null,
    ats_score: null,
    keyword_score: null,
    formatting_score: null,
    ai_summary: null,
  }

  const { data: inserted, error } = await supabase.from('resume_analyses').insert(insertPayload).select('id').single()
  if (error) {
    console.error('[resume/persist] Save failed', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      filename: result.filename,
      profileId: profile.id,
      fileSize: result.fileSize,
    })
    throw new Error(
      error.message.includes('resume_analyses') || error.message.includes('does not exist') || error.message.includes('column')
        ? 'Resume extracted successfully, but saving your resume data failed because the Supabase schema is not aligned yet. Please apply the resume persistence migration and try again.'
        : error.message || 'Resume extracted successfully, but saving your resume data failed. Please try again.'
    )
  }
  return { id: inserted.id, structuredResume }
}

export type ResumeAnalyzeResult = {
  overallScore: number
  atsScore: number
  keywordScore: number
  formattingScore: number
  detectedSkills: string[]
  strengths: string[]
  improvements: string[]
  projects: Array<{ title: string; outcome: string }>
  educationExperience: string[]
  certifications: string[]
  missingSkills: string[]
  atsRecommendations: string[]
  aiSummary: string
}

export const analyzeResumeOnServer = async (
  result: ResumeExtractResult,
  targetRole: string,
  resumeAnalysisId?: number,
): Promise<ResumeAnalyzeResult> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) throw new Error('Your session has expired. Please sign in again.')

  const response = await fetch('/api/resume/analyze', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: result.text,
      targetRole,
      filename: result.filename,
      fileSize: result.fileSize,
      pageCount: result.pageCount,
      characterCount: result.characterCount,
      resumeAnalysisId,
    }),
  })
  const payload = await response.json().catch(() => null) as Partial<ResumeAnalyzeResult> & { error?: string; dbError?: string } | null
  if (!response.ok || !payload) throw new Error(payload?.error || 'Resume analysis failed. Please try again.')
  if (payload.dbError) throw new Error('Resume analyzed, but the result could not be saved. Please try again.')
  const arrays = {
    detectedSkills: payload.detectedSkills ?? [],
    strengths: payload.strengths ?? [],
    improvements: payload.improvements ?? [],
    projects: payload.projects ?? [],
    educationExperience: payload.educationExperience ?? [],
    certifications: payload.certifications ?? [],
    missingSkills: payload.missingSkills ?? [],
    atsRecommendations: payload.atsRecommendations ?? [],
  }
  if (typeof payload.overallScore !== 'number' || typeof payload.atsScore !== 'number' || typeof payload.keywordScore !== 'number' || typeof payload.formattingScore !== 'number' || typeof payload.aiSummary !== 'string') {
    throw new Error('Resume analysis returned an incomplete response. Please try again.')
  }
  return { ...payload, ...arrays, overallScore: payload.overallScore, atsScore: payload.atsScore, keywordScore: payload.keywordScore, formattingScore: payload.formattingScore, aiSummary: payload.aiSummary }
}

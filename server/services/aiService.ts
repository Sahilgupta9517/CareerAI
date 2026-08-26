import { z } from 'zod'

export interface ResumeAnalysisResult {
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

export interface CareerAnalysisResult {
  career_summary: string
  strengths: Array<{ skill: string; reason: string }>
  skill_gaps: Array<{ skill: string; current_level: number; target_level: number; priority: 'High' | 'Medium' | 'Low'; reason: string }>
  recommended_skills: Array<{ skill: string; reason: string }>
  learning_strategy: Array<{ step: number; title: string; description: string }>
  recommended_roles: Array<{ role: string; match_percentage: number; reason: string }>
  interview_preparation: Array<{ topic: string; questions: string[] }>
}

export interface SkillGapAnalysisResult {
  readiness_score: number
  matched_skills: Array<{ skill: string; category: string; current_level: number; reason: string }>
  partial_skills: Array<{ skill: string; category: string; current_level: number; target_level: number; gap_percentage: number; priority: 'High' | 'Medium' | 'Low'; reason: string; recommended_action: string; estimated_learning_time: string; resources: string[] }>
  missing_skills: Array<{ skill: string; category: string; current_level: number; target_level: number; gap_percentage: number; priority: 'High' | 'Medium' | 'Low'; reason: string; recommended_action: string; estimated_learning_time: string; resources: string[] }>
  recommended_skills: string[]
  skill_gaps: Array<{ skill: string; current_level: number; target_level: number; priority: 'High' | 'Medium' | 'Low'; reason: string }>
  skill_categories: Record<string, string[]>
  technical_skill_coverage: number
  high_priority_gap_count: number
  medium_priority_gap_count: number
  low_priority_gap_count: number
  learning_sequence: Array<{ step: number; title: string; description: string }>
}

export interface InterviewEvaluationResult {
  score: number
  technicalAccuracy?: number
  conceptUnderstanding?: number
  problemSolving?: number
  communication?: number
  completeness?: number
  confidence?: number
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  idealAnswerPoints: string[]
  fallbackUsed?: boolean
}

export interface GeneratedInterviewQuestion {
  question: string
  topic: string
  difficulty: string
  source: 'role' | 'resume' | 'project' | 'skill_gap' | 'career_analysis' | 'behavioral'
  expectedConcepts: string[]
  adaptiveReason: string
  basedOnPreviousScore: boolean
}

export interface InterviewQuestionGenerationResult {
  questions: GeneratedInterviewQuestion[]
  providerStatus: AIProviderStatus
  fallbackUsed: boolean
}
export type AIProviderName = 'gemini' | 'groq' | 'huggingface' | 'openai' | 'openrouter' | 'local'

export type AIProviderStatus = 'available' | 'rate_limited' | 'temporarily_unavailable' | 'failed' | 'local_fallback'

export interface AdaptiveInterviewQuestionInput {
  role: string
  experience: string
  interviewType: string
  difficulty: string
  previousQuestion: string
  candidateAnswer: string
  evaluation: InterviewEvaluationResult
  previousQuestions: Array<{ question: string; topic: string; difficulty: string }>
  context: unknown
}

export interface AdaptiveInterviewQuestionResult {
  question: GeneratedInterviewQuestion
  providerStatus: AIProviderStatus
  fallbackUsed: boolean
}

export class AIProviderError extends Error {
  readonly code: 'QUOTA_EXHAUSTED' | 'TEMPORARY_UNAVAILABLE' | 'AUTHENTICATION_FAILED' | 'PROVIDER_FAILED'
  readonly provider: string
  readonly retryable: boolean

  constructor(
    message: string,
    code: 'QUOTA_EXHAUSTED' | 'TEMPORARY_UNAVAILABLE' | 'AUTHENTICATION_FAILED' | 'PROVIDER_FAILED',
    provider: string,
    retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.code = code
    this.provider = provider
    this.retryable = retryable
    this.name = 'AIProviderError'
  }
}

export interface InterviewBatchEvaluationResult {
  overallScore: number
  technicalScore: number
  communicationScore: number
  problemSolvingScore: number
  roleKnowledgeScore: number
  clarityScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  topicPerformance: Array<{ topic: string; score: number }>
  answers: Array<{
    questionId: string
    score: number
    correctness: number
    relevance: number
    clarity: number
    technicalDepth: number
    feedback: string
    idealAnswer: string
    improvementTips: string[]
  }>
}

const scoreSchema = z.number().int().min(0).max(100)
const textArraySchema = z.array(z.string())

export const ResumeAnalysisResultSchema = z.object({
  overallScore: scoreSchema,
  atsScore: scoreSchema,
  keywordScore: scoreSchema,
  formattingScore: scoreSchema,
  detectedSkills: textArraySchema.default([]),
  strengths: textArraySchema.default([]),
  improvements: textArraySchema.default([]),
  projects: z.array(z.object({ title: z.string(), outcome: z.string() })).default([]),
  educationExperience: textArraySchema.default([]),
  certifications: textArraySchema.default([]),
  missingSkills: textArraySchema.default([]),
  atsRecommendations: textArraySchema.default([]),
  aiSummary: z.string(),
})

const skillCategorySchema = z.enum(['Programming', 'Frontend', 'Backend', 'Database', 'Cloud/DevOps', 'AI/ML', 'Data', 'Tools', 'Soft Skills', 'Other'])
const gapItemSchema = z.object({
  skill: z.string().min(1), category: skillCategorySchema, current_level: scoreSchema, target_level: scoreSchema,
  gap_percentage: scoreSchema, priority: z.enum(['High', 'Medium', 'Low']), reason: z.string(), recommended_action: z.string(), estimated_learning_time: z.string(), resources: textArraySchema.default([]),
})
export const SkillGapAnalysisResultSchema = z.object({
  readiness_score: scoreSchema,
  matched_skills: z.array(z.object({ skill: z.string().min(1), category: skillCategorySchema, current_level: scoreSchema, reason: z.string() })).default([]),
  partial_skills: z.array(gapItemSchema).default([]),
  missing_skills: z.array(gapItemSchema).default([]),
  recommended_skills: textArraySchema.default([]),
  skill_gaps: z.array(z.object({ skill: z.string().min(1), current_level: scoreSchema, target_level: scoreSchema, priority: z.enum(['High', 'Medium', 'Low']), reason: z.string() })).default([]),
  skill_categories: z.record(z.string(), textArraySchema).default({}),
  technical_skill_coverage: scoreSchema,
  high_priority_gap_count: z.number().int().nonnegative().default(0),
  medium_priority_gap_count: z.number().int().nonnegative().default(0),
  low_priority_gap_count: z.number().int().nonnegative().default(0),
  learning_sequence: z.array(z.object({ step: z.number().int().positive(), title: z.string().min(1), description: z.string() })).default([]),
})

export const InterviewEvaluationResultSchema = z.object({
  score: scoreSchema,
  technicalAccuracy: scoreSchema,
  conceptUnderstanding: scoreSchema,
  problemSolving: scoreSchema,
  communication: scoreSchema,
  completeness: scoreSchema,
  confidence: scoreSchema,
  strengths: textArraySchema,
  weaknesses: textArraySchema,
  improvements: textArraySchema,
  idealAnswerPoints: textArraySchema,
})

export const GeneratedInterviewQuestionSchema = z.object({
  question: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.string().min(1),
  source: z.enum(['role', 'resume', 'project', 'skill_gap', 'career_analysis', 'behavioral']),
  expectedConcepts: textArraySchema,
  adaptiveReason: z.string().min(1).default('Personalized for the interview context.'),
  basedOnPreviousScore: z.boolean().default(false),
})

export const InterviewQuestionGenerationResultSchema = z.object({
  questions: z.array(GeneratedInterviewQuestionSchema),
  providerStatus: z.enum(['available', 'rate_limited', 'temporarily_unavailable', 'failed', 'local_fallback']),
  fallbackUsed: z.boolean(),
})

const GeneratedInterviewQuestionsResponseSchema = z.object({
  questions: z.array(z.object({
    question: z.string().min(1),
    topic: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    difficulty: z.string().min(1).optional(),
    source: z.string().min(1).optional(),
    expectedConcepts: textArraySchema.optional(),
    adaptiveReason: z.string().min(1).optional(),
    basedOnPreviousScore: z.boolean().optional(),
  })),
})

export const InterviewBatchEvaluationResultSchema = z.object({
  overallScore: scoreSchema,
  technicalScore: scoreSchema,
  communicationScore: scoreSchema,
  problemSolvingScore: scoreSchema,
  roleKnowledgeScore: scoreSchema,
  clarityScore: scoreSchema,
  summary: z.string(),
  strengths: textArraySchema,
  weaknesses: textArraySchema,
  recommendations: textArraySchema,
  topicPerformance: z.array(z.object({ topic: z.string(), score: scoreSchema })),
  answers: z.array(z.object({
    questionId: z.string(),
    score: scoreSchema,
    correctness: scoreSchema,
    relevance: scoreSchema,
    clarity: scoreSchema,
    technicalDepth: scoreSchema,
    feedback: z.string(),
    idealAnswer: z.string(),
    improvementTips: textArraySchema,
  })),
})

const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const

const nextDifficulty = (difficulty: string, score: number): string => {
  const index = Math.max(0, difficultyOrder.indexOf(difficulty as typeof difficultyOrder[number]))
  if (score >= 85) return difficultyOrder[Math.min(index + 1, difficultyOrder.length - 1)]
  if (score < 70) return difficultyOrder[Math.max(index - 1, 0)]
  return difficultyOrder[index] ?? 'Intermediate'
}

type OpenAIResponse = {
  choices?: Array<{ message?: { content?: unknown } }>
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>
}
type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}
const asOpenRouterResponse = (value: unknown): OpenRouterResponse => {
  if (!isRecord(value) || !Array.isArray(value.choices)) return {}
  return value as OpenRouterResponse
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const asOpenAIResponse = (value: unknown): OpenAIResponse => {
  if (!isRecord(value) || !Array.isArray(value.choices)) return {}
  return value as OpenAIResponse
}

const asGeminiResponse = (value: unknown): GeminiResponse => {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return {}
  return value as GeminiResponse
}

export const parseJsonResponse = (value: string): unknown => {
  const trimmed = value.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = fenced?.[1]?.trim() ?? trimmed
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('AI returned malformed JSON.')
    return JSON.parse(candidate.slice(start, end + 1))
  }
}

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const skillCategories = ['Programming', 'Frontend', 'Backend', 'Database', 'Cloud/DevOps', 'AI/ML', 'Data', 'Tools', 'Soft Skills', 'Other'] as const
const inferSkillCategory = (skill: string): typeof skillCategories[number] => {
  const normalized = skill.toLowerCase()
  if (/python|java|javascript|typescript|c\+\+|programming|algorithm|data structure/.test(normalized)) return 'Programming'
  if (/react|html|css|frontend|tailwind/.test(normalized)) return 'Frontend'
  if (/node|api|backend|django|fastapi|spring/.test(normalized)) return 'Backend'
  if (/sql|postgres|mysql|mongo|database/.test(normalized)) return 'Database'
  if (/aws|docker|kubernetes|devops|cloud|linux/.test(normalized)) return 'Cloud/DevOps'
  if (/machine learning|tensorflow|pytorch|ai|ml/.test(normalized)) return 'AI/ML'
  if (/data|pandas|numpy|statistics|excel|power bi/.test(normalized)) return 'Data'
  if (/git|github|testing|vscode|jupyter/.test(normalized)) return 'Tools'
  if (/communication|leadership|teamwork/.test(normalized)) return 'Soft Skills'
  return 'Other'
}
const skillName = (value: unknown): string => typeof value === 'string' ? value.trim() : isRecord(value) && typeof value.skill === 'string' ? value.skill.trim() : ''

export const normalizeSkillGapAnalysisResponse = (value: unknown): SkillGapAnalysisResult => {
  const parsedValue = typeof value === 'string' ? parseJsonResponse(value) : value
  if (!isRecord(parsedValue)) throw new Error('The AI skill-gap response was not a JSON object.')
  const source = parsedValue
  console.log('[CareerAI] Skill Gap response shape', {
    keys: Object.keys(source),
    types: Object.fromEntries(Object.entries(source).map(([key, item]) => [key, Array.isArray(item) ? 'array' : item === null ? 'null' : typeof item])),
  })
  const matched = source.matched_skills ?? source.matchedSkills ?? source.current_skills ?? source.currentSkills ?? []
  const partial = source.partial_skills ?? source.partialSkills ?? source.partially_known_skills ?? source.partiallyKnownSkills ?? []
  const missing = source.missing_skills ?? source.missingSkills ?? []
  const normalizeGap = (item: unknown): unknown => {
    if (typeof item === 'string') return { skill: item, category: inferSkillCategory(item), current_level: 0, target_level: 0, gap_percentage: 0, priority: 'Medium', reason: 'This skill is relevant to the target role.', recommended_action: `Learn the fundamentals of ${item}.`, estimated_learning_time: 'To be estimated', resources: [] }
    if (!isRecord(item)) return item
    const name = skillName(item)
    return {
      ...item,
      skill: name,
      category: typeof item.category === 'string' && skillCategories.includes(item.category as typeof skillCategories[number]) ? item.category : inferSkillCategory(name),
      current_level: item.current_level ?? item.currentLevel ?? 0,
      target_level: item.target_level ?? item.targetLevel ?? 0,
      gap_percentage: item.gap_percentage ?? item.gapPercentage ?? 0,
      priority: item.priority === 'High' || item.priority === 'Low' ? item.priority : 'Medium',
      reason: typeof item.reason === 'string' && item.reason.trim() ? item.reason : 'This skill is relevant to the target role.',
      recommended_action: item.recommended_action ?? item.recommendedAction ?? '',
      estimated_learning_time: item.estimated_learning_time ?? item.estimatedLearningTime ?? '',
      resources: item.resources ?? item.topics ?? [],
    }
  }
  const normalizeMatched = (item: unknown): unknown => {
    if (typeof item === 'string') return { skill: item, category: inferSkillCategory(item), current_level: 0, reason: 'This skill was identified in the candidate context.' }
    if (!isRecord(item)) return item
    const name = skillName(item)
    return { ...item, skill: name, category: typeof item.category === 'string' && skillCategories.includes(item.category as typeof skillCategories[number]) ? item.category : inferSkillCategory(name), current_level: item.current_level ?? item.currentLevel ?? 0, reason: typeof item.reason === 'string' ? item.reason : 'This skill was identified in the candidate context.' }
  }
  const normalized = {
    readiness_score: source.readiness_score ?? source.readinessScore ?? source.overall_readiness_score ?? source.overallReadinessScore,
    matched_skills: asArray(matched).map(normalizeMatched),
    partial_skills: asArray(partial).map(normalizeGap),
    missing_skills: asArray(missing).map(normalizeGap),
    recommended_skills: asArray(source.recommended_skills ?? source.recommendedSkills).map(skillName).filter(Boolean),
    skill_gaps: asArray(source.skill_gaps ?? source.skillGaps).map((item) => {
      const normalized = normalizeGap(item)
      if (!isRecord(normalized)) return normalized
      return { skill: normalized.skill, current_level: normalized.current_level, target_level: normalized.target_level, priority: normalized.priority, reason: normalized.reason }
    }),
    skill_categories: isRecord(source.skill_categories ?? source.skillCategories)
      ? Object.fromEntries(Object.entries((source.skill_categories ?? source.skillCategories) as Record<string, unknown>).map(([category, values]) => [category, asArray(values).map(skillName).filter(Boolean)]))
      : {},
    technical_skill_coverage: source.technical_skill_coverage ?? source.technicalSkillCoverage ?? 0,
    high_priority_gap_count: source.high_priority_gap_count ?? source.highPriorityGapCount ?? 0,
    medium_priority_gap_count: source.medium_priority_gap_count ?? source.mediumPriorityGapCount ?? 0,
    low_priority_gap_count: source.low_priority_gap_count ?? source.lowPriorityGapCount ?? 0,
    learning_sequence: asArray(source.learning_sequence ?? source.learningSequence).map((item, index) => typeof item === 'string' ? { step: index + 1, title: item, description: item } : isRecord(item) ? { step: typeof item.step === 'number' && Number.isInteger(item.step) && item.step > 0 ? item.step : index + 1, title: typeof item.title === 'string' ? item.title : skillName(item), description: typeof item.description === 'string' ? item.description : typeof item.title === 'string' ? item.title : skillName(item) } : null).filter((item): item is { step: number; title: string; description: string } => item !== null && item.title.length > 0),
  }
  const result = SkillGapAnalysisResultSchema.safeParse(normalized)
  if (!result.success) throw new Error(`The AI skill-gap response did not match the required schema: ${result.error.issues.map((issue) => issue.path.join('.') || 'response').join(', ')}`)
  return result.data
}

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string, model = process.env.AI_FALLBACK_MODEL || process.env.AI_MODEL || 'gpt-4o-mini'): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 1800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const lower = errorText.toLowerCase()
    if (response.status === 429 || lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource_exhausted')) {
      throw new AIProviderError('The OpenAI provider is rate limited.', 'QUOTA_EXHAUSTED', 'openai', true)
    }
    if ([500, 502, 503, 504].includes(response.status)) {
      throw new AIProviderError('The OpenAI provider is temporarily unavailable.', 'TEMPORARY_UNAVAILABLE', 'openai', true)
    }
    if (response.status === 401 || response.status === 403) {
      throw new AIProviderError('The OpenAI provider authentication failed.', 'AUTHENTICATION_FAILED', 'openai', false)
    }
    throw new AIProviderError('The OpenAI provider request failed.', 'PROVIDER_FAILED', 'openai', false)
  }

  const data = asOpenAIResponse(await response.json())
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content) throw new Error('OpenAI returned an empty completion response.')
  return content
}

async function callCompatibleProvider(apiKey: string, systemPrompt: string, userPrompt: string, provider: 'groq' | 'huggingface', endpoint: string, model: string): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 1800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const lower = errorText.toLowerCase()
    if (response.status === 429 || lower.includes('quota') || lower.includes('rate limit')) throw new AIProviderError(`The ${provider} provider is rate limited.`, 'QUOTA_EXHAUSTED', provider, false)
    if ([500, 502, 503, 504].includes(response.status)) throw new AIProviderError(`The ${provider} provider is temporarily unavailable.`, 'TEMPORARY_UNAVAILABLE', provider, true)
    if (response.status === 401 || response.status === 403) throw new AIProviderError(`${provider} authentication failed.`, 'AUTHENTICATION_FAILED', provider, false)
    throw new AIProviderError(`The ${provider} provider request failed.`, 'PROVIDER_FAILED', provider, false)
  }

  const data = asOpenAIResponse(await response.json())
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new AIProviderError(`${provider} returned an empty completion response.`, 'PROVIDER_FAILED', provider, false)
  return content.trim()
}

const callGroq = (apiKey: string, systemPrompt: string, userPrompt: string) => callCompatibleProvider(apiKey, systemPrompt, userPrompt, 'groq', 'https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_MODEL || 'llama-3.1-8b-instant')
const callHuggingFace = (apiKey: string, systemPrompt: string, userPrompt: string) => callCompatibleProvider(apiKey, systemPrompt, userPrompt, 'huggingface', 'https://router.huggingface.co/v1/chat/completions', process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct')

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const model = process.env.AI_MODEL || 'gemini-3.6-flash'

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const response = await fetch(url, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },

    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },

      contents: [
        {
          role: 'user',
          parts: [
            {
              text: userPrompt,
            },
          ],
        },
      ],

      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 1800,
      },
    }),
  })

  if (!response.ok) {
    const errorText =
      await response.text()

    const lowerError = errorText.toLowerCase()
    if (response.status === 429 || lowerError.includes('quota') || lowerError.includes('resource_exhausted') || lowerError.includes('rate limit')) throw new AIProviderError('The Gemini provider is rate limited.', 'QUOTA_EXHAUSTED', 'gemini', true)
    if (response.status === 401 || response.status === 403) throw new AIProviderError('Gemini authentication failed.', 'AUTHENTICATION_FAILED', 'gemini', false)
    if ([500, 502, 503, 504].includes(response.status)) throw new AIProviderError('The Gemini provider is temporarily unavailable.', 'TEMPORARY_UNAVAILABLE', 'gemini', true)
    throw new AIProviderError('The Gemini provider request failed.', 'PROVIDER_FAILED', 'gemini', false)
  }

  const data =
    asGeminiResponse(
      await response.json(),
    )

  const text =
    data.candidates?.[0]
      ?.content?.parts?.[0]?.text

  if (
    typeof text !== 'string' ||
    !text.trim()
  ) {
    throw new Error(
      'Gemini returned an empty response.',
    )
  }

  return text.trim()
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

const withTimeout = async <T>(operation: Promise<T>, milliseconds: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new AIProviderError('The AI provider timed out.', 'TEMPORARY_UNAVAILABLE', 'provider', true)), milliseconds)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const callWithRetry = async (providerCall: () => Promise<string>): Promise<string> => {
  let lastError: unknown
  const maxAttempts = Math.max(1, Number(process.env.AI_MAX_RETRIES || 1) + 1)
  const timeoutMs = Math.max(1000, Number(process.env.AI_TIMEOUT_MS || process.env.AI_REQUEST_TIMEOUT_MS || 18000))
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await withTimeout(providerCall(), timeoutMs)
    } catch (error) {
      lastError = error
      if (
        !(error instanceof AIProviderError)
        || !error.retryable
        || error.code === 'QUOTA_EXHAUSTED'
        || attempt === maxAttempts - 1
      ) throw error
      await wait((1000 * (2 ** attempt)) + Math.floor(Math.random() * 250))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI provider failed.')
}
async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free'

  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5174',
      'X-Title': 'CareerAI',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIProviderError('The OpenRouter provider timed out.', 'TEMPORARY_UNAVAILABLE', 'openrouter', true)
    }
    throw error
  }

  if (!response.ok) {
  let errorText: string
  try {
    errorText = await response.text()
  } finally {
    clearTimeout(timeout)
  }
  const lowerError = errorText.toLowerCase()

  console.error('[OpenRouter] HTTP error:', {
    status: response.status,
    statusText: response.statusText,
    body: errorText,
  })

  throw new AIProviderError(
  `OpenRouter request failed (${response.status}).`,
  response.status === 429 || lowerError.includes('quota') || lowerError.includes('rate limit') || lowerError.includes('resource_exhausted')
      ? 'QUOTA_EXHAUSTED'
      : response.status >= 500
        ? 'TEMPORARY_UNAVAILABLE'
        : response.status === 401 || response.status === 403
          ? 'AUTHENTICATION_FAILED'
          : 'PROVIDER_FAILED',
    'openrouter',
    response.status === 429 || response.status >= 500 || lowerError.includes('quota') || lowerError.includes('rate limit') || lowerError.includes('resource_exhausted'),
  )
}


  let data: OpenRouterResponse
  try {
    data = asOpenRouterResponse(await response.json())
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIProviderError('The OpenRouter provider timed out.', 'TEMPORARY_UNAVAILABLE', 'openrouter', true)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
  console.log('[CareerAI] OpenRouter response received', {
    hasChoices: Array.isArray(data.choices),
    choiceCount: data.choices?.length ?? 0,
    contentType: typeof data.choices?.[0]?.message?.content,
  })

  const content = data.choices?.[0]?.message?.content

  if (process.env.NODE_ENV !== 'production' && typeof content === 'string') {
    console.debug('[CareerAI] OpenRouter response preview', content.slice(0, 160))
  }

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned an empty completion response.')
  }

  if (/user safety|safety refusal|content policy/i.test(content)) {
    throw new AIProviderError('OpenRouter returned a safety refusal instead of structured output.', 'PROVIDER_FAILED', 'openrouter', false)
  }

  return content.trim()
}
async function callAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const configuredProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
  const providerOrder = (process.env.AI_PROVIDER_ORDER || configuredProvider)
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean)

  const providers: Array<{
    name: AIProviderName
    key: string
    call: () => Promise<string>
  }> = []

  const geminiKey = process.env.AI_API_KEY || ''
  const groqKey = process.env.GROQ_API_KEY || ''
  const huggingFaceKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || ''
  const openRouterKey = process.env.OPENROUTER_API_KEY || ''

  const openAIKey = process.env.OPENAI_API_KEY || ''
  const addGemini = () => geminiKey && geminiKey !== 'your_key_here' && providers.push({ name: 'gemini', key: geminiKey, call: () => callGemini(geminiKey, systemPrompt, userPrompt) })
  const addGroq = () => groqKey && groqKey !== 'your_key_here' && providers.push({ name: 'groq', key: groqKey, call: () => callGroq(groqKey, systemPrompt, userPrompt) })
  const addHuggingFace = () => huggingFaceKey && huggingFaceKey !== 'your_key_here' && providers.push({ name: 'huggingface', key: huggingFaceKey, call: () => callHuggingFace(huggingFaceKey, systemPrompt, userPrompt) })
  const addOpenAI = () => openAIKey && openAIKey !== 'your_key_here' && providers.push({ name: 'openai', key: openAIKey, call: () => callOpenAI(openAIKey, systemPrompt, userPrompt) })
  const addOpenRouter = () => openRouterKey && openRouterKey !== 'your_key_here' && providers.push({ name: 'openrouter', key: openRouterKey, call: () => callOpenRouter(openRouterKey, systemPrompt, userPrompt) })

  for (const provider of providerOrder) {
    if (provider === 'gemini') addGemini()
    if (provider === 'groq') addGroq()
    if (provider === 'huggingface' || provider === 'hf') addHuggingFace()
    if (provider === 'openrouter') addOpenRouter()
    if (provider === 'openai') addOpenAI()
  }

  if (!providers.length) {
    throw new AIProviderError(
      'No AI provider is configured.',
      'AUTHENTICATION_FAILED',
      configuredProvider,
      false,
    )
  }

  let lastError: unknown

  for (const provider of providers) {
    try {
      console.log(
        `[CareerAI] Trying AI provider: ${provider.name}`,
      )

      return await callWithRetry(provider.call)
    } catch (error) {
      lastError = error

      console.warn(
        '[CareerAI] Provider failed',
        {
          provider: provider.name,
          code:
            error instanceof AIProviderError
              ? error.code
              : 'PROVIDER_FAILED',
        },
      )
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AIProviderError(
        'All AI providers failed.',
        'PROVIDER_FAILED',
        providers[0].name,
        false,
      )
}

const normalizeInterviewQuestions = (values: unknown[], difficulty: string, role: string, count: number, context: unknown = {}): GeneratedInterviewQuestion[] => {
  const questions = values.flatMap((value): GeneratedInterviewQuestion[] => {
    if (typeof value === 'string' && value.trim()) return [{ question: value.trim(), topic: role, difficulty, source: 'role', expectedConcepts: [], adaptiveReason: 'Personalized for the interview context.', basedOnPreviousScore: false }]
    if (!isRecord(value) || typeof value.question !== 'string' || !value.question.trim()) return []
    const topic = typeof value.topic === 'string' ? value.topic : typeof value.category === 'string' ? value.category : ''
    if (!topic || typeof value.difficulty !== 'string') return []
    const source = classifyQuestionSource(typeof value.source === 'string' ? value.source : undefined, value.question, context)
    const expectedConcepts = Array.isArray(value.expectedConcepts) ? value.expectedConcepts.filter((item): item is string => typeof item === 'string') : []
    const adaptiveReason = typeof value.adaptiveReason === 'string' && value.adaptiveReason.trim() ? value.adaptiveReason.trim() : 'Personalized for the interview context.'
    const basedOnPreviousScore = typeof value.basedOnPreviousScore === 'boolean' ? value.basedOnPreviousScore : false
    return [{ question: value.question.trim(), topic, difficulty, source, expectedConcepts, adaptiveReason, basedOnPreviousScore }]
  }).slice(0, count)
  const unique = new Set(questions.map((question) => question.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))
  if (questions.length !== count || unique.size !== questions.length) throw new Error('Generated questions failed validation.')
  return questions
}

const normalizedText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const contextReference = (question: string, context: unknown): 'resume' | 'project' | null => {
  const record = isRecord(context) ? context : {}
  const questionText = normalizedText(question)
  const resume = isRecord(record.resume) ? record.resume : {}
  const projects = Array.isArray(record.projects) ? record.projects : Array.isArray(resume.projects) ? resume.projects : []
  const projectNames = projects.map((item) => {
    if (typeof item === 'string') return item
    if (isRecord(item) && typeof item.title === 'string') return item.title
    if (isRecord(item) && typeof item.name === 'string') return item.name
    return ''
  }).filter((item): item is string => Boolean(item && normalizedText(item).length >= 3))
  if (projectNames.some((project) => questionText.includes(normalizedText(project)))) return 'project'

  const resumeSkills = Array.isArray(record.resumeSkills)
    ? record.resumeSkills.filter((item): item is string => typeof item === 'string')
    : Array.isArray(resume.technicalSkills)
      ? resume.technicalSkills.filter((item): item is string => typeof item === 'string')
      : []
  if (resumeSkills.some((skill) => normalizedText(skill).length >= 3 && questionText.includes(normalizedText(skill)))) return 'resume'
  return null
}

const classifyQuestionSource = (source: string | undefined, question: string, context: unknown): GeneratedInterviewQuestion['source'] => {
  const explicitSource = source?.toLowerCase().replace(/[-\s]+/g, '_')
  const reference = contextReference(question, context)
  if (reference) return reference
  return (explicitSource === 'skill_gap' || explicitSource === 'career_analysis' || explicitSource === 'behavioral' ? explicitSource : 'role') as GeneratedInterviewQuestion['source']
}

const localInterviewQuestions = (role: string, type: string, difficulty: string, context: unknown, count: number): GeneratedInterviewQuestion[] => {
  const record = isRecord(context) ? context : {}
  const skills = Array.isArray(record.resumeSkills) ? record.resumeSkills.filter((item): item is string => typeof item === 'string').slice(0, 4) : []
  const projects = Array.isArray(record.projects) ? record.projects.map((item) => {
    if (typeof item === 'string') return item
    if (isRecord(item) && typeof item.title === 'string') return item.title
    if (isRecord(item) && typeof item.name === 'string') return item.name
    return ''
  }).filter(Boolean).slice(0, 2) : []
  const focus = skills[0] || 'your current technical skills'
  const project = projects[0] || 'one of your projects'
  const rolePrompts: Record<string, string[]> = {
    'Python Developer': [`How would you use decorators in a ${role} codebase, and what trade-offs do they introduce?`, `Explain Python generators and when they improve memory usage in production systems.`, `How would you design asynchronous work in Python, and how would you test it?`, `What causes GIL contention and how would you choose a concurrency strategy?`, `How would you optimize a slow SQL query used by a Python service?`],
    'Frontend Developer': [`How does React decide when to re-render a component, and how would you diagnose an unnecessary render?`, `Design state management for a complex frontend feature and explain the trade-offs.`, `How would you improve Core Web Vitals for a data-heavy page?`, `How would you integrate an API with robust loading, caching, and error states?`, `Explain the JavaScript event loop and its effect on browser responsiveness.`],
    'Backend Developer': [`How would you design and version a REST API for ${focus}?`, `How would you model database indexes for a high-traffic backend query?`, `Design an authentication flow and identify its security boundaries.`, `When would you use caching, and how would you handle invalidation?`, `How would you scale a backend service while preserving reliability?`],
  }
  const roleQuestions = rolePrompts[role] || [`What fundamentals are most important for a ${role} working at ${difficulty} level?`, `Describe how you would debug a difficult production issue as a ${role}.`, `How would you test and monitor a ${role} feature?`, `Explain a design trade-off relevant to ${role} work.`, `How would you improve the reliability of a ${role} system?`]
  const behavioral = [`Tell me about a time you solved a difficult problem while working toward a ${role} goal.`, `How do you communicate technical trade-offs to teammates?`, `Describe how you respond when an implementation does not work as expected.`]
  const coding = [`Design a ${role} solution for a bounded data-processing problem and explain its complexity.`, `How would you test edge cases in a coding solution for ${role} work?`, `Describe how you would improve the performance of an initially correct solution.`]
  const system = [`Design a scalable system relevant to ${role}; cover APIs, storage, caching, and failure handling.`, `Compare two architecture options for a ${role} service and explain the trade-offs.`, `How would you make a ${role} system observable and resilient under load?`]
  const projectQuestion: GeneratedInterviewQuestion = { question: `Walk me through the architecture and most important technical decision in ${project}.`, topic: project, difficulty, source: 'project', expectedConcepts: skills, adaptiveReason: 'Grounded in the candidate project context.', basedOnPreviousScore: false }
  const sourcePrompts = type === 'Behavioral' || type === 'HR' ? behavioral : type === 'Coding' ? coding : type === 'System Design' ? system : roleQuestions
  const questions: GeneratedInterviewQuestion[] = sourcePrompts.map((question, index) => ({ question, topic: skills[index % Math.max(skills.length, 1)] || role, difficulty, source: type === 'Behavioral' || type === 'HR' ? 'behavioral' as const : skills[index] ? 'skill_gap' as const : 'role' as const, expectedConcepts: skills.length ? [skills[index % skills.length]] : [], adaptiveReason: 'Personalized fallback question.', basedOnPreviousScore: false }))
  const combined = projects.length ? [projectQuestion, ...questions] : questions
  while (combined.length < count) {
    const index = combined.length
    combined.push({
      question: `Explain how you would validate, monitor, and improve a ${role} solution at the ${difficulty} level (follow-up ${index + 1}).`,
      topic: skills[index % Math.max(skills.length, 1)] || role,
      difficulty,
      source: 'role',
      expectedConcepts: skills.length ? [skills[index % skills.length]] : [],
      adaptiveReason: 'Personalized fallback question.',
      basedOnPreviousScore: false,
    })
  }
  return combined.slice(0, count).map((question) => ({ ...question, difficulty, adaptiveReason: question.adaptiveReason ?? 'Personalized fallback question.', basedOnPreviousScore: question.basedOnPreviousScore ?? false }))
}

const localInterviewEvaluation = (question: string, answer: string): InterviewEvaluationResult => {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length
  const hasSubstance = wordCount >= 20
  const score = Math.min(75, Math.max(25, 25 + Math.min(wordCount, 50)))
  return {
    score,
    technicalAccuracy: score,
    conceptUnderstanding: score,
    problemSolving: score,
    communication: hasSubstance ? 70 : 45,
    completeness: hasSubstance ? 65 : 35,
    confidence: hasSubstance ? 65 : 45,
    strengths: hasSubstance ? ['The answer provides enough detail to review.'] : ['The answer addresses the question.'],
    weaknesses: hasSubstance ? ['Technical claims require deeper validation.'] : ['The answer needs more specific reasoning and examples.'],
    improvements: ['Explain the approach step by step.', 'Include a concrete example or trade-off.'],
    idealAnswerPoints: [`Address the key concepts in: ${question.slice(0, 120)}`],
    fallbackUsed: true,
  }
}

export const aiService = {
  async analyzeSkillGap(input: { targetRole: string; requiredSkills: string[]; preferredSkills: string[]; resumeAnalysis: unknown; profileContext: unknown }): Promise<SkillGapAnalysisResult> {
    const systemPrompt = `You are an evidence-based career skills analyst. Compare the candidate resume analysis with the target role requirements. Use only skills and evidence present in the supplied resume analysis or profile context; do not invent candidate skills, experience, projects, or certifications. Return JSON only matching the requested schema. Estimate levels as integers 0-100. Categorize every skill as Programming, Frontend, Backend, Database, Cloud/DevOps, AI/ML, Data, Tools, Soft Skills, or Other. Missing skills may be role requirements absent from the resume, but must explain why they matter. Keep arrays valid, using [] when empty.`
    const userPrompt = `Target role: ${input.targetRole}\nRequired skills: ${JSON.stringify(input.requiredSkills)}\nPreferred skills: ${JSON.stringify(input.preferredSkills)}\nResume AI analysis: ${JSON.stringify(input.resumeAnalysis)}\nProfile context: ${JSON.stringify(input.profileContext)}\nReturn exactly: {"readiness_score":0,"matched_skills":[],"partial_skills":[],"missing_skills":[],"recommended_skills":[],"skill_gaps":[],"learning_sequence":[],"skill_categories":{},"technical_skill_coverage":0,"high_priority_gap_count":0,"medium_priority_gap_count":0,"low_priority_gap_count":0}. Each partial/missing item needs skill, category, current_level, target_level, gap_percentage, priority, reason, recommended_action, estimated_learning_time, resources.`
    const responseText = await callAI(systemPrompt, userPrompt)
    return normalizeSkillGapAnalysisResponse(responseText)
  },

  async analyzeResume(resumeText: string, targetRole: string): Promise<ResumeAnalysisResult> {
    const systemPrompt = `You are an expert ATS resume analyzer and senior technical recruiter.

Analyze the resume strictly against the target role: "${targetRole}".

IMPORTANT RULES:

1. detectedSkills MUST contain ONLY actual technical/professional skills.
2. Never include complete sentences, resume summaries, education details, project descriptions, or personal statements as skills.
3. Each detected skill must be a short skill name of 1-4 words.
4. Examples of valid skills:
   Python, Java, JavaScript, TypeScript, React, Node.js, SQL,
   PostgreSQL, MongoDB, Git, GitHub, Docker, AWS, REST API,
   Machine Learning, Data Analysis, NumPy, Pandas, HTML, CSS,
   C++, Java, Spring Boot, Express.js, FastAPI.
5. Do NOT return:
   - "Passionate about AI"
   - "B.Tech Computer Science"
   - "Seeking opportunities"
   - complete project descriptions
   - complete resume sentences
6. Only include a skill if it is explicitly present in the resume.
7. missingSkills must contain relevant skills for the target role that are NOT sufficiently demonstrated in the resume.
8. Extract certifications only when they are explicitly listed in the resume; otherwise return an empty array.
9. Scores must be realistic between 0 and 100.
10. Do not give extremely high scores without strong evidence.
11. Return ONLY valid JSON. No markdown. No explanation outside JSON.

Return exactly this JSON structure:

{
  "overallScore": 0,
  "atsScore": 0,
  "keywordScore": 0,
  "formattingScore": 0,
  "detectedSkills": [],
  "strengths": [],
  "improvements": [],
  "projects": [
    {
      "title": "",
      "outcome": ""
    }
  ],
  "educationExperience": [],
  "certifications": [],
  "missingSkills": [],
  "atsRecommendations": [],
  "aiSummary": ""
}`

    const userPrompt = `
Target Role:
${targetRole}

Resume Content:
${resumeText}

Analyze this resume carefully.

For detectedSkills:
- Extract only real technical/professional skills.
- Do not copy sentences from the resume.
- Do not include education, project descriptions, or career objectives.
- Keep each skill short and clean.

For missingSkills:
- Compare the resume with the target role.
- Recommend realistic skills that would improve the candidate's fit.

Return only the requested JSON structure.
`

    try {
      let responseText = await callAI(systemPrompt, userPrompt)
      try {
        return ResumeAnalysisResultSchema.parse(parseJsonResponse(responseText))
      } catch {
        responseText = await callAI(systemPrompt, `${userPrompt}\nReturn only the JSON object. Repair any formatting and do not include markdown or commentary.`)
        return ResumeAnalysisResultSchema.parse(parseJsonResponse(responseText))
      }
   } catch (error) {
  console.error('aiService.analyzeResume error:', error)

  throw new Error(
    error instanceof Error
      ? error.message
      : 'AI resume analysis failed.'
  )
}
  },

  async analyzeCareer(
  profile: any,
  skills: any[],
  goal: any,
  preferences: any,
  resumeAnalysis?: any
): Promise<CareerAnalysisResult> {
   const systemPrompt = `
You are an expert AI Career Advisor, Technical Recruiter,
ATS Specialist and Learning Strategist.

Analyze the candidate's:

1. Profile
2. Current technical skills
3. Career goal
4. Preferences
5. Resume AI analysis

Your job is to create a realistic and personalized career plan.

Return ONLY valid JSON.

Required JSON structure:

{
  "career_summary": "string",

  "strengths": [
    {
      "skill": "string",
      "reason": "string"
    }
  ],

  "skill_gaps": [
    {
      "skill": "string",
      "current_level": 50,
      "target_level": 85,
      "priority": "High",
      "reason": "string"
    }
  ],

  "recommended_skills": [
    {
      "skill": "string",
      "reason": "string"
    }
  ],

  "learning_strategy": [
    {
      "step": 1,
      "title": "string",
      "description": "string"
    }
  ],

  "recommended_roles": [
    {
      "role": "string",
      "match_percentage": 85,
      "reason": "string"
    }
  ],

  "interview_preparation": [
    {
      "topic": "string",
      "questions": [
        "string"
      ]
    }
  ]
}

Rules:

- current_level must be 0-100.
- target_level must be 0-100.
- match_percentage must be 0-100.
- priority must be High, Medium, or Low.
- Do not invent candidate experience.
- Do not treat random resume sentences as technical skills.
- Use actual skills from the candidate profile.
- Use resume missing_skills to improve skill-gap detection.
- Recommendations must match the target role.
- Give practical industry-oriented recommendations.
- Return valid JSON only.
`
    const userPrompt = `
USER PROFILE:
${JSON.stringify(profile)}

CURRENT SKILLS:
${JSON.stringify(skills)}

CAREER GOAL:
${JSON.stringify(goal)}

PREFERENCES:
${JSON.stringify(preferences)}

RESUME AI ANALYSIS:
${JSON.stringify(resumeAnalysis || null)}
`
    try {
      let responseText = await callAI(systemPrompt, userPrompt)
      let parsed: Partial<CareerAnalysisResult>
      try {
        parsed = parseJsonResponse(responseText) as Partial<CareerAnalysisResult>
      } catch (error) {
        if (!responseText.toLowerCase().includes('user safety')) throw error
        responseText = await callAI(systemPrompt, `${userPrompt}\nReturn only the JSON object. Do not include safety labels, commentary, markdown, or prose.`)
        parsed = parseJsonResponse(responseText) as Partial<CareerAnalysisResult>
      }

      return {
        career_summary: parsed.career_summary || 'Summary generated.',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        skill_gaps: Array.isArray(parsed.skill_gaps) ? parsed.skill_gaps : [],
        recommended_skills: Array.isArray(parsed.recommended_skills) ? parsed.recommended_skills : [],
        learning_strategy: Array.isArray(parsed.learning_strategy) ? parsed.learning_strategy : [],
        recommended_roles: Array.isArray(parsed.recommended_roles) ? parsed.recommended_roles : [],
        interview_preparation: Array.isArray(parsed.interview_preparation) ? parsed.interview_preparation : [],
      }
   } catch (error) {
  console.error(
    'aiService.analyzeCareer error:',
    error,
  )

  throw new Error(
    error instanceof Error
      ? error.message
      : 'AI career analysis failed.',
  )
}
  },

  async generateInterviewQuestions(role: string, experience: string, type: string, context: unknown = {}, count = 5, difficulty = 'Medium'): Promise<InterviewQuestionGenerationResult> {
    const difficultyDescriptions = {
      'Beginner': 'Beginner/Fresher level: fundamentals, basic concepts, simple implementation scenarios',
      'Intermediate': 'Intermediate level: practical implementation, debugging, moderate complexity, real-world scenarios',
      'Advanced': 'Advanced level: architecture, optimization, trade-offs, complex problem-solving, performance considerations',
      'Expert': 'Expert level: complex system design, edge cases, production scenarios, deep technical reasoning, scalability at scale'
    }

    const interviewTypeDescriptions = {
      'Technical': 'Focus on technical concepts, problem-solving, coding, algorithms, system design relevant to the role',
      'Behavioral': 'Focus on soft skills, communication, teamwork, conflict resolution, leadership, motivation, company culture fit',
      'HR': 'Focus on career goals, strengths and weaknesses, motivation, company alignment, long-term career plans, work preferences',
      'Coding': 'Focus on programming challenges, algorithm implementation, debugging, optimization, code quality, and testing',
      'System Design': 'Focus on architecture, scalability, databases, APIs, caching, microservices, DevOps, and distributed systems',
      'Project-Based': 'Focus on the candidate\'s actual projects from resume, technical decisions, outcomes, and lessons learned',
      'Mixed': 'Balanced mix of technical (50%), behavioral (30%), and project-based questions (20%)'
    }

    const roleSpecificContexts: Record<string, string> = {
      'Frontend Developer': 'HTML, CSS, JavaScript/TypeScript, React/Vue/Angular, responsive design, accessibility, performance, browser APIs, state management, testing, build tools',
      'Backend Developer': 'APIs, databases, authentication, caching, queues, microservices, testing, security, scalability, DevOps, system design',
      'Full Stack Developer': 'Frontend technologies, backend technologies, databases, APIs, deployment, CI/CD, system thinking',
      'Python Developer': 'Python, OOP, data structures, algorithms, FastAPI/Django, SQL, async programming, testing, APIs',
      'Java Developer': 'Java, OOP, Spring Boot, SQL, microservices, concurrency, testing, Maven/Gradle, JVM internals',
      'React Developer': 'React, hooks, state management, performance, testing, TypeScript, component patterns, Next.js',
      'Node.js Developer': 'JavaScript, Express/NestJS, async programming, databases, APIs, testing, deployment, performance',
      'Data Analyst': 'SQL, Excel, Python/R, pandas, data cleaning, visualization, business analytics, statistical analysis, reporting',
      'Data Scientist': 'Python, ML algorithms, statistics, data cleaning, feature engineering, model evaluation, ML libraries, deep learning',
      'AI/ML Engineer': 'Python, TensorFlow/PyTorch, ML algorithms, deep learning, NLP, computer vision, model deployment, MLOps',
      'DevOps Engineer': 'Linux, Docker, Kubernetes, CI/CD, cloud platforms (AWS/GCP/Azure), networking, security, monitoring, IaC',
      'Cloud Engineer': 'AWS/GCP/Azure, networking, security, databases, infrastructure, scaling, cost optimization, disaster recovery',
      'Mobile Developer': 'React Native/Flutter, iOS/Android, APIs, databases, performance, testing, deployment, mobile design',
      'QA Engineer': 'Testing strategies, automation, SQL, debugging, frameworks, CI/CD, performance testing, security testing',
      'Cybersecurity Analyst': 'Security principles, encryption, firewalls, vulnerability assessment, incident response, compliance, penetration testing'
    }

    const systemPrompt = `You are an expert interviewer specializing in hiring for "${role}" positions.

You are conducting a ${type} interview at ${difficulty} difficulty level.

CANDIDATE EXPERIENCE: ${experience}

DIFFICULTY LEVEL REQUIREMENTS:
${difficultyDescriptions[difficulty as keyof typeof difficultyDescriptions] || difficultyDescriptions['Intermediate']}

INTERVIEW TYPE GUIDANCE:
${interviewTypeDescriptions[type as keyof typeof interviewTypeDescriptions] || interviewTypeDescriptions['Technical']}

ROLE-SPECIFIC KNOWLEDGE AREAS FOR ${role.toUpperCase()}:
${roleSpecificContexts[role] || 'General software development and problem-solving'}

CANDIDATE CONTEXT:
${JSON.stringify(context)}

INSTRUCTIONS:
1. Generate exactly ${count} interview questions for this ${type} interview at ${difficulty} difficulty.
2. Match the difficulty level appropriately for the candidate's experience level.
3. Use the candidate context (skills, gaps, projects, analysis) to personalize questions.
4. Never invent experiences or projects - only reference what's in the context.
5. Each question should be focused, professional, and role-relevant.
6. Vary question types to avoid repetition.
7. Return ONLY valid JSON with structure: { "questions": [{ "question": "...", "topic": "...", "difficulty": "...", "source": "role|resume|project|skill_gap|career_analysis|behavioral", "expectedConcepts": ["..."], "adaptiveReason": "...", "basedOnPreviousScore": false }] }

EXAMPLE FORMATS BY TYPE:

Technical:
- "Explain how you would implement [feature] using [technology]"
- "Describe how you would optimize [component] for performance"
- "How would you debug [common issue] in [technology]?"

Behavioral:
- "Tell me about a time when [situation]. How did you handle it?"
- "Describe your approach to [soft skill]"
- "How do you [work practice]?"

System Design:
- "Design a [system]. How would you handle [constraint]?"
- "Explain the trade-offs between [option A] and [option B]"
- "How would you scale [component] for [traffic level]?"

Project-Based:
- "Walk me through the architecture of [project]"
- "What was the most challenging part of [project]? How did you solve it?"
- "What would you change about [project] if you built it again?"

HR/Career:
- "What attracted you to ${role}?"
- "Where do you see your career in [timeframe]?"
- "What's most important to you in a role?"

Generate questions now. Return ONLY JSON.`

    const userPrompt = `
Please generate ${count} ${type} interview questions at ${difficulty} difficulty for a ${role} position.

Target Role: ${role}
Experience Level: ${experience}
Interview Type: ${type}
Difficulty: ${difficulty}
Number of Questions: ${count}

Candidate Context:
${JSON.stringify(context, null, 2)}
`

    try {
      const responseText = await callAI(systemPrompt, userPrompt)
      const parsed = GeneratedInterviewQuestionsResponseSchema.parse(parseJsonResponse(responseText))
      if (parsed.questions.length > 0) {
        const questions = normalizeInterviewQuestions(parsed.questions, difficulty, role, count, context)
        const contextRecord = isRecord(context) ? context : {}
        const hasResume = (typeof contextRecord.resumeText === 'string' && contextRecord.resumeText.trim().length > 0)
          || (Array.isArray(contextRecord.resumeSkills) && contextRecord.resumeSkills.length > 0)
          || (Array.isArray(contextRecord.projects) && contextRecord.projects.length > 0)
          || (isRecord(contextRecord.resume) && (
            (Array.isArray(contextRecord.resume.projects) && contextRecord.resume.projects.length > 0)
            || (Array.isArray(contextRecord.resume.technicalSkills) && contextRecord.resume.technicalSkills.length > 0)
            || (Array.isArray(contextRecord.resume.experience) && contextRecord.resume.experience.length > 0)
          ))
        const hasResumeQuestion = questions.some((question) => question.source === 'resume' || question.source === 'project')
        if (!hasResume || hasResumeQuestion) return { questions, providerStatus: 'available', fallbackUsed: false }
        if (hasResume && !hasResumeQuestion) throw new Error('AI returned no resume-grounded question.')
      }
      throw new Error('No valid questions returned')
    } catch (error) {
      console.error('aiService.generateInterviewQuestions error:', error)
      const fallbackQuestions = localInterviewQuestions(role, type, difficulty, context, count)
      if (fallbackQuestions.length === count) {
        const status: AIProviderStatus = error instanceof AIProviderError && error.code === 'QUOTA_EXHAUSTED' ? 'rate_limited' : error instanceof AIProviderError && error.retryable ? 'temporarily_unavailable' : 'failed'
        console.warn('[Interview AI] Using local question fallback', { providerStatus: status, questionCount: count })
        return { questions: fallbackQuestions, providerStatus: 'local_fallback', fallbackUsed: true }
      }
      throw new Error(`AI question generation failed: ${error instanceof Error ? error.message : 'provider request failed'}`, { cause: error })
    }
  },

  async generateAdaptiveInterviewQuestion(input: AdaptiveInterviewQuestionInput): Promise<AdaptiveInterviewQuestionResult> {
    const score = input.evaluation.score
    const requestedDifficulty = nextDifficulty(input.difficulty, score)
    const previousQuestionKeys = new Set(input.previousQuestions.map((item) => item.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))
    const systemPrompt = `You are an adaptive interviewer for a ${input.role} candidate.
Generate exactly one next ${input.interviewType} interview question.
The candidate's previous answer scored ${score}/100. Use ${requestedDifficulty} difficulty unless a focused follow-up is more appropriate.
Scores: technical accuracy ${input.evaluation.technicalAccuracy ?? 0}, concept understanding ${input.evaluation.conceptUnderstanding ?? 0}, problem solving ${input.evaluation.problemSolving ?? 0}, communication ${input.evaluation.communication ?? 0}.
If the score is below 70, target weaknesses and improvement suggestions with a simpler focused question. If the score is 85 or higher, deepen the concept when appropriate. Scores from 70 through 84 should remain approximately the same difficulty.
Do not repeat any previous question. Do not invent candidate projects or experience; use only the supplied context.
Return ONLY valid JSON matching this shape: { "question": "...", "topic": "...", "difficulty": "Beginner|Intermediate|Advanced|Expert", "source": "role|resume|project|skill_gap|career_analysis|behavioral", "expectedConcepts": ["..."], "adaptiveReason": "...", "basedOnPreviousScore": true }`
    const userPrompt = `Target role: ${input.role}
Experience: ${input.experience}
Interview type: ${input.interviewType}
Current difficulty: ${input.difficulty}
Previous question: ${input.previousQuestion}
Candidate answer: ${input.candidateAnswer}
Weaknesses: ${JSON.stringify(input.evaluation.weaknesses)}
Improvement suggestions: ${JSON.stringify(input.evaluation.improvements)}
Candidate context: ${JSON.stringify(input.context)}
Previous questions and topics: ${JSON.stringify(input.previousQuestions)}`

    try {
      const generated = GeneratedInterviewQuestionSchema.parse(parseJsonResponse(await callAI(systemPrompt, userPrompt)))
      const questionKey = generated.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (previousQuestionKeys.has(questionKey)) throw new Error('AI generated a duplicate interview question.')
      return { question: generated, providerStatus: 'available', fallbackUsed: false }
    } catch (error) {
      console.error('aiService.generateAdaptiveInterviewQuestion error:', error)
      const fallback = localInterviewQuestions(input.role, input.interviewType, requestedDifficulty, input.context, Math.max(input.previousQuestions.length + 1, 5))
        .find((question) => !previousQuestionKeys.has(question.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))
      if (!fallback) throw new Error('Adaptive interview question generation failed.', { cause: error })
      return {
        question: { ...fallback, adaptiveReason: score < 70 ? 'Focused on improving the previous weak area.' : score >= 85 ? 'Increased depth after a strong previous answer.' : 'Maintains the current difficulty based on the previous answer.', basedOnPreviousScore: true },
        providerStatus: 'local_fallback',
        fallbackUsed: true,
      }
    }
  },

  async evaluateInterviewAnswer(question: string, answer: string, role: string, context: unknown = {}): Promise<InterviewEvaluationResult> {
    const systemPrompt = `You are an expert interviewer and evaluator for a "${role}" position.

You are evaluating a candidate's response to an interview question. Be thorough, fair, and specific in your evaluation.

EVALUATION CRITERIA:
1. technicalAccuracy (0-100): How technically correct is the answer?
2. conceptUnderstanding (0-100): Does the candidate truly understand the concepts?
3. problemSolving (0-100): If applicable, does the approach solve the problem effectively?
4. communication (0-100): Is the answer clear, well-organized, and easy to follow?
5. completeness (0-100): Does the answer cover important aspects? Are there gaps?
6. confidence (0-100): Does the candidate sound knowledgeable and confident?

OVERALL SCORE: Average of the dimension scores, adjusted for severity of any major gaps.

SCORING GUIDELINES:
- 90-100: Excellent response, demonstrates deep expertise
- 80-89: Very good, shows solid understanding with minor gaps
- 70-79: Good, demonstrates competence but has some areas for improvement
- 60-69: Adequate, shows basic understanding but significant gaps
- 50-59: Below average, multiple issues or incomplete understanding
- Below 50: Poor response, fundamental misunderstandings or major gaps

Return ONLY valid JSON with this exact structure:
{
  "score": 75,
  "technicalAccuracy": 75,
  "conceptUnderstanding": 75,
  "problemSolving": 75,
  "communication": 75,
  "completeness": 75,
  "confidence": 75,
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "improvements": ["Improvement suggestion 1", "Improvement suggestion 2"],
  "idealAnswerPoints": ["Should mention X", "Should explain Y", "Consider adding Z"]
}

RULES:
- All scores must be integers between 0-100.
- Be specific in feedback - avoid vague comments.
- strengths, weaknesses, improvements, and idealAnswerPoints should each have 2-4 items.
- If the answer is excellent, acknowledge what they did well.
- If the answer is weak, provide constructive feedback on how to improve.
- Consider the role context: technical questions weight technical accuracy and problem-solving higher.
- For behavioral questions, weight communication and confidence higher.
`

    const userPrompt = `
ROLE: ${role}

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

CANDIDATE CONTEXT:
${JSON.stringify(context, null, 2)}

Please evaluate this answer and provide detailed feedback.
`

    try {
      const responseText = await callAI(systemPrompt, userPrompt)
      return InterviewEvaluationResultSchema.parse(parseJsonResponse(responseText))
    } catch (error) {
      console.error('aiService.evaluateInterviewAnswer error:', error)
      console.warn('[Interview AI] Using deterministic answer evaluation fallback')
      return localInterviewEvaluation(question, answer)
    }
  },

  async evaluateInterview(
    role: string,
    interviewType: string,
    difficulty: string,
    questions: Array<{ id: number; question: string; topic: string; userAnswer: string }>,
    context: unknown = {},
  ): Promise<InterviewBatchEvaluationResult> {
    const systemPrompt = `You are evaluating a completed ${interviewType} interview for a ${role} candidate at ${difficulty} difficulty.
Return ONLY valid JSON matching the requested schema. Evaluate every supplied answer semantically; never invent an answer or score.
All numeric scores must be integers from 0 to 100. The answers array must contain exactly one item for every question ID.`
    const userPrompt = `Role: ${role}\nInterview type: ${interviewType}\nDifficulty: ${difficulty}\nCandidate context: ${JSON.stringify(context)}\nQuestions and answers: ${JSON.stringify(questions)}`
    let lastError: unknown

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const parsed = InterviewBatchEvaluationResultSchema.parse(parseJsonResponse(await callAI(systemPrompt, userPrompt)))
        const suppliedQuestionIds = new Set(questions.map((question) => String(question.id)))
        const returnedQuestionIds = parsed.answers.map((answer) => answer.questionId)
        const uniqueQuestionIds = new Set(returnedQuestionIds)
        if (
          parsed.answers.length !== questions.length
          || uniqueQuestionIds.size !== returnedQuestionIds.length
          || returnedQuestionIds.some((questionId) => !suppliedQuestionIds.has(questionId))
          || suppliedQuestionIds.size !== uniqueQuestionIds.size
        ) {
          throw new Error('AI evaluation did not include exactly one result for every supplied question.')
        }
        return parsed
      } catch (error) {
        lastError = error
        console.error(`aiService.evaluateInterview attempt ${attempt + 1} failed:`, error)
      }
    }

    throw new Error('AI interview evaluation failed after one retry.', { cause: lastError })
  }
}

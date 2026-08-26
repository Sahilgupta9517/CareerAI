export type JobProviderStatus = 'available' | 'unavailable' | 'rate_limited' | 'unauthorized' | 'invalid_response' | 'timeout' | 'failed'

export interface NormalizedProviderJob {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  employmentType: string
  experienceLevel: string
  salary?: string
  description: string
  skills: string[]
  postedAt: string
  applyUrl?: string
  source: string
}

export interface JobProviderResult {
  jobs: NormalizedProviderJob[]
  page: number
  pageSize: number
  hasMore: boolean
  status: JobProviderStatus
  source: string
}

export interface JobProvider {
  readonly name: string
  search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult>
}

export class JobProviderError extends Error {
  readonly status: JobProviderStatus
  constructor(status: JobProviderStatus, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.status = status
    this.name = 'JobProviderError'
  }
}

const cache = new Map<string, { expiresAt: number; result: JobProviderResult }>()
const cacheTtlMs = 5 * 60 * 1000

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const validUrl = (value: unknown) => {
  const candidate = text(value)
  if (!candidate) return undefined
  try {
    const url = new URL(candidate)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch { return undefined }
}
const listValue = (value: unknown) => Array.isArray(value) ? value.flatMap((item) => typeof item === 'string' ? [item.trim()] : []) .filter(Boolean).slice(0, 30) : []

const extractJobs = (payload: unknown): { items: unknown[]; hasMore: boolean } => {
  if (Array.isArray(payload)) return { items: payload, hasMore: false }
  if (!isRecord(payload)) throw new JobProviderError('invalid_response', 'Job provider returned an invalid response.')
  const items = Array.isArray(payload.jobs) ? payload.jobs : Array.isArray(payload.results) ? payload.results : Array.isArray(payload.data) ? payload.data : null
  if (!items) throw new JobProviderError('invalid_response', 'Job provider returned no valid job collection.')
  return { items, hasMore: payload.hasMore === true || payload.nextPage !== null && payload.nextPage !== undefined }
}

const normalizeJob = (value: unknown, source: string, index: number): NormalizedProviderJob | null => {
  if (!isRecord(value)) return null
  const title = text(value.title ?? value.position ?? value.job_title)
  const company = text(value.company ?? value.companyName ?? value.employer_name)
  const description = text(value.description ?? value.snippet ?? value.summary)
  if (!title || !company || !description) return null
  const applyUrl = validUrl(value.applyUrl ?? value.apply_url ?? value.url ?? value.redirect_url)
  const location = text(value.location ?? value.locationName ?? value.city) || 'Location not listed'
  const remote = value.remote === true || /remote/i.test(location) || /remote/i.test(text(value.workMode))
  const id = text(value.id ?? value.jobId ?? value.externalId) || `${source}-${title}-${company}-${index}`
  return {
    id: `${source}:${id}`,
    title,
    company,
    location,
    remote,
    employmentType: text(value.employmentType ?? value.employment_type ?? value.type) || 'Not listed',
    experienceLevel: text(value.experienceLevel ?? value.experience_level ?? value.experience) || 'Not listed',
    salary: text(value.salary ?? value.salaryRange) || undefined,
    description: description.slice(0, 1200),
    skills: listValue(value.skills ?? value.requiredSkills ?? value.tags),
    postedAt: text(value.postedAt ?? value.posted_at ?? value.datePosted) || 'Recently posted',
    applyUrl,
    source,
  }
}

const deduplicate = (jobs: NormalizedProviderJob[]) => {
  const seen = new Set<string>()
  return jobs.filter((job) => {
    const key = `${job.title}|${job.company}|${job.location}`.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const normalizeProviderResponse = (payload: unknown, source: string) => {
  const extracted = extractJobs(payload)
  const jobs = deduplicate(extracted.items.flatMap((item, index) => {
    const job = normalizeJob(item, source, index)
    return job ? [job] : []
  }))
  return { jobs, hasMore: extracted.hasMore }
}

export class RestJobProvider implements JobProvider {
  readonly name: string
  private readonly endpoint: string
  private readonly apiKey: string
  private readonly timeoutMs: number
  constructor(endpoint: string, apiKey: string, timeoutMs = 8000) {
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
    this.name = process.env.JOB_PROVIDER_NAME || 'Configured Job Provider'
  }

  async search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25))
    const url = new URL(this.endpoint)
    url.searchParams.set('page', String(page)); url.searchParams.set('pageSize', String(pageSize))
    if (input.query) url.searchParams.set('query', input.query)
    if (input.location) url.searchParams.set('location', input.location)
    const cacheKey = url.toString()
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.result
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) }, signal: controller.signal })
      if (response.status === 401 || response.status === 403) throw new JobProviderError('unauthorized', 'The configured job provider rejected the request.')
      if (response.status === 429) throw new JobProviderError('rate_limited', 'The configured job provider is rate limited.')
      if (!response.ok) throw new JobProviderError('failed', 'The configured job provider is unavailable.')
      const payload = await response.json().catch(() => { throw new JobProviderError('invalid_response', 'The configured job provider returned invalid JSON.') })
      const normalized = normalizeProviderResponse(payload, this.name)
      const result = { jobs: normalized.jobs, page, pageSize, hasMore: normalized.hasMore || normalized.jobs.length >= pageSize, status: 'available' as const, source: this.name }
      cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, result })
      return result
    } catch (error) {
      if (error instanceof JobProviderError) throw error
      if (error instanceof Error && error.name === 'AbortError') throw new JobProviderError('timeout', 'The configured job provider timed out.', { cause: error })
      throw new JobProviderError('failed', 'The configured job provider could not be reached.', { cause: error })
    } finally { clearTimeout(timeout) }
  }
}

export const createConfiguredJobProvider = (): JobProvider | null => {
  const provider = (process.env.JOB_PROVIDER || '').toLowerCase()
  const endpoint = text(process.env.JOB_PROVIDER_URL)
  if (!provider || provider === 'demo' || !endpoint || /your[-_]legitimate[-_]job[-_]api|your[-_].*example|example\.com/i.test(endpoint)) return null
  const url = validUrl(endpoint)
  if (!url) throw new JobProviderError('invalid_response', 'JOB_PROVIDER_URL must be an HTTPS URL.')
  return new RestJobProvider(url, process.env.JOB_PROVIDER_API_KEY || '', Number(process.env.JOB_PROVIDER_TIMEOUT_MS) || 8000)
}

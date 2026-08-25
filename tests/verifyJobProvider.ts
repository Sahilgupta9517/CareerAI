import { JobProviderError, RestJobProvider, normalizeProviderResponse } from '../server/services/jobProvider.ts'

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const normalized = normalizeProviderResponse({ jobs: [
  { id: '1', title: 'Python Developer', company: 'Acme', location: 'Remote', remote: true, employment_type: 'Full-time', experience_level: 'junior', description: 'Build services.', skills: ['Python'], posted_at: 'today', url: 'https://example.com/job/1' },
  { id: '1-copy', title: 'Python Developer', company: 'Acme', location: 'Remote', remote: true, employment_type: 'Full-time', experience_level: 'junior', description: 'Duplicate.', skills: ['Python'], url: 'http://unsafe.example/job/1' },
  { title: 'Incomplete listing' },
] }, 'Test Provider')
assert(normalized.jobs.length === 1, 'expected malformed and duplicate jobs to be removed')
assert(normalized.jobs[0].applyUrl === 'https://example.com/job/1', 'expected HTTPS apply URL')
assert(normalized.jobs[0].remote && normalized.jobs[0].employmentType === 'Full-time', 'expected normalized provider fields')

try { normalizeProviderResponse({ unexpected: true }, 'Test Provider'); throw new Error('expected malformed response failure') } catch (error) { assert(error instanceof JobProviderError && error.status === 'invalid_response', 'expected typed malformed response error') }

const originalFetch = globalThis.fetch
globalThis.fetch = (async () => new Response('', { status: 429 })) as typeof fetch
try {
  await new RestJobProvider('https://provider.example/jobs', 'server-only-key').search({})
  throw new Error('expected rate limit failure')
} catch (error) { assert(error instanceof JobProviderError && error.status === 'rate_limited', 'expected typed rate limit error') }
globalThis.fetch = originalFetch
console.log('job provider checks passed')

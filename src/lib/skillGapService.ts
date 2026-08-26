import { supabase } from '@/lib/supabase'
import type { SkillGapAnalysis } from '@/types/skillGap'

export async function runSkillGapAnalysis(input: { targetRole: string; requiredSkills: string[]; preferredSkills: string[]; resumeAnalysis: unknown; profileContext: unknown; force?: boolean }): Promise<SkillGapAnalysis & { cached?: boolean }> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Your session has expired. Please sign in again.')
  const response = await fetch('/api/skill-gap/analyze', {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const result = await response.json().catch(() => null) as SkillGapAnalysis & { error?: string | { code?: string; message?: string } }
  if (!response.ok) {
    const message = typeof result?.error === 'string' ? result.error : result?.error?.message || 'AI analysis is temporarily unavailable. Please try again.'
    throw new Error(/timed out|provider|quota|rate limit|unavailable|429|too many requests|openrouter request failed/i.test(message) ? 'AI analysis is temporarily unavailable. Please try again.' : message)
  }
  return result
}
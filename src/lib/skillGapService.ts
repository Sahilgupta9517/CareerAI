import { supabase } from '@/lib/supabase'
import type { SkillGapAnalysis } from '@/types/skillGap'

export async function runSkillGapAnalysis(input: { targetRole: string; requiredSkills: string[]; preferredSkills: string[]; resumeAnalysis: unknown; profileContext: unknown }): Promise<SkillGapAnalysis> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Your session has expired. Please sign in again.')
  const response = await fetch('/api/skill-gap/analyze', {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const result = await response.json().catch(() => null) as SkillGapAnalysis & { error?: string }
  if (!response.ok) throw new Error(result?.error || 'Skill-gap analysis failed. Please try again.')
  return result
}
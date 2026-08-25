import { demoJobs } from '@/data/jobs'
import { roleRequirements } from '@/data/roleRequirements'
import { getProfile, type ProfileBundle } from '@/lib/profileService'
import { calculateJobMatch, sortJobs } from '@/lib/jobMatching'
import { calculateRoleReadiness, compareRoleSkills } from '@/lib/skillMatching'
import type { SkillComparison, UserSkill } from '@/types/skillGap'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'

export type DashboardStats = {
  resumeScore: number | null
  interviewScore: number | null
  skillsCount: number
  latestResumeAnalysis: { filename?: string | null; overall_score?: number | null; created_at?: string | null } | null
  interviewHistory: Array<{ id: string | number; job_role?: string | null; score?: number | null; created_at?: string | null }>
  savedJobsCount?: number
  appliedCount?: number
  interviewCount?: number
  offerCount?: number
  rejectedCount?: number
}

export type DashboardOverview = {
  profile: ProfileBundle
  stats: DashboardStats | null
  role: typeof roleRequirements[number] | null
  readiness: number | null
  skillAverage: number | null
  skillComparisons: SkillComparison[]
  jobs: ReturnType<typeof calculateJobMatch>[]
  roadmap: { total: number; completed: number; inProgress: number } | null
}

const averageProficiency = (skills: ProfileBundle['skills']) => skills.length ? Math.round(skills.reduce((sum, skill) => sum + skill.proficiency, 0) / skills.length) : null

const getStats = async (): Promise<DashboardStats | null> => {
  const { data: sessionData, error } = await supabase.auth.getSession()
  if (error || !sessionData.session) return null
  try {
    return await fetchApi<DashboardStats>('/api/dashboard-stats', { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }, 'Dashboard stats')
  } catch (statsError) {
    if (import.meta.env.DEV) console.error('[Dashboard stats] optional stats unavailable', statsError)
    return null
  }
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const profile = await getProfile()
  const stats = await getStats()
  const role = roleRequirements.find((item) => item.title === profile.goal?.target_role) ?? null
  const userSkills: UserSkill[] = profile.skills.map((skill) => ({ name: skill.name, proficiency: skill.proficiency }))
  const skillComparisons = role ? compareRoleSkills(role, userSkills) : []
  const readiness = role ? calculateRoleReadiness(role, userSkills) : null
  const skillNames = profile.skills.map((skill) => skill.name)
  const jobs = profile.goal?.target_role ? sortJobs(demoJobs.map((job) => calculateJobMatch(job, skillNames, profile.goal?.target_role ?? '')), 'Best Match').slice(0, 3) : []
  const { data: roadmapRows } = await supabase.from('roadmap_progress').select('status').eq('profile_id', profile.profile.id)
  const roadmap = roadmapRows ? { total: roadmapRows.length, completed: roadmapRows.filter((row) => row.status === 'completed').length, inProgress: roadmapRows.filter((row) => row.status === 'in_progress').length } : null
  return { profile, stats, role, readiness, skillAverage: averageProficiency(profile.skills), skillComparisons, jobs, roadmap }
}
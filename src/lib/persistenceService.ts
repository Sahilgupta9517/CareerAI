/**
 * Data service for job matching persistence
 * Handles loading and saving data from Supabase
 */

import { supabase } from './supabase'
import { sanitizeSkillList } from './resumeParser'

export type JobMatchingErrorKind = 'AUTH' | 'PROFILE' | 'CAREER_GOAL' | 'SKILLS' | 'RESUME' | 'AI_ANALYSIS' | 'SAVED_JOBS' | 'APPLICATION' | 'APPLICATION_QUERY' | 'APPLICATION_INSERT' | 'APPLICATION_UPDATE' | 'INTERVIEW' | 'EVALUATION' | 'COMPLETION' | 'HISTORY' | 'DETAILS' | 'DELETE'

export class JobMatchingError extends Error {
  public readonly kind: JobMatchingErrorKind

  constructor(kind: JobMatchingErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.kind = kind
    this.name = 'JobMatchingError'
  }
}

export type ApplicationStatus = 'saved' | 'applied' | 'assessment' | 'interview' | 'rejected' | 'offer'

export interface SavedJob {
  id: number
  profile_id: number
  job_id: string
  created_at: string
}

export interface JobApplication {
  id: number
  profile_id: number
  job_id: string
  status: ApplicationStatus
  applied_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CareerGoal {
  id: number
  profile_id: number
  target_role: string
  preferred_location: string | null
  work_preference: string | null
  goal_description: string | null
  created_at: string
  updated_at: string
}

export interface CareerAnalysis {
  id: number
  profile_id: number
  target_role: string
  career_summary: string
  strengths: Array<{ skill: string; reason: string }>
  skill_gaps: Array<{ skill: string; current_level: number; target_level: number; priority: string; reason: string }>
  recommended_skills: Array<{ skill: string; reason: string }>
  learning_strategy: Array<{ step: number; title: string; description: string }>
  recommended_roles: Array<{ role: string; match_percentage: number; reason: string }>
  interview_preparation: Array<{ topic: string; questions: string[] }>
  created_at: string
  updated_at: string
}

const applicationFailureMessage = (error: { code?: string; message?: string }) => {
  if (error.code === 'PGRST205') return 'Application tracking is not configured yet. Apply the existing job persistence migration, then retry.'
  if (error.code === '42501') return 'Application tracking is blocked by your account permissions. Please sign in again and retry.'
  return error.message || 'Application status could not be saved. Please try again.'
}

/**
 * Get the authenticated user's profile ID
 */
export async function getCurrentProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw new JobMatchingError('AUTH', 'Your session could not be verified.', { cause: userError })
  if (!userData.user) throw new JobMatchingError('AUTH', 'Your session has expired. Please sign in again.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, name, education, branch, experience, location')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle()

  if (profileError) throw new JobMatchingError('PROFILE', 'Your profile could not be loaded.', { cause: profileError })

  if (!profile) {
    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert({ user_id: userData.user.id })
      .select('id, user_id, name, education, branch, experience, location')
      .single()

    if (createError) {
      throw new JobMatchingError('PROFILE', 'Your profile could not be created. Please complete your profile setup.', { cause: createError })
    }

    return createdProfile
  }

  return profile
}

/**
 * Get or create career goal
 */
export async function getCareerGoal(profileId: number): Promise<CareerGoal | null> {
  const { data, error } = await supabase
    .from('career_goals')
    .select('*')
    .eq('profile_id', profileId)
    .limit(1)
    .maybeSingle()

  if (error) throw new JobMatchingError('CAREER_GOAL', 'Your target role could not be loaded.', { cause: error })
  return data
}

/**
 * Update or create career goal with target role
 */
export async function setTargetRole(profileId: number, targetRole: string): Promise<CareerGoal> {
  const { data: existing } = await supabase
    .from('career_goals')
    .select('id')
    .eq('profile_id', profileId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('career_goals')
      .update({ target_role: targetRole, updated_at: new Date().toISOString() })
      .eq('profile_id', profileId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('career_goals')
      .insert({
        profile_id: profileId,
        target_role: targetRole,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get the latest career analysis for a target role
 */
export async function getLatestCareerAnalysis(profileId: number, targetRole: string): Promise<CareerAnalysis | null> {
  const { data, error } = await supabase
    .from('career_analyses')
    .select('*')
    .eq('profile_id', profileId)
    .eq('target_role', targetRole)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new JobMatchingError('AI_ANALYSIS', 'Career Analysis could not be loaded for the current target role.', { cause: error })
  return data
}

/**
 * Get all saved jobs for a profile
 */
export async function getSavedJobs(profileId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_jobs')
    .select('job_id')
    .eq('profile_id', profileId)

  if (error) throw new JobMatchingError('SAVED_JOBS', 'Saved jobs could not be loaded.', { cause: error })
  return data?.map(row => row.job_id) ?? []
}

/**
 * Save a job
 */
export async function saveJob(profileId: number, jobId: string): Promise<SavedJob> {
  const { data, error } = await supabase
    .from('saved_jobs')
    .insert({ profile_id: profileId, job_id: jobId })
    .select()
    .single()

  if (error && error.code !== '23505') throw error // 23505 = unique constraint, job already saved
  if (error && error.code === '23505') {
    // Job already saved, return existing
    const { data: existing } = await supabase
      .from('saved_jobs')
      .select()
      .eq('profile_id', profileId)
      .eq('job_id', jobId)
      .single()
    return existing
  }
  return data
}

/**
 * Unsave a job
 */
export async function unsaveJob(profileId: number, jobId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_jobs')
    .delete()
    .eq('profile_id', profileId)
    .eq('job_id', jobId)

  if (error) throw error
}

/**
 * Get all job applications for a profile
 */
export async function getJobApplications(profileId: number): Promise<JobApplication[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('id, profile_id, job_id, status, applied_at, notes, created_at, updated_at')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })

  if (error) {
    logJobMatchingError('APPLICATION_QUERY', error)
    throw new JobMatchingError('APPLICATION_QUERY', applicationFailureMessage(error), { cause: error })
  }
  return (data ?? []).map((row) => ({
    ...row,
    status: row.status as ApplicationStatus,
    applied_at: row.applied_at ?? null,
    notes: row.notes ?? null,
  }))
}

/**
 * Get application status for a job
 */
export async function getApplicationStatus(profileId: number, jobId: string): Promise<ApplicationStatus | null> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('status')
    .eq('profile_id', profileId)
    .eq('job_id', jobId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.status ?? null
}

/**
 * Update or create job application
 */
export async function updateJobApplication(
  profileId: number,
  jobId: string,
  status: ApplicationStatus,
  notes?: string,
): Promise<JobApplication> {
  const now = new Date().toISOString()
  const payload = {
    profile_id: profileId,
    job_id: jobId,
    status,
    notes: notes ?? null,
    updated_at: now,
    ...(status === 'applied' ? { applied_at: now } : {}),
  }
  const { data, error } = await supabase
    .from('job_applications')
    .upsert(payload, { onConflict: 'profile_id,job_id' })
    .select('id, profile_id, job_id, status, applied_at, notes, created_at, updated_at')
    .single()

  if (error) {
    const kind = error.code === '23505' ? 'APPLICATION_INSERT' : 'APPLICATION_UPDATE'
    logJobMatchingError(kind, error)
    throw new JobMatchingError(kind, applicationFailureMessage(error), { cause: error })
  }
  return { ...data, status: data.status as ApplicationStatus, applied_at: data.applied_at ?? null, notes: data.notes ?? null }
}

/**
 * Load all user-specific data needed for job matching
 */
export async function loadUserJobMatchingData(profileId: number) {
  const careerGoal = await getCareerGoal(profileId)
  const userSkills = await loadUserSkills(profileId)
  let savedJobIds: string[] = []

  try {
    savedJobIds = await getSavedJobs(profileId)
  } catch (error) {
    logJobMatchingError('SAVED_JOBS', error)
  }

  return {
    careerGoal,
    targetRole: careerGoal?.target_role ?? '',
    userSkills,
    savedJobIds,
  }
}

/**
 * Load user skills from Supabase
 */
async function loadUserSkills(profileId: number): Promise<string[]> {
  const skillsResponse = await supabase
    .from('user_skills')
    .select('id, skill_id, proficiency, skill:skills(id, name, category)')
    .eq('profile_id', profileId)
  let rawSkillData: unknown[] = skillsResponse.data ?? []

  if (skillsResponse.error) {
    logJobMatchingError('SKILLS', skillsResponse.error)
    const directResponse = await supabase
      .from('user_skills')
      .select('id, skill_id, proficiency')
      .eq('profile_id', profileId)
    if (directResponse.error) {
      logJobMatchingError('SKILLS', directResponse.error)
      throw new JobMatchingError('SKILLS', 'Your saved skills could not be loaded.', { cause: directResponse.error })
    }
    rawSkillData = (directResponse.data ?? []).map((row) => ({ ...row, skill: null }))
  }

  type SkillRow = { id?: number; skill_id: number; proficiency?: number | null; skill?: { id: number; name: string; category: string | null } | Array<{ id: number; name: string; category: string | null }> | null }
  const rows = rawSkillData as SkillRow[]
  const relationSkills = rows.flatMap((row) => Array.isArray(row.skill) ? row.skill : row.skill ? [row.skill] : [])
  let skillLookup = new Map(relationSkills.map((skill) => [skill.id, skill]))

  // PostgREST may not expose the relationship in every deployed schema. Resolve by FK
  // without inventing names, while retaining the same authenticated profile scope.
  if (relationSkills.length < rows.length) {
    const skillIds = [...new Set(rows.map((row) => row.skill_id).filter((id) => Number.isFinite(id)))]
    if (skillIds.length) {
      const directResponse = await supabase.from('skills').select('id, name, category').in('id', skillIds)
      if (directResponse.error) {
        logJobMatchingError('SKILLS', directResponse.error)
        throw new JobMatchingError('SKILLS', 'Your saved skills could not be resolved to the skills catalog.', { cause: directResponse.error })
      }
      skillLookup = new Map((directResponse.data ?? []).map((skill) => [skill.id, skill]))
    }
  }

  const savedSkills = sanitizeSkillList(rows
    .map((row) => skillLookup.get(row.skill_id)?.name)
    .filter((name): name is string => Boolean(name && name.trim())))

  let resumeSkills: string[] = []
  try {
    const { data: latestResume, error: resumeError } = await supabase
      .from('resume_analyses')
      .select('structured_resume')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (resumeError) throw resumeError
    const persisted = latestResume?.structured_resume
    const persistedSkills =
      persisted && typeof persisted === 'object' && 'technicalSkills' in persisted && Array.isArray(persisted.technicalSkills)
        ? sanitizeSkillList(persisted.technicalSkills)
        : []
    resumeSkills = persistedSkills
  } catch (error) {
    logJobMatchingError('RESUME', error)
    resumeSkills = []
  }

  const seen = new Set<string>()
  return [...savedSkills, ...resumeSkills].filter((skill) => {
    const key = skill.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function logJobMatchingError(kind: JobMatchingErrorKind, error: unknown) {
  if (import.meta.env.DEV) console.error(`[JobMatching] ${kind} load failed:`, error)
}

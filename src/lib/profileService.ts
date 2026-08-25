import { supabase } from './supabase'
import { sanitizeSkillList } from './resumeParser'

export const SKILL_CATEGORIES = ['Programming', 'Frontend', 'Backend', 'Database', 'DevOps', 'AI / Machine Learning', 'Data Science', 'Tools', 'Cloud', 'Soft Skills', 'Other'] as const
export type SkillCategory = typeof SKILL_CATEGORIES[number]

export interface ProfileRecord { id: number; user_id: string; name: string | null; education: string | null; branch: string | null; graduation_year: string | null; experience: string | null; location: string | null; created_at?: string }
export interface ProfileSkill { id: number; skillId: number; name: string; category: string; proficiency: number }
export interface ProfileProject { id: number; name: string; description: string; technologies: string[]; githubUrl: string | null; liveUrl: string | null; projectType: string | null; startDate: string | null; endDate: string | null; createdAt: string; updatedAt: string }
export interface ProfileBundle { userId: string; email: string; profile: ProfileRecord; goal: { target_role: string; goal_description: string | null; work_preference: string | null; preferred_location: string | null } | null; preferences: { preferred_industries?: string | null; preferred_work_mode?: string | null } | null; skills: ProfileSkill[]; projects: ProfileProject[]; resume: { id: number; filename: string; created_at: string; file_size: number; extracted_text?: string | null } | null }

const userContext = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error('Your session could not be verified.')
  if (!data.user) throw new Error('Your session has expired. Please sign in again.')
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id, user_id, name, education, branch, graduation_year, experience, location, created_at').eq('user_id', data.user.id).limit(1).maybeSingle()
  if (profileError) throw new Error('Your profile could not be loaded.')
  if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')
  return { user: data.user, profile: profile as ProfileRecord }
}

export async function getProfile(): Promise<ProfileBundle> {
  const { user, profile } = await userContext()
  const [goalResult, preferencesResult, skillsResult, projectsResult, resumeResult] = await Promise.all([
    supabase.from('career_goals').select('target_role, goal_description, work_preference, preferred_location').eq('profile_id', profile.id).limit(1).maybeSingle(),
    supabase.from('user_preferences').select('preferred_industries, preferred_work_mode').eq('profile_id', profile.id).limit(1).maybeSingle(),
    supabase.from('user_skills').select('id, skill_id, proficiency, skill:skills(name, category)').eq('profile_id', profile.id),
    supabase.from('projects').select('id, name, description, technologies, github_url, live_url, project_type, start_date, end_date, created_at, updated_at').eq('profile_id', profile.id).order('updated_at', { ascending: false }),
    supabase.from('resume_analyses').select('id, filename, file_size, extracted_text, created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (goalResult.error || preferencesResult.error || skillsResult.error || projectsResult.error || resumeResult.error) throw new Error('Some profile data could not be loaded. Please retry.')
  const seenSkills = new Set<string>()
  const skills = (skillsResult.data ?? []).flatMap((row) => {
    const relation = row.skill as unknown as { name?: string; category?: string | null } | null
    const names = sanitizeSkillList([relation?.name])
    const name = names[0]
    const key = name?.toLowerCase()
    if (!name || !key || seenSkills.has(key)) return []
    seenSkills.add(key)
    const category = SKILL_CATEGORIES.includes(relation?.category as SkillCategory) ? relation?.category as SkillCategory : 'Other'
    return [{ id: row.id, skillId: row.skill_id, name, category, proficiency: Number(row.proficiency) || 0 }]
  })
  const projects = (projectsResult.data ?? []).map((project) => ({ id: project.id, name: project.name, description: project.description, technologies: sanitizeSkillList(project.technologies), githubUrl: project.github_url, liveUrl: project.live_url, projectType: project.project_type, startDate: project.start_date, endDate: project.end_date, createdAt: project.created_at, updatedAt: project.updated_at }))
  return { userId: user.id, email: user.email ?? '', profile, goal: goalResult.data, preferences: preferencesResult.data, skills, projects, resume: resumeResult.data }
}

export async function updateProfile(input: { name: string; location: string; graduationYear: string; education: string; branch: string; summary: string; targetRole: string; goal: string; workPreference: string; industry: string }) {
  const { profile } = await userContext()
  if (!input.name.trim()) throw new Error('Name cannot be empty.')
  if (!input.targetRole.trim()) throw new Error('Target role cannot be empty.')
  if (!/^\d{4}$/.test(input.graduationYear) || Number(input.graduationYear) < 1950 || Number(input.graduationYear) > 2200) throw new Error('Enter a valid graduation year.')
  const { error: profileError } = await supabase.from('profiles').update({ name: input.name.trim(), location: input.location.trim() || null, graduation_year: input.graduationYear, education: input.education.trim() || null, branch: input.branch.trim() || null, experience: input.summary.trim() || null }).eq('id', profile.id)
  if (profileError) throw new Error('Your profile details could not be saved.')
  const goal = { profile_id: profile.id, target_role: input.targetRole.trim(), goal_description: input.goal.trim() || null, work_preference: input.workPreference.trim() || null, preferred_location: input.location.trim() || null }
  const { data: existingGoal } = await supabase.from('career_goals').select('id').eq('profile_id', profile.id).limit(1).maybeSingle()
  const goalResult = existingGoal ? await supabase.from('career_goals').update(goal).eq('id', existingGoal.id) : await supabase.from('career_goals').insert(goal)
  if (goalResult.error) throw new Error('Your career goal could not be saved.')
  const preferences = { profile_id: profile.id, preferred_work_mode: input.workPreference.trim() || null, preferred_locations: input.location.trim() || null, preferred_industries: input.industry.trim() || null }
  const { data: existingPreferences } = await supabase.from('user_preferences').select('id').eq('profile_id', profile.id).limit(1).maybeSingle()
  const preferencesResult = existingPreferences ? await supabase.from('user_preferences').update(preferences).eq('id', existingPreferences.id) : await supabase.from('user_preferences').insert(preferences)
  if (preferencesResult.error) throw new Error('Your career preferences could not be saved.')
}

export async function addProject(input: { name: string; description: string; technologies: string[]; githubUrl?: string; liveUrl?: string; projectType?: string }) { const { profile } = await userContext(); if (!input.name.trim() || !input.description.trim()) throw new Error('Project name and description are required.'); for (const value of [input.githubUrl, input.liveUrl]) if (value) { try { if (new URL(value).protocol !== 'https:') throw new Error() } catch { throw new Error('Project links must be valid HTTPS URLs.') } } const { error } = await supabase.from('projects').insert({ profile_id: profile.id, name: input.name.trim(), description: input.description.trim(), technologies: sanitizeSkillList(input.technologies), github_url: input.githubUrl || null, live_url: input.liveUrl || null, project_type: input.projectType || null }); if (error) throw new Error('Project could not be saved.') }
export async function deleteProject(id: number) { const { profile } = await userContext(); const { error } = await supabase.from('projects').delete().eq('id', id).eq('profile_id', profile.id); if (error) throw new Error('Project could not be deleted.') }
export async function updateSkill(id: number, proficiency: number) { const { profile } = await userContext(); const { error } = await supabase.from('user_skills').update({ proficiency: Math.min(100, Math.max(0, Math.round(proficiency))) }).eq('id', id).eq('profile_id', profile.id); if (error) throw new Error('Skill proficiency could not be updated.') }
export async function deleteSkill(id: number) { const { profile } = await userContext(); const { error } = await supabase.from('user_skills').delete().eq('id', id).eq('profile_id', profile.id); if (error) throw new Error('Skill could not be deleted.') }
export async function addSkill(name: string, category: string, proficiency: number) { const { profile } = await userContext(); if (!SKILL_CATEGORIES.includes(category as SkillCategory)) throw new Error('Choose a valid skill category.'); if (!Number.isFinite(proficiency) || proficiency < 0 || proficiency > 100) throw new Error('Proficiency must be between 0 and 100.'); const canonical = sanitizeSkillList([name])[0]; if (!canonical) throw new Error('Choose a valid technical skill from the supported catalog.'); let { data: catalog } = await supabase.from('skills').select('id, name').ilike('name', canonical).limit(1).maybeSingle(); if (!catalog) { const result = await supabase.from('skills').insert({ name: canonical, category }).select('id, name').single(); if (result.error) throw new Error('This skill is not available in the skills catalog.'); catalog = result.data } const { data: duplicate } = await supabase.from('user_skills').select('id').eq('profile_id', profile.id).eq('skill_id', catalog.id).limit(1).maybeSingle(); if (duplicate) throw new Error('That skill is already on your profile.'); const { error } = await supabase.from('user_skills').insert({ profile_id: profile.id, skill_id: catalog.id, proficiency: Math.round(proficiency) }); if (error) throw new Error('Skill could not be added.') }
export const calculateProfileStrength = (data: Pick<ProfileBundle, 'profile' | 'goal' | 'skills' | 'projects' | 'resume' | 'preferences'>) => { const complete = { basic: Boolean(data.profile.name), role: Boolean(data.goal?.target_role), skills: data.skills.length > 0, resume: Boolean(data.resume), education: Boolean(data.profile.education || data.profile.branch || data.profile.graduation_year), projects: data.projects.length > 0 || Boolean(data.profile.experience), preferences: Boolean(data.goal?.work_preference || data.preferences?.preferred_industries) }; const weights = { basic: 15, role: 15, skills: 15, resume: 15, education: 15, projects: 15, preferences: 10 }; const sections = Object.fromEntries(Object.entries(weights).map(([key, weight]) => [key, complete[key as keyof typeof complete] ? weight : 0])) as typeof weights; const total = Object.values(sections).reduce((sum, value) => sum + value, 0); const missing = Object.entries(complete).filter(([, value]) => !value).map(([key]) => key); return { total, sections, completed: Object.values(complete).filter(Boolean).length, missing } }

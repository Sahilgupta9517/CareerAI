import { getCurrentProfile, type CareerAnalysis, JobMatchingError } from './persistenceService'
import { supabase } from './supabase'
import { sanitizeSkillList } from './resumeParser'
import type { ParsedResume } from './resumeParser'

export type InterviewType = 'Technical' | 'HR' | 'Behavioral' | 'Mixed' | 'Role-specific'
export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'

export type InterviewQuestion = {
  question: string
  topic: string
  difficulty: InterviewDifficulty
  questionType: 'technical' | 'behavioral' | 'coding' | 'resume'
  expectedAnswer?: string
  questionSource?: 'role' | 'resume' | 'project' | 'skill_gap' | 'career_analysis' | 'behavioral'
  resumeContext?: string
  skillArea?: string
  adaptiveReason?: string
  basedOnPreviousScore?: boolean
}

export type AnswerEvaluation = {
  score: number
  technicalAccuracy: number
  conceptUnderstanding: number
  problemSolving: number
  communication: number
  completeness: number
  strengths: string[]
  improvements: string[]
  idealAnswerPoints: string[]
  confidence: number
}

export type MockInterview = {
  id: number
  profile_id: number
  target_role: string
  interview_type: InterviewType
  difficulty: InterviewDifficulty
  total_questions: number
  completed_questions: number
  overall_score: number | null
  technical_score: number | null
  communication_score: number | null
  problem_solving_score: number | null
  confidence_score: number | null
  question_count?: number
  duration_minutes?: number
  status?: string
  started_at: string
  completed_at: string | null
  created_at: string
  updated_at?: string | null
  role_knowledge_score?: number | null
  clarity_score?: number | null
  summary?: string | null
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
  personalized?: boolean
  resume_snapshot?: Record<string, unknown>
}

export type MockInterviewQuestion = InterviewQuestion & {
  expectedTopics?: string[]
  id?: number
  interview_id?: number
  user_answer?: string | null
  score?: number | null
  feedback?: AnswerEvaluation | null
  response_time_seconds?: number | null
  skipped?: boolean
  time_taken_seconds?: number | null
  is_correct?: boolean | null
  expected_answer?: string | null
  questionSource?: string
  skillArea?: string | null
  adaptive_reason?: string | null
  based_on_previous_score?: boolean
}

export type InterviewContext = {
  targetRole: string
  experience: string | null
  education: string | null
  preferredJobType: string | null
  preferredWorkMode: string | null
  skills: Array<{ name: string; proficiency: number }>
  resumeSkills: string[]
  projects: string[]
  analysis: CareerAnalysis | null
  resumeText: string
  resume: ParsedResume | null
  skillGaps: string[]
}

function logInterviewFailure(error: unknown, userId: string | null, profileId: number | null, targetRole: string | null) {
  if (import.meta.env.DEV) {
    console.error('[Interview Debug]', {
      message: 'Interview data access failed',
      userId,
      profileId,
      targetRole,
      error,
    })
  }
}

export async function loadInterviewContext(): Promise<{ profileId: number; context: InterviewContext }> {
  if (import.meta.env.DEV) {
    console.group('[Interview Debug]')
    console.log('Loading interview context...')
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    const userId = userData?.user?.id ?? null

    if (import.meta.env.DEV) {
      console.log('Authenticated user:', userId ? { id: userId } : null)
    }

    if (userError || !userData?.user) {
      const authError = userError ?? new Error('User not authenticated')
      logInterviewFailure(authError, userId, null, null)
      throw new JobMatchingError('AUTH', 'Your session has expired. Please sign in again.', { cause: authError })
    }

    const profile = await getCurrentProfile()

    if (import.meta.env.DEV) {
      console.log('Profile:', profile)
      console.log('Profile ID:', profile.id)
    }

    const profileId = profile.id

    const [goalResult, preferenceResult, skillsResult, resumeResult] = await Promise.all([
      supabase.from('career_goals').select('target_role').eq('profile_id', profileId).limit(1).maybeSingle(),
      supabase.from('user_preferences').select('preferred_job_type, preferred_work_mode').eq('profile_id', profileId).limit(1).maybeSingle(),
      supabase.from('user_skills').select('id, skill_id, proficiency, skill:skills(id, name, category)').eq('profile_id', profileId),
      supabase.from('resume_analyses').select('extracted_text, structured_resume').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (import.meta.env.DEV) {
      console.log('Goal result:', goalResult)
      console.log('Preference result:', preferenceResult)
      console.log('Skills result:', skillsResult)
      console.log('Resume result:', resumeResult)
    }

    if (goalResult.error) throw new JobMatchingError('CAREER_GOAL', 'Your target role could not be loaded.', { cause: goalResult.error })
    if (preferenceResult.error) throw new JobMatchingError('PROFILE', 'Your job preferences could not be loaded.', { cause: preferenceResult.error })
    if (skillsResult.error) throw new JobMatchingError('SKILLS', 'Your interview skills could not be loaded.', { cause: skillsResult.error })
    if (resumeResult.error) throw new JobMatchingError('RESUME', 'Your resume context could not be loaded.', { cause: resumeResult.error })

    type SkillRow = {
      skill_id: number
      proficiency: number | null
      skill: { id: number; name: string; category: string | null } | Array<{ id: number; name: string; category: string | null }> | null
    }

    const skills = (skillsResult.data as SkillRow[] | null ?? []).flatMap((row) => {
      const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill
      return skill?.name ? [{ name: skill.name, proficiency: Number(row.proficiency) || 0 }] : []
    })

    const structured = resumeResult.data?.structured_resume
    const resumeText = resumeResult.data?.extracted_text ?? ''
    const resumeSkills = structured && typeof structured === 'object' && 'technicalSkills' in structured && Array.isArray(structured.technicalSkills)
      ? sanitizeSkillList(structured.technicalSkills)
      : []
    const projects = structured && typeof structured === 'object' && 'projects' in structured && Array.isArray(structured.projects)
      ? structured.projects
        .map((project: unknown) => typeof project === 'string'
          ? project
          : project && typeof project === 'object' && 'name' in project && typeof project.name === 'string'
            ? project.name
            : project && typeof project === 'object' && 'title' in project && typeof project.title === 'string'
              ? project.title
              : '')
        .filter(Boolean)
      : []

    const targetRole = goalResult.data?.target_role ?? ''
    if (import.meta.env.DEV) console.log('Target role:', targetRole)

    const { data: analysis } = targetRole
      ? await supabase.from('career_analyses').select('*').eq('profile_id', profileId).eq('target_role', targetRole).order('created_at', { ascending: false }).limit(1).maybeSingle()
      : { data: null }

    const context: InterviewContext = {
      targetRole,
      experience: profile.experience,
      education: profile.education,
      preferredJobType: preferenceResult.data?.preferred_job_type ?? null,
      preferredWorkMode: preferenceResult.data?.preferred_work_mode ?? null,
      skills,
      resumeSkills,
      projects,
      analysis: analysis as CareerAnalysis | null,
      resumeText,
      resume: structured && typeof structured === 'object' ? structured as ParsedResume : null,
      skillGaps: (analysis?.skill_gaps ?? []).map((gap: CareerAnalysis['skill_gaps'][number]) => gap.skill),
    }

    if (import.meta.env.DEV) {
      console.log('Interview context:', context)
    }

    return { profileId, context }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[Interview Debug] Interview context failed:', error)
    }
    logInterviewFailure(error, null, null, null)
    throw error
  } finally {
    if (import.meta.env.DEV) {
      console.groupEnd()
    }
  }
}

export async function loadInterviewDashboard() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    throw new JobMatchingError('AUTH', 'Your session has expired. Please sign in again.', { cause: userError ?? new Error('Missing authenticated user') })
  }

  const profile = await getCurrentProfile()
  const targetRoleRow = await supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).limit(1).maybeSingle()
  const interviews = await getMockInterviewHistory(profile.id)
  const targetRole = targetRoleRow.data?.target_role ?? ''
  const stats = {
    total: interviews.length,
    completed: interviews.filter((item) => item.status === 'completed' || item.overall_score !== null).length,
    averageScore: interviews.length
      ? Math.round(interviews.reduce((sum, item) => sum + Number(item.overall_score ?? 0), 0) / interviews.length)
      : 0,
  }

  return {
    profile,
    targetRole,
    interviews,
    activeInterview: interviews.find((item) => item.status === 'in_progress') ?? null,
    stats,
  }
}

export async function createMockInterview(profileId: number, input: Pick<MockInterview, 'target_role' | 'interview_type' | 'difficulty' | 'total_questions'> & { question_count?: number; duration_minutes?: number; status?: string }): Promise<MockInterview> {
  const now = new Date().toISOString()
  if (import.meta.env.DEV) {
    console.group('[Interview Debug]')
    console.log('Create interview request:', { profileId, input })
  }

  try {
    const { data, error } = await supabase
      .from('mock_interviews')
      .insert({
        profile_id: profileId,
        target_role: input.target_role,
        interview_type: input.interview_type,
        difficulty: input.difficulty,
        total_questions: input.total_questions,
        question_count: input.question_count ?? input.total_questions,
        duration_minutes: input.duration_minutes ?? 20,
        status: input.status ?? 'in_progress',
        completed_questions: 0,
        overall_score: null,
        technical_score: null,
        communication_score: null,
        problem_solving_score: null,
        confidence_score: null,
        started_at: now,
        completed_at: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (import.meta.env.DEV) {
      console.log('Create interview response:', { data, error })
    }

    if (error) throw error
    return data as MockInterview
  } finally {
    if (import.meta.env.DEV) console.groupEnd()
  }
}

export async function saveInterviewQuestion(question: MockInterviewQuestion & { interview_id: number }) {
  const payload = {
    interview_id: question.interview_id,
    question: question.question,
    topic: question.topic,
    difficulty: question.difficulty,
    question_type: question.questionType,
    expected_answer: question.expected_answer ?? question.expectedAnswer ?? null,
    user_answer: question.user_answer ?? null,
    score: question.score ?? 0,
    technical_score: question.feedback?.technicalAccuracy ?? question.score ?? 0,
    communication_score: question.feedback?.communication ?? question.score ?? 0,
    problem_solving_score: question.feedback?.problemSolving ?? question.score ?? 0,
    confidence_score: question.feedback?.confidence ?? question.score ?? 0,
    feedback: question.feedback ?? {},
    improvement: question.feedback?.improvements?.join(' ') ?? null,
    time_taken_seconds: question.response_time_seconds ?? question.time_taken_seconds ?? null,
    is_correct: question.is_correct ?? (question.score != null ? question.score >= 70 : null),
    created_at: new Date().toISOString(),
  }

  if (import.meta.env.DEV) {
    console.group('[Interview Debug]')
    console.log('Save interview question request:', { interviewId: question.interview_id, payload })
  }

  try {
    const { data, error } = await supabase.from('mock_interview_questions').insert(payload).select().single()
    if (import.meta.env.DEV) console.log('Save interview question response:', { data, error })
    if (error) throw error
    return data
  } finally {
    if (import.meta.env.DEV) console.groupEnd()
  }
}

export async function completeMockInterview(id: number, scores: Pick<MockInterview, 'completed_questions' | 'overall_score' | 'technical_score' | 'communication_score' | 'problem_solving_score' | 'confidence_score'>) {
  const now = new Date().toISOString()
  if (import.meta.env.DEV) {
    console.group('[Interview Debug]')
    console.log('Complete interview request:', { id, scores })
  }

  try {
    const { data, error } = await supabase
      .from('mock_interviews')
      .update({
        ...scores,
        status: 'completed',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (import.meta.env.DEV) console.log('Complete interview response:', { data, error })
    if (error) throw error
    return data as MockInterview
  } finally {
    if (import.meta.env.DEV) console.groupEnd()
  }
}

export async function getMockInterviewHistory(profileId: number) {
  try {
    const { data, error } = await supabase
      .from('mock_interviews')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (import.meta.env.DEV) {
      console.log('[Interview Debug] History query:', { profileId, data, error })
    }

    if (error) throw error
    return (data ?? []) as MockInterview[]
  } catch (error) {
    logInterviewFailure(error, null, profileId, null)
    return []
  }
}

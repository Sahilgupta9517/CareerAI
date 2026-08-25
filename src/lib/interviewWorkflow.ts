import { supabase } from './supabase'
import { getCurrentProfile, JobMatchingError } from './persistenceService'
import { loadInterviewContext, type MockInterview, type MockInterviewQuestion, type InterviewContext } from './interviewService'

export interface InterviewSetup {
  targetRole: string
  interviewType: 'Technical' | 'Behavioral' | 'HR' | 'Coding' | 'System Design' | 'Project-Based' | 'Mixed'
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  questionCount: 5 | 10 | 15 | 20
  durationMinutes: 5 | 10 | 15 | 20 | 30
}

export interface InterviewSession {
  interview: MockInterview
  questions: MockInterviewQuestion[]
  currentQuestionIndex: number
  answers: Map<number, string>
  startTime: Date
  isActive: boolean
  timeRemaining: number
  providerStatus?: string
  fallbackUsed?: boolean
}

export interface InterviewReport {
  interview: MockInterview
  questions: Array<MockInterviewQuestion & { feedback?: any }>
  overallScore: number
  scores: {
    technical: number
    communication: number
    problemSolving: number
    roleKnowledge: number
    clarity: number
  }
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  topicPerformance: Array<{ topic: string; score: number }>
  improvementAreas: string[]
  nextSteps: string[]
  completedAt: Date
}

/**
 * Start a new interview session with the given setup
 */
export async function startInterviewSession(setup: InterviewSetup, context?: InterviewContext): Promise<InterviewSession> {
  const profile = await getCurrentProfile()

  // Build context for AI
  const loadedContext = context || (await loadInterviewContext()).context
  const aiContext = loadedContext ? { ...loadedContext, targetRole: setup.targetRole } : {
    targetRole: setup.targetRole,
    experience: null,
    education: null,
    preferredJobType: null,
    preferredWorkMode: null,
    skills: [],
    resumeSkills: [],
    projects: [],
    analysis: null,
    resumeText: '',
    resume: null,
    skillGaps: [],
  }

  // Call backend to generate interview and questions
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) {
    throw new JobMatchingError('AUTH', 'Authentication failed', { cause: sessionError })
  }

  try {
    const response = await fetch('/api/interview/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetRole: setup.targetRole,
        interviewType: setup.interviewType,
        difficulty: setup.difficulty,
        questionCount: setup.questionCount,
        durationMinutes: setup.durationMinutes,
          context: aiContext,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(errorData?.error || `Interview generation failed (${response.status}).`)
    }

    const data = await response.json()

    // Create interview session object
    const session: InterviewSession = {
      interview: {
        id: data.interviewId,
        profile_id: profile.id,
        target_role: setup.targetRole,
        interview_type: setup.interviewType,
        difficulty: setup.difficulty,
        total_questions: setup.questionCount,
        completed_questions: 0,
        overall_score: null,
        technical_score: null,
        communication_score: null,
        problem_solving_score: null,
        confidence_score: null,
        question_count: setup.questionCount,
        duration_minutes: setup.durationMinutes,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
      } as MockInterview,
      questions: data.questions || [],
      currentQuestionIndex: 0,
      answers: new Map(),
      startTime: new Date(),
      isActive: true,
      timeRemaining: setup.durationMinutes * 60,
        providerStatus: data.providerStatus,
        fallbackUsed: Boolean(data.fallbackUsed),
    }

    return session
  } catch (error) {
    throw new JobMatchingError('INTERVIEW', error instanceof Error ? error.message : 'Interview session could not be created.', { cause: error })
  }
}

/**
 * Submit an answer for a question
 */
export async function submitAnswer(
  interviewId: number,
  questionId: number,
  questionText: string,
  answer: string
): Promise<{ score: number; technicalAccuracy: number; conceptUnderstanding: number; problemSolving: number; communication: number; completeness: number; confidence: number; feedback: { strengths: string[]; weaknesses: string[]; improvements: string[]; idealAnswerPoints: string[] } }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) {
    throw new JobMatchingError('AUTH', 'Authentication failed', { cause: sessionError })
  }

  try {
    const response = await fetch(`/api/interview/${interviewId}/answer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId,
        questionText,
        answer,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to evaluate answer')
    }

    return await response.json()
  } catch (error) {
    throw new JobMatchingError('EVALUATION', 'Failed to evaluate answer', { cause: error })
  }
}

export async function generateAdaptiveQuestion(interviewId: number, questionId: number, context: unknown = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) throw new JobMatchingError('AUTH', 'Authentication failed', { cause: sessionError })

  const response = await fetch(`/api/interview/${interviewId}/adaptive-question`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessionData.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, context }),
  })
  const result = await response.json().catch(() => null) as { question?: MockInterviewQuestion; providerStatus?: string; fallbackUsed?: boolean; error?: string } | null
  if (!response.ok || !result?.question) throw new JobMatchingError('EVALUATION', result?.error || 'The next question could not be generated.')
  return { question: result.question, providerStatus: result.providerStatus, fallbackUsed: Boolean(result.fallbackUsed) }
}

/**
 * Complete an interview and generate report
 */
export async function completeInterview(interviewId: number): Promise<InterviewReport> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) {
    throw new JobMatchingError('AUTH', 'Authentication failed', { cause: sessionError })
  }

  try {
    // Fetch interview and questions
    const { data: interview } = await supabase
      .from('mock_interviews')
      .select('*')
      .eq('id', interviewId)
      .single()

    const { data: questions } = await supabase
      .from('mock_interview_questions')
      .select('*')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true })

    if (!interview) {
      throw new Error('Interview not found')
    }

    const response = await fetch('/api/interview/evaluate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ interviewId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(errorData?.error || `Interview evaluation failed (${response.status}).`)
    }

    const result = await response.json() as { evaluation: { overallScore: number; technicalScore: number; communicationScore: number; problemSolvingScore: number; roleKnowledgeScore: number; clarityScore: number; strengths: string[]; weaknesses: string[]; recommendations: string[]; topicPerformance: Array<{ topic: string; score: number }> } }
    const evaluation = result.evaluation
    const completedInterview = (result as { interview?: MockInterview }).interview ?? interview
    return generateInterviewReport(completedInterview as MockInterview, questions || [], {
      overall_score: evaluation.overallScore,
      technical_score: evaluation.technicalScore,
      communication_score: evaluation.communicationScore,
      problem_solving_score: evaluation.problemSolvingScore,
      confidence_score: evaluation.clarityScore,
      role_knowledge_score: evaluation.roleKnowledgeScore,
      clarity_score: evaluation.clarityScore,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      recommendations: evaluation.recommendations,
      topic_performance: evaluation.topicPerformance,
    })
  } catch (error) {
    throw new JobMatchingError('COMPLETION', error instanceof Error ? error.message : 'Failed to complete interview', { cause: error })
  }
}

export async function getInterviewReport(interviewId: number): Promise<InterviewReport> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) throw new JobMatchingError('AUTH', 'Authentication failed', { cause: sessionError })

  const response = await fetch(`/api/interview/${interviewId}/report`, {
    headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` },
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { error?: string } | null
    throw new JobMatchingError('DETAILS', errorData?.error || `Report loading failed (${response.status}).`)
  }

  const result = await response.json() as { interview: MockInterview; report: MockInterview & { role_knowledge_score?: number; clarity_score?: number; summary?: string; topic_performance?: Array<{ topic: string; score: number }> }; questions: MockInterviewQuestion[] }
  const report = result.report
  return {
    interview: result.interview,
    questions: result.questions,
    overallScore: Number(report.overall_score ?? 0),
    scores: {
      technical: Number(report.technical_score ?? 0),
      communication: Number(report.communication_score ?? 0),
      problemSolving: Number(report.problem_solving_score ?? 0),
      roleKnowledge: Number(report.role_knowledge_score ?? 0),
      clarity: Number(report.clarity_score ?? 0),
    },
    strengths: Array.isArray(report.strengths) ? report.strengths as string[] : [],
    weaknesses: Array.isArray(report.weaknesses) ? report.weaknesses as string[] : [],
    recommendations: Array.isArray(report.recommendations) ? report.recommendations as string[] : [],
    topicPerformance: report.topic_performance ?? [],
    improvementAreas: [],
    nextSteps: [],
    completedAt: new Date(report.completed_at ?? report.created_at),
  }
}

/**
 * Generate interview report from questions and scores
 */
function generateInterviewReport(
  interview: MockInterview,
  questions: any[],
  scores: any
): InterviewReport {
  // Extract unique topics and their average scores
  const topicMap = new Map<string, number[]>()
  questions.forEach((q: any) => {
    if (q.topic) {
      const current = topicMap.get(q.topic) || []
      current.push(q.score || 0)
      topicMap.set(q.topic, current)
    }
  })

  const topicPerformance = Array.from(topicMap.entries()).map(([topic, scores]) => ({
    topic,
    score: Math.round(scores.reduce((a, b) => a + b) / scores.length),
  }))

  // Collect feedback
  const strengths = new Set<string>()
  const weaknesses = new Set<string>()
  const recommendations = new Set<string>()

  questions.forEach((q: any) => {
    if (q.feedback) {
      const feedback = typeof q.feedback === 'string' ? JSON.parse(q.feedback) : q.feedback
      if (Array.isArray(feedback.strengths)) {
        feedback.strengths.forEach((s: string) => strengths.add(s))
      }
      if (Array.isArray(feedback.weaknesses)) {
        feedback.weaknesses.forEach((w: string) => weaknesses.add(w))
      }
      if (Array.isArray(feedback.improvements)) {
        feedback.improvements.forEach((i: string) => recommendations.add(i))
      }
    }
  })

  // Identify improvement areas
  const improvementAreas = topicPerformance
    .filter((t) => t.score < 70)
    .map((t) => t.topic)

  return {
    interview,
    questions,
    overallScore: scores.overall_score,
    scores: {
      technical: scores.technical_score,
      communication: scores.communication_score,
      problemSolving: scores.problem_solving_score,
      roleKnowledge: scores.technical_score, // Use technical as proxy
      clarity: scores.communication_score,
    },
    strengths: Array.from(strengths).slice(0, 5),
    weaknesses: Array.from(weaknesses).slice(0, 5),
    recommendations: Array.from(recommendations).slice(0, 5),
    topicPerformance,
    improvementAreas,
    nextSteps: generateNextSteps(interview.target_role, scores.overall_score, improvementAreas),
    completedAt: new Date(),
  }
}

/**
 * Generate personalized next steps based on performance
 */
function generateNextSteps(role: string, score: number, weakAreas: string[]): string[] {
  const nextSteps: string[] = []

  if (score >= 85) {
    nextSteps.push(`You're well-prepared for ${role} interviews. Focus on System Design if that's not a strength.`)
  } else if (score >= 70) {
    nextSteps.push(`Good progress! Practice more on ${weakAreas.join(', ')} to improve further.`)
  } else {
    nextSteps.push(`Keep practicing! Focus on fundamentals and build real projects.`)
  }

  if (weakAreas.includes('System Design')) {
    nextSteps.push('Study distributed systems, database design, and scalability patterns.')
  }

  if (weakAreas.includes('Coding')) {
    nextSteps.push('Solve more coding challenges on platforms like LeetCode.')
  }

  if (weakAreas.includes('Communication')) {
    nextSteps.push('Work on explaining technical concepts more clearly. Practice with peers.')
  }

  return nextSteps
}

/**
 * Get interview history with filtering
 */
export async function getInterviewHistory(
  filters?: {
    targetRole?: string
    interviewType?: string
    minScore?: number
    maxScore?: number
  }
): Promise<MockInterview[]> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session?.access_token) {
      throw new JobMatchingError('AUTH', 'Authentication failed', { cause: sessionError })
    }

    const response = await fetch('/api/interview/history', {
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch interview history')
    }

    let interviews = (await response.json()).interviews as MockInterview[]

    // Apply filters
    if (filters?.targetRole) {
      interviews = interviews.filter((i) => i.target_role === filters.targetRole)
    }
    if (filters?.interviewType) {
      interviews = interviews.filter((i) => i.interview_type === filters.interviewType)
    }
    if (filters?.minScore) {
      interviews = interviews.filter((i) => (i.overall_score || 0) >= filters.minScore!)
    }
    if (filters?.maxScore) {
      interviews = interviews.filter((i) => (i.overall_score || 0) <= filters.maxScore!)
    }

    return interviews
  } catch (error) {
    throw new JobMatchingError('HISTORY', 'Failed to retrieve interview history', { cause: error })
  }
}

/**
 * Get detailed interview with questions and answers
 */
export async function getInterviewDetails(interviewId: number) {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session?.access_token) {
      throw new JobMatchingError('AUTH', 'Authentication failed', { cause: sessionError })
    }

    const response = await fetch(`/api/interview/${interviewId}`, {
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch interview details')
    }

    return await response.json()
  } catch (error) {
    throw new JobMatchingError('DETAILS', 'Failed to retrieve interview details', { cause: error })
  }
}

/**
 * Delete an interview
 */
export async function deleteInterview(interviewId: number): Promise<boolean> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session?.access_token) {
      throw new JobMatchingError('AUTH', 'Authentication failed', { cause: sessionError })
    }

    const response = await fetch(`/api/interview/${interviewId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
      },
    })

    return response.ok
  } catch (error) {
    throw new JobMatchingError('DELETE', 'Failed to delete interview', { cause: error })
  }
}

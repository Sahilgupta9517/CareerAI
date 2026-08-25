import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { extractResumePdf, ResumeExtractError } from './extractResumePdf.ts'
import { aiService, AIProviderError } from './services/aiService.ts'
import { dbService, getSupabaseClient } from './services/dbService.ts'
import { createConfiguredJobProvider, JobProviderError } from './services/jobProvider.ts'

// Load environment variables manually from .env.local and .env
const loadEnvFiles = () => {
  const rootDir = process.cwd()
  const paths = [path.resolve(rootDir, '.env.local'), path.resolve(rootDir, '.env')]
  for (const envPath of paths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
      for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('#')) continue
        const eqIdx = line.indexOf('=')
        if (eqIdx > 0) {
          const key = line.slice(0, eqIdx).trim()
          let val = line.slice(eqIdx + 1).trim()
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
          if (key && !process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  }
}
loadEnvFiles()

const json = (response: ServerResponse, status: number, body: unknown) => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'content-type, x-filename, authorization, x-client-info, apikey')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
  response.end(JSON.stringify(body))
}

const readBody = (request: IncomingMessage, maxBytes: number): Promise<Buffer> =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) {
        request.pause()
        reject(new Error('Payload size limit exceeded.'))
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AIProviderError) return fallback
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

const compactInterviewContext = (context: unknown) => {
  if (!context || typeof context !== 'object') return {}
  const value = context as Record<string, unknown>
  const limit = (text: unknown, size: number) => typeof text === 'string' ? text.slice(0, size) : ''
  const list = (items: unknown, size: number) => Array.isArray(items) ? items.slice(0, size) : []
  const resume = value.resume && typeof value.resume === 'object' ? value.resume as Record<string, unknown> : null
  const analysis = value.analysis && typeof value.analysis === 'object' ? value.analysis as Record<string, unknown> : null
  return {
    targetRole: limit(value.targetRole, 120),
    experience: limit(value.experience, 500),
    education: limit(value.education, 500),
    skills: list(value.skills, 50),
    resumeSkills: list(value.resumeSkills, 50),
    projects: list(resume?.projects ?? value.projects, 10).map((project) => typeof project === 'string' ? project.slice(0, 500) : project),
    resumeExperience: list(resume?.experience, 8),
    resumeEducation: list(resume?.education, 5),
    resumeText: limit(value.resumeText, 1500),
    skillGaps: list(value.skillGaps, 20),
    careerAnalysis: analysis ? {
      strengths: list(analysis.strengths, 10),
      skillGaps: list(analysis.skill_gaps, 20),
      recommendedSkills: list(analysis.recommended_skills, 15),
      interviewPreparation: list(analysis.interview_preparation, 10),
    } : null,
  }
}

const handleRequest = async (request: IncomingMessage, response: ServerResponse) => {
  const url = request.url?.split('?')[0] || ''

  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Headers', 'content-type, x-filename, authorization, x-client-info, apikey')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
    response.end()
    return
  }

  const authHeader = request.headers.authorization

  if (url.startsWith('/api/interview') && !authHeader) {
    json(response, 401, { error: 'Authentication is required.' })
    return
  }

  if (url.startsWith('/api/jobs') && !authHeader) {
    json(response, 401, { error: 'Authentication is required.' })
    return
  }

  try {
    if (url === '/api/jobs' && request.method === 'GET') {
      try {
        const provider = createConfiguredJobProvider()
        if (!provider) {
          json(response, 200, { jobs: [], page: 1, pageSize: 24, hasMore: false, liveAvailable: false, providerStatus: 'unavailable' })
          return
        }
        const requestUrl = new URL(request.url ?? '/api/jobs', 'http://localhost')
        const result = await provider.search({
          query: requestUrl.searchParams.get('query') ?? undefined,
          location: requestUrl.searchParams.get('location') ?? undefined,
          page: Number(requestUrl.searchParams.get('page') ?? 1),
          pageSize: Number(requestUrl.searchParams.get('pageSize') ?? 24),
        })
        json(response, 200, { ...result, liveAvailable: true })
      } catch (error) {
        const status = error instanceof JobProviderError ? error.status : 'failed'
        console.error('GET /api/jobs provider error:', { status })
        json(response, status === 'unauthorized' ? 401 : status === 'rate_limited' ? 429 : 503, { jobs: [], page: 1, pageSize: 24, hasMore: false, liveAvailable: false, providerStatus: status })
      }
      return
    }

    // 1. POST /api/resume/extract
    if (url === '/api/resume/extract' && request.method === 'POST') {
      const body = await readBody(request, 5 * 1024 * 1024)
      const filenameHeader = request.headers['x-filename']
      const filename = decodeURIComponent(
        Array.isArray(filenameHeader) ? filenameHeader[0] ?? '' : filenameHeader ?? 'resume.pdf'
      )
      try {
        const result = await extractResumePdf(new Uint8Array(body), filename, request.headers['content-type'] ?? null)
        json(response, 200, result)
        return
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Resume processing failed.'
        console.error('[resume/extract] extraction failed', {
          message,
          filename,
          contentType: request.headers['content-type'] ?? null,
          bytes: body.length,
        })
        json(response, 400, { error: message })
        return
      }
    }

    // 2. POST /api/resume/analyze
    if (url === '/api/resume/analyze' && request.method === 'POST') {
      const body = await readBody(request, 2 * 1024 * 1024)
      const { text, targetRole, filename, fileSize, pageCount, characterCount } = JSON.parse(body.toString())
      if (!text || !targetRole) {
        json(response, 400, { error: 'Missing text or targetRole parameters.' })
        return
      }

      const { userId, profile } = await dbService.getUserAndProfile(authHeader)
      const analysis = await aiService.analyzeResume(text, targetRole)

      // Save to Supabase
      const supabase = getSupabaseClient(authHeader)
      const { data: inserted, error: insertError } = await supabase
        .from('resume_analyses')
        .insert({
          user_id: userId,
          profile_id: profile.id,
          filename: filename || 'resume.pdf',
          file_size: fileSize || 0,
          page_count: pageCount || 1,
          character_count: characterCount || text.length,
          extracted_text: text,
          overall_score: analysis.overallScore,
          ats_score: analysis.atsScore,
          keyword_score: analysis.keywordScore,
          formatting_score: analysis.formattingScore,
          detected_skills: analysis.detectedSkills,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          projects: analysis.projects,
          education_experience: analysis.educationExperience,
          certifications: analysis.certifications,
          missing_skills: analysis.missingSkills,
          ats_recommendations: analysis.atsRecommendations,
          ai_summary: analysis.aiSummary
        })
        .select()
        .single()

      if (insertError) {
        console.error('Failed to save resume analysis to db:', insertError)
        json(response, 500, { error: `Resume analysis could not be saved: ${insertError.message}` })
        return
      }

      json(response, 200, { ...analysis, id: inserted.id, createdAt: inserted.created_at })
      return
    }

    // 3. POST /api/career/analyze
if (url === '/api/career/analyze' && request.method === 'POST') {
  const body = await readBody(request, 1 * 1024 * 1024)

  const {
    profile: frontendProfile,
    skills,
    careerGoal,
    preferences,
    resumeAnalysis,
  } = JSON.parse(body.toString())

  const { profile } = await dbService.getUserAndProfile(authHeader)
  const supabase = getSupabaseClient(authHeader)

  const { data: currentGoal, error: goalError } = await supabase
    .from('career_goals')
    .select('target_role, preferred_location, work_preference, goal_description')
    .eq('profile_id', profile.id)
    .limit(1)
    .maybeSingle()

  if (goalError) {
    throw new Error(goalError.message)
  }

  const currentTargetRole = currentGoal?.target_role || careerGoal?.target_role || 'Software Developer'
  const effectiveCareerGoal = {
    ...(careerGoal ?? {}),
    target_role: currentTargetRole,
  }

  const analysis = await aiService.analyzeCareer(
    frontendProfile,
    skills,
    effectiveCareerGoal,
    preferences,
    resumeAnalysis,
  )

  const { data: inserted, error: insertError } = await supabase
    .from('career_analyses')
    .insert({
      profile_id: profile.id,
      target_role: currentTargetRole,
      career_summary: analysis.career_summary,
      strengths: analysis.strengths,
      skill_gaps: analysis.skill_gaps,
      recommended_skills: analysis.recommended_skills,
      learning_strategy: analysis.learning_strategy,
      recommended_roles: analysis.recommended_roles,
      interview_preparation: analysis.interview_preparation,
    })
    .select()
    .single()

  if (insertError) {
    console.error(
      'Failed to save career analysis to db:',
      insertError,
    )

    json(response, 200, {
      ...analysis,
      dbError: insertError.message,
    })

    return
  }

  json(response, 200, inserted)
  return
}

    if (url === '/api/skill-gap/analyze' && request.method === 'POST') {
      const body = JSON.parse((await readBody(request, 300 * 1024)).toString()) as { targetRole?: string; requiredSkills?: string[]; preferredSkills?: string[]; resumeAnalysis?: unknown; profileContext?: unknown }
      if (!body.targetRole || !Array.isArray(body.requiredSkills)) {
        json(response, 400, { error: 'Target role and role requirements are required.' })
        return
      }
      try {
        const { profile } = await dbService.getUserAndProfile(authHeader)
        const supabase = getSupabaseClient(authHeader)
        const { data: analysis } = await supabase.from('resume_analyses').select('detected_skills, missing_skills, strengths, projects, education_experience, certifications, ai_summary').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (!analysis) { json(response, 400, { error: 'Analyze your resume before running skill-gap analysis.' }); return }
        const result = await aiService.analyzeSkillGap({ targetRole: body.targetRole, requiredSkills: body.requiredSkills, preferredSkills: body.preferredSkills ?? [], resumeAnalysis: { ...analysis, ...(body.resumeAnalysis && typeof body.resumeAnalysis === 'object' ? body.resumeAnalysis : {}) }, profileContext: body.profileContext ?? {} })
        const { data: saved, error } = await supabase.from('career_analyses').insert({ profile_id: profile.id, target_role: body.targetRole, career_summary: `Skill-gap analysis for ${body.targetRole}.`, strengths: [], skill_gaps: result.missing_skills, recommended_skills: result.recommended_skills, learning_strategy: result.learning_sequence, recommended_roles: [], interview_preparation: [], skill_gap_analysis: result }).select('id, created_at, skill_gap_analysis').single()
        if (error) throw error
        json(response, 200, { ...result, id: saved.id, created_at: saved.created_at })
      } catch (error) {
        console.error('POST /api/skill-gap/analyze error:', error)
        json(response, 502, { error: error instanceof Error ? error.message : 'Skill-gap analysis failed. Please try again.' })
      }
      return
    }

    // 4. POST /api/interview/generate - Create interview and generate personalized questions
    if (url === '/api/interview/generate' && request.method === 'POST') {
      const body = await readBody(request, 500 * 1024)
      const {
        targetRole,
        interviewType = 'Technical',
        difficulty = 'Intermediate',
        questionCount = 5,
        durationMinutes = 20,
        context = {}
      } = JSON.parse(body.toString())

      if (!targetRole) {
        json(response, 400, { error: 'targetRole is required' })
        return
      }

      try {
        const { profile } = await dbService.getUserAndProfile(authHeader)
        const supabase = getSupabaseClient(authHeader)

        const compactContext = compactInterviewContext(context)
        const generation = await aiService.generateInterviewQuestions(
          targetRole,
          typeof compactContext.experience === 'string' ? compactContext.experience : 'Not specified',
          interviewType,
          compactContext,
          1,
          difficulty
        )
        const questions = generation.questions
        const questionKeys = questions.map((question) => question.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
        const questionsAreValid = questions.length === 1
          && questions.every((question) => question.question.trim() && question.topic.trim() && question.difficulty.trim())
          && new Set(questionKeys).size === questions.length
        if (!questionsAreValid) {
          json(response, 502, { error: 'Interview questions could not be validated.' })
          return
        }

        const personalized = Boolean(compactContext.resumeText || (Array.isArray(compactContext.projects) && compactContext.projects.length) || (Array.isArray(compactContext.resumeSkills) && compactContext.resumeSkills.length))
        const { data: interview, error: insertError } = await supabase
          .from('mock_interviews')
          .insert({ profile_id: profile.id, target_role: targetRole, interview_type: interviewType, difficulty, question_count: questionCount, duration_minutes: durationMinutes, total_questions: questionCount, status: 'in_progress', resume_snapshot: compactContext, personalized })
          .select()
          .single()
        if (insertError) {
          json(response, 400, { error: `Failed to create interview: ${insertError.message}` })
          return
        }

        // Save questions to mock_interview_questions table
        const questionsToInsert = questions.map((question) => ({
          interview_id: interview.id,
          question: question.question,
          topic: question.topic,
          difficulty: question.difficulty,
          question_type: interviewType,
          expected_topics: question.expectedConcepts,
          question_source: question.source,
          adaptive_reason: question.adaptiveReason,
          based_on_previous_score: question.basedOnPreviousScore,
          is_correct: false,
          skipped: false
        }))

        const { data: savedQuestions, error: questionsError } = await supabase
          .from('mock_interview_questions')
          .insert(questionsToInsert)
          .select('id, question, topic, difficulty, question_type, expected_topics, question_source, adaptive_reason, based_on_previous_score')

        if (questionsError) {
          console.error('Failed to save questions:', {
            interviewId: interview.id,
            profileId: profile.id,
            error: questionsError,
          })
          await supabase.from('mock_interviews').delete().eq('id', interview.id)
          const databaseError = questionsError as { message?: string; details?: string; hint?: string; code?: string }
          json(response, 500, {
            error: `Generated questions could not be saved: ${databaseError.message || 'Supabase rejected the insert.'}`,
            databaseError: {
              code: databaseError.code || null,
              details: databaseError.details || null,
              hint: databaseError.hint || null,
            },
          })
          return
        }

        json(response, 200, {
          success: true,
          providerStatus: generation.providerStatus,
          fallbackUsed: generation.fallbackUsed,
          interviewId: interview.id,
          targetRole,
          interviewType,
          difficulty,
          durationMinutes,
          questions: (savedQuestions ?? []).map((q, i) => ({
            id: q.id,
            questionNumber: i + 1,
            question: q.question,
            category: q.topic,
            difficulty: q.difficulty,
            expectedTopics: q.expected_topics ?? [q.topic],
            questionType: q.question_type,
            questionSource: q.question_source,
            adaptiveReason: q.adaptive_reason,
            basedOnPreviousScore: q.based_on_previous_score,
          }))
        })
        return
      } catch (error) {
        console.error('POST /api/interview/generate error:', error)
        json(response, 502, { error: errorMessage(error, 'AI question generation failed.') })
        return
      }
    }

    if (url.match(/^\/api\/interview\/\d+\/adaptive-question$/) && request.method === 'POST') {
      const interviewId = parseInt(url.split('/')[3], 10)
      const body = JSON.parse((await readBody(request, 200 * 1024)).toString()) as { questionId?: number; context?: unknown }
      if (!Number.isInteger(interviewId) || interviewId <= 0) {
        json(response, 400, { error: 'A valid interviewId is required.' })
        return
      }

      try {
        const { profile } = await dbService.getUserAndProfile(authHeader)
        const supabase = getSupabaseClient(authHeader)
        const { data: interview, error: interviewError } = await supabase
          .from('mock_interviews')
          .select('id, profile_id, target_role, interview_type, difficulty, total_questions, resume_snapshot, status')
          .eq('id', interviewId)
          .eq('profile_id', profile.id)
          .single()
        if (interviewError || !interview) {
          json(response, 404, { error: 'Interview not found.' })
          return
        }
        if (interview.status !== 'in_progress') {
          json(response, 409, { error: 'This interview is no longer active.' })
          return
        }

        const { data: questions, error: questionsError } = await supabase
          .from('mock_interview_questions')
          .select('id, question, topic, difficulty, user_answer, score, technical_score, communication_score, problem_solving_score, confidence_score, feedback, question_source, expected_topics')
          .eq('interview_id', interviewId)
          .order('created_at', { ascending: true })
        if (questionsError || !questions?.length) {
          json(response, 400, { error: questionsError?.message || 'Interview questions were not found.' })
          return
        }
        if (questions.length >= interview.total_questions) {
          json(response, 409, { error: 'The interview already has its full set of questions.' })
          return
        }

        const answeredQuestions = questions.filter((question) => Boolean(question.user_answer?.trim()) && Number.isInteger(question.score))
        const previousQuestion = body.questionId
          ? answeredQuestions.find((question) => question.id === body.questionId)
          : answeredQuestions[answeredQuestions.length - 1]
        if (!previousQuestion || previousQuestion.score === null || previousQuestion.score === undefined) {
          json(response, 400, { error: 'Answer and evaluation must be saved before generating the next question.' })
          return
        }
        const feedback = previousQuestion.feedback && typeof previousQuestion.feedback === 'object' ? previousQuestion.feedback as Record<string, unknown> : {}
        const feedbackList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
        const scoreValue = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100 ? value : undefined
        const technicalAccuracy = scoreValue(previousQuestion.technical_score)
        const conceptUnderstanding = scoreValue(feedback.conceptUnderstanding) ?? scoreValue(previousQuestion.score)
        const problemSolving = scoreValue(previousQuestion.problem_solving_score)
        const communication = scoreValue(previousQuestion.communication_score)
        const confidence = scoreValue(previousQuestion.confidence_score)
        if ([technicalAccuracy, conceptUnderstanding, problemSolving, communication, confidence].some((value) => value === undefined)) {
          json(response, 400, { error: 'The saved evaluation is incomplete.' })
          return
        }

        const generation = await aiService.generateAdaptiveInterviewQuestion({
          role: interview.target_role,
          experience: typeof interview.resume_snapshot?.experience === 'string' ? interview.resume_snapshot.experience : 'Not specified',
          interviewType: interview.interview_type,
          difficulty: previousQuestion.difficulty,
          previousQuestion: previousQuestion.question,
          candidateAnswer: previousQuestion.user_answer ?? '',
          evaluation: {
            score: previousQuestion.score,
            technicalAccuracy,
            conceptUnderstanding,
            problemSolving,
            communication,
            confidence,
            strengths: feedbackList(feedback.strengths),
            weaknesses: feedbackList(feedback.weaknesses),
            improvements: feedbackList(feedback.improvements),
            idealAnswerPoints: feedbackList(feedback.idealAnswerPoints),
          },
          previousQuestions: questions.map((question) => ({ question: question.question, topic: question.topic, difficulty: question.difficulty })),
          context: body.context ?? interview.resume_snapshot ?? {},
        })

        const duplicate = questions.some((question) => question.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === generation.question.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
        if (duplicate) throw new Error('Adaptive question duplicated an existing question.')
        const { data: savedQuestion, error: insertError } = await supabase
          .from('mock_interview_questions')
          .insert({
            interview_id: interviewId,
            question: generation.question.question,
            topic: generation.question.topic,
            difficulty: generation.question.difficulty,
            question_type: interview.interview_type,
            expected_topics: generation.question.expectedConcepts,
            question_source: generation.question.source,
            adaptive_reason: generation.question.adaptiveReason,
            based_on_previous_score: generation.question.basedOnPreviousScore,
            is_correct: false,
            skipped: false,
          })
          .select('id, question, topic, difficulty, question_type, expected_topics, question_source, adaptive_reason, based_on_previous_score')
          .single()
        if (insertError) throw insertError
        json(response, 200, { success: true, providerStatus: generation.providerStatus, fallbackUsed: generation.fallbackUsed, question: { id: savedQuestion.id, questionNumber: questions.length + 1, question: savedQuestion.question, category: savedQuestion.topic, difficulty: savedQuestion.difficulty, expectedTopics: savedQuestion.expected_topics, questionType: savedQuestion.question_type, questionSource: savedQuestion.question_source, adaptiveReason: savedQuestion.adaptive_reason, basedOnPreviousScore: savedQuestion.based_on_previous_score } })
      } catch (error) {
        console.error('POST /api/interview/:id/adaptive-question error:', error)
        json(response, 502, { error: errorMessage(error, 'Adaptive question generation failed. Your answer was preserved.') })
      }
      return
    }

    if (url === '/api/interview/evaluate' && request.method === 'POST') {
      const body = JSON.parse((await readBody(request, 200 * 1024)).toString()) as { interviewId?: number; context?: unknown }
      const interviewId = Number(body.interviewId)
      if (!Number.isInteger(interviewId) || interviewId <= 0) {
        json(response, 400, { error: 'A valid interviewId is required.' })
        return
      }

      const { profile } = await dbService.getUserAndProfile(authHeader)
      const supabase = getSupabaseClient(authHeader)
      const { data: interview, error: interviewError } = await supabase
        .from('mock_interviews')
        .select('*')
        .eq('id', interviewId)
        .eq('profile_id', profile.id)
        .single()
      if (interviewError || !interview) {
        json(response, 404, { error: 'Interview not found.' })
        return
      }

      const { data: questions, error: questionsError } = await supabase
        .from('mock_interview_questions')
        .select('id, question, topic, user_answer, score, technical_score, communication_score, problem_solving_score, confidence_score, feedback')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: true })
      if (questionsError || !questions?.length) {
        json(response, 400, { error: questionsError?.message || 'Interview questions were not found.' })
        return
      }

      try {
        const evaluation = await aiService.evaluateInterview(
          interview.target_role,
          interview.interview_type,
          interview.difficulty,
          questions.map((question) => ({
            id: question.id,
            question: question.question,
            topic: question.topic,
            userAnswer: question.user_answer ?? '',
          })),
          body.context ?? {},
        )
        const questionById = new Map(questions.map((question) => [String(question.id), question]))
        const answersById = new Map(evaluation.answers.map((answer) => [answer.questionId, answer]))
        if (answersById.size !== questions.length || questions.some((question) => !answersById.has(String(question.id)))) {
          throw new Error('AI evaluation did not include exactly one result for every interview question.')
        }

        for (const answer of evaluation.answers) {
          const question = questionById.get(answer.questionId)
          if (!question) throw new Error('AI evaluation contained an unknown question ID.')
          const feedback = {
            feedback: answer.feedback,
            improvementTips: answer.improvementTips,
          }
          const { error: questionUpdateError } = await supabase
            .from('mock_interview_questions')
            .update({
              score: answer.score,
              technical_score: answer.technicalDepth,
              communication_score: answer.clarity,
              problem_solving_score: answer.correctness,
              confidence_score: answer.clarity,
              feedback,
              ideal_answer: answer.idealAnswer,
              improvement_tips: answer.improvementTips,
              is_correct: answer.score >= 70,
              updated_at: new Date().toISOString(),
            })
            .eq('id', question.id)
            .eq('interview_id', interviewId)
          if (questionUpdateError) throw questionUpdateError

          const { error: answerUpsertError } = await supabase.from('interview_answers').upsert({
            interview_id: interviewId,
            question_id: question.id,
            profile_id: profile.id,
            answer: question.user_answer ?? '',
            score: answer.score,
            correctness: answer.correctness,
            relevance: answer.relevance,
            clarity: answer.clarity,
            technical_depth: answer.technicalDepth,
            feedback: answer.feedback,
            ideal_answer: answer.idealAnswer,
            improvement_tips: answer.improvementTips,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'interview_id,question_id' })
          if (answerUpsertError) throw answerUpsertError
        }

        const now = new Date().toISOString()
        const report = {
          interview_id: interviewId,
          profile_id: profile.id,
          target_role: interview.target_role,
          interview_type: interview.interview_type,
          difficulty: interview.difficulty,
          question_count: questions.length,
          answered_questions: questions.filter((question) => Boolean(question.user_answer?.trim())).length,
          completed_at: now,
          overall_score: evaluation.overallScore,
          technical_score: evaluation.technicalScore,
          communication_score: evaluation.communicationScore,
          problem_solving_score: evaluation.problemSolvingScore,
          role_knowledge_score: evaluation.roleKnowledgeScore,
          clarity_score: evaluation.clarityScore,
          summary: evaluation.summary,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          recommendations: evaluation.recommendations,
          topic_performance: evaluation.topicPerformance,
        }
        const { data: savedReport, error: reportError } = await supabase.from('interview_reports').upsert(report, { onConflict: 'interview_id' }).select().single()
        if (reportError) throw reportError
        const { data: completedInterview, error: completionError } = await supabase.from('mock_interviews').update({
          status: 'completed', completed_at: now, completed_questions: questions.length, questions_answered: questions.filter((question) => Boolean(question.user_answer?.trim())).length,
          overall_score: evaluation.overallScore, technical_score: evaluation.technicalScore, communication_score: evaluation.communicationScore,
          problem_solving_score: evaluation.problemSolvingScore, role_knowledge_score: evaluation.roleKnowledgeScore,
          confidence_score: evaluation.clarityScore, clarity_score: evaluation.clarityScore, summary: evaluation.summary, strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses, recommendations: evaluation.recommendations, updated_at: now,
        }).eq('id', interviewId).eq('profile_id', profile.id).select().single()
        if (completionError) throw completionError
        json(response, 200, { success: true, interview: completedInterview, report: savedReport, evaluation })
      } catch (error) {
        console.error('POST /api/interview/evaluate error:', error)
        json(response, 502, { error: errorMessage(error, 'Interview evaluation failed.') })
      }
      return
    }

    // 4b. GET /api/interview/:id - Retrieve interview and questions
    if (url.match(/^\/api\/interview\/\d+$/) && request.method === 'GET') {
      const interviewId = parseInt(url.split('/').pop() || '0', 10)
      if (!interviewId) {
        json(response, 400, { error: 'Invalid interview ID' })
        return
      }

      try {
        const { profile } = await dbService.getUserAndProfile(authHeader)
        const supabase = getSupabaseClient(authHeader)

        // Get interview (with RLS check)
        const { data: interview, error: interviewError } = await supabase
          .from('mock_interviews')
          .select('*')
          .eq('id', interviewId)
          .eq('profile_id', profile.id)
          .single()

        if (interviewError || !interview) {
          json(response, 404, { error: 'Interview not found' })
          return
        }

        // Get questions for interview
        const { data: questions, error: questionsError } = await supabase
          .from('mock_interview_questions')
          .select('*')
          .eq('interview_id', interviewId)
          .order('created_at', { ascending: true })

        if (questionsError) {
          json(response, 400, { error: questionsError.message })
          return
        }

        json(response, 200, {
          interview,
          questions: questions || []
        })
        return
      } catch (error) {
        console.error('GET /api/interview/:id error:', error)
        json(response, 500, { error: 'Failed to retrieve interview' })
        return
      }
    }

    // 5. POST /api/interview/:id/answer - Save answer and evaluate
    if ((url.match(/^\/api\/interview\/\d+\/answer$/) || url === '/api/interview/answer') && request.method === 'POST') {
      const body = await readBody(request, 100 * 1024)
      const parsedBody = JSON.parse(body.toString()) as { interviewId?: number; questionId?: number; questionText?: string; answer?: string }
      const interviewId = url === '/api/interview/answer' ? Number(parsedBody.interviewId) : parseInt(url.split('/')[3], 10)
      const { questionId, questionText, answer } = parsedBody

      if (!interviewId || !answer) {
        json(response, 400, { error: 'Missing required fields' })
        return
      }

      try {
        const { profile } = await dbService.getUserAndProfile(authHeader)
        const supabase = getSupabaseClient(authHeader)

        // Verify interview belongs to user
        const { data: interview } = await supabase
          .from('mock_interviews')
          .select('target_role, interview_type')
          .eq('id', interviewId)
          .eq('profile_id', profile.id)
          .single()

        if (!interview) {
          json(response, 403, { error: 'Unauthorized' })
          return
        }

        // Evaluate answer
        const evaluation = await aiService.evaluateInterviewAnswer(
          questionText || '',
          answer,
          interview.target_role,
          {}
        )

        // Save answer
        if (questionId) {
          const { error: updateError } = await supabase
            .from('mock_interview_questions')
            .update({
              user_answer: answer,
              score: evaluation.score,
              technical_score: evaluation.technicalAccuracy,
              communication_score: evaluation.communication,
              problem_solving_score: evaluation.problemSolving,
              confidence_score: evaluation.confidence,
              feedback: {
                strengths: evaluation.strengths,
                weaknesses: evaluation.weaknesses,
                improvements: evaluation.improvements,
                idealAnswerPoints: evaluation.idealAnswerPoints,
                technicalAccuracy: evaluation.technicalAccuracy,
                conceptUnderstanding: evaluation.conceptUnderstanding,
                problemSolving: evaluation.problemSolving,
                communication: evaluation.communication,
                completeness: evaluation.completeness,
                confidence: evaluation.confidence,
              },
              is_correct: evaluation.score >= 70
            })
            .eq('id', questionId)
            .eq('interview_id', interviewId)

          if (updateError) {
            console.error('Failed to save answer:', updateError)
            throw updateError
          }

          const { error: answerError } = await supabase.from('interview_answers').upsert({
            interview_id: interviewId,
            question_id: questionId,
            profile_id: profile.id,
            answer,
            score: evaluation.score,
            correctness: evaluation.technicalAccuracy,
            relevance: evaluation.conceptUnderstanding,
            clarity: evaluation.communication,
            technical_depth: evaluation.technicalAccuracy,
            feedback: evaluation.improvements.join(' '),
            ideal_answer: evaluation.idealAnswerPoints.join(' '),
            improvement_tips: evaluation.improvements,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'interview_id,question_id' })
          if (answerError) throw answerError
        }

        json(response, 200, evaluation)
        return
      } catch (error) {
        console.error('POST /api/interview/:id/answer error:', error)
        json(response, 500, { error: errorMessage(error, 'Failed to evaluate answer') })
        return
      }
    }

    if (url.match(/^\/api\/interview\/\d+\/report$/) && request.method === 'GET') {
      const interviewId = parseInt(url.split('/')[3], 10)
      const { profile } = await dbService.getUserAndProfile(authHeader)
      const supabase = getSupabaseClient(authHeader)
      const { data: interview, error: interviewError } = await supabase.from('mock_interviews').select('*').eq('id', interviewId).eq('profile_id', profile.id).single()
      const { data: report, error } = await supabase.from('interview_reports').select('*').eq('interview_id', interviewId).eq('profile_id', profile.id).single()
      if (interviewError || error || !report || !interview) {
        json(response, 404, { error: 'Interview report not found.' })
        return
      }
      const { data: questions } = await supabase.from('mock_interview_questions').select('*').eq('interview_id', interviewId).order('created_at', { ascending: true })
      json(response, 200, {
        success: true,
        interview,
        report,
        questions: questions ?? [],
      })
      return
    }

    // 6. PATCH /api/interview/:id - Update interview status and scores
    if (url.match(/^\/api\/interview\/\d+$/) && request.method === 'PATCH') {
      const interviewId = parseInt(url.split('/').pop() || '0', 10)
      const body = await readBody(request, 100 * 1024)
      const updates = JSON.parse(body.toString())

      try {
        const { profile } = await dbService.getUserAndProfile(authHeader)
        const supabase = getSupabaseClient(authHeader)

        // Verify ownership
        const { data: interview } = await supabase
          .from('mock_interviews')
          .select('id')
          .eq('id', interviewId)
          .eq('profile_id', profile.id)
          .single()

        if (!interview) {
          json(response, 403, { error: 'Unauthorized' })
          return
        }

        // If completing, calculate average scores
        const updateData: any = { ...updates }
        if (updates.status === 'completed') {
          updateData.completed_at = new Date().toISOString()

          // Get all questions for this interview
          const { data: questions } = await supabase
            .from('mock_interview_questions')
            .select('score, technical_score, communication_score, problem_solving_score, confidence_score')
            .eq('interview_id', interviewId)

          if (questions && questions.length > 0) {
            const avgScore = Math.round(questions.reduce((sum, q) => sum + (q.score || 0), 0) / questions.length)
            const avgTech = Math.round(questions.reduce((sum, q) => sum + (q.technical_score || 0), 0) / questions.length)
            const avgComm = Math.round(questions.reduce((sum, q) => sum + (q.communication_score || 0), 0) / questions.length)
            const avgProb = Math.round(questions.reduce((sum, q) => sum + (q.problem_solving_score || 0), 0) / questions.length)
            const avgConf = Math.round(questions.reduce((sum, q) => sum + (q.confidence_score || 0), 0) / questions.length)

            updateData.overall_score = avgScore
            updateData.technical_score = avgTech
            updateData.communication_score = avgComm
            updateData.problem_solving_score = avgProb
            updateData.confidence_score = avgConf
            updateData.questions_answered = questions.filter((q) => q.score !== null).length
          }
        }

        const { data: updated, error: updateError } = await supabase
          .from('mock_interviews')
          .update(updateData)
          .eq('id', interviewId)
          .select()
          .single()

        if (updateError) {
          json(response, 400, { error: updateError.message })
          return
        }

        json(response, 200, updated)
        return
      } catch (error) {
        console.error('PATCH /api/interview/:id error:', error)
        json(response, 500, { error: 'Failed to update interview' })
        return
      }
    }

    // 7. DELETE /api/interview/:id - Delete interview
    if (url.match(/^\/api\/interview\/\d+$/) && request.method === 'DELETE') {
      const interviewId = parseInt(url.split('/').pop() || '0', 10)

      try {
        const { profile } = await dbService.getUserAndProfile(authHeader)
        const supabase = getSupabaseClient(authHeader)

        // Verify ownership before deletion
        const { data: interview } = await supabase
          .from('mock_interviews')
          .select('id')
          .eq('id', interviewId)
          .eq('profile_id', profile.id)
          .single()

        if (!interview) {
          json(response, 403, { error: 'Unauthorized' })
          return
        }

        const { error: deleteError } = await supabase
          .from('mock_interviews')
          .delete()
          .eq('id', interviewId)

        if (deleteError) {
          json(response, 400, { error: deleteError.message })
          return
        }

        json(response, 200, { success: true })
        return
      } catch (error) {
        console.error('DELETE /api/interview/:id error:', error)
        json(response, 500, { error: 'Failed to delete interview' })
        return
      }
    }

    // 8. GET /api/interview/history - Get all interviews for user
    if (url === '/api/interview/history' && request.method === 'GET') {
      try {
        const { profile } = await dbService.getUserAndProfile(authHeader)
        const supabase = getSupabaseClient(authHeader)

        const { data: interviews, error: interviewError } = await supabase
          .from('mock_interviews')
          .select('*')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false })

        if (interviewError) {
          json(response, 400, { error: interviewError.message })
          return
        }

        json(response, 200, { interviews: interviews || [] })
        return
      } catch (error) {
        console.error('GET /api/interview/history error:', error)
        json(response, 500, { error: 'Failed to retrieve interview history' })
        return
      }
    }

    // 4. POST /api/interview/start - Legacy endpoint
    if (url === '/api/profile') {
      const { profile } = await dbService.getUserAndProfile(authHeader)
      const supabase = getSupabaseClient(authHeader)

      if (request.method === 'GET') {
        const [goalRes, prefRes, skillsRes] = await Promise.all([
          supabase.from('career_goals').select('*').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase.from('user_preferences').select('*').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase.from('user_skills').select('id, proficiency, skill:skills(id, name, category)').eq('profile_id', profile.id)
        ])

        const skills = (skillsRes.data ?? []).map((row: any) => ({
          id: row.id,
          name: row.skill?.name || 'Unknown',
          proficiency: row.proficiency,
          category: row.skill?.category || 'General'
        }))

        json(response, 200, {
          profile,
          skills,
          goal: goalRes.data,
          preferences: prefRes.data
        })
        return
      }

      if (request.method === 'POST') {
        const body = await readBody(request, 100 * 1024)
        const updates = JSON.parse(body.toString())

        // Update profile
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({
            name: updates.name,
            education: updates.education,
            branch: updates.branch,
            graduation_year: updates.graduationYear,
            experience: updates.experience,
            location: updates.location
          })
          .eq('id', profile.id)

        if (profileErr) throw profileErr

        // Upsert goal
        const goalFields = {
          profile_id: profile.id,
          target_role: updates.targetRole,
          preferred_location: updates.location,
          work_preference: updates.workPreference,
          goal_description: updates.goal
        }

        const { data: existingGoal } = await supabase.from('career_goals').select('id').eq('profile_id', profile.id).limit(1).maybeSingle()
        if (existingGoal) {
          await supabase.from('career_goals').update(goalFields).eq('id', existingGoal.id)
        } else {
          await supabase.from('career_goals').insert(goalFields)
        }

        // Upsert preferences
        const prefFields = {
          profile_id: profile.id,
          preferred_work_mode: updates.workPreference,
          preferred_locations: updates.location,
          preferred_industries: updates.industry
        }
        const { data: existingPref } = await supabase.from('user_preferences').select('id').eq('profile_id', profile.id).limit(1).maybeSingle()
        if (existingPref) {
          await supabase.from('user_preferences').update(prefFields).eq('id', existingPref.id)
        } else {
          await supabase.from('user_preferences').insert(prefFields)
        }

        json(response, 200, { message: 'Profile updated successfully.' })
        return
      }
    }

    // 8. GET /api/dashboard-stats
    if (url === '/api/dashboard-stats' && request.method === 'GET') {
      const { profile } = await dbService.getUserAndProfile(authHeader)
      const supabase = getSupabaseClient(authHeader)

      const [resumesRes, interviewsRes, mockInterviewsRes, skillsRes, goalRes, careerRes, savedJobsRes, applicationsRes] = await Promise.all([
        supabase.from('resume_analyses').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('interview_sessions').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('mock_interviews').select('id, target_role, interview_type, overall_score, created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('user_skills').select('id').eq('profile_id', profile.id),
        supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).limit(1).maybeSingle(),
        supabase.from('career_analyses').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('saved_jobs').select('id', { count: 'exact', head: true }).eq('profile_id', profile.id),
        supabase.from('job_applications').select('status').eq('profile_id', profile.id)
      ])

      const latestResume = resumesRes.data
      const legacyInterviewSessions = interviewsRes.data ?? []
      const mockInterviewSessions = (mockInterviewsRes.data ?? []).filter((session: any) => session.overall_score !== null).map((session: any) => ({
        id: `mock-${session.id}`,
        job_role: session.target_role,
        interview_type: session.interview_type,
        score: session.overall_score,
        created_at: session.created_at,
      }))
      const interviewSessions = [...legacyInterviewSessions, ...mockInterviewSessions].sort((left: any, right: any) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      const skillsCount = (skillsRes.data ?? []).length
      const currentTargetRole = goalRes.data?.target_role ?? null
      const latestCareer = careerRes.data
      const latestCareerAnalysis = currentTargetRole && latestCareer && latestCareer.target_role === currentTargetRole ? latestCareer : null
      const applications = applicationsRes.data ?? []

      let avgInterview = null
      if (interviewSessions.length > 0) {
        const sum = interviewSessions.reduce((total: number, session: any) => total + (session.score || 0), 0)
        avgInterview = Math.round(sum / interviewSessions.length)
      }

      json(response, 200, {
        resumeScore: latestResume?.overall_score ?? null,
        atsScore: latestResume?.ats_score ?? null,
        interviewScore: avgInterview,
        skillsCount,
        latestResumeAnalysis: latestResume ?? null,
        latestCareerAnalysis,
        interviewHistory: interviewSessions,
        savedJobsCount: savedJobsRes.count ?? 0,
        appliedCount: applications.filter((application: any) => application.status === 'applied').length,
        interviewCount: applications.filter((application: any) => application.status === 'interview').length,
        offerCount: applications.filter((application: any) => application.status === 'offer').length,
        rejectedCount: applications.filter((application: any) => application.status === 'rejected').length,
      })
      return
    }

    json(response, 404, { error: `Not found: ${request.method} ${url}` })
  } catch (error) {
    console.error('Server router handle error:', error)
    const status = error instanceof ResumeExtractError
      ? error.status
      : !authHeader || (error instanceof Error && /invalid user session|authorization header|missing authenticated/i.test(error.message))
        ? 401
        : 500
    const code = error instanceof ResumeExtractError ? error.code : 'server_error'
    const message = error instanceof Error ? error.message : 'An error occurred while processing this request.'
    json(response, status, { error: message, code })
  }
}

export const resumeExtractPlugin = (): Plugin => ({
  name: 'resume-extract-api',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = request.url?.split('?')[0] || ''
      if (!url.startsWith('/api/')) {
        next()
        return
      }
      void handleRequest(request, response)
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = request.url?.split('?')[0] || ''
      if (!url.startsWith('/api/')) {
        next()
        return
      }
      void handleRequest(request, response)
    })
  },
})

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { extractResumePdf, ResumeExtractError } from './extractResumePdf.ts'
import { aiService } from './services/aiService.ts'
import { dbService, getSupabaseClient } from './services/dbService.ts'

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

  try {
    // 1. POST /api/resume/extract
    if (url === '/api/resume/extract' && request.method === 'POST') {
      const body = await readBody(request, 5 * 1024 * 1024)
      const filenameHeader = request.headers['x-filename']
      const filename = decodeURIComponent(
        Array.isArray(filenameHeader) ? filenameHeader[0] ?? '' : filenameHeader ?? 'resume.pdf'
      )
      const result = await extractResumePdf(new Uint8Array(body), filename, request.headers['content-type'] ?? null)
      json(response, 200, result)
      return
    }

    // 2. POST /api/resume/analyze
    if (url === '/api/resume/analyze' && request.method === 'POST') {
      const body = await readBody(request, 2 * 1024 * 1024)
      const { text, targetRole, filename, fileSize, pageCount, characterCount } = JSON.parse(body.toString())
      if (!text || !targetRole) {
        json(response, 400, { error: 'Missing text or targetRole parameters.' })
        return
      }

      const { profile } = await dbService.getUserAndProfile(authHeader)
      const analysis = await aiService.analyzeResume(text, targetRole)

      // Save to Supabase
      const supabase = getSupabaseClient(authHeader)
      const { data: inserted, error: insertError } = await supabase
        .from('resume_analyses')
        .insert({
          profile_id: profile.id,
          filename: filename || 'resume.pdf',
          file_size: fileSize || 0,
          page_count: pageCount || 1,
          character_count: characterCount || text.length,
          overall_score: analysis.overallScore,
          ats_score: analysis.atsScore,
          keyword_score: analysis.keywordScore,
          formatting_score: analysis.formattingScore,
          detected_skills: analysis.detectedSkills,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          projects: analysis.projects,
          education_experience: analysis.educationExperience,
          missing_skills: analysis.missingSkills,
          ats_recommendations: analysis.atsRecommendations,
          ai_summary: analysis.aiSummary
        })
        .select()
        .single()

      if (insertError) {
        console.error('Failed to save resume analysis to db:', insertError)
        // If DB fails (e.g. table not created yet), return AI response anyway so UI does not break!
        json(response, 200, { ...analysis, dbError: insertError.message })
        return
      }

      json(response, 200, inserted)
      return
    }

    // 3. POST /api/career/analyze
    if (url === '/api/career/analyze' && request.method === 'POST') {
      const body = await readBody(request, 1 * 1024 * 1024)
      const { profile: frontendProfile, skills, careerGoal, preferences } = JSON.parse(body.toString())

      const { profile } = await dbService.getUserAndProfile(authHeader)
      const analysis = await aiService.analyzeCareer(frontendProfile, skills, careerGoal, preferences)

      const supabase = getSupabaseClient(authHeader)
      const { data: inserted, error: insertError } = await supabase
        .from('career_analyses')
        .insert({
          profile_id: profile.id,
          target_role: careerGoal?.target_role || 'Software Developer',
          career_summary: analysis.career_summary,
          strengths: analysis.strengths,
          skill_gaps: analysis.skill_gaps,
          recommended_skills: analysis.recommended_skills,
          learning_strategy: analysis.learning_strategy,
          recommended_roles: analysis.recommended_roles,
          interview_preparation: analysis.interview_preparation
        })
        .select()
        .single()

      if (insertError) {
        console.error('Failed to save career analysis to db:', insertError)
        json(response, 200, { ...analysis, dbError: insertError.message })
        return
      }

      json(response, 200, inserted)
      return
    }

    // 4. POST /api/interview/start
    if (url === '/api/interview/start' && request.method === 'POST') {
      const body = await readBody(request, 100 * 1024)
      const { jobRole, experienceLevel, interviewType } = JSON.parse(body.toString())
      const questions = await aiService.generateInterviewQuestions(jobRole || 'Software Developer', experienceLevel || 'Student / Fresher', interviewType || 'Technical')
      json(response, 200, { questions })
      return
    }

    // 5. POST /api/interview/answer
    if (url === '/api/interview/answer' && request.method === 'POST') {
      const body = await readBody(request, 100 * 1024)
      const { question, answer, jobRole } = JSON.parse(body.toString())
      const result = await aiService.evaluateInterviewAnswer(question, answer, jobRole || 'Software Developer')
      json(response, 200, result)
      return
    }

    // 6. POST /api/interview/save
    if (url === '/api/interview/save' && request.method === 'POST') {
      const body = await readBody(request, 500 * 1024)
      const { jobRole, experienceLevel, interviewType, score, messages, feedback } = JSON.parse(body.toString())
      const { profile } = await dbService.getUserAndProfile(authHeader)

      const supabase = getSupabaseClient(authHeader)
      const { data: inserted, error: insertError } = await supabase
        .from('interview_sessions')
        .insert({
          profile_id: profile.id,
          job_role: jobRole,
          experience_level: experienceLevel,
          interview_type: interviewType,
          score,
          messages,
          feedback
        })
        .select()
        .single()

      if (insertError) {
        console.error('Failed to save interview session to db:', insertError)
        json(response, 400, { error: insertError.message })
        return
      }

      json(response, 200, inserted)
      return
    }

    // 7. GET /api/profile & POST /api/profile
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

      const [resumesRes, interviewsRes, skillsRes, careerRes] = await Promise.all([
        supabase.from('resume_analyses').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('interview_sessions').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('user_skills').select('id'),
        supabase.from('career_analyses').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ])

      const latestResume = resumesRes.data
      const interviewSessions = interviewsRes.data ?? []
      const skillsCount = (skillsRes.data ?? []).length
      const latestCareer = careerRes.data

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
        latestCareerAnalysis: latestCareer ?? null,
        interviewHistory: interviewSessions
      })
      return
    }

    json(response, 404, { error: `Not found: ${request.method} ${url}` })
  } catch (error) {
    console.error('Server router handle error:', error)
    const status = error instanceof ResumeExtractError ? error.status : 500
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

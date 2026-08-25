const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'gemini-2.5-flash'
const MAX_TEXT_LENGTH = 50000

type ResumeAnalysis = {
  atsScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  missingSkills: string[]
  recommendations: string[]
  keywordMatch: string[]
  careerRoles: string[]
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })

const clampScore = (value: unknown) => {
  const score = Number(value)

  if (!Number.isFinite(score)) return 0

  return Math.max(0, Math.min(100, Math.round(score)))
}

const cleanStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20)
}

const cleanAnalysis = (value: unknown): ResumeAnalysis => {
  const data =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {}

  return {
    atsScore: clampScore(data.atsScore),

    summary:
      typeof data.summary === 'string'
        ? data.summary.trim()
        : 'Resume analysis completed.',

    strengths: cleanStringArray(data.strengths),

    weaknesses: cleanStringArray(data.weaknesses),

    missingSkills: cleanStringArray(data.missingSkills),

    recommendations: cleanStringArray(data.recommendations),

    keywordMatch: cleanStringArray(data.keywordMatch),

    careerRoles: cleanStringArray(data.careerRoles),
  }
}

const extractGeminiText = (data: unknown) => {
  if (!data || typeof data !== 'object') return ''

  const response = data as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: unknown
        }>
      }
    }>
  }

  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim() || ''
  )
}

const parseGeminiJson = (text: string) => {
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  try {
    return JSON.parse(text)
  } catch {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    try {
      return JSON.parse(cleaned)
    } catch {
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')

      if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(
          cleaned.slice(firstBrace, lastBrace + 1),
        )
      }

      throw new Error('Gemini returned invalid JSON.')
    }
  }
}

const buildPrompt = (resumeText: string) => `
You are CareerAI, an expert ATS resume analyzer and career advisor.

Analyze the following resume carefully.

Your analysis must be realistic and based ONLY on information present in the resume.
Do not invent work experience, skills, education, certifications, achievements, or projects.

Evaluate:

1. ATS compatibility
2. Resume clarity
3. Technical skills
4. Strengths
5. Weaknesses
6. Missing or potentially useful skills
7. Resume improvement recommendations
8. Relevant job/career roles

ATS score should be from 0 to 100.

Return ONLY valid JSON.
Do not use markdown.
Do not wrap the JSON in code fences.

Use exactly this JSON structure:

{
  "atsScore": 0,
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "missingSkills": [],
  "recommendations": [],
  "keywordMatch": [],
  "careerRoles": []
}

Rules:
- atsScore must be an integer from 0 to 100.
- strengths must contain concise points.
- weaknesses must contain actionable issues.
- missingSkills should contain skills that would improve the candidate's target employability based on the resume.
- recommendations should be practical.
- keywordMatch should contain important technical keywords already present in the resume.
- careerRoles should contain 3 to 6 realistic roles.
- Do not claim that a skill exists if it is not present.

RESUME:

${resumeText}
`

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (request.method !== 'POST') {
    return json(
      {
        error: 'Method not allowed',
        code: 'method_not_allowed',
      },
      405,
    )
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

  if (!geminiApiKey) {
    return json(
      {
        error:
          'Gemini API is not configured. Add GEMINI_API_KEY to Supabase secrets.',
        code: 'gemini_not_configured',
      },
      500,
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return json(
      {
        error: 'Invalid JSON request.',
        code: 'invalid_json',
      },
      400,
    )
  }

  const requestBody =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>)
      : {}

  const resumeText =
    typeof requestBody.resumeText === 'string'
      ? requestBody.resumeText.trim()
      : ''

  if (!resumeText) {
    return json(
      {
        error: 'Resume text is required.',
        code: 'missing_resume_text',
      },
      400,
    )
  }

  if (resumeText.length > MAX_TEXT_LENGTH) {
    return json(
      {
        error:
          'Resume text is too long. Please upload a shorter resume.',
        code: 'resume_too_long',
      },
      413,
    )
  }

  try {
    const prompt = buildPrompt(resumeText)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
        geminiApiKey,
      )}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini API error:', response.status)

      return json(
        {
          error:
            typeof data?.error?.message === 'string'
              ? data.error.message
              : 'Gemini AI analysis failed.',
          code: 'gemini_api_error',
        },
        response.status,
      )
    }

    const generatedText = extractGeminiText(data)

    if (!generatedText) {
      return json(
        {
          error: 'Gemini returned no analysis.',
          code: 'empty_ai_response',
        },
        502,
      )
    }

    const parsedJson = parseGeminiJson(generatedText)
    const analysis = cleanAnalysis(parsedJson)

    return json({
      success: true,
      model: MODEL,
      analysis,
    })
  } catch (error) {
    console.error('Resume AI analysis error:', error)

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'AI resume analysis failed.',
        code: 'analysis_failed',
      },
      500,
    )
  }
})
export interface ResumeAnalysisResult {
  overallScore: number
  atsScore: number
  keywordScore: number
  formattingScore: number
  detectedSkills: string[]
  strengths: string[]
  improvements: string[]
  projects: Array<{ title: string; outcome: string }>
  educationExperience: string[]
  missingSkills: string[]
  atsRecommendations: string[]
  aiSummary: string
}

export interface CareerAnalysisResult {
  career_summary: string
  strengths: Array<{ skill: string; reason: string }>
  skill_gaps: Array<{ skill: string; current_level: number; target_level: number; priority: 'High' | 'Medium' | 'Low'; reason: string }>
  recommended_skills: Array<{ skill: string; reason: string }>
  learning_strategy: Array<{ step: number; title: string; description: string }>
  recommended_roles: Array<{ role: string; match_percentage: number; reason: string }>
  interview_preparation: Array<{ topic: string; questions: string[] }>
}

export interface InterviewEvaluationResult {
  score: number
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  idealAnswerPoints: string[]
}

type OpenAIResponse = {
  choices?: Array<{ message?: { content?: unknown } }>
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const asOpenAIResponse = (value: unknown): OpenAIResponse => {
  if (!isRecord(value) || !Array.isArray(value.choices)) return {}
  return value as OpenAIResponse
}

const asGeminiResponse = (value: unknown): GeminiResponse => {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return {}
  return value as GeminiResponse
}

const getApiKey = (): string => {
  return process.env.AI_API_KEY || ''
}

const isGeminiKey = (key: string): boolean => {
  return key.startsWith('AIZA') || !key.startsWith('sk-')
}

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const model = process.env.AI_MODEL || 'gpt-4o-mini'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API returned error status ${response.status}: ${errorText}`)
  }

  const data = asOpenAIResponse(await response.json())
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content) throw new Error('OpenAI returned an empty completion response.')
  return content
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const model = process.env.AI_MODEL || 'gemini-1.5-flash'
  // Use Gemini v1beta REST API generateContent endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nUser Content:\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API returned error status ${response.status}: ${errorText}`)
  }

  const data = asGeminiResponse(await response.json())
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string' || !text) throw new Error('Gemini returned an empty content response.')
  return text
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('AI API key is missing. Please configure AI_API_KEY in .env.local.')
  }

  if (isGeminiKey(apiKey)) {
    return callGemini(apiKey, systemPrompt, userPrompt)
  } else {
    return callOpenAI(apiKey, systemPrompt, userPrompt)
  }
}

export const aiService = {
  async analyzeResume(resumeText: string, targetRole: string): Promise<ResumeAnalysisResult> {
    const systemPrompt = `You are a professional ATS scanner and senior technical recruiter.
    Analyze the resume text against the target role: "${targetRole}".
    Return a structured JSON output with the exact keys below.
    JSON Output Format:
    {
      "overallScore": 85,
      "atsScore": 82,
      "keywordScore": 79,
      "formattingScore": 90,
      "detectedSkills": ["React", "JavaScript", "Python"],
      "strengths": ["Clear work descriptions", "Impact quantified"],
      "improvements": ["Highlight more SQL experience"],
      "projects": [
        { "title": "Project Name", "outcome": "quantified impact description" }
      ],
      "educationExperience": ["B.Tech CSE - DIT (2026)", "Software Intern - X Corp"],
      "missingSkills": ["Docker", "Kubernetes"],
      "atsRecommendations": ["Use standard bullet points", "Include more core technical keywords"],
      "aiSummary": "A concise paragraph summary of the resume strength and fit for the role."
    }`

    const userPrompt = `Target Role: ${targetRole}\n\nResume Content:\n${resumeText}`

    try {
      const responseText = await callAI(systemPrompt, userPrompt)
      const parsed = JSON.parse(responseText) as ResumeAnalysisResult

      // Gracefully handle fields or fill defaults if shape is slightly malformed
      return {
        overallScore: Number(parsed.overallScore) || 70,
        atsScore: Number(parsed.atsScore) || 70,
        keywordScore: Number(parsed.keywordScore) || 70,
        formattingScore: Number(parsed.formattingScore) || 70,
        detectedSkills: Array.isArray(parsed.detectedSkills) ? parsed.detectedSkills : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        educationExperience: Array.isArray(parsed.educationExperience) ? parsed.educationExperience : [],
        missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
        atsRecommendations: Array.isArray(parsed.atsRecommendations) ? parsed.atsRecommendations : [],
        aiSummary: parsed.aiSummary || 'Analysis complete.',
      }
    } catch (error) {
      console.error('aiService.analyzeResume error:', error)
      // Return beautiful fallback
      return {
        overallScore: 65,
        atsScore: 60,
        keywordScore: 55,
        formattingScore: 80,
        detectedSkills: ['JavaScript', 'HTML', 'CSS'],
        strengths: ['Resume structure is clean.'],
        improvements: ['We could not contact the AI. Please configure a valid key.'],
        projects: [],
        educationExperience: [],
        missingSkills: ['SQL', 'React'],
        atsRecommendations: ['Please configure AI_API_KEY in .env.local to unlock complete review.'],
        aiSummary: 'This is a local fallback analysis because the AI provider was offline or the API key was misconfigured.',
      }
    }
  },

  async analyzeCareer(profile: any, skills: any[], goal: any, preferences: any): Promise<CareerAnalysisResult> {
    const systemPrompt = `You are a professional career guidance AI.
    Analyze the user's details, skills, target goal, and preferences.
    Produce structured career recommendations, gaps, strengths, a learning roadmap, and job preparation notes.
    Return a structured JSON with the exact keys matching the required format.
    
    JSON Output Format:
    {
      "career_summary": "string",
      "strengths": [{ "skill": "string", "reason": "string" }],
      "skill_gaps": [{ "skill": "string", "current_level": 50, "target_level": 80, "priority": "High", "reason": "string" }],
      "recommended_skills": [{ "skill": "string", "reason": "string" }],
      "learning_strategy": [{ "step": 1, "title": "string", "description": "string" }],
      "recommended_roles": [{ "role": "string", "match_percentage": 85, "reason": "string" }],
      "interview_preparation": [{ "topic": "string", "questions": ["string"] }]
    }`

    const userPrompt = `
    Profile: ${JSON.stringify(profile)}
    Skills: ${JSON.stringify(skills)}
    Goal: ${JSON.stringify(goal)}
    Preferences: ${JSON.stringify(preferences)}
    `

    try {
      const responseText = await callAI(systemPrompt, userPrompt)
      const parsed = JSON.parse(responseText) as CareerAnalysisResult

      return {
        career_summary: parsed.career_summary || 'Summary generated.',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        skill_gaps: Array.isArray(parsed.skill_gaps) ? parsed.skill_gaps : [],
        recommended_skills: Array.isArray(parsed.recommended_skills) ? parsed.recommended_skills : [],
        learning_strategy: Array.isArray(parsed.learning_strategy) ? parsed.learning_strategy : [],
        recommended_roles: Array.isArray(parsed.recommended_roles) ? parsed.recommended_roles : [],
        interview_preparation: Array.isArray(parsed.interview_preparation) ? parsed.interview_preparation : [],
      }
    } catch (error) {
      console.error('aiService.analyzeCareer error:', error)
      return {
        career_summary: 'Unable to connect to AI server. Please verify your environment keys.',
        strengths: [],
        skill_gaps: [],
        recommended_skills: [],
        learning_strategy: [],
        recommended_roles: [],
        interview_preparation: [],
      }
    }
  },

  async generateInterviewQuestions(role: string, experience: string, type: string): Promise<string[]> {
    const systemPrompt = `You are a technical interviewer for a "${role}" position (Experience: ${experience}).
    Generate exactly 5 interview questions of type "${type}" (e.g. Technical, Behavioral, or HR).
    Return a structured JSON output with a "questions" key containing the list of 5 questions.
    Format: { "questions": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"] }`

    const userPrompt = `Role: ${role}\nExperience: ${experience}\nType: ${type}`

    try {
      const responseText = await callAI(systemPrompt, userPrompt)
      const parsed = JSON.parse(responseText) as { questions: string[] }
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed.questions.slice(0, 5)
      }
      throw new Error('No questions returned in JSON.')
    } catch (error) {
      console.error('aiService.generateInterviewQuestions error:', error)
      // Standard fallback questions
      return [
        `Explain your experience working as a ${role}. What are your core tech tools?`,
        `Describe a challenging problem you solved in your recent ${role} project.`,
        `What is your approach to learning a new skill or framework?`,
        `How do you handle disagreement with team members about technical solutions?`,
        `Why are you interested in joining our company?`,
      ]
    }
  },

  async evaluateInterviewAnswer(question: string, answer: string, role: string): Promise<InterviewEvaluationResult> {
    const systemPrompt = `You are an expert interviewer evaluating a candidate's response for a "${role}" role.
    Evaluate the response against the question. Provide a score out of 100, lists of strengths, weaknesses, improvements, and ideal answer points.
    Return a structured JSON output with the exact keys.
    Format:
    {
      "score": 80,
      "strengths": ["Detailed explanation", "Clean logic"],
      "weaknesses": ["Missed caching details"],
      "improvements": ["Explain trade-offs of using Redis"],
      "idealAnswerPoints": ["Mention scalability", "Explain index search time complexity"]
    }`

    const userPrompt = `Role: ${role}\nQuestion: ${question}\nCandidate Answer: ${answer}`

    try {
      const responseText = await callAI(systemPrompt, userPrompt)
      const parsed = JSON.parse(responseText) as InterviewEvaluationResult
      return {
        score: Number(parsed.score) || 75,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Good response structure.'],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        idealAnswerPoints: Array.isArray(parsed.idealAnswerPoints) ? parsed.idealAnswerPoints : [],
      }
    } catch (error) {
      console.error('aiService.evaluateInterviewAnswer error:', error)
      return {
        score: 70,
        strengths: ['Answer was recorded.'],
        weaknesses: ['AI evaluation was unavailable.'],
        improvements: ['Check server connection to get automated insights.'],
        idealAnswerPoints: ['The ideal response should outline practical experience and design principles.'],
      }
    }
  }
}

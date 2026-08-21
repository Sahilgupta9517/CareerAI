import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responseShape = {
  career_summary: 'string',
  strengths: 'array',
  skill_gaps: 'array',
  recommended_skills: 'array',
  learning_strategy: 'array',
  recommended_roles: 'array',
  interview_preparation: 'array',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const aiApiKey = Deno.env.get('AI_API_KEY')
  const aiApiUrl = Deno.env.get('AI_API_URL') || 'https://api.openai.com/v1/chat/completions'
  const aiModel = Deno.env.get('AI_MODEL') || 'gpt-4o-mini'
  if (!supabaseUrl || !supabaseAnonKey || !aiApiKey) return json({ error: 'Career analysis is not configured on the server.' }, 500)

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Your session is invalid or expired.' }, 401)

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid analysis payload.' }, 400)
  }

  const prompt = `Analyze this authenticated user's career data. Use only the supplied data. Do not invent saved skills, experience, goals, preferences, or achievements. Return valid JSON only with exactly these top-level keys: ${JSON.stringify(responseShape)}.

Required JSON shape:
{
  "career_summary": "string",
  "strengths": [{ "skill": "string", "reason": "string" }],
  "skill_gaps": [{ "skill": "string", "current_level": 0, "target_level": 0, "priority": "High | Medium | Low", "reason": "string" }],
  "recommended_skills": [{ "skill": "string", "reason": "string" }],
  "learning_strategy": [{ "step": 1, "title": "string", "description": "string" }],
  "recommended_roles": [{ "role": "string", "match_percentage": 0, "reason": "string" }],
  "interview_preparation": [{ "topic": "string", "questions": ["string"] }]
}

Authenticated user id: ${userData.user.id}
Career data:
${JSON.stringify(payload)}`

  const providerResponse = await fetch(aiApiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: aiModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a precise career analysis assistant. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!providerResponse.ok) {
    const providerError = await providerResponse.text()
    console.error('AI provider request failed:', providerResponse.status, providerError.slice(0, 500))
    return json({ error: 'The AI provider could not generate an analysis.' }, 502)
  }

  const providerJson = await providerResponse.json()
  const content = providerJson.choices?.[0]?.message?.content
  if (typeof content !== 'string') return json({ error: 'The AI provider returned no analysis.' }, 502)

  try {
    const parsed = JSON.parse(content)
    if (typeof parsed.career_summary !== 'string' || !Array.isArray(parsed.strengths) || !Array.isArray(parsed.skill_gaps) || !Array.isArray(parsed.recommended_skills) || !Array.isArray(parsed.learning_strategy) || !Array.isArray(parsed.recommended_roles) || !Array.isArray(parsed.interview_preparation)) {
      throw new Error('Invalid analysis shape')
    }
    return json(parsed)
  } catch (error) {
    console.error('AI provider returned invalid JSON:', error)
    return json({ error: 'The AI provider returned an invalid analysis.' }, 502)
  }
})

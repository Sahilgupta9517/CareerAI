import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Loader2, MessageSquareText, Sparkles, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'

type ResumeContext = {
  overall_score: number | null
  ats_score: number | null
  keyword_score: number | null
  formatting_score: number | null
  detected_skills: string[] | null
  strengths: string[] | null
  improvements: string[] | null
  missing_skills: string[] | null
  ats_recommendations: string[] | null
  ai_summary: string | null
}
type UserData = {
  profile: {
    name: string | null
    education: string | null
    branch: string | null
    experience: string | null
    location: string | null
  }

  skills: Array<{
    id: number
    name: string
    proficiency: number
    category: string | null
  }>

  goal: {
    target_role: string | null
    preferred_location: string | null
    work_preference: string | null
    goal_description: string | null
  } | null

  preferences: {
    preferred_job_type: string | null
    preferred_work_mode: string | null
    preferred_locations: string | null
    expected_salary: string | number | null
    preferred_industries: string | null
  } | null

  resume: ResumeContext | null
}

type AiAnalysis = {
  career_summary: string
  strengths: Array<{ skill: string; reason: string }>
  skill_gaps: Array<{ skill: string; current_level: number; target_level: number; priority: 'High' | 'Medium' | 'Low'; reason: string }>
  recommended_skills: Array<{ skill: string; reason: string }>
  learning_strategy: Array<{ step: number; title: string; description: string }>
  recommended_roles: Array<{ role: string; match_percentage: number; reason: string }>
  interview_preparation: Array<{ topic: string; questions: string[] }>
}

const show = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not provided'
  return String(value)
}

const isAiAnalysis = (value: unknown): value is AiAnalysis => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.career_summary === 'string' && Array.isArray(candidate.strengths) && Array.isArray(candidate.skill_gaps) && Array.isArray(candidate.recommended_skills) && Array.isArray(candidate.learning_strategy) && Array.isArray(candidate.recommended_roles) && Array.isArray(candidate.interview_preparation)
}

export function CareerAnalysisPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<UserData | null>(null)
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [latestCareerAnalysis, setLatestCareerAnalysis] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadUserData = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) {
      navigate('/login', { replace: true })
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, education, branch, experience, location')
      .eq('user_id', userData.user.id)
      .limit(1)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')

    const [skillsResult, goalResult, preferencesResult, resumeResult] = await Promise.all([
      supabase.from('user_skills').select('id, proficiency, skill:skills(id, name, category)').eq('profile_id', profile.id),
      supabase.from('career_goals').select('target_role, preferred_location, work_preference, goal_description').eq('profile_id', profile.id).limit(1).maybeSingle(),
      supabase.from('user_preferences').select('preferred_job_type, preferred_work_mode, preferred_locations, expected_salary, preferred_industries').eq('profile_id', profile.id).limit(1).maybeSingle(),
      supabase.from('resume_analyses').select('overall_score, ats_score, keyword_score, formatting_score, detected_skills, strengths, improvements, missing_skills, ats_recommendations, ai_summary, created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (skillsResult.error) throw skillsResult.error
    if (goalResult.error) throw goalResult.error
    if (resumeResult.error) {
      console.error('Could not load latest resume analysis:', resumeResult.error)
    }

    const skills = (skillsResult.data ?? []).map((row) => {
      const skill = row.skill as unknown as { id: number; name: string; category: string | null } | null
      return {
        id: row.id,
        name: skill?.name ?? 'Unknown skill',
        proficiency: Number(row.proficiency) || 0,
        category: skill?.category ?? null,
      }
    })

    return {
      profile,
      skills,
      goal: goalResult.data,
      preferences: preferencesResult.data,
      resume: resumeResult.data ?? null,
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await loadUserData()
        if (!userData) return

        setData(userData)
        const currentTargetRole = userData.goal?.target_role ?? ''
        const { data: latestAnalysisData, error: latestAnalysisError } = await supabase
          .from('career_analyses')
          .select('*')
          .eq('profile_id', userData.profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestAnalysisError) throw latestAnalysisError

        setLatestCareerAnalysis(latestAnalysisData ?? null)
        if (latestAnalysisData && currentTargetRole && latestAnalysisData.target_role === currentTargetRole) {
          const parsedAnalysis = isAiAnalysis(latestAnalysisData) ? latestAnalysisData : null
          setAnalysis(parsedAnalysis)
        } else {
          setAnalysis(null)
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'We could not load your career data.')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [])

  const generateAnalysis = async () => {
    if (!data) return
    const targetRole = data.goal?.target_role ?? ''
    if (!targetRole) {
      setErrorMessage('Set a target role before generating a new AI Career Analysis.')
      return
    }

    setGenerating(true)
    setErrorMessage('')
    try {
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data.session?.access_token
      if (!token) throw new Error('You must be logged in to generate career analysis.')

      const result = await fetchApi('/api/career/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile: data.profile,
          skills: data.skills,
          careerGoal: { ...(data.goal ?? {}), target_role: targetRole },
          preferences: data.preferences,
          resumeAnalysis: data.resume,
        }),
      }, 'Career analysis')
      if (!isAiAnalysis(result)) throw new Error('The AI provider returned an incomplete analysis.')
      setAnalysis(result)
      setLatestCareerAnalysis({ ...result, target_role: targetRole })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'We could not generate your AI analysis.')
    } finally {
      setGenerating(false)
    }
  }

  const skillAverage = data?.skills.length ? Math.round(data.skills.reduce((sum, skill) => sum + skill.proficiency, 0) / data.skills.length) : 0
  const targetRole = data?.goal?.target_role || ''
  const roleChangedMessage = targetRole && latestCareerAnalysis && latestCareerAnalysis.target_role !== targetRole ? `Your target role changed to ${targetRole}. Generate a new AI Career Analysis.` : ''

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading career data" /></div>
  if (errorMessage && !data) return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">{errorMessage}</div>
  if (!data) return <div role="status" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Career data is not available yet.</div>

  return <div className="space-y-6">
    <PageHeader title="AI Career Analysis" description={targetRole ? `Generate a structured analysis for your ${targetRole} path.` : 'Complete your career goal before generating an analysis.'} eyebrow={<Badge variant="outline" className="border-primary/20 text-primary"><Sparkles className="h-3.5 w-3.5" /> Secure AI analysis</Badge>} actions={<div className="flex gap-2"><Button onClick={generateAnalysis} disabled={generating || !targetRole}>{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {analysis ? 'Regenerate Analysis' : 'Generate AI Analysis'}</Button><Button asChild variant="outline"><Link to="/skills">View skill gaps <ArrowRight className="h-4 w-4" /></Link></Button></div>} />
    {errorMessage ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</div> : null}
    {roleChangedMessage ? <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{roleChangedMessage}</div> : null}

    <Card className="relative overflow-hidden p-6"><div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-gradient opacity-10 blur-3xl" /><div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Career Overview</p><h2 className="mt-2 text-2xl font-bold">{show(data.profile.name)} · {show(targetRole)}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{analysis?.career_summary || 'Your AI-generated summary will appear here after you generate the analysis.'}</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">{show(data.profile.education)}</Badge><Badge variant="secondary">{show(data.profile.experience)}</Badge><Badge variant="secondary">{show(data.profile.location)}</Badge></div></div><div className="min-w-44 rounded-2xl bg-brand-soft p-5 text-center"><p className="text-xs text-muted-foreground">Current skill average</p><p className="mt-1 text-4xl font-bold text-primary">{skillAverage}%</p><Progress value={skillAverage} className="mt-3" /></div></div></Card>

    <div className="grid gap-5 lg:grid-cols-2"><Card className="p-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></span><div><h2 className="text-base font-semibold">Current Strengths</h2><p className="text-sm text-muted-foreground">AI analysis of your strongest saved skills.</p></div></div><div className="mt-5 space-y-3">{analysis?.strengths.map((item) => <div key={item.skill} className="rounded-xl bg-muted/40 px-4 py-3"><div className="flex justify-between text-sm font-semibold"><span>{item.skill}</span><span className="text-emerald-700">{show(data.skills.find((skill) => skill.name === item.skill)?.proficiency)}%</span></div><p className="mt-1 text-xs text-muted-foreground">{item.reason}</p></div>)}{!analysis ? <p className="text-sm text-muted-foreground">Generate the analysis to identify your strengths.</p> : analysis.strengths.length === 0 ? <p className="text-sm text-muted-foreground">No strengths returned for the current data.</p> : null}</div></Card><Card className="p-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Target className="h-4 w-4" /></span><div><h2 className="text-base font-semibold">Skill Gaps</h2><p className="text-sm text-muted-foreground">AI-prioritized areas to strengthen.</p></div></div><div className="mt-5 space-y-3">{analysis?.skill_gaps.map((item) => <div key={item.skill}><div className="flex items-center justify-between text-sm"><span>{item.skill}</span><Badge variant={item.priority === 'High' ? 'danger' : item.priority === 'Medium' ? 'warning' : 'secondary'}>{item.priority}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.current_level}% current · {item.target_level}% target · {item.reason}</p><Progress value={item.current_level} className="mt-2 h-1.5" /></div>)}{!analysis ? <p className="text-sm text-muted-foreground">Generate the analysis to identify your skill gaps.</p> : analysis.skill_gaps.length === 0 ? <p className="text-sm text-muted-foreground">No skill gaps returned for the current data.</p> : null}</div></Card></div>

    <Card className="p-6"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary" /><div><h2 className="text-base font-semibold">Recommended Skills</h2><p className="text-sm text-muted-foreground">Suggestions returned by the secure AI analysis.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{analysis?.recommended_skills.map((item) => <div key={item.skill} className="rounded-xl border border-border p-4"><p className="text-sm font-semibold">{item.skill}</p><p className="mt-1 text-xs text-muted-foreground">{item.reason}</p></div>)}{!analysis ? <p className="text-sm text-muted-foreground">Generate the analysis to receive recommendations.</p> : analysis.recommended_skills.length === 0 ? <p className="text-sm text-muted-foreground">No recommended skills returned.</p> : null}</div></Card>

    <div className="grid gap-5 lg:grid-cols-2"><Card className="p-6"><h2 className="text-base font-semibold">Personalized Learning Strategy</h2><p className="mt-2 text-sm text-muted-foreground">Ordered guidance from the secure AI response.</p><div className="mt-5 space-y-4">{analysis?.learning_strategy.map((item) => <div key={item.step} className="flex gap-3"><span className="font-semibold text-primary">{String(item.step).padStart(2, '0')}</span><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p></div></div>)}{!analysis ? <p className="text-sm text-muted-foreground">Generate the analysis to receive a learning strategy.</p> : null}</div><Button asChild variant="outline" className="mt-5"><Link to="/roadmap">Open learning roadmap <ArrowRight className="h-4 w-4" /></Link></Button></Card><Card className="p-6"><h2 className="text-base font-semibold">Recommended Job Roles</h2><p className="mt-2 text-sm text-muted-foreground">Role suggestions based on your supplied career data.</p><div className="mt-5 space-y-3">{analysis?.recommended_roles.map((item) => <div key={item.role} className="rounded-xl border border-border p-4"><div className="flex justify-between gap-3 text-sm font-semibold"><span>{item.role}</span><span className="text-primary">{item.match_percentage}%</span></div><p className="mt-1 text-xs text-muted-foreground">{item.reason}</p></div>)}{!analysis ? <p className="text-sm text-muted-foreground">Generate the analysis to receive role suggestions.</p> : null}</div><Button asChild variant="outline" className="mt-5"><Link to="/jobs">Explore job matches <ArrowRight className="h-4 w-4" /></Link></Button></Card></div>

    <Card className="p-6"><div className="flex items-center gap-3"><MessageSquareText className="h-5 w-5 text-primary" /><div><h2 className="text-base font-semibold">Interview Preparation</h2><p className="text-sm text-muted-foreground">Targeted topics and questions from the AI response.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{analysis?.interview_preparation.map((item) => <div key={item.topic} className="rounded-xl border border-border p-4"><p className="text-sm font-semibold">{item.topic}</p><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{item.questions.map((question) => <li key={question}>• {question}</li>)}</ul></div>)}{!analysis ? <p className="text-sm text-muted-foreground">Generate the analysis to receive interview preparation topics.</p> : null}</div></Card>

    <Card className="p-6"><div className="flex items-center gap-3"><BriefcaseBusiness className="h-5 w-5 text-primary" /><div><h2 className="text-base font-semibold">Profile context</h2><p className="text-sm text-muted-foreground">{show(data.profile.branch)} · {show(data.profile.experience)} · {show(data.preferences?.preferred_industries)} · {show(data.preferences?.expected_salary)}</p></div></div></Card>
  </div>
}

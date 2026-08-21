import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Sparkles, TrendingUp } from 'lucide-react'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { ChartCard } from '@/components/common/ChartCard'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { supabase } from '@/lib/supabase'

type Priority = 'High' | 'Medium' | 'Low'
type SkillRecord = { id: number; name: string; category: string | null }
type SkillGap = SkillRecord & { current: number; required: number; gap: number; priority: Priority; topics: string[] }

const roleWeights: Record<string, Record<string, number>> = {
  'Frontend Developer': { Frontend: 1, Programming: 0.95, Tools: 0.8, 'Core CS': 0.7, Backend: 0.55, Data: 0.5 },
  'Backend Developer': { Backend: 1, Programming: 0.95, Data: 0.9, 'Core CS': 0.85, Tools: 0.8, Frontend: 0.5 },
  'Data Analyst': { Data: 1, Programming: 0.85, Tools: 0.8, 'Core CS': 0.6, Backend: 0.55, Frontend: 0.4 },
  'Data Scientist': { Data: 1, Programming: 0.95, 'Core CS': 0.8, Tools: 0.75, Backend: 0.55, Frontend: 0.3 },
  'AI/ML Engineer': { Programming: 1, Data: 0.95, 'Core CS': 0.9, Backend: 0.8, Tools: 0.8, Frontend: 0.3 },
  'Cloud Engineer': { Backend: 0.95, Tools: 1, 'Core CS': 0.9, Programming: 0.8, Data: 0.65, Frontend: 0.35 },
  'Software Developer': { Programming: 1, 'Core CS': 0.9, Backend: 0.85, Tools: 0.8, Data: 0.75, Frontend: 0.7 },
}

const topicsFor = (skill: SkillRecord) => {
  const name = skill.name.toLowerCase()
  if (name.includes('sql')) return ['Joins and aggregations', 'Window functions', 'Query optimization']
  if (name.includes('react')) return ['Component composition', 'State and effects', 'Performance patterns']
  if (name.includes('javascript')) return ['Closures and async', 'Modules and APIs', 'Testing fundamentals']
  if (name.includes('data structure') || name.includes('algorithm')) return ['Arrays and hashing', 'Trees and graphs', 'Complexity analysis']
  if (name.includes('python')) return ['Functions and data models', 'Packages and testing', 'Practical automation']
  if (name.includes('git')) return ['Branching workflows', 'Rebasing and recovery', 'Collaborative pull requests']
  return [`${skill.name} fundamentals`, `${skill.name} practical projects`, `${skill.name} interview patterns`]
}

const priorityFor = (gap: number): Priority => (gap >= 45 ? 'High' : gap >= 20 ? 'Medium' : 'Low')

export function SkillGapPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [preferencesContext, setPreferencesContext] = useState('')
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([])

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) {
          navigate('/login', { replace: true })
          return
        }
        const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('user_id', userData.user.id).limit(1).maybeSingle()
        if (profileError) throw profileError
        if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')

        const [savedResult, catalogResult, goalResult, preferencesResult] = await Promise.all([
          supabase.from('user_skills').select('skill_id, proficiency').eq('profile_id', profile.id),
          supabase.from('skills').select('id, name, category').order('name'),
          supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase.from('user_preferences').select('preferred_work_mode, preferred_locations, preferred_industries').eq('profile_id', profile.id).limit(1).maybeSingle(),
        ])
        if (savedResult.error) throw savedResult.error
        if (catalogResult.error) throw catalogResult.error
        if (goalResult.error) throw goalResult.error
        if (preferencesResult.error) throw preferencesResult.error

        const role = goalResult.data?.target_role
        if (!role) return
        setTargetRole(role)
        const preferences = preferencesResult.data
        setPreferencesContext([preferences?.preferred_work_mode, preferences?.preferred_locations, preferences?.preferred_industries].filter(Boolean).join(' · '))
        const weights = roleWeights[role] ?? roleWeights['Software Developer']
        const saved = new Map((savedResult.data ?? []).map((row) => [row.skill_id, Number(row.proficiency) || 0]))
        const gaps = (catalogResult.data as SkillRecord[]).filter((skill) => (weights[skill.category ?? ''] ?? 0) > 0).map((skill) => {
          const required = Math.round(60 + (weights[skill.category ?? ''] ?? 0) * 30)
          const current = saved.get(skill.id) ?? 0
          const gap = Math.max(0, required - current)
          return { ...skill, current, required, gap, priority: priorityFor(gap), topics: topicsFor(skill) }
        }).sort((left, right) => right.gap - left.gap)
        setSkillGaps(gaps)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'We could not load your skill analysis.')
      } finally {
        setLoading(false)
      }
    }
    void loadAnalysis()
  }, [navigate])

  const strongSkills = skillGaps.filter((skill) => skill.current >= skill.required)
  const improvementSkills = skillGaps.filter((skill) => skill.current > 0 && skill.current < skill.required)
  const missingSkills = skillGaps.filter((skill) => skill.current === 0)
  const gapPercentage = useMemo(() => {
    if (skillGaps.length === 0) return 0
    const required = skillGaps.reduce((total, skill) => total + skill.required, 0)
    const current = skillGaps.reduce((total, skill) => total + Math.min(skill.current, skill.required), 0)
    return Math.round(((required - current) / required) * 100)
  }, [skillGaps])
  const roadmap = skillGaps.filter((skill) => skill.gap > 0).sort((left, right) => left.current - right.current || right.gap - left.gap)
  const radarData = skillGaps.slice(0, 6).map((skill) => ({ subject: skill.name, you: skill.current, role: skill.required }))

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading skill gap analysis" /></div>
  if (errorMessage) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>
  if (!targetRole) return <div role="status" className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">Complete your career goal during onboarding to generate a personalized skill gap analysis.</div>

  return <div className="space-y-6">
    <PageHeader title="Skill Gap Analysis" description={`How your skills compare with the inferred baseline for a ${targetRole} role.`} eyebrow={<Badge variant="outline" className="border-primary/20 text-primary"><Sparkles className="h-3.5 w-3.5" /> Based on your saved profile</Badge>} actions={<Button asChild><Link to="/roadmap">Close gaps with roadmap <ArrowRight className="h-4 w-4" /></Link></Button>} />
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="flex flex-col items-center p-6 text-center"><h2 className="self-start text-base font-semibold">Role Readiness</h2><ProgressRing value={100 - gapPercentage} size={168} className="my-5" label={targetRole} /><p className="text-sm text-muted-foreground">{strongSkills.length} strong · {improvementSkills.length} improving · {missingSkills.length} missing</p><div className="mt-5 w-full rounded-xl bg-brand-soft p-4 text-left"><p className="flex items-center gap-2 text-xs font-semibold text-primary"><TrendingUp className="h-3.5 w-3.5" /> Priority focus</p><p className="mt-1 text-sm text-foreground/80">{roadmap[0] ? `${roadmap[0].name} — ${roadmap[0].gap} points below the inferred requirement.` : 'Your saved skills meet the inferred baseline.'}</p></div></Card>
      <ChartCard title="You vs. target role" description="Current proficiency compared with the role baseline" className="lg:col-span-2"><div className="h-[320px] w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="72%"><PolarGrid stroke="#e6e8ef" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} /><Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e6e8ef', fontSize: 12 }} /><Radar name="Target role" dataKey="role" stroke="#c4b5fd" fill="#c4b5fd" fillOpacity={0.35} /><Radar name="You" dataKey="you" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.45} /></RadarChart></ResponsiveContainer></div><div className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> You</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-violet-300" /> {targetRole}</span></div></ChartCard>
    </div>
    <Card className="p-6"><h2 className="text-base font-semibold">Skill status</h2><div className="mt-5 grid gap-5 md:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Strong</p><p className="mt-2 text-sm text-muted-foreground">{strongSkills.map((skill) => skill.name).join(', ') || 'None yet'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Needs improvement</p><p className="mt-2 text-sm text-muted-foreground">{improvementSkills.map((skill) => skill.name).join(', ') || 'None yet'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Missing</p><p className="mt-2 text-sm text-muted-foreground">{missingSkills.map((skill) => skill.name).join(', ') || 'None'}</p></div></div></Card>
    <Card className="p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Prioritized skill gaps</h2><p className="mt-1 text-sm text-muted-foreground">Ordered by missing proficiency and priority.</p></div><Badge variant="secondary">{gapPercentage}% gap</Badge></div><div className="mt-6 space-y-5">{roadmap.map((skill) => <div key={skill.id}><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2.5"><span className="text-sm font-medium">{skill.name}</span><Badge variant="secondary">{skill.category || 'General'}</Badge><Badge variant={skill.priority === 'High' ? 'danger' : skill.priority === 'Medium' ? 'warning' : 'secondary'}>{skill.priority}</Badge></div><div className="flex items-center gap-3 text-xs"><span className="text-muted-foreground">You <span className="font-semibold text-foreground">{skill.current}%</span> / required {skill.required}%</span><span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">-{skill.gap}%</span></div></div><Progress value={skill.current} /><p className="mt-2 text-xs text-muted-foreground">Topics: {skill.topics.join(' · ')}</p></div>)}{roadmap.length === 0 ? <p className="text-sm text-muted-foreground">No current gaps found.</p> : null}</div></Card>
    <Card className="p-6"><h2 className="text-base font-semibold">Personalized learning roadmap</h2><p className="mt-1 text-sm text-muted-foreground">Build from fundamentals toward advanced practice for {targetRole}.</p><div className="mt-6 grid gap-4 md:grid-cols-3">{(['Beginner', 'Intermediate', 'Advanced'] as const).map((level, index) => { const items = roadmap.filter((skill) => index === 0 ? skill.current < 30 : index === 1 ? skill.current >= 30 && skill.current < 60 : skill.current >= 60); return <div key={level} className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-sm font-semibold text-primary">{level}</p><ul className="mt-3 space-y-2 text-sm">{items.slice(0, 5).map((skill) => <li key={skill.id}><span className="font-medium">{skill.name}</span><span className="block text-xs text-muted-foreground">{skill.topics[0]}</span></li>)}{items.length === 0 ? <li className="text-muted-foreground">Nothing queued.</li> : null}</ul></div> })}</div></Card>
    <AIRecommendationCard message={preferencesContext ? `Your analysis also reflects your saved preferences: ${preferencesContext}. Prioritize the high-gap skills above before moving to advanced topics.` : `Prioritize the high-gap skills above before moving to advanced topics for ${targetRole}.`} action={<Button asChild variant="outline"><Link to="/jobs">See affected jobs <ArrowRight className="h-4 w-4" /></Link></Button>} />
  </div>
}

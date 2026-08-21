import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { PageHeader } from '@/components/common/PageHeader'
import { supabase } from '@/lib/supabase'

type Status = 'Not Started' | 'In Progress' | 'Completed'
type DatabaseStatus = 'not_started' | 'in_progress' | 'completed'
type PhaseName = 'Phase 1: Fundamentals' | 'Phase 2: Intermediate' | 'Phase 3: Advanced' | 'Phase 4: Job Ready'
type RoadmapItem = { id: string; name: string; why: string; current: number; target: number; priority: 'High' | 'Medium' | 'Low'; topics: string[]; hours: number; task: string; phase: PhaseName }

type Skill = { id: number; name: string; category: string | null }
const weights: Record<string, Record<string, number>> = {
  'Frontend Developer': { Frontend: 1, Programming: 0.95, Tools: 0.8, 'Core CS': 0.7, Backend: 0.55, Data: 0.5 },
  'Backend Developer': { Backend: 1, Programming: 0.95, Data: 0.9, 'Core CS': 0.85, Tools: 0.8, Frontend: 0.5 },
  'Data Analyst': { Data: 1, Programming: 0.85, Tools: 0.8, 'Core CS': 0.6, Backend: 0.55, Frontend: 0.4 },
  'Data Scientist': { Data: 1, Programming: 0.95, 'Core CS': 0.8, Tools: 0.75, Backend: 0.55, Frontend: 0.3 },
  'AI/ML Engineer': { Programming: 1, Data: 0.95, 'Core CS': 0.9, Backend: 0.8, Tools: 0.8, Frontend: 0.3 },
  'Cloud Engineer': { Backend: 0.95, Tools: 1, 'Core CS': 0.9, Programming: 0.8, Data: 0.65, Frontend: 0.35 },
  'Software Developer': { Programming: 1, 'Core CS': 0.9, Backend: 0.85, Tools: 0.8, Data: 0.75, Frontend: 0.7 },
}

const topicsFor = (skill: Skill) => {
  const name = skill.name.toLowerCase()
  if (name.includes('sql')) return ['Joins and aggregations', 'Window functions', 'Query optimization']
  if (name.includes('react')) return ['Component composition', 'State and effects', 'Performance patterns']
  if (name.includes('javascript')) return ['Closures and async', 'Modules and APIs', 'Testing fundamentals']
  if (name.includes('data structure') || name.includes('algorithm')) return ['Arrays and hashing', 'Trees and graphs', 'Complexity analysis']
  if (name.includes('python')) return ['Functions and data models', 'Packages and testing', 'Practical automation']
  return [`${skill.name} fundamentals`, `${skill.name} practical projects`, `${skill.name} interview patterns`]
}

const phaseFor = (current: number): PhaseName => current < 30 ? 'Phase 1: Fundamentals' : current < 60 ? 'Phase 2: Intermediate' : current < 80 ? 'Phase 3: Advanced' : 'Phase 4: Job Ready'
const priorityFor = (gap: number): 'High' | 'Medium' | 'Low' => gap >= 45 ? 'High' : gap >= 20 ? 'Medium' : 'Low'
const nextStatus: Record<Status, Status> = { 'Not Started': 'In Progress', 'In Progress': 'Completed', Completed: 'Not Started' }
const toDisplayStatus: Record<DatabaseStatus, Status> = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed' }
const toDatabaseStatus: Record<Status, DatabaseStatus> = { 'Not Started': 'not_started', 'In Progress': 'in_progress', Completed: 'completed' }

export function RoadmapPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [preferenceText, setPreferenceText] = useState('')
  const [items, setItems] = useState<RoadmapItem[]>([])
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [profileId, setProfileId] = useState<number | null>(null)

  useEffect(() => {
    const loadRoadmap = async () => {
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
        setProfileId(profile.id)
        const [savedResult, catalogResult, goalResult, preferenceResult, progressResult] = await Promise.all([
          supabase.from('user_skills').select('skill_id, proficiency').eq('profile_id', profile.id),
          supabase.from('skills').select('id, name, category').order('name'),
          supabase.from('career_goals').select('target_role, preferred_location, work_preference, goal_description').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase.from('user_preferences').select('preferred_work_mode, preferred_locations, preferred_industries').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase.from('roadmap_progress').select('roadmap_item_id, status').eq('profile_id', profile.id),
        ])
        if (savedResult.error) throw savedResult.error
        if (catalogResult.error) throw catalogResult.error
        if (goalResult.error) throw goalResult.error
        if (preferenceResult.error) throw preferenceResult.error
        if (progressResult.error) throw progressResult.error
        const role = goalResult.data?.target_role
        if (!role) return
        setTargetRole(role)
        const preference = preferenceResult.data
        setPreferenceText([preference?.preferred_work_mode, preference?.preferred_locations, preference?.preferred_industries].filter(Boolean).join(' · '))
        const roleWeights = weights[role] ?? weights['Software Developer']
        const saved = new Map((savedResult.data ?? []).map((row) => [row.skill_id, Number(row.proficiency) || 0]))
        const generated = (catalogResult.data as Skill[]).filter((skill) => (roleWeights[skill.category ?? ''] ?? 0) > 0).map((skill) => {
          const target = Math.round(60 + (roleWeights[skill.category ?? ''] ?? 0) * 30)
          const current = saved.get(skill.id) ?? 0
          const gap = Math.max(0, target - current)
          return { id: `skill-${skill.id}`, name: skill.name, why: `${skill.name} supports the ${role} responsibilities in the ${skill.category || 'core'} area.`, current, target, priority: priorityFor(gap), topics: topicsFor(skill), hours: Math.max(2, Math.ceil(gap / 8)), task: `Build a small ${skill.name} project and explain the trade-offs in an interview.`, phase: phaseFor(current) }
        }).filter((item) => item.current < item.target).sort((left, right) => right.target - right.current - (left.target - left.current))
        setItems(generated)
        const savedStatuses = Object.fromEntries((progressResult.data ?? []).map((row) => [row.roadmap_item_id, toDisplayStatus[row.status as DatabaseStatus] || 'Not Started']))
        setStatuses(Object.fromEntries(generated.map((item) => [item.id, savedStatuses[item.id] || 'Not Started'])))
      } catch (error) {
        if (import.meta.env.DEV) console.error('Supabase roadmap load error:', error)
        const message = error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'We could not build your learning roadmap.'
        setErrorMessage(message)
      } finally {
        setLoading(false)
      }
    }
    void loadRoadmap()
  }, [navigate])

  const overall = useMemo(() => items.length === 0 ? 0 : Math.round((items.filter((item) => statuses[item.id] === 'Completed').length / items.length) * 100), [items, statuses])
  const phases: PhaseName[] = ['Phase 1: Fundamentals', 'Phase 2: Intermediate', 'Phase 3: Advanced', 'Phase 4: Job Ready']
  const phaseProgress = (phase: PhaseName) => { const phaseItems = items.filter((item) => item.phase === phase); return phaseItems.length === 0 ? 0 : Math.round((phaseItems.filter((item) => statuses[item.id] === 'Completed').length / phaseItems.length) * 100) }
  const toggleStatus = async (id: string) => {
    if (profileId === null) return
    const previous = statuses[id] || 'Not Started'
    const next = nextStatus[previous]
    setStatuses((current) => ({ ...current, [id]: next }))
    const databaseStatus = toDatabaseStatus[next]
    const { error } = await supabase.from('roadmap_progress').upsert(
      { profile_id: profileId, roadmap_item_id: id, status: databaseStatus, completed_at: databaseStatus === 'completed' ? new Date().toISOString() : null },
      { onConflict: 'profile_id,roadmap_item_id' },
    )
    if (error) {
      if (import.meta.env.DEV) console.error('Supabase roadmap progress save error:', error)
      setStatuses((current) => ({ ...current, [id]: previous }))
      setErrorMessage(error.message)
    }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading learning roadmap" /></div>
  if (errorMessage) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>
  if (!targetRole) return <div role="status" className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">Complete your career goal during onboarding to generate your personalized roadmap.</div>
  if (items.length === 0) return <div role="status" className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">Your saved skills already meet the current role baseline. No learning gaps are queued.</div>

  return <div className="space-y-6">
    <PageHeader title="Career Roadmap" description={`A personalized plan for becoming a ${targetRole}.`} eyebrow={<Badge variant="outline" className="border-primary/20 text-primary"><Sparkles className="h-3.5 w-3.5" /> Built from your skill gaps</Badge>} actions={<Button asChild variant="outline"><Link to="/skills">Why these skills? <ArrowRight className="h-4 w-4" /></Link></Button>} />
    <Card className="p-6"><div className="grid gap-6 sm:grid-cols-3"><div><p className="text-sm text-muted-foreground">Overall progress</p><p className="mt-1 text-3xl font-bold">{overall}%</p><Progress value={overall} className="mt-3" /></div><div><p className="text-sm text-muted-foreground">Current phase</p><p className="mt-1 text-lg font-semibold">{phases.find((phase) => items.some((item) => item.phase === phase && statuses[item.id] !== 'Completed')) || 'Job Ready'}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Prioritized by largest skill gaps</p></div><div><p className="text-sm text-muted-foreground">Preferences</p><p className="mt-1 text-lg font-semibold">{preferenceText || '—'}</p><p className="mt-1 text-xs text-muted-foreground">Real profile context</p></div></div></Card>
    <div className="grid gap-5 lg:grid-cols-2">{phases.map((phase) => { const phaseItems = items.filter((item) => item.phase === phase); return <Card key={phase} className="p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">{phase}</h2><p className="mt-1 text-sm text-muted-foreground">{phaseItems.length} learning items</p></div><Badge variant={phaseProgress(phase) === 100 ? 'success' : 'secondary'}>{phaseProgress(phase)}%</Badge></div><Progress value={phaseProgress(phase)} className="mt-4" /><div className="mt-5 space-y-4">{phaseItems.map((item) => <div key={item.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">{item.why}</p></div><Badge variant={item.priority === 'High' ? 'danger' : item.priority === 'Medium' ? 'warning' : 'secondary'}>{item.priority}</Badge></div><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><span>Current: <strong className="text-foreground">{item.current}%</strong> · Target: <strong className="text-foreground">{item.target}%</strong></span><span>Estimated: <strong className="text-foreground">{item.hours}h</strong></span></div><p className="mt-3 text-xs"><strong>Topics:</strong> {item.topics.join(' · ')}</p><p className="mt-2 text-xs text-muted-foreground"><strong>Practice:</strong> {item.task}</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => toggleStatus(item.id)}><Check className="h-4 w-4" /> {statuses[item.id] || 'Not Started'}</Button></div>)}</div>{phaseItems.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Nothing queued for this phase.</p> : null}</Card> })}</div>
    <AIRecommendationCard message={`Your roadmap is ordered by the largest gaps for ${targetRole}. Complete fundamentals before advancing to higher-level topics${preferenceText ? `, aligned with ${preferenceText}` : ''}.`} action={<Button asChild variant="outline"><Link to="/jobs">View job matches <ArrowRight className="h-4 w-4" /></Link></Button>} />
  </div>
}

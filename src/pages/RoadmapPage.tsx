import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Check, Circle, GraduationCap, Map, Sparkles, Target } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { supabase } from '@/lib/supabase'
import { roleRequirements } from '@/data/roleRequirements'
import { generateRoadmap, type RoadmapItem, type RoadmapPhase, type RoadmapStatus } from '@/lib/roadmap'
import { calculateRoleReadiness } from '@/lib/skillMatching'
import { normalizeSkill } from '@/lib/jobMatching'
import { sanitizeSkillList } from '@/lib/resumeParser'
import type { UserSkill } from '@/types/skillGap'

type DatabaseStatus = 'not_started' | 'in_progress' | 'completed'
const toDatabase: Record<RoadmapStatus, DatabaseStatus> = { 'Not Started': 'not_started', 'In Progress': 'in_progress', Completed: 'completed' }
const fromDatabase: Record<DatabaseStatus, RoadmapStatus> = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed' }
const nextStatus: Record<RoadmapStatus, RoadmapStatus> = { 'Not Started': 'In Progress', 'In Progress': 'Completed', Completed: 'Not Started' }
const priorityRank = { High: 3, Medium: 2, Low: 1 }

type SkillRow = { skill?: { name?: string | null } | null; skill_id: number; proficiency?: number | null }

export function RoadmapPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [profileId, setProfileId] = useState<number | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const [resumeAnalyzed, setResumeAnalyzed] = useState(false)
  const [userSkills, setUserSkills] = useState<UserSkill[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, RoadmapStatus>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) { navigate('/login', { replace: true }); return }
        const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('user_id', userData.user.id).limit(1).maybeSingle()
        if (profileError) throw profileError
        if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')
        const [goalResult, skillsResult, resumeResult, progressResult] = await Promise.all([
          supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase.from('user_skills').select('skill_id, proficiency, skill:skills(name)').eq('profile_id', profile.id),
          supabase.from('resume_analyses').select('extracted_text, structured_resume').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('roadmap_progress').select('roadmap_item_id, status').eq('profile_id', profile.id),
        ])
        if (goalResult.error) throw goalResult.error
        if (skillsResult.error) throw skillsResult.error
        if (resumeResult.error) throw resumeResult.error
        if (progressResult.error && progressResult.error.code !== 'PGRST205') throw progressResult.error
        const role = goalResult.data?.target_role?.trim() ?? ''
        const rows = (skillsResult.data ?? []) as unknown as SkillRow[]
        const savedNames = rows.map((row) => row.skill?.name).filter((name): name is string => Boolean(name))
        const savedSkills = sanitizeSkillList(savedNames).map((name) => {
          const row = rows.find((candidate) => candidate.skill?.name && sanitizeSkillList([candidate.skill.name])[0] === name)
          const proficiency = row?.proficiency == null ? undefined : Number(row.proficiency)
          return { name, ...(proficiency !== undefined && Number.isFinite(proficiency) ? { proficiency } : {}) }
        })
        const structured = resumeResult.data?.structured_resume
        const analyzed = Boolean(structured && typeof structured === 'object') || typeof resumeResult.data?.extracted_text === 'string'
        const resumeNames = structured && typeof structured === 'object' && 'technicalSkills' in structured && Array.isArray(structured.technicalSkills) ? sanitizeSkillList(structured.technicalSkills) : []
        setProfileId(profile.id); setTargetRole(role); setResumeAnalyzed(analyzed); setUserSkills([...savedSkills, ...resumeNames.filter((name) => !savedSkills.some((skill) => skill.name === name)).map((name) => ({ name }))])
        setProgressMap(Object.fromEntries((progressResult.data ?? []).map((row) => [row.roadmap_item_id, fromDatabase[(row.status as DatabaseStatus) ?? 'not_started'] ?? 'Not Started'])))
      } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'We could not load your roadmap data.')
      } finally { setLoading(false) }
    }
    void load()
  }, [navigate])

  const role = roleRequirements.find((item) => item.title === targetRole) ?? (targetRole === 'Software Developer' ? roleRequirements.find((item) => item.title === 'Software Engineer') : undefined)
  const phases = useMemo(() => role ? generateRoadmap(role, userSkills).map((phase) => ({ ...phase, items: phase.items.map((item) => ({ ...item, status: progressMap[item.id] ?? item.status })) })) : [], [role, userSkills, progressMap])
  const allItems = phases.flatMap((phase) => phase.items)
  const completed = allItems.filter((item) => item.status === 'Completed').length
  const overall = allItems.length ? Math.round((completed / allItems.length) * 100) : 0
  const currentReadiness = role ? calculateRoleReadiness(role, userSkills) : 0
  const missingSkills = role ? role.requiredSkills.filter((skill) => !userSkills.some((item) => normalizeSkill(item.name) === normalizeSkill(skill))).length : 0
  const nextItem = [...allItems].filter((item) => item.status !== 'Completed').sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority])[0]
  const duration = allItems.reduce((total, item) => total + (item.duration.includes('week') ? 2 : 1), 0)

  const toggleStatus = async (item: RoadmapItem) => {
    if (profileId === null) return
    const previous = progressMap[item.id] ?? item.status
    const next = nextStatus[previous]
    setProgressMap((current) => ({ ...current, [item.id]: next }))
    const { error } = await supabase.from('roadmap_progress').upsert({ profile_id: profileId, roadmap_item_id: item.id, status: toDatabase[next], completed_at: next === 'Completed' ? new Date().toISOString() : null }, { onConflict: 'profile_id,roadmap_item_id' })
    if (error) { setProgressMap((current) => ({ ...current, [item.id]: previous })); setErrorMessage('Roadmap progress could not be saved. Please try again.') }
  }

  if (loading) return <div className="space-y-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-36 w-full" /><Skeleton className="h-72 w-full" /></div>
  if (errorMessage && !targetRole) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>
  if (!targetRole) return <EmptyState icon={<Target className="h-8 w-8" />} title="Set a career goal to build your personalized roadmap." action="Choose a target role before planning your next steps." to="/skills" button="Set Target Role" />
  if (!resumeAnalyzed) return <EmptyState icon={<GraduationCap className="h-8 w-8" />} title="Analyze your resume to unlock your personalized roadmap." action="CareerAI needs your actual skills and projects to create evidence-based learning steps." to="/resume-analyzer" button="Analyze Resume" />
  if (!role) return <EmptyState icon={<Target className="h-8 w-8" />} title="Choose a supported target role to build your roadmap." action="Update your target role in Skill Gap Analysis." to="/skills" button="Open Skill Gap" />

  return <div className="space-y-6">
    <PageHeader title="Career Roadmap" description={`A dynamic learning path built from your ${targetRole} skill gaps and analyzed resume.`} eyebrow={<Badge variant="outline" className="border-primary/20 text-primary"><Map className="h-3.5 w-3.5" /> Evidence-based plan</Badge>} actions={<Button asChild variant="outline"><Link to="/skills">Review Skill Gaps <ArrowRight className="h-4 w-4" /></Link></Button>} />
    {errorMessage ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</div> : null}
    <Card className="border-primary/15 bg-brand-soft p-5"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-muted-foreground">Target role</p><p className="mt-1 text-lg font-semibold">{targetRole}</p></div><div><p className="text-xs text-muted-foreground">Current readiness</p><p className="mt-1 text-lg font-semibold">{currentReadiness}%</p></div><div><p className="text-xs text-muted-foreground">Current skills</p><p className="mt-1 text-lg font-semibold">{userSkills.length}</p></div><div><p className="text-xs text-muted-foreground">Required gaps</p><p className="mt-1 text-lg font-semibold">{missingSkills}</p></div><div className="flex items-center gap-3"><ProgressRing value={overall} size={64} label={`${overall}%`} /><div><p className="text-xs text-muted-foreground">Roadmap progress</p><p className="text-sm font-semibold">{completed} of {allItems.length} complete</p></div></div></div><div className="mt-4 border-t border-primary/10 pt-4"><p className="text-xs text-muted-foreground">Estimated duration</p><p className="mt-1 text-sm font-semibold">{Math.max(1, Math.ceil(duration / 2))}-{Math.max(2, duration)} weeks based on the generated learning tasks</p></div></Card>
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="p-5"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary" /><div><h2 className="text-base font-semibold">Recommended Next Step</h2><p className="mt-1 text-xs text-muted-foreground">Highest-priority incomplete learning task.</p></div></div>{nextItem ? <div className="mt-4 rounded-lg border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{nextItem.skill}</p><p className="mt-1 text-xs text-muted-foreground">{nextItem.priority} priority · {nextItem.difficulty} · {nextItem.duration}</p></div><Badge variant={nextItem.priority === 'High' ? 'danger' : 'warning'}>{nextItem.status}</Badge></div><p className="mt-3 text-xs text-muted-foreground">{nextItem.why}</p><Button size="sm" variant="outline" className="mt-4" onClick={() => void toggleStatus(nextItem)}>{nextItem.status === 'Not Started' ? 'Start Learning' : 'Continue Learning'} <ArrowRight className="h-3.5 w-3.5" /></Button></div> : <p className="mt-4 text-sm text-muted-foreground">All roadmap tasks are complete.</p>}</Card><Card className="p-5"><div className="flex items-center gap-3"><BriefcaseBusiness className="h-5 w-5 text-primary" /><div><h2 className="text-base font-semibold">Build Projects</h2><p className="mt-1 text-xs text-muted-foreground">Practical evidence for your remaining gaps.</p></div></div><div className="mt-4 space-y-3">{phases.find((phase) => phase.name === 'Phase 4 - Projects & Practice')?.items.slice(0, 3).map((item) => <div key={item.id} className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">{item.skill}</p><p className="mt-1 text-xs text-muted-foreground">{item.task}</p></div>)}</div></Card></div>
    <div className="space-y-5">{phases.map((phase, index) => <PhaseCard key={phase.name} phase={phase} index={index} onToggle={toggleStatus} />)}</div>
  </div>
}

function EmptyState({ icon, title, action, to, button }: { icon: React.ReactNode; title: string; action: string; to: string; button: string }) { return <div className="rounded-xl border border-dashed border-border bg-muted/15 p-8 text-center"><span className="mx-auto flex w-fit text-muted-foreground">{icon}</span><h2 className="mt-3 text-base font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{action}</p><Button asChild className="mt-5"><Link to={to}>{button} <ArrowRight className="h-4 w-4" /></Link></Button></div> }
function PhaseCard({ phase, index, onToggle }: { phase: RoadmapPhase; index: number; onToggle: (item: RoadmapItem) => void }) { const completed = phase.items.filter((item) => item.status === 'Completed').length; const progress = phase.items.length ? Math.round((completed / phase.items.length) * 100) : 0; return <Card className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-primary">{index + 1}</span><h2 className="text-base font-semibold">{phase.name}</h2></div><p className="mt-1 text-sm text-muted-foreground">{phase.description}</p></div><Badge variant={progress === 100 ? 'success' : 'secondary'}>{progress}% complete</Badge></div><Progress value={progress} className="mt-4 h-1.5" /><div className="mt-5 grid gap-3">{phase.items.length ? phase.items.map((item) => <RoadmapItemCard key={item.id} item={item} onToggle={onToggle} />) : <p className="text-sm text-muted-foreground">No tasks are needed in this phase for the current gaps.</p>}</div></Card> }
function RoadmapItemCard({ item, onToggle }: { item: RoadmapItem; onToggle: (item: RoadmapItem) => void }) { const statusVariant = item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'warning' : 'secondary'; return <div className="rounded-lg border border-border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.skill}</h3><Badge variant={item.priority === 'High' ? 'danger' : item.priority === 'Medium' ? 'warning' : 'secondary'}>{item.priority}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.why}</p></div><Badge variant={statusVariant}><span className="flex items-center gap-1">{item.status === 'Completed' ? <Check className="h-3 w-3" /> : item.status === 'In Progress' ? <Circle className="h-3 w-3" /> : null}{item.status}</span></Badge></div><div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4"><div><b>Difficulty</b><p className="mt-1 text-muted-foreground">{item.difficulty}</p></div><div><b>Time</b><p className="mt-1 text-muted-foreground">{item.duration}</p></div><div><b>What to learn</b><p className="mt-1 text-muted-foreground">{item.outcome}</p></div><div><b>Prerequisites</b><p className="mt-1 text-muted-foreground">{item.prerequisites.length ? item.prerequisites.join(', ') : 'None'}</p></div></div><p className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground"><b className="text-foreground">Practical task:</b> {item.task}</p><Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => onToggle(item)}>{item.status === 'Not Started' ? 'Start Learning' : item.status === 'In Progress' ? 'Mark Complete' : 'Reset'} <ArrowRight className="h-3.5 w-3.5" /></Button></div> }

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Check, CircleAlert, CircleDot, GraduationCap, Loader2, Target } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { supabase } from '@/lib/supabase'
import { roleRequirements } from '@/data/roleRequirements'
import { compareRoleSkills, calculateRoleReadiness } from '@/lib/skillMatching'
import { runSkillGapAnalysis } from '@/lib/skillGapService'
import { normalizeSkill } from '@/lib/jobMatching'
import { sanitizeSkillList } from '@/lib/resumeParser'
import type { ResumeEducation } from '@/lib/resumeParser'
import type { SkillComparison, UserSkill } from '@/types/skillGap'
import type { SkillGapAnalysis } from '@/types/skillGap'

type SavedSkillRow = { skill?: { name?: string | null } | null; skill_id: number; proficiency?: number | null }
type Filter = 'all' | 'matched' | 'partial' | 'missing'
const RESUME_SKILLS_KEY = 'careerai.resumeTechnicalSkills'

const mergeSkills = (saved: UserSkill[], resume: string[]): UserSkill[] => {
  const merged = sanitizeSkillList(saved.map((skill) => skill.name)).map((name) => {
    const original = saved.find((skill) => normalizeSkill(skill.name) === normalizeSkill(name))
    return original?.proficiency === undefined ? { name } : { name, proficiency: original.proficiency }
  })
  for (const name of sanitizeSkillList(resume)) {
    if (!merged.some((skill) => normalizeSkill(skill.name) === normalizeSkill(name))) merged.push({ name })
  }
  return merged
}

const findRole = (title: string) => roleRequirements.find((item) => item.title === title)
  ?? (title === 'Software Developer' ? roleRequirements.find((item) => item.title === 'Software Engineer') : undefined)

export function SkillGapPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [savingRole, setSavingRole] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [savedRole, setSavedRole] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [userSkills, setUserSkills] = useState<UserSkill[]>([])
  const [education, setEducation] = useState<ResumeEducation[]>([])
  const [resumeAnalyzed, setResumeAnalyzed] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [aiAnalysis, setAiAnalysis] = useState<SkillGapAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiCached, setAiCached] = useState(false)

  const saveTargetRole = async (nextRole: string) => {
    const normalizedRole = nextRole.trim()
    if (!normalizedRole) return
    const priorRole = savedRole
    setSavingRole(true)
    setErrorMessage('')
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) { navigate('/login', { replace: true }); return }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('user_id', userData.user.id).limit(1).maybeSingle()
      if (profileError) throw profileError
      if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')
      const { data: existing, error: lookupError } = await supabase.from('career_goals').select('id, preferred_location, work_preference, goal_description').eq('profile_id', profile.id).limit(1).maybeSingle()
      if (lookupError) throw lookupError
      const payload = { target_role: normalizedRole, preferred_location: existing?.preferred_location ?? null, work_preference: existing?.work_preference ?? null, goal_description: existing?.goal_description ?? null }
      const response = existing
        ? await supabase.from('career_goals').update(payload).eq('id', existing.id).select('target_role')
        : await supabase.from('career_goals').insert({ profile_id: profile.id, ...payload }).select('target_role')
      if (response.error) throw response.error
      const persistedRole = response.data?.[0]?.target_role ?? normalizedRole
      setSavedRole(persistedRole)
      setSelectedRole(persistedRole)
    } catch (error) {
      setSavedRole(priorRole)
      setSelectedRole(priorRole)
      setErrorMessage(error instanceof Error ? error.message : 'We could not save the target role. Please try again.')
    } finally { setSavingRole(false) }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) { navigate('/login', { replace: true }); return }
        const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('user_id', userData.user.id).limit(1).maybeSingle()
        if (profileError) throw profileError
        if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')
        const [skillsResult, goalResult, resumeResult] = await Promise.all([
          supabase.from('user_skills').select('skill_id, proficiency, skill:skills(name)').eq('profile_id', profile.id),
          supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase.from('resume_analyses').select('structured_resume, detected_skills, missing_skills, strengths, projects, education_experience, certifications, ai_summary').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ])
        if (skillsResult.error) throw skillsResult.error
        if (goalResult.error) throw goalResult.error
        if (resumeResult.error) throw resumeResult.error
        const rows = (skillsResult.data ?? []) as unknown as SavedSkillRow[]
        const saved = rows.map((row) => {
          if (!row.skill?.name) return null
          const proficiency = row.proficiency == null ? undefined : Number(row.proficiency)
          const validNames = sanitizeSkillList([row.skill.name])
          if (!validNames.length) return null
          return { name: validNames[0], ...(proficiency !== undefined && Number.isFinite(proficiency) ? { proficiency } : {}) }
        }).filter((skill): skill is UserSkill => skill !== null)
        const structured = resumeResult.data?.structured_resume
        const analyzed = Boolean(structured && typeof structured === 'object')
        setResumeAnalyzed(analyzed)
        setEducation(analyzed && 'education' in structured && Array.isArray(structured.education) ? structured.education as ResumeEducation[] : [])
        let resumeSkills: string[] = []
        if (analyzed && 'technicalSkills' in structured && Array.isArray(structured.technicalSkills)) resumeSkills = sanitizeSkillList(structured.technicalSkills)
        try {
          const local = JSON.parse(window.localStorage.getItem(RESUME_SKILLS_KEY) ?? '[]')
          if (analyzed && Array.isArray(local)) resumeSkills = sanitizeSkillList([...resumeSkills, ...local])
        } catch { /* local resume cache is optional */ }
        const role = goalResult.data?.target_role ?? ''
        setSavedRole(role); setSelectedRole(role); setUserSkills(mergeSkills(saved, resumeSkills))
        if (role) {
          const savedAnalysis = await supabase.from('career_analyses').select('skill_gap_analysis').eq('profile_id', profile.id).eq('target_role', role).not('skill_gap_analysis', 'eq', '{}').order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (savedAnalysis.error) throw savedAnalysis.error
          if (savedAnalysis.data?.skill_gap_analysis && typeof savedAnalysis.data.skill_gap_analysis === 'object') {
            setAiAnalysis(savedAnalysis.data.skill_gap_analysis as SkillGapAnalysis)
            setAiCached(true)
          }
        }
      } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'We could not load your skill data.')
      } finally { setLoading(false) }
    }
    void load()
  }, [navigate])

  const role = findRole(selectedRole)
  const comparisons = useMemo(() => role ? compareRoleSkills(role, userSkills) : [], [role, userSkills])
  const readiness = role ? calculateRoleReadiness(role, userSkills) : 0
  const filtered = comparisons.filter((item) => filter === 'all' || (filter === 'matched' ? item.classification === 'MATCHED' : filter === 'partial' ? item.classification === 'PARTIAL' : item.classification === 'MISSING'))
  const nextSkills = [...comparisons].filter((item) => item.classification !== 'MATCHED').sort((left, right) => priorityValue(right) - priorityValue(left) || right.weight - left.weight).slice(0, 3)

  const runAi = async (force = false) => {
    if (!role || aiLoading) return
    setAiLoading(true)
    setAiError('')
    try {
      const result = await runSkillGapAnalysis({
        targetRole: role.title,
        requiredSkills: role.requiredSkills,
        preferredSkills: role.preferredSkills,
        resumeAnalysis: { detected_skills: userSkills.map((skill) => skill.name) },
        profileContext: { skills: userSkills },
        force,
      })
      setAiAnalysis(result)
      setAiCached(false)
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI skill-gap analysis failed. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) return <div className="space-y-5"><Skeleton className="h-16 w-full" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-80 w-full" /></div>
  if (errorMessage) return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">{errorMessage}</div>

  return <div className="space-y-6">
    <PageHeader title="Skill Gap Analysis" description="A deterministic comparison of your current skills against the requirements for your target role." eyebrow={<Badge variant="outline" className="border-primary/20 text-primary"><Target className="h-3.5 w-3.5" /> Role readiness</Badge>} actions={<Button asChild><Link to="/roadmap">Build My Roadmap <ArrowRight className="h-4 w-4" /></Link></Button>} />
    <Card className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Career goal</p><p className="mt-1 text-lg font-semibold">{savedRole || 'No target role set'}</p><p className="mt-1 text-xs text-muted-foreground">Choose a supported role to calculate your gap.</p></div><Select className="sm:max-w-xs" value={selectedRole} onChange={(event) => { void saveTargetRole(event.target.value) }} aria-label="Target role" disabled={savingRole}><option value="">Choose a target role</option>{roleRequirements.map((item) => <option key={item.id} value={item.title}>{item.title}</option>)}</Select></div></Card>
    {!selectedRole ? <EmptyState icon={<Target className="h-8 w-8" />} title="Set a target role to calculate your skill gap." action="Choose a role above or update your profile." /> : null}
    {selectedRole && !resumeAnalyzed ? <Card className="border-sky-200 bg-sky-50/60 p-5"><p className="text-sm text-sky-900">Resume evidence is not available yet. Your deterministic comparison below uses saved profile skills.</p><Button asChild variant="outline" className="mt-4"><Link to="/resume-analyzer">Analyze Resume</Link></Button></Card> : null}
    {role ? <>
      {resumeAnalyzed ? <Card className="border-amber-200/80 bg-amber-50/60 p-5"><p className="text-sm text-amber-900/75">Resume evidence is included in this AI Skill Gap Analysis.</p></Card> : null}
      <Card className="border-primary/15 bg-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">AI Skill Gap Analysis</p><p className="mt-1 text-sm text-muted-foreground">Get personalized explanations, priorities and a learning strategy based on your current skills and target career.</p>{aiCached ? <p className="mt-2 text-xs text-emerald-700">Loaded from your saved analysis.</p> : null}</div><Button onClick={() => void runAi(Boolean(aiAnalysis))} disabled={aiLoading}>{aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : aiAnalysis ? 'Regenerate AI Analysis' : 'Run AI Analysis'}</Button></div>{aiError ? <div role="alert" className="mt-4 flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"><span>{aiError}</span><Button size="sm" variant="outline" onClick={() => void runAi()} disabled={aiLoading}>Retry</Button></div> : null}</Card>
      {aiAnalysis ? <AiSkillGapDashboard analysis={aiAnalysis} /> : null}
      <Card className="border-primary/15 bg-brand-soft p-5"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Overall readiness</p><h2 className="mt-1 text-2xl font-bold">{role.title}</h2><p className="mt-1 text-sm text-muted-foreground">Matched skills count fully; partial skills count at 50%.</p></div><div className="flex items-center gap-4"><ProgressRing value={readiness} size={94} label={`${readiness}%`} /><div className="text-sm"><p className="font-semibold">{comparisons.filter((item) => item.classification === 'MATCHED').length} matched</p><p className="text-muted-foreground">of {role.requiredSkills.length} required skills</p></div></div></div></Card>
      <div className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Skills You Have" value={comparisons.filter((item) => item.classification === 'MATCHED').length} tone="success" /><SummaryCard label="Needs Improvement" value={comparisons.filter((item) => item.classification === 'PARTIAL').length} tone="warning" /><SummaryCard label="Missing Skills" value={comparisons.filter((item) => item.classification === 'MISSING').length} tone="danger" /></div>
      <Card className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold">Recommended Next Skills</h2><p className="mt-1 text-sm text-muted-foreground">The highest-impact next steps, ordered by priority.</p></div><Badge variant="secondary">Top {nextSkills.length}</Badge></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{nextSkills.map((item, index) => <GapCard key={item.skill} item={item} rank={index + 1} />)}{nextSkills.length === 0 ? <p className="text-sm text-muted-foreground">You currently match every configured requirement.</p> : null}</div></Card>
      <Card className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-base font-semibold">Skill Comparison</h2><p className="mt-1 text-sm text-muted-foreground">Deterministic matching using normalized skill names and saved proficiency.</p></div><div className="flex flex-wrap gap-2">{(['all', 'matched', 'partial', 'missing'] as Filter[]).map((value) => <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'matched' ? 'Matched' : value === 'partial' ? 'Needs Improvement' : 'Missing'}</Button>)}</div></div><div className="mt-5 space-y-3">{filtered.map((item) => <DetailedSkillRow key={`${item.requirement}-${item.skill}`} item={item} />)}{filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No skills match this filter.</p> : null}</div></Card>
      <div className="grid gap-5 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-primary" /><div><h2 className="text-base font-semibold">Skills You Have</h2><p className="mt-1 text-sm text-muted-foreground">Evidence from your analyzed resume and saved profile skills.</p></div></div><div className="mt-5 flex flex-wrap gap-2">{userSkills.map((skill) => <Badge key={skill.name} variant="secondary"><Check className="h-3 w-3" />{skill.name}{skill.proficiency !== undefined ? ` ${skill.proficiency}%` : ''}</Badge>)}</div></Card><Card className="p-5"><div className="flex items-center gap-3"><CircleAlert className="h-5 w-5 text-amber-700" /><div><h2 className="text-base font-semibold">Learning Order</h2><p className="mt-1 text-sm text-muted-foreground">Start with high-priority required gaps, then build preferred skills.</p></div></div><ol className="mt-5 space-y-3">{nextSkills.map((item, index) => <li key={item.skill} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{index + 1}</span><span><b>{item.skill}</b><span className="ml-2 text-xs text-muted-foreground">{item.estimatedDifficulty}</span><span className="mt-1 block text-xs text-muted-foreground">{item.learningAction}</span></span></li>)}</ol></Card></div>
      <Card className="p-5"><div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-primary" /><div><h2 className="text-base font-semibold">Education</h2><p className="mt-1 text-sm text-muted-foreground">Academic information kept separate from technical skills.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{education.map((item, index) => <div key={`${item.institution}-${index}`} className="rounded-lg border border-border p-4"><p className="text-sm font-semibold">{item.degree}</p><p className="mt-1 text-sm text-muted-foreground">{item.institution}</p>{item.year ? <p className="mt-2 text-xs text-muted-foreground">Graduation: {item.year}</p> : null}{item.score ? <p className="text-xs text-muted-foreground">Score: {item.score}</p> : null}</div>)}{education.length === 0 ? <p className="text-sm text-muted-foreground">No education records were extracted.</p> : null}</div></Card>
    </> : null}
  </div>
}

function priorityValue(item: SkillComparison) { return item.priority === 'High' ? 3 : item.priority === 'Medium' ? 2 : 1 }
function AiSkillGapDashboard({ analysis }: { analysis: SkillGapAnalysis }) {
  const current = analysis.matched_skills ?? []
  const missing = analysis.missing_skills ?? []
  const partial = analysis.partial_skills ?? []
  const sequence = analysis.learning_sequence ?? []
  const readinessStatus = analysis.readiness_score >= 80 ? 'Ready' : analysis.readiness_score >= 60 ? 'Developing' : 'Needs Improvement'
  const items = [...missing, ...partial]
  return <div className="space-y-5">
    <Card className="border-primary/15 bg-brand-soft p-5"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Overall readiness</p><h2 className="mt-1 text-2xl font-bold">{readinessStatus}</h2><p className="mt-1 text-sm text-muted-foreground">{analysis.technical_skill_coverage ?? 0}% technical skill coverage for this role.</p></div><ProgressRing value={analysis.readiness_score ?? 0} size={108} label={`${analysis.readiness_score ?? 0}%`} /></div></Card>
    <div className="grid gap-4 sm:grid-cols-4"><SummaryCard label="Current skills" value={current.length} tone="success" /><SummaryCard label="Partial skills" value={partial.length} tone="warning" /><SummaryCard label="Missing skills" value={missing.length} tone="danger" /><SummaryCard label="High priority" value={analysis.high_priority_gap_count ?? 0} tone="danger" /></div>
    <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Skill gaps</h2><p className="mt-1 text-sm text-muted-foreground">Prioritized development areas grounded in your resume.</p></div><div className="flex gap-2"><Badge variant="danger">High {analysis.high_priority_gap_count ?? 0}</Badge><Badge variant="warning">Medium {analysis.medium_priority_gap_count ?? 0}</Badge><Badge variant="secondary">Low {analysis.low_priority_gap_count ?? 0}</Badge></div></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{items.map((item) => <div key={`${item.skill}-${item.category}`} className="rounded-lg border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.skill}</p><p className="mt-1 text-xs text-muted-foreground">{item.category} | Current {item.current_level}% | Target {item.target_level}%</p></div><Badge variant={item.priority === 'High' ? 'danger' : item.priority === 'Medium' ? 'warning' : 'secondary'}>{item.priority}</Badge></div><Progress value={item.current_level} className="mt-4 h-2" /><p className="mt-3 text-sm text-muted-foreground">{item.reason}</p><p className="mt-2 text-sm"><span className="font-semibold">Recommended action:</span> {item.recommended_action}</p><p className="mt-2 text-xs text-muted-foreground">Gap {item.gap_percentage}% | {item.estimated_learning_time}</p>{(item.resources ?? []).length > 0 ? <p className="mt-2 text-xs text-muted-foreground">Topics: {(item.resources ?? []).join(', ')}</p> : null}</div>)}{items.length === 0 ? <p className="text-sm text-muted-foreground">No skill gaps identified for this role.</p> : null}</div></Card>
    <div className="grid gap-5 lg:grid-cols-2"><Card className="p-5"><h2 className="text-base font-semibold">Current skills</h2><div className="mt-4 flex flex-wrap gap-2">{current.map((item) => <Badge key={`${item.skill}-${item.category}`} variant="secondary">{item.skill} {item.current_level}%</Badge>)}{current.length === 0 ? <p className="text-sm text-muted-foreground">No current skills identified.</p> : null}</div></Card><Card className="p-5"><h2 className="text-base font-semibold">Learning focus</h2><ol className="mt-4 space-y-2">{sequence.map((item) => <li key={`${item.step}-${item.title}`} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{item.step}</span><span><b>{item.title}</b><span className="mt-1 block text-muted-foreground">{item.description}</span></span></li>)}{sequence.length === 0 ? <li className="text-sm text-muted-foreground">No learning sequence available.</li> : null}</ol></Card></div>
  </div>
}
function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'danger' }) { return <Card className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${tone === 'success' ? 'text-emerald-700' : tone === 'warning' ? 'text-amber-700' : 'text-rose-700'}`}>{value}</p></Card> }
function EmptyState({ icon, title, action }: { icon: ReactNode; title: string; action: string }) { return <Card className="p-8 text-center"><span className="mx-auto flex w-fit text-muted-foreground">{icon}</span><h2 className="mt-3 text-base font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{action}</p></Card> }
function GapCard({ item, rank }: { item: SkillComparison; rank: number }) { return <div className="rounded-lg border border-border p-4"><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{rank}. {item.skill}</span><Badge variant={item.priority === 'High' ? 'danger' : item.priority === 'Medium' ? 'warning' : 'secondary'}>{item.priority} Priority</Badge></div><p className="mt-2 text-xs text-muted-foreground">{item.reason}</p><p className="mt-3 text-xs font-medium">{item.estimatedDifficulty} learning difficulty</p></div> }
function DetailedSkillRow({ item }: { item: SkillComparison }) { const color = item.classification === 'MATCHED' ? 'success' : item.classification === 'PARTIAL' ? 'warning' : 'danger'; const value = item.proficiency ?? (item.classification === 'MATCHED' ? 100 : 0); return <div className="rounded-lg border border-border p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="flex items-start gap-3"><span className={`mt-0.5 ${item.classification === 'MATCHED' ? 'text-emerald-600' : item.classification === 'PARTIAL' ? 'text-amber-600' : 'text-rose-600'}`}>{item.classification === 'MATCHED' ? <Check className="h-5 w-5" /> : item.classification === 'PARTIAL' ? <CircleDot className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}</span><div><p className="text-sm font-semibold">{item.skill}</p><p className="mt-1 text-xs text-muted-foreground">{item.requirement} requirement - {item.reason}</p></div></div><div className="flex items-center gap-2"><Badge variant={color}>{item.classification}</Badge>{item.priority ? <Badge variant="outline">{item.priority}</Badge> : null}</div></div><div className="mt-3 flex items-center gap-3"><Progress value={value} className="h-2" /><span className="w-12 text-right text-xs font-semibold">{item.classification === 'MISSING' ? '0%' : `${value}%`}</span></div>{item.classification !== 'MATCHED' ? <p className="mt-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Recommended action:</span> {item.learningAction} <span className="ml-1">({item.estimatedDifficulty})</span></p> : null}</div> }

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, Loader2, MessageSquareText, Sparkles, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'

type ProgressData = {
  profile: { name: string | null; location: string | null }
  skills: Array<{ id: number; name: string; proficiency: number }>
  roadmap: Array<{ id: string; status: 'not_started' | 'in_progress' | 'completed' }>
}

const show = (value: unknown) => value === null || value === undefined || value === '' ? 'Not available' : String(value)

function EmptyState({ title, description, action, to, icon: Icon }: { title: string; description: string; action: string; to: string; icon: typeof FileText }) {
  return <div className="rounded-xl border border-dashed border-border bg-muted/15 p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p><Button asChild variant="outline" size="sm" className="mt-4"><Link to={to}>{action} <ArrowRight className="h-3.5 w-3.5" /></Link></Button></div></div></div>
}

function MetricCard({ title, value, detail, icon: Icon, to, action }: { title: string; value: string; detail: string; icon: typeof Target; to: string; action: string }) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-bold tracking-tight text-foreground truncate">{value}</p><p className="mt-1 text-xs text-muted-foreground truncate">{detail}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span></div><Button asChild variant="outline" size="sm" className="mt-5 w-full"><Link to={to}>{action} <ArrowRight className="h-3.5 w-3.5" /></Link></Button></Card>
}

export function ProgressPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ProgressData | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) { navigate('/login', { replace: true }); return }
        const { data: profile, error: profileError } = await supabase.from('profiles').select('id, name, location').eq('user_id', userData.user.id).limit(1).maybeSingle()
        if (profileError) throw profileError
        if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')
        
        const [skillsResult, roadmapResult, sessionResult] = await Promise.all([
          supabase.from('user_skills').select('id, proficiency, skill:skills(id, name)').eq('profile_id', profile.id),
          supabase.from('roadmap_progress').select('roadmap_item_id, status').eq('profile_id', profile.id),
          supabase.auth.getSession()
        ])
        
        if (skillsResult.error) throw skillsResult.error
        if (roadmapResult.error && roadmapResult.error.code !== 'PGRST205') throw roadmapResult.error
        const skills = (skillsResult.data ?? []).map((row) => {
          const skill = row.skill as unknown as { id: number; name: string } | null
          return { id: row.id, name: skill?.name ?? 'Unknown skill', proficiency: Number(row.proficiency) || 0 }
        })
        setData({ profile, skills, roadmap: (roadmapResult.data ?? []).map((item) => ({ id: item.roadmap_item_id, status: item.status })) })
        
        const token = sessionResult.data.session?.access_token
        if (token) {
          setStats(await fetchApi('/api/dashboard-stats', { headers: { Authorization: `Bearer ${token}` } }, 'Progress stats'))
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'We could not load your progress.')
      } finally { setLoading(false) }
    }
    void loadProgress()
  }, [navigate])

  const skillAverage = useMemo(() => data?.skills.length ? Math.round(data.skills.reduce((sum, skill) => sum + skill.proficiency, 0) / data.skills.length) : 0, [data])
  const completedRoadmap = data?.roadmap.filter((item) => item.status === 'completed').length ?? 0
  const inProgressRoadmap = data?.roadmap.filter((item) => item.status === 'in_progress').length ?? 0
  const totalRoadmap = data?.roadmap.length ?? 0
  const roadmapProgress = totalRoadmap ? Math.round((completedRoadmap / totalRoadmap) * 100) : null
  const readiness = data?.skills.length ? skillAverage : null
  const currentPhase = inProgressRoadmap > 0 ? 'Active learning' : totalRoadmap > 0 ? 'Ready to start' : 'Not available'
  const nextStep = data?.skills.length === 0 ? { text: 'Add skills to start measuring your career progress.', to: '/onboarding', action: 'Complete onboarding' } : roadmapProgress !== 100 ? { text: 'Continue your current roadmap phase.', to: '/roadmap', action: 'Continue roadmap' } : { text: 'Keep building your skills and tracking your progress.', to: '/skills', action: 'View skill gaps' }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading career progress" /></div>
  if (errorMessage) return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">{errorMessage}</div>
  if (!data) return <div role="status" className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Progress data is not available yet.</div>

  return <div className="space-y-7">
    <PageHeader title="Career Progress" description="Track your growth, learning progress, interview performance and career readiness in one place." eyebrow={<Badge variant="outline" className="border-primary/20 text-primary"><Sparkles className="h-3.5 w-3.5" /> Your career journey</Badge>} />

    <Card className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[240px_1fr]">
        <div className="flex flex-col items-center justify-center border-b border-border bg-muted/25 p-7 text-center lg:border-b-0 lg:border-r">
          <p className="text-sm font-semibold text-foreground">Overall Career Readiness</p>
          <ProgressRing value={readiness ?? 0} size={158} className="my-4" label={readiness === null ? 'Not available' : `${readiness}%`} />
          <p className="max-w-[180px] text-xs leading-relaxed text-muted-foreground">Calculated from your saved skill proficiency.</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Progress snapshot</p>
              <p className="mt-1 text-xs text-muted-foreground">A quick view of the areas that move your career forward.</p>
            </div>
            <Badge variant="secondary">{show(data.profile.name)}</Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[{ label: 'Skills', value: readiness, to: '/skills' }, { label: 'Roadmap', value: roadmapProgress, to: '/roadmap' }, { label: 'Jobs', value: stats?.latestCareerAnalysis?.recommended_roles?.[0] ? stats.latestCareerAnalysis.recommended_roles[0].match_percentage : null, to: '/jobs' }, { label: 'Interview', value: stats?.interviewScore, to: '/interview' }, { label: 'Resume', value: stats?.resumeScore, to: '/resume-analyzer' }].map((item) => <Link key={item.label} to={item.to} className="rounded-lg border border-border bg-muted/10 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/20">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-foreground">{item.value === null ? '—' : `${item.value}%`}</p>
              <Progress value={item.value ?? 0} className="mt-3" />
            </Link>)}
          </div>
        </div>
      </div>
    </Card>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard title="Skill Progress" value={`${skillAverage}%`} detail={`${data.skills.length} selected skills`} icon={Target} to="/skills" action="View Skill Gap" />
      <MetricCard title="Roadmap Progress" value={roadmapProgress === null ? '—' : `${completedRoadmap}/${totalRoadmap}`} detail={roadmapProgress === null ? 'No saved progress' : `${totalRoadmap - completedRoadmap} remaining`} icon={CheckCircle2} to="/roadmap" action="View Roadmap" />
      <MetricCard title="Job Matching" value={stats?.latestCareerAnalysis?.recommended_roles?.[0] ? `${stats.latestCareerAnalysis.recommended_roles[0].match_percentage}%` : '—'} detail={stats?.latestCareerAnalysis?.recommended_roles?.[0] ? stats.latestCareerAnalysis.recommended_roles[0].role : 'No persisted matches'} icon={BriefcaseBusiness} to="/jobs" action="View Jobs" />
      <MetricCard title="Interview Performance" value={stats?.interviewScore ? `${stats.interviewScore}%` : '—'} detail={stats?.interviewHistory?.length ? `${stats.interviewHistory.length} sessions completed` : 'No completed interviews'} icon={MessageSquareText} to="/interview" action="Start Interview" />
      <MetricCard title="Resume Health" value={stats?.resumeScore ? `${stats.resumeScore}/100` : '—'} detail={stats?.latestResumeAnalysis ? stats.latestResumeAnalysis.filename : 'No resume analysis'} icon={FileText} to="/resume-analyzer" action="Open Analyzer" />
    </div>

    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Development</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Skill Development</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your saved proficiency, grouped by progress state.</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/skills">View all skills <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {data.skills.map((skill) => { const status = skill.proficiency >= 70 ? 'Strong' : skill.proficiency >= 40 ? 'Improving' : 'Needs work'; const tone = skill.proficiency >= 70 ? 'success' : skill.proficiency >= 40 ? 'warning' : 'danger'; return <div key={skill.id} className="rounded-lg border border-border bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">{skill.name}</span>
            <Badge variant={tone}>{status}</Badge>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={skill.proficiency} className="h-2" />
            <span className="w-10 text-right text-xs font-semibold text-foreground">{skill.proficiency}%</span>
          </div>
        </div> })}
        {data.skills.length === 0 ? <EmptyState title="No skills saved yet" description="Complete onboarding to start tracking your skill development." action="Add skills" to="/onboarding" icon={Target} /> : null}
      </div>
    </Card>

    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Learning</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Career Roadmap</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your persisted learning progress.</p>
          </div>
          <Badge variant={roadmapProgress === null ? 'secondary' : roadmapProgress === 100 ? 'success' : 'secondary'}>{roadmapProgress === null ? 'Not available' : `${roadmapProgress}%`}</Badge>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current phase</span>
            <span className="font-semibold text-foreground">{currentPhase}</span>
          </div>
          <Progress value={roadmapProgress ?? 0} className="mt-3 h-2" />
          <div className="mt-5 flex items-start">
            {['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].map((phase, index) => <div key={phase} className="relative flex flex-1 flex-col items-center gap-2 text-center">
              <span className={`z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-card text-[10px] font-bold ${index === 0 && inProgressRoadmap > 0 ? 'border-primary text-primary' : index === 0 && completedRoadmap > 0 ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground'}`}>{index + 1}</span>
              <span className="text-[11px] text-muted-foreground">{phase}</span>
              {index < 3 ? <span className="absolute left-1/2 right-[-50%] top-3.5 h-px bg-border" /> : null}
            </div>)}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border bg-muted/10 p-3">
            <p className="text-xs text-muted-foreground">Completed items</p>
            <p className="mt-1 font-semibold text-foreground">{roadmapProgress === null ? '—' : completedRoadmap}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/10 p-3">
            <p className="text-xs text-muted-foreground">Remaining items</p>
            <p className="mt-1 font-semibold text-foreground">{roadmapProgress === null ? '—' : totalRoadmap - completedRoadmap}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="mt-5 w-full"><Link to="/roadmap">Continue Roadmap <ArrowRight className="h-4 w-4" /></Link></Button>
      </Card>
      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Opportunities</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Job Search</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved job activity from your account.</p>
        <div className="mt-5"><EmptyState title="No persisted job activity yet" description="Explore job matches and save roles you're interested in." action="Explore Jobs" to="/jobs" icon={BriefcaseBusiness} /></div>
      </Card>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Practice</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Interview Performance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your completed mock interview results.</p>
        <div className="mt-5"><EmptyState title="No completed interviews yet" description="Complete a mock interview to see your latest and average scores." action="Start first mock interview" to="/interview" icon={MessageSquareText} /></div>
      </Card>
      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Application readiness</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Resume Health</h2>
        <p className="mt-1 text-sm text-muted-foreground">Resume analysis metrics from your account.</p>
        <div className="mt-5"><EmptyState title="No resume analysis yet" description="Upload your resume to start tracking ATS, keywords, formatting, and score." action="Open Resume Analyzer" to="/resume-analyzer" icon={FileText} /></div>
      </Card>
    </div>

    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Timeline</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Recent Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">Persisted activity from your connected career records.</p>
        </div>
        <Badge variant="secondary">Live data</Badge>
      </div>
      <div className="mt-5"><EmptyState title="No recent activity yet" description="Your timeline will update when roadmap items, interviews, resume analysis, or saved jobs are persisted." action="Continue roadmap" to="/roadmap" icon={Sparkles} /></div>
    </Card>

    <Card className="overflow-hidden border-primary/15 bg-brand-soft p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Recommended Next Step</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{nextStep.text}</p>
          <p className="mt-1 text-sm text-muted-foreground">Keep your progress moving with one focused action.</p>
        </div>
        <Button asChild className="shrink-0"><Link to={nextStep.to}>{nextStep.action} <ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
    </Card>
  </div>
}

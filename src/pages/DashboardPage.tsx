import { useEffect, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Check, CircleAlert, FileText, Map, MessageSquareText, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileAvatar } from '@/components/common/ProfileAvatar'
import { ProgressRing } from '@/components/common/ProgressRing'
import { getDashboardOverview, type DashboardOverview } from '@/lib/dashboardService'
import { calculateProfileStrength } from '@/lib/profileService'
import { cn } from '@/lib/utils'

const score = (value: number | null | undefined, suffix = '%') => value === null || value === undefined ? 'Not available' : `${value}${suffix}`

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => { setLoading(true); setError(''); try { setOverview(await getDashboardOverview()) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load your career dashboard.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  if (loading) return <DashboardSkeleton />
  if (error || !overview) return <div role="alert" className="space-y-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300"><p>{error || 'Unable to load your career dashboard.'}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></div>

  const { profile, stats, role, readiness, skillAverage, skillComparisons, jobs, roadmap } = overview
  const strength = calculateProfileStrength(profile)
  const firstName = profile.profile.name?.split(' ')[0] || 'there'
  const matched = skillComparisons.filter((item) => item.classification === 'MATCHED')
  const improving = skillComparisons.filter((item) => item.classification === 'PARTIAL')
  const missing = skillComparisons.filter((item) => item.classification === 'MISSING')
  const nextGap = [...missing, ...improving][0]

  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-2xl border border-primary/10 p-6 shadow-soft sm:p-8" style={{ background: 'linear-gradient(120deg, rgba(37,99,235,0.12) 0%, rgba(11,23,40,1) 45%, rgba(34,211,238,0.08) 100%)' }}>
      <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-16 right-1/4 h-56 w-56 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Career command center</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold text-white sm:text-5xl">Welcome back, {firstName}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Track your career progress and achieve your goals with AI guidance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{profile.goal?.target_role || 'Target role not set'}</Badge>
          <Button asChild variant="outline" size="sm"><Link to="/profile">View Profile</Link></Button>
        </div>
      </div>
    </section>

    <Card className="p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <ProgressRing value={readiness ?? 0} size={132} label={readiness === null ? 'N/A' : `${readiness}%`} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Career Readiness</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-foreground">{readiness === null ? 'Not available' : `${readiness}%`}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Based on validated skills and the requirements for your persisted target role.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
          <Metric label="Target role" value={profile.goal?.target_role || 'Not set'} />
          <Metric label="Current skills" value={String(profile.skills.length)} />
          <Metric label="Required skills" value={role ? String(role.requiredSkills.length) : 'Not available'} />
          <Metric label="Skill coverage" value={skillAverage === null ? 'Not available' : `${skillAverage}%`} />
          <Metric label="Profile strength" value={`${strength.total}%`} />
          <Button asChild className="col-span-2 sm:col-span-1"><Link to="/career-analysis">View Analysis <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>
    </Card>

    <Card className="p-6"><SectionHeading title="AI Career Recommendation" description={nextGap ? `Your highest-impact next step is to improve ${nextGap.skill} for your ${profile.goal?.target_role || 'career'} goal.` : 'CareerAI will recommend evidence-based next steps from your target role and skills.'} action={nextGap ? 'Start Recommended Action' : 'Complete Profile'} to={nextGap ? '/skills' : '/profile'} /></Card>

    <section>
      <SectionHeading title="Career Analytics" description="Current signals from your connected career records." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Resume Score" value={score(stats?.resumeScore, '/100')} detail={stats?.latestResumeAnalysis?.filename || 'No resume analysis'} icon={FileText} to="/resume-analyzer" />
        <Kpi title="Skill Match" value={readiness === null ? 'Not available' : `${readiness}%`} detail={`${matched.length} matched skills`} icon={Target} to="/skills" />
        <Kpi title="Interview Score" value={score(stats?.interviewScore)} detail={stats?.interviewHistory.length ? `${stats.interviewHistory.length} completed` : 'No interviews completed'} icon={MessageSquareText} to="/interview" />
        <Kpi title="Job Match" value={jobs[0] ? `${jobs[0].matchPercentage}%` : 'Not available'} detail={jobs[0]?.job.title || 'No matching roles'} icon={BriefcaseBusiness} to="/jobs" />
      </div>
      <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">Progress tracking will appear as you complete more activities.</p>
    </section>

    <section>
      <SectionHeading title="Skill Gap Snapshot" description="Canonical skills compared with your target role." action="View Full Skill Gap" to="/skills" />
      <div className="grid gap-4 md:grid-cols-3">
        <GapGroup title="Matched Skills" count={matched.length} tone="success" items={matched.map((item) => item.skill)} />
        <GapGroup title="Needs Improvement" count={improving.length} tone="warning" items={improving.map((item) => item.skill)} />
        <GapGroup title="Missing Skills" count={missing.length} tone="danger" items={missing.map((item) => item.skill)} />
      </div>
    </section>

    <section>
      <SectionHeading title="Best Job Matches" description="CareerAI demo matches scored against your persisted target role and skills." action="View Jobs" to="/jobs" />
      <div className="grid gap-4 lg:grid-cols-3">
        {jobs.map((match) => <Card key={match.job.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{match.job.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground truncate">{match.job.company}</p>
            </div>
            <Badge variant="success">{match.matchPercentage}% match</Badge>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{match.job.location} · {match.job.type}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {match.matchedSkills.slice(0, 3).map((skill) => <Badge key={skill} variant="secondary"><Check className="h-3 w-3" />{skill}</Badge>)}
          </div>
          <Button asChild size="sm" variant="outline" className="mt-5 w-full"><Link to="/jobs">View Job <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
        </Card>)}
        {!jobs.length ? <Empty title="Live jobs are currently unavailable." description="Set a target role to see relevant job matches." action="Open Job Matching" to="/jobs" icon={BriefcaseBusiness} /> : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Demo Data · Match scores are calculated from the existing CareerAI job catalog.</p>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <SectionHeading title="Interview Performance" description="Real persisted mock interview results." />
        {stats?.interviewHistory.length
          ? <div className="mt-5 grid grid-cols-2 gap-4">
              <Metric label="Average score" value={score(stats.interviewScore)} />
              <Metric label="Completed interviews" value={String(stats.interviewHistory.length)} />
              <Metric label="Latest interview" value={stats.interviewHistory[0]?.job_role || 'Available'} />
              <Button asChild className="col-span-2"><Link to="/interview">Practice Interview <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          : <Empty title="No interviews completed yet." description="Complete your first AI mock interview to start tracking performance." action="Start Mock Interview" to="/interview" icon={MessageSquareText} />}
      </Card>
      <Card className="p-6">
        <SectionHeading title="Application Tracking" description="Persisted job activity from your account." />
        {stats
          ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Pipeline label="Saved" value={stats.savedJobsCount} />
              <Pipeline label="Applied" value={stats.appliedCount} />
              <Pipeline label="Interview" value={stats.interviewCount} />
              <Pipeline label="Offer" value={stats.offerCount} />
              <Pipeline label="Rejected" value={stats.rejectedCount} />
            </div>
          : <Empty title="Application tracking is temporarily unavailable." description="Open Job Matching to manage saved roles and applications." action="Open Job Matching" to="/jobs" icon={BriefcaseBusiness} />}
      </Card>
    </div>

    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <Card className="p-6">
        <SectionHeading title="Career Roadmap" description={profile.goal?.target_role || 'Your persisted learning progress'} action="Continue Roadmap" to="/roadmap" />
        {roadmap && roadmap.total
          ? <div className="mt-5">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/80">{roadmap.completed} of {roadmap.total} items complete</span>
                <span className="font-semibold text-foreground">{Math.round((roadmap.completed / roadmap.total) * 100)}%</span>
              </div>
              <Progress value={(roadmap.completed / roadmap.total) * 100} className="mt-3" />
              <p className="mt-3 text-sm text-muted-foreground">{roadmap.inProgress ? `${roadmap.inProgress} item${roadmap.inProgress === 1 ? '' : 's'} in progress.` : 'Continue your next roadmap item.'}</p>
            </div>
          : <Empty title="No roadmap progress yet." description="Open your roadmap to start your persisted learning plan." action="Open Roadmap" to="/roadmap" icon={Map} />}
      </Card>
      <Card className="p-6">
        <SectionHeading title="Profile Snapshot" description="Your connected career identity." action="View Profile" to="/profile" />
        <div className="mt-5 flex items-center gap-4">
          <ProfileAvatar initials={profile.profile.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{profile.profile.name || 'Name not added'}</p>
            <p className="text-sm text-muted-foreground truncate">{profile.goal?.target_role || 'Target role not added'}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 text-sm">
          <Field label="Education" value={[profile.profile.education, profile.profile.branch].filter(Boolean).join(' · ')} />
          <Field label="Location" value={profile.profile.location} />
          <Field label="Work preference" value={profile.goal?.work_preference || profile.preferences?.preferred_work_mode} />
          <Field label="Resume" value={profile.resume ? 'Analyzed' : 'Not analyzed'} />
        </div>
      </Card>
    </div>

    <Card className="p-6">
      <SectionHeading title="Profile Data Quality" description="Checks reflect real persisted data, not inferred claims." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Target role', Boolean(profile.goal?.target_role)],
          ['Skills', profile.skills.length > 0],
          ['Resume', Boolean(profile.resume)],
          ['Career goal', Boolean(profile.goal?.goal_description)],
          ['Education', Boolean(profile.profile.education || profile.profile.branch || profile.profile.graduation_year)],
          ['Location', Boolean(profile.profile.location)],
          ['Projects', profile.projects.length > 0],
          ['Preferences', Boolean(profile.goal?.work_preference || profile.preferences?.preferred_industries)],
        ].map(([label, complete]) => <div key={label as string} className="flex items-center gap-2 text-sm">
          <span className={complete ? 'text-emerald-400' : 'text-muted-foreground'}>{complete ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</span>
          <span className="text-foreground/80">{complete ? `${label} available` : `${label} not added`}</span>
        </div>)}
      </div>
    </Card>
  </div>
}

function SectionHeading({ title, description, action, to }: { title: string; description: string; action?: string; to?: string }) { return <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{action && to ? <Button asChild variant="ghost" size="sm"><Link to={to}>{action} <ArrowRight className="h-3.5 w-3.5" /></Link></Button> : null}</div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p></div> }
function Field({ label, value }: { label: string; value?: string | null }) { return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium text-foreground">{value || 'Not available'}</span></div> }
function Kpi({ title, value, detail, icon: Icon, to }: { title: string; value: string; detail: string; icon: typeof Target; to: string }) { return <Card className="p-5 transition-shadow hover:shadow-lift"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-primary"><Icon className="h-4 w-4" /></span><Button asChild variant="ghost" size="icon" aria-label={`Open ${title}`}><Link to={to}><ArrowRight className="h-4 w-4" /></Link></Button></div><p className="mt-4 text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-2xl font-bold text-foreground">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></Card> }
function GapGroup({ title, count, tone, items }: { title: string; count: number; tone: 'success' | 'warning' | 'danger'; items: string[] }) { return <Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-semibold text-foreground">{title}</h3><Badge variant={tone}>{count}</Badge></div><div className="mt-4 space-y-2">{items.slice(0, 5).map((item) => <p key={item} className="flex items-center gap-2 text-sm text-foreground/85"><span className={cn('h-1.5 w-1.5 rounded-full', tone === 'success' ? 'bg-emerald-400' : tone === 'warning' ? 'bg-amber-400' : 'bg-rose-400')} />{item}</p>)}{!items.length ? <p className="text-sm text-muted-foreground">None currently</p> : null}</div></Card> }
function Pipeline({ label, value }: { label: string; value?: number }) { return <div className="rounded-lg border border-border bg-muted/20 p-3 text-center"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold text-foreground">{value === undefined ? '—' : value}</p></div> }
function Empty({ title, description, action, to, icon: Icon }: { title: string; description: string; action: string; to: string; icon: typeof Target }) { return <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/15 p-6 text-center"><Icon className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p><Button asChild size="sm" variant="outline" className="mt-4"><Link to={to}>{action} <ArrowRight className="h-3.5 w-3.5" /></Link></Button></div> }
function DashboardSkeleton() { return <div className="space-y-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36" />)}</div><Skeleton className="h-48 w-full" /></div> }

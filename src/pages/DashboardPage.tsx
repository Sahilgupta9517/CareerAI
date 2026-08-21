import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  Circle,
  FileText,
  Flame,
  MessagesSquare,
  Target,
  Loader2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { ChartCard } from '@/components/common/ChartCard'
import { ProgressRing } from '@/components/common/ProgressRing'
import { StatCard } from '@/components/common/StatCard'
import { supabase } from '@/lib/supabase'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

interface DashboardData {
  profile: {
    name: string | null
    education: string | null
    branch: string | null
    graduation_year: string | number | null
    experience: string | null
    location: string | null
  }
  skills: Array<{ id: number; name: string; proficiency: number; category: string | null }>
  careerGoal: {
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
}

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  return String(value)
}

const averageProficiency = (skills: DashboardData['skills']) =>
  skills.length > 0 ? Math.round(skills.reduce((total, skill) => total + skill.proficiency, 0) / skills.length) : 0

export function DashboardPage() {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) {
          navigate('/login', { replace: true })
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, education, branch, graduation_year, experience, location')
          .eq('user_id', userData.user.id)
          .limit(1)
          .maybeSingle()
        if (profileError) throw profileError
        if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')

        const [skillsResult, careerGoalResult, preferencesResult, sessionResult] = await Promise.all([
          supabase
            .from('user_skills')
            .select('id, proficiency, skill:skills(id, name, category)')
            .eq('profile_id', profile.id),
          supabase.from('career_goals').select('target_role, preferred_location, work_preference, goal_description').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase
            .from('user_preferences')
            .select('preferred_job_type, preferred_work_mode, preferred_locations, expected_salary, preferred_industries')
            .eq('profile_id', profile.id)
            .limit(1)
            .maybeSingle(),
          supabase.auth.getSession()
        ])

        if (skillsResult.error) throw skillsResult.error
        if (careerGoalResult.error) throw careerGoalResult.error
        if (preferencesResult.error) throw preferencesResult.error

        const skills = (skillsResult.data ?? []).map((row) => {
          const skill = row.skill as unknown as { id: number; name: string; category: string | null } | null
          return {
            id: row.id,
            name: skill?.name ?? 'Unknown skill',
            proficiency: Number(row.proficiency) || 0,
            category: skill?.category ?? null,
          }
        })

        setDashboardData({ profile, skills, careerGoal: careerGoalResult.data, preferences: preferencesResult.data })

        const token = sessionResult.data.session?.access_token
        if (token) {
          const statsRes = await fetch('/api/dashboard-stats', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            setStats(statsData)
          }
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'We could not load your dashboard.')
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [navigate])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading dashboard" /></div>
  }

  if (errorMessage || !dashboardData) {
    return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{errorMessage || 'Dashboard data is unavailable.'}</div>
  }

  const proficiency = averageProficiency(dashboardData.skills)
  const firstName = dashboardData.profile.name?.split(' ')[0] || 'there'
  const progressData = dashboardData.skills.length > 0 ? [{ week: 'Current', readiness: proficiency }] : []
  const recommendationSkillNames = dashboardData.skills.slice(0, 2).map((skill) => skill.name).join(' and ')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Here's your career progress for today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="px-3 py-1.5">
            <Flame className="h-3.5 w-3.5" /> Live profile
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link to="/roadmap">Today's plan</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 lg:col-span-1">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-gradient opacity-10 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-base font-semibold">Career Readiness</h2>
              <Badge variant="success">From saved skills</Badge>
            </div>
            <ProgressRing value={proficiency} size={180} className="my-6" label="Skill level" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your current skill average for the {displayValue(dashboardData.careerGoal?.target_role)} track is {proficiency}%.
            </p>
            <Button asChild className="mt-5 w-full">
              <Link to="/skills">
                View Analysis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
          <StatCard
            label="Resume Score"
            value={stats?.resumeScore ? `${stats.resumeScore}/100` : '—'}
            caption={stats?.latestResumeAnalysis ? stats.latestResumeAnalysis.filename : 'Not available'}
            icon={FileText}
            tone="from-indigo-500 to-violet-500"
          />
          <StatCard
            label="Skill Match"
            value={`${proficiency}%`}
            caption={`${dashboardData.skills.length} selected skills`}
            icon={Target}
            progress={proficiency}
            tone="from-sky-500 to-indigo-500"
          />
          <StatCard
            label="Interview Score"
            value={stats?.interviewScore ? `${stats.interviewScore}%` : '—'}
            caption={stats?.interviewHistory?.length ? `${stats.interviewHistory.length} sessions completed` : 'Not available'}
            icon={MessagesSquare}
            tone="from-amber-500 to-orange-500"
          />
          <StatCard
            label="Job Match"
            value={stats?.latestCareerAnalysis?.recommended_roles?.[0] ? `${stats.latestCareerAnalysis.recommended_roles[0].match_percentage}%` : '—'}
            caption={stats?.latestCareerAnalysis?.recommended_roles?.[0] ? stats.latestCareerAnalysis.recommended_roles[0].role : 'Not available'}
            icon={BriefcaseBusiness}
            tone="from-emerald-500 to-teal-500"
          />
        </div>
      </div>

      <AIRecommendationCard
        message={
          recommendationSkillNames
            ? `You have ${dashboardData.skills.length} selected skills, including ${recommendationSkillNames}. Keep building toward your ${displayValue(dashboardData.careerGoal?.target_role)} goal.`
            : `Add skills to your profile to get personalized guidance for your ${displayValue(dashboardData.careerGoal?.target_role)} goal.`
        }
        action={
          <Button asChild variant="outline">
            <Link to="/skills">
              View Skill Gap <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          title="Career Progress"
          description="Current skill level from your saved skills"
          className="lg:col-span-2"
          action={<Badge variant="secondary">Weekly</Badge>}
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="readinessFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef0f5" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  domain={[40, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: '1px solid #e6e8ef',
                    boxShadow: '0 16px 40px -20px rgba(16,24,40,.35)',
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value}%`, 'Career readiness']}
                />
                <Area
                  type="monotone"
                  dataKey="readiness"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="url(#readinessFill)"
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Selected Skills</h3>
              <p className="mt-1 text-sm text-muted-foreground">{dashboardData.skills.length} skills saved</p>
            </div>
            <Badge variant="gradient">{proficiency}%</Badge>
          </div>
          <ul className="mt-5 space-y-2">
            {dashboardData.skills.slice(0, 4).map((skill) => (
              <li
                key={skill.id}
                className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/50"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground">
                  <Circle className="h-2 w-2" />
                </span>
                <span className="flex-1 text-sm">{skill.name}</span>
                <span className="text-xs text-muted-foreground">{skill.proficiency}%</span>
              </li>
            ))}
            {dashboardData.skills.length === 0 ? <li className="text-sm text-muted-foreground">No skills saved yet.</li> : null}
          </ul>
          <div className="mt-5 rounded-xl bg-muted/60 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Average proficiency</span>
              <span>{proficiency}%</span>
            </div>
            <Progress value={proficiency} className="h-1.5" />
          </div>
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link to="/roadmap">
              Open Roadmap <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="text-base font-semibold">Profile</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Education</dt><dd className="text-right font-medium">{displayValue(dashboardData.profile.education)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Branch</dt><dd className="text-right font-medium">{displayValue(dashboardData.profile.branch)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Graduation</dt><dd className="text-right font-medium">{displayValue(dashboardData.profile.graduation_year)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Experience</dt><dd className="text-right font-medium">{displayValue(dashboardData.profile.experience)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Location</dt><dd className="text-right font-medium">{displayValue(dashboardData.profile.location)}</dd></div>
          </dl>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Career Goal & Preferences</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div className="space-y-3 text-sm">
              <p className="font-medium text-primary">Career goal</p>
              <p><span className="text-muted-foreground">Target role: </span>{displayValue(dashboardData.careerGoal?.target_role)}</p>
              <p><span className="text-muted-foreground">Preferred location: </span>{displayValue(dashboardData.careerGoal?.preferred_location)}</p>
              <p><span className="text-muted-foreground">Work preference: </span>{displayValue(dashboardData.careerGoal?.work_preference)}</p>
              <p className="leading-relaxed"><span className="text-muted-foreground">Goal: </span>{displayValue(dashboardData.careerGoal?.goal_description)}</p>
            </div>
            <div className="space-y-3 text-sm">
              <p className="font-medium text-primary">Preferences</p>
              <p><span className="text-muted-foreground">Job type: </span>{displayValue(dashboardData.preferences?.preferred_job_type)}</p>
              <p><span className="text-muted-foreground">Work mode: </span>{displayValue(dashboardData.preferences?.preferred_work_mode)}</p>
              <p><span className="text-muted-foreground">Locations: </span>{displayValue(dashboardData.preferences?.preferred_locations)}</p>
              <p><span className="text-muted-foreground">Salary: </span>{displayValue(dashboardData.preferences?.expected_salary)}</p>
              <p><span className="text-muted-foreground">Industries: </span>{displayValue(dashboardData.preferences?.preferred_industries)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Career Data</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/profile">View profile</Link></Button>
        </div>
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            {dashboardData.skills.map((skill) => (
              <span key={skill.id} className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium">
                {skill.name} <span className="text-xs text-muted-foreground">{skill.proficiency}%</span>
              </span>
            ))}
            {dashboardData.skills.length === 0 ? <span className="text-sm text-muted-foreground">No skills saved yet.</span> : null}
          </div>
        </Card>
      </div>
    </div>
  )
}

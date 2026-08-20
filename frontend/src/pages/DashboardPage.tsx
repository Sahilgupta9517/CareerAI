import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Circle,
  FileText,
  Flame,
  MessagesSquare,
  Target,
} from 'lucide-react'
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
import { metrics, readinessTrend, recommendedActions, student, thisWeekTasks } from '@/data/mock'
import { cn } from '@/lib/utils'

const priorityVariant = { High: 'danger', Medium: 'warning', Low: 'secondary' } as const

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting()}, {student.firstName} 👋
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Here's your career progress for today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="px-3 py-1.5">
            <Flame className="h-3.5 w-3.5" /> 7-day streak
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
              <Badge variant="success">+7 this week</Badge>
            </div>
            <ProgressRing value={metrics.careerReadiness} size={180} className="my-6" label="Job ready" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              You're making strong progress toward becoming a {student.targetRole}.
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
            value={`${metrics.resumeScore}%`}
            caption="Excellent"
            icon={FileText}
            progress={metrics.resumeScore}
            tone="from-indigo-500 to-violet-500"
          />
          <StatCard
            label="Skill Match"
            value={`${metrics.skillMatch}%`}
            caption="this month"
            icon={Target}
            trend={8}
            progress={metrics.skillMatch}
            tone="from-sky-500 to-indigo-500"
          />
          <StatCard
            label="Interview Score"
            value={`${metrics.interviewScore}%`}
            caption="improvement"
            icon={MessagesSquare}
            trend={12}
            progress={metrics.interviewScore}
            tone="from-amber-500 to-orange-500"
          />
          <StatCard
            label="Job Match"
            value={`${metrics.jobMatch}%`}
            caption="3 new matches"
            icon={BriefcaseBusiness}
            progress={metrics.jobMatch}
            tone="from-emerald-500 to-teal-500"
          />
        </div>
      </div>

      <AIRecommendationCard
        message="Your biggest current skill gap is SQL and Data Structures. Completing these skills could increase your job match by approximately 14%."
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
          description="Readiness score over the last 5 weeks"
          className="lg:col-span-2"
          action={<Badge variant="secondary">Weekly</Badge>}
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readinessTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
              <h3 className="text-base font-semibold">Upcoming Roadmap</h3>
              <p className="mt-1 text-sm text-muted-foreground">This Week</p>
            </div>
            <Badge variant="gradient">Week 5</Badge>
          </div>
          <ul className="mt-5 space-y-2">
            {thisWeekTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/50"
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border',
                    task.done ? 'border-transparent bg-brand-gradient text-white' : 'border-border text-muted-foreground',
                  )}
                >
                  {task.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                </span>
                <span className={cn('flex-1 text-sm', task.done ? 'text-muted-foreground line-through' : '')}>
                  {task.title}
                </span>
                <span className="text-xs text-muted-foreground">{task.hours}h</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-muted/60 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Week completion</span>
              <span>50%</span>
            </div>
            <Progress value={50} className="h-1.5" />
          </div>
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link to="/roadmap">
              Open Roadmap <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recommended Actions</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/progress">View all</Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {recommendedActions.map((action) => (
            <Card
              key={action.id}
              className="flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{action.title}</h3>
                <Badge variant={priorityVariant[action.priority]}>{action.priority}</Badge>
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{action.description}</p>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{action.progress}%</span>
                </div>
                <Progress value={action.progress} className="h-1.5" />
              </div>
              <p className="mt-3 text-xs font-medium text-primary">{action.impact}</p>
              <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                <Link to={action.to}>{action.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

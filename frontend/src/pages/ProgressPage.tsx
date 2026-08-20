import { Award, Flame, Lock, Sparkles, Target, Timer } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { ChartCard } from '@/components/common/ChartCard'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { achievements, activityData, readinessTrend } from '@/data/mock'
import { cn } from '@/lib/utils'

export function ProgressPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Progress"
        description="Everything you have improved since you joined CareerAI."
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> 5 weeks tracked
          </Badge>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Study streak" value="7 days" caption="personal best" icon={Flame} tone="from-amber-500 to-orange-500" />
        <StatCard label="Hours this week" value="19.0" caption="vs. 12h goal" icon={Timer} trend={22} tone="from-sky-500 to-indigo-500" />
        <StatCard label="Skills improved" value="6" caption="since week 1" icon={Target} trend={14} tone="from-indigo-500 to-violet-500" />
        <StatCard label="Achievements" value="4 / 6" caption="unlocked" icon={Award} tone="from-emerald-500 to-teal-500" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Readiness vs. skills" description="Weekly growth across both scores">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readinessTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef0f5" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis domain={[40, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e6e8ef', fontSize: 12 }} />
                <Line type="monotone" dataKey="readiness" name="Readiness" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="skills" name="Skills" stroke="#a78bfa" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Study activity" description="Hours logged over the last 7 days">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef0f5" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,.06)' }}
                  contentStyle={{ borderRadius: 14, border: '1px solid #e6e8ef', fontSize: 12 }}
                  formatter={(value) => [`${value} hrs`, 'Studied']}
                />
                <Bar dataKey="hours" fill="url(#activityFill)" radius={[8, 8, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <Card className="p-6">
        <h2 className="text-base font-semibold">Achievements</h2>
        <p className="mt-1 text-sm text-muted-foreground">Milestones you unlock as your profile gets stronger.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={cn(
                'flex items-start gap-3 rounded-2xl border p-4 transition-all',
                achievement.unlocked
                  ? 'border-primary/20 bg-brand-soft'
                  : 'border-dashed border-border bg-muted/40 opacity-70',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  achievement.unlocked ? 'bg-brand-gradient text-white' : 'bg-white text-muted-foreground',
                )}
              >
                {achievement.unlocked ? <Award className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-sm font-semibold">{achievement.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AIRecommendationCard
        message="Your best study days are Friday and Saturday. Scheduling DSA practice in those blocks should lift your interview score fastest."
      />
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { ChartCard } from '@/components/common/ChartCard'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { metrics, skillRadar, skills, student } from '@/data/mock'
import { cn } from '@/lib/utils'

export function SkillGapPage() {
  const gaps = [...skills]
    .map((skill) => ({ ...skill, gap: Math.max(0, skill.target - skill.level) }))
    .sort((a, b) => b.gap - a.gap)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Gap Analysis"
        description={`How your skills compare to what a ${student.targetRole} role expects.`}
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Updated today
          </Badge>
        }
        actions={
          <Button asChild>
            <Link to="/roadmap">
              Close gaps with roadmap <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center p-6 text-center">
          <h2 className="self-start text-base font-semibold">Role Readiness</h2>
          <ProgressRing value={metrics.skillMatch} size={168} className="my-5" label={student.targetRole} />
          <p className="text-sm text-muted-foreground">
            {gaps.filter((skill) => skill.gap > 0).length} skills below target level
          </p>
          <div className="mt-5 w-full rounded-xl bg-brand-soft p-4 text-left">
            <p className="flex items-center gap-2 text-xs font-semibold text-primary">
              <TrendingUp className="h-3.5 w-3.5" /> Fastest win
            </p>
            <p className="mt-1 text-sm text-foreground/80">SQL — 38 points below target, ~3 weeks of focused study.</p>
          </div>
        </Card>

        <ChartCard
          title="You vs. target role"
          description="Skill coverage across the six areas hiring managers screen for"
          className="lg:col-span-2"
        >
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillRadar} outerRadius="72%">
                <PolarGrid stroke="#e6e8ef" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e6e8ef', fontSize: 12 }} />
                <Radar name="Target role" dataKey="role" stroke="#c4b5fd" fill="#c4b5fd" fillOpacity={0.35} />
                <Radar name="You" dataKey="you" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.45} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> You
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-300" /> {student.targetRole}
            </span>
          </div>
        </ChartCard>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Skill breakdown</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sorted by the size of the gap to your target role.</p>
          </div>
          <Badge variant="secondary">{skills.length} skills tracked</Badge>
        </div>
        <div className="mt-6 space-y-5">
          {gaps.map((skill) => (
            <div key={skill.name}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium">{skill.name}</span>
                  <Badge variant="secondary">{skill.category}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    You <span className="font-semibold text-foreground">{skill.level}</span> / target {skill.target}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 font-semibold',
                      skill.gap === 0 ? 'bg-emerald-50 text-emerald-700' : skill.gap > 25 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700',
                    )}
                  >
                    {skill.gap === 0 ? 'On target' : `-${skill.gap}`}
                  </span>
                </div>
              </div>
              <div className="relative">
                <Progress value={skill.level} />
                <span
                  className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/30"
                  style={{ left: `${skill.target}%` }}
                  title={`Target ${skill.target}`}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AIRecommendationCard
        message="Focus the next 4 weeks on SQL and Data Structures. Together they account for 68% of your remaining gap and appear in 9 of your 10 top job matches."
        action={
          <Button asChild variant="outline">
            <Link to="/jobs">
              See affected jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
    </div>
  )
}

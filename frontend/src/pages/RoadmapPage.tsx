import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { PageHeader } from '@/components/common/PageHeader'
import { RoadmapCard } from '@/components/common/RoadmapCard'
import { useToast } from '@/components/common/Toast'
import { roadmap as initialRoadmap, student } from '@/data/mock'

export function RoadmapPage() {
  const { toast } = useToast()
  const [roadmap, setRoadmap] = useState(initialRoadmap)

  const overall = useMemo(() => {
    const tasks = roadmap.flatMap((week) => week.tasks)
    const done = tasks.filter((task) => task.done).length
    return Math.round((done / tasks.length) * 100)
  }, [roadmap])

  const toggleTask = (weekId: string, taskId: string) => {
    setRoadmap((current) =>
      current.map((week) => {
        if (week.id !== weekId) return week
        const tasks = week.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task))
        const progress = Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100)
        const status = progress === 100 ? 'completed' : progress > 0 ? 'active' : week.status
        return { ...week, tasks, progress, status: status as typeof week.status }
      }),
    )
    toast({ title: 'Roadmap updated', description: 'Your readiness score will recalculate tonight.', tone: 'ai' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Roadmap"
        description={`A 12-week plan built around your goal of becoming a ${student.targetRole}.`}
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Personalized plan
          </Badge>
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/skills">
              Why these skills? <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <Card className="p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Overall completion</p>
            <p className="mt-1 text-3xl font-bold">{overall}%</p>
            <Progress value={overall} className="mt-3" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current phase</p>
            <p className="mt-1 text-lg font-semibold">SQL & Data Fundamentals</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Week 3–4 of 12
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Weekly commitment</p>
            <p className="mt-1 text-lg font-semibold">10–12 hours</p>
            <p className="mt-1 text-xs text-muted-foreground">Estimated job-ready by 14 Nov</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {roadmap.map((week) => (
          <RoadmapCard key={week.id} week={week} onToggleTask={toggleTask} />
        ))}
      </div>

      <AIRecommendationCard
        message="You are 2 days ahead of schedule. If you keep this pace, CareerAI projects 86% readiness by the end of week 8 — enough to start applying to your top 3 matches."
        action={
          <Button asChild variant="outline">
            <Link to="/jobs">
              View job matches <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
    </div>
  )
}

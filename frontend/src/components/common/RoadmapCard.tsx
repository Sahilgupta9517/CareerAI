import { Check, Circle, Clock, Target } from 'lucide-react'
import type { RoadmapWeek } from '@/data/mock'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface RoadmapCardProps {
  week: RoadmapWeek
  onToggleTask?: (weekId: string, taskId: string) => void
}

const statusMeta = {
  completed: { label: 'Completed', variant: 'success' as const },
  active: { label: 'In progress', variant: 'gradient' as const },
  upcoming: { label: 'Upcoming', variant: 'secondary' as const },
}

export function RoadmapCard({ week, onToggleTask }: RoadmapCardProps) {
  const meta = statusMeta[week.status]
  const totalHours = week.tasks.reduce((sum, task) => sum + task.hours, 0)

  return (
    <Card
      className={cn(
        'p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift',
        week.status === 'active' && 'border-primary/30 shadow-lift',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{week.week}</span>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <h3 className="mt-2 text-lg font-semibold">{week.focus}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            {week.outcome}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {totalHours} hrs
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Progress</span>
          <span className="text-foreground">{week.progress}%</span>
        </div>
        <Progress value={week.progress} />
      </div>

      <ul className="mt-5 space-y-2">
        {week.tasks.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onToggleTask?.(week.id, task.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:border-border hover:bg-muted/60"
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  task.done ? 'border-transparent bg-brand-gradient text-white' : 'border-border text-transparent',
                )}
              >
                {task.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
              </span>
              <span className={cn('flex-1 text-sm', task.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                {task.title}
              </span>
              <span className="text-xs text-muted-foreground">{task.hours}h</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

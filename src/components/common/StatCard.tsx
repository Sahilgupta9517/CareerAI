import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  caption: string
  icon: LucideIcon
  trend?: number
  progress?: number
  tone?: string
  className?: string
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  trend,
  progress,
  tone = 'from-indigo-500 to-violet-500',
  className,
}: StatCardProps) {
  const TrendIcon = trend !== undefined && trend < 0 ? TrendingDown : TrendingUp
  return (
    <Card
      className={cn(
        'group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={cn('rounded-xl bg-gradient-to-br p-2.5 text-white shadow-sm transition-transform duration-300 group-hover:scale-110', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {trend !== undefined ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
              trend >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400',
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trend >= 0 ? '+' : ''}
            {trend}%
          </span>
        ) : null}
        <span className="text-muted-foreground">{caption}</span>
      </div>
      {progress !== undefined ? <Progress value={progress} className="mt-4 h-1.5" /> : null}
    </Card>
  )
}

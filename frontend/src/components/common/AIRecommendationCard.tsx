import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIRecommendationCardProps {
  title?: string
  message: string
  action?: ReactNode
  className?: string
}

export function AIRecommendationCard({
  title = 'AI Recommendation',
  message,
  action,
  className,
}: AIRecommendationCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/15 bg-brand-soft p-6 shadow-soft',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lift">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">{title}</p>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground/80">{message}</p>
          </div>
        </div>
        {action ? <div className="shrink-0 sm:pl-4">{action}</div> : null}
      </div>
    </div>
  )
}

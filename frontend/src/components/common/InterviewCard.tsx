import { Clock, MessageSquareText, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface InterviewCardProps {
  title: string
  description: string
  questions: number
  duration: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  lastScore: number
  onStart?: () => void
}

const difficultyVariant = {
  Beginner: 'success',
  Intermediate: 'default',
  Advanced: 'warning',
} as const

export function InterviewCard({
  title,
  description,
  questions,
  duration,
  difficulty,
  lastScore,
  onStart,
}: InterviewCardProps) {
  return (
    <Card className="flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge variant={difficultyVariant[difficulty]}>{difficulty}</Badge>
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5" />
          {questions} questions
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {duration}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Last score</p>
          <p className="text-sm font-semibold">{lastScore > 0 ? `${lastScore}%` : 'Not attempted'}</p>
        </div>
        <Button size="sm" onClick={onStart}>
          <Play className="h-3.5 w-3.5" />
          Start
        </Button>
      </div>
    </Card>
  )
}

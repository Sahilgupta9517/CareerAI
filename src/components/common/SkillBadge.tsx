import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillBadgeProps {
  name: string
  selected?: boolean
  onClick?: () => void
  level?: number
  className?: string
}

export function SkillBadge({ name, selected, onClick, level, className }: SkillBadgeProps) {
  const interactive = Boolean(onClick)
  const Comp = interactive ? 'button' : 'span'
  return (
    <Comp
      {...(interactive ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
        selected
          ? 'border-transparent bg-brand-gradient text-white shadow-lift'
          : 'border-border bg-white text-foreground/80',
        interactive && !selected && 'hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary',
        interactive && selected && 'hover:brightness-105',
        className,
      )}
    >
      {selected ? <Check className="h-3.5 w-3.5" /> : null}
      {name}
      {level !== undefined ? (
        <span className={cn('text-xs font-semibold', selected ? 'text-white/80' : 'text-muted-foreground')}>
          {level}
        </span>
      ) : null}
    </Comp>
  )
}

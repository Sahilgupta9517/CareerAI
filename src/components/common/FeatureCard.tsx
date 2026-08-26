import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  tone?: string
  className?: string
}

export function FeatureCard({ icon: Icon, title, description, tone = 'from-indigo-500 to-violet-500', className }: FeatureCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/80 bg-card/90 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-glow backdrop-blur-sm',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-15" />
      <div className={cn('relative inline-flex rounded-xl bg-gradient-to-br p-3 text-white shadow-lift transition-transform duration-300 group-hover:scale-110', tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="relative mt-5 text-base font-semibold">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

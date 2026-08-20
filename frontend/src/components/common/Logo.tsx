import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
  tagline?: boolean
}

export function Logo({ className, showText = true, tagline = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-lift">
        <Sparkles className="h-[18px] w-[18px] text-white" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
      </div>
      {showText ? (
        <div className="leading-tight">
          <span className="block text-[17px] font-bold tracking-tight">
            Career<span className="text-gradient">AI</span>
          </span>
          {tagline ? (
            <span className="block text-[11px] font-medium text-muted-foreground">Your AI-Powered Career Coach</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

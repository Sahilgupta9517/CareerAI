import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
  tagline?: boolean
}

export function Logo({ className, showText = true, tagline = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient shadow-soft">
        <svg viewBox="0 0 24 24" className="h-[21px] w-[21px] text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 17 12 5l7 12" />
          <path d="M8 14h8" />
          <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </div>
      {showText ? (
        <div className="leading-tight">
            <span className="block text-[17px] font-bold tracking-tight text-foreground">
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

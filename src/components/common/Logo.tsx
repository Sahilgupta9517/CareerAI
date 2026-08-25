import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
  tagline?: boolean
  light?: boolean
}

export function Logo({ className, showText = true, tagline = false, light = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="relative flex h-9 w-9 items-center justify-center rounded-xl shadow-glow"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #22D3EE 100%)' }}
      >
        <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 17V8l6-3 6 3v9l-6 3-6-3Z" />
          <path d="M6 8l6 3 6-3M12 11v9" />
          <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
        </svg>
      </div>
      {showText ? (
        <div className="leading-tight">
          <span className={cn('block text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-foreground')}>
            Career<span className="text-gradient">AI</span>
          </span>
          {tagline ? (
            <span className={cn('block text-[10px] font-semibold', light ? 'text-white/60' : 'text-muted-foreground')}>
              AI-Powered Career Intelligence
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}


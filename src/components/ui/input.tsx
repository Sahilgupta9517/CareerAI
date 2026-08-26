import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border bg-input/90 px-3.5 py-2 text-sm text-foreground shadow-inner-glow transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{ borderColor: 'rgba(148,163,184,0.18)' }}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }

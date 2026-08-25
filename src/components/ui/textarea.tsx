import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[96px] w-full rounded-xl border bg-input px-4 py-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20',
        className,
      )}
      style={{ borderColor: 'rgba(148,163,184,0.18)' }}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }

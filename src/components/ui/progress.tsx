import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  indicatorClassName?: string
}

export function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    const id = window.setTimeout(() => setWidth(Math.min(100, Math.max(0, value))), 80)
    return () => window.clearTimeout(id)
  }, [value])

  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted/60', className)} {...props}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', indicatorClassName)}
        style={{ width: `${width}%`, backgroundImage: 'linear-gradient(90deg, #2563EB, #22D3EE)' }}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  className?: string
  showValue?: boolean
}

export function ProgressRing({
  value,
  size = 160,
  strokeWidth = 12,
  label,
  sublabel,
  className,
  showValue = true,
}: ProgressRingProps) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const id = window.setTimeout(() => setProgress(value), 120)
    return () => window.clearTimeout(id)
  }, [value])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  const gradientId = `ring-${Math.round(size)}-${Math.round(value)}`

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="stroke-muted" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={`url(#${gradientId})`}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue ? (
          <span className="text-3xl font-bold tracking-tight" style={{ fontSize: size / 4.6 }}>
            {Math.round(progress)}%
          </span>
        ) : null}
        {label ? <span className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</span> : null}
        {sublabel ? <span className="text-[11px] text-muted-foreground/80">{sublabel}</span> : null}
      </div>
    </div>
  )
}

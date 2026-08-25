import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl overflow-hidden relative', className)}
      {...props}
    >
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: 'rgba(148,163,184,0.07)' }}
      />
      <div
        className="absolute inset-0 rounded-xl animate-shimmer"
        style={{
          backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.08) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  )
}

import { cn } from '@/lib/utils'

interface ProfileAvatarProps {
  initials: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  status?: boolean
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
}

export function ProfileAvatar({ initials, size = 'md', className, status }: ProfileAvatarProps) {
  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-brand-gradient font-semibold text-white shadow-lift ring-2 ring-background',
          sizes[size],
        )}
      >
        {initials}
      </div>
      {status ? (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
      ) : null}
    </div>
  )
}

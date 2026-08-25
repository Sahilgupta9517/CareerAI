import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Menu, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileAvatar } from '@/components/common/ProfileAvatar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

interface TopbarProps {
  onOpenMobileNav: () => void
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const [openNotifications, setOpenNotifications] = useState(false)
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your profile'
  const initials = name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-30 flex h-[78px] items-center gap-3 border-b border-border/80 bg-white/90 px-4 backdrop-blur-xl sm:px-8">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
        <div className="hidden lg:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Career intelligence</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">Your command center</p>
        </div>
        <div className="relative ml-auto w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search skills, jobs, roadmap…"
          className="h-10 w-full rounded-xl border border-border bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/80 focus:border-primary/60 focus:bg-white focus:ring-4 focus:ring-primary/10"
        />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/interview">
            <Sparkles className="h-4 w-4" />
            Ask CareerAI
          </Link>
        </Button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenNotifications((open) => !open)}
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <div
            className={cn(
              'absolute right-0 top-12 w-[min(320px,calc(100vw-2rem))] origin-top-right rounded-xl border border-border bg-white p-2 shadow-lift transition-all',
              openNotifications ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0',
            )}
          >
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notifications
            </p>
            <p className="px-3 py-3 text-sm text-muted-foreground">You are all caught up.</p>
          </div>
        </div>

        <Link to="/profile" aria-label="Open profile">
          <ProfileAvatar initials={initials} status />
        </Link>
      </div>
    </header>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Menu, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileAvatar } from '@/components/common/ProfileAvatar'
import { notifications, student } from '@/data/mock'
import { cn } from '@/lib/utils'

interface TopbarProps {
  onOpenMobileNav: () => void
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const [openNotifications, setOpenNotifications] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search skills, jobs, roadmap…"
          className="h-10 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/80 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10"
        />
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
            className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <div
            className={cn(
              'absolute right-0 top-12 w-[min(320px,calc(100vw-2rem))] origin-top-right rounded-2xl border border-border bg-white p-2 shadow-glow transition-all',
              openNotifications ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0',
            )}
          >
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notifications
            </p>
            {notifications.map((item) => (
              <div key={item.id} className="rounded-xl px-3 py-2.5 transition-colors hover:bg-muted">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">{item.time}</p>
              </div>
            ))}
          </div>
        </div>

        <Link to="/profile" aria-label="Open profile">
          <ProfileAvatar initials={student.initials} status />
        </Link>
      </div>
    </header>
  )
}

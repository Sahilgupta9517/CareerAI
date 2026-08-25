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
    <header
      className="sticky top-0 z-30 flex h-[72px] items-center gap-3 px-4 backdrop-blur-xl sm:px-6"
      style={{
        background: 'rgba(6,17,31,0.85)',
        borderBottom: '1px solid rgba(148,163,184,0.08)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/8 hover:text-white lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop left section */}
      <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
        <div className="hidden lg:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Career intelligence</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-100">Your command center</p>
        </div>

        {/* Search */}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Search skills, jobs, roadmap…"
            className="h-10 w-full rounded-xl px-4 pl-10 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:ring-2 focus:ring-primary/30"
            style={{
              background: 'rgba(148,163,184,0.07)',
              border: '1px solid rgba(148,163,184,0.12)',
            }}
          />
        </div>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/interview">
            <Sparkles className="h-4 w-4" />
            Ask CareerAI
          </Link>
        </Button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenNotifications((open) => !open)}
            className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <div
            className={cn(
              'absolute right-0 top-12 w-[min(320px,calc(100vw-2rem))] origin-top-right rounded-xl p-2 shadow-lift transition-all',
              openNotifications ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0',
            )}
            style={{
              background: '#0F2238',
              border: '1px solid rgba(148,163,184,0.12)',
            }}
          >
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Notifications
            </p>
            <p className="px-3 py-3 text-sm text-slate-400">You are all caught up.</p>
          </div>
        </div>

        {/* Avatar */}
        <Link to="/profile" aria-label="Open profile">
          <ProfileAvatar initials={initials} status />
        </Link>
      </div>
    </header>
  )
}


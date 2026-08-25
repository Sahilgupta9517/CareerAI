import { NavLink } from 'react-router-dom'
import {
  BriefcaseBusiness,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LineChart,
  Map,
  MessagesSquare,
  Settings,
  Target,
  User,
  X,
  Sparkles,
} from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { ProfileAvatar } from '@/components/common/ProfileAvatar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

export const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Resume Analyzer', to: '/resume-analyzer', icon: FileText },
  { label: 'Skill Gap', to: '/skills', icon: Target },
  { label: 'Career Analysis', to: '/career-analysis', icon: Sparkles },
  { label: 'Career Roadmap', to: '/roadmap', icon: Map },
  { label: 'Job Matching', to: '/jobs', icon: BriefcaseBusiness },
  { label: 'AI Mock Interview', to: '/interview', icon: MessagesSquare },
  { label: 'Progress', to: '/progress', icon: LineChart },
  { label: 'Profile', to: '/profile', icon: User },
  { label: 'Settings', to: '/settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your profile'
  const targetRole = user?.user_metadata?.target_role || 'Career profile'
  const initials = name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'
  return (
    <>
      <div
        role="presentation"
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/80 bg-white transition-[width,transform] duration-300 ease-out lg:translate-x-0',
          collapsed ? 'w-[76px]' : 'w-[264px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('flex h-[78px] items-center border-b border-border/70 px-4', collapsed ? 'justify-center' : 'justify-between')}>
          <Logo showText={!collapsed} />
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn('px-4 pt-5', collapsed && 'px-3')}>
          {!collapsed ? <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Workspace</p> : null}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-blue-50 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 h-6 w-1 rounded-r-full bg-brand-gradient" />
                  ) : null}
                  <item.icon strokeWidth={1.8} className={cn('h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-105')} />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border bg-slate-50/70 p-3">
          <NavLink
            to="/profile"
            onClick={onCloseMobile}
            className={cn(
              'flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted',
              collapsed && 'justify-center',
            )}
          >
            <ProfileAvatar initials={initials} status />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{targetRole}</p>
              </div>
            ) : null}
          </NavLink>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'mt-2 hidden w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex',
              collapsed && 'justify-center px-0',
            )}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
            {!collapsed ? 'Collapse sidebar' : null}
          </button>
        </div>
      </aside>
    </>
  )
}

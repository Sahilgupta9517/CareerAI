import { NavLink } from 'react-router-dom'
import {
  BriefcaseBusiness,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Map,
  MessagesSquare,
  Settings,
  Sparkles,
  Target,
  User,
  X,
} from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { ProfileAvatar } from '@/components/common/ProfileAvatar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const navGroups = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Career Analysis', to: '/career-analysis', icon: Sparkles },
      { label: 'Resume', to: '/resume-analyzer', icon: FileText },
      { label: 'Jobs', to: '/jobs', icon: BriefcaseBusiness },
    ],
  },
  {
    label: 'CAREER DEVELOPMENT',
    items: [
      { label: 'Skill Gap', to: '/skills', icon: Target },
      { label: 'Career Roadmap', to: '/roadmap', icon: Map },
      { label: 'Interviews', to: '/interview', icon: MessagesSquare },
      { label: 'Progress', to: '/progress', icon: LineChart },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Profile', to: '/profile', icon: User },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

// Keep flat navItems export for compatibility
export const navItems = navGroups.flatMap((g) => g.items)

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, signOut } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your profile'
  const targetRole = user?.user_metadata?.target_role || 'AI Career Intelligence'
  const initials = name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <>
      {/* Mobile overlay */}
      <div
        role="presentation"
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-40 bg-navy-900/70 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-[width,transform] duration-300 ease-out lg:translate-x-0',
          collapsed ? 'w-[76px]' : 'w-[264px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          background: 'linear-gradient(180deg, #081827 0%, #06111F 100%)',
          borderRight: '1px solid rgba(148,163,184,0.08)',
        }}
      >
        {/* Logo / header */}
        <div className={cn(
          'flex h-[72px] items-center shrink-0 px-4',
          collapsed ? 'justify-center' : 'justify-between',
        )}
          style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}
        >
          <Logo showText={!collapsed} light />
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        collapsed && 'justify-center px-0 py-3',
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active background */}
                        {isActive && (
                          <span
                            className="absolute inset-0 rounded-lg"
                            style={{ background: 'rgba(37,99,235,0.18)' }}
                          />
                        )}
                        {/* Left indicator strip */}
                        {isActive && (
                          <span
                            className="absolute left-0 h-5 w-0.5 rounded-r-full"
                            style={{ background: 'linear-gradient(180deg, #3B82F6, #22D3EE)' }}
                          />
                        )}
                        <item.icon
                          strokeWidth={1.8}
                          className={cn(
                            'relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200',
                            isActive ? 'text-blue-400' : 'group-hover:scale-105',
                          )}
                        />
                        {!collapsed && (
                          <span className="relative z-10 truncate">{item.label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: user profile + collapse */}
        <div
          className="shrink-0 p-3 space-y-1"
          style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}
        >
          <NavLink
            to="/profile"
            onClick={onCloseMobile}
            className={cn(
              'flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/5',
              collapsed && 'justify-center',
            )}
          >
            <ProfileAvatar initials={initials} status />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">{name}</p>
                <p className="truncate text-xs text-slate-500">{targetRole}</p>
              </div>
            )}
          </NavLink>

          {!collapsed && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'hidden w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 lg:flex',
              collapsed && 'justify-center px-0',
            )}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
            {!collapsed ? 'Collapse' : null}
          </button>
        </div>
      </aside>
    </>
  )
}


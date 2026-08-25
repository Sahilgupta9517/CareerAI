import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }} />
      </div>

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={cn('relative z-10 transition-[padding] duration-300 ease-out', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main key={location.pathname} className="page-shell animate-fade-in px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}


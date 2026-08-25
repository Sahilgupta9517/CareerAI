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
    <div className="min-h-screen bg-[radial-gradient(circle_at_85%_-10%,rgba(37,99,235,.08),transparent_30%),linear-gradient(180deg,#ffffff_0%,hsl(var(--background))_38%,#f6f8fb_100%)]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={cn('transition-[padding] duration-300 ease-out', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main key={location.pathname} className="page-shell animate-fade-in px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

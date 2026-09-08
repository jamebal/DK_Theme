import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { IconHome, IconLink, IconRoute, IconSettings } from '@tabler/icons-react'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { useAuth } from '@/features/auth/auth-context'
import { appConfig } from '@/lib/config'

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const { logout, user } = useAuth()
  return <Sidebar collapsible='offcanvas' {...props}>
    <SidebarHeader className='p-5'><Link to='/dashboard' className='font-semibold tracking-tight'>{appConfig.appName}</Link></SidebarHeader>
    <SidebarContent><NavMain items={[
      { title: '首页', url: '/dashboard', icon: IconHome },
      { title: '订阅', url: '/clients', icon: IconLink },
      { title: '节点', url: '/node-status', icon: IconRoute },
      { title: '设置', url: '/settings', icon: IconSettings },
    ]} /></SidebarContent>
    <SidebarFooter><NavUser user={{ name: '账户', email: user?.email ?? '', avatar: user?.avatar_url ?? undefined }} onLogout={logout} /></SidebarFooter>
  </Sidebar>
}

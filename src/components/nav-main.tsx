import type { Icon } from '@tabler/icons-react'
import { Link, useLocation } from 'react-router-dom'
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'

export function NavMain({ items }: { items: { title: string; url: string; icon: Icon }[] }) {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  return <SidebarGroup><SidebarGroupContent><SidebarMenu className='gap-1'>
    {items.map(item => <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={location.pathname === item.url} className='h-10 rounded-md px-3'>
        <Link to={item.url} onClick={() => setOpenMobile(false)} aria-current={location.pathname === item.url ? 'page' : undefined}>
          <item.icon /><span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>)}
  </SidebarMenu></SidebarGroupContent></SidebarGroup>
}

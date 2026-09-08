import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/brand-logo'
import { RouteChunkErrorBoundary } from '@/components/route-chunk-error-boundary'
import { ThemeToggle } from '@/components/theme-toggle'

export function AuthLayout() {
  const location = useLocation()
  return <div className='flex min-h-screen flex-col p-6 sm:p-10'>
    <header className='flex items-center justify-between'><BrandLogo /><ThemeToggle /></header>
    <main className='mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12'>
      <RouteChunkErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<p>页面加载中…</p>}><Outlet /></Suspense>
      </RouteChunkErrorBoundary>
    </main>
  </div>
}

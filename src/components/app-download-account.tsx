import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/clipboard'
import { useAuth } from '@/features/auth/auth-context'
import { apiClient } from '@/lib/api/client'
import { appConfig } from '@/lib/config'
import { parseAppAccounts } from '@/lib/app-accounts'

async function fetchAppAccounts(signal: AbortSignal) {
  const response = await apiClient.get<unknown>(appConfig.appAccountsApiPath, {
    signal,
    headers: { 'Cache-Control': 'no-store' },
  })
  return parseAppAccounts(response.data)
}

export function AppDownloadAccount({ appName }: { appName: string }) {
  const { token, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const { data } = useQuery({
    queryKey: ['app-download-accounts', user?.email],
    queryFn: ({ signal }) => fetchAppAccounts(signal),
    enabled: Boolean(token && user && appConfig.appAccountsApiPath) && !appConfig.enableMock,
    staleTime: 60_000,
    gcTime: 0,
    retry: false,
  })
  if (!token || !user || !appConfig.appAccountsApiPath || appConfig.enableMock) return null
  const value = data?.[appName]
  if (!value) return null
  const { appleId, password } = value

  async function copyAccountValue(value: string, label: string) {
    try {
      await copyText(value)
      toast.success(`${label}已复制`)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <div className='mt-3 min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm dark:border-border/70 dark:bg-background/40'>
      <p className='font-medium text-slate-900 dark:text-foreground'>{appName} 下载账号</p>
      <dl className='mt-3 space-y-3'>
        <div>
          <dt className='text-slate-500 dark:text-muted-foreground'>Apple ID</dt>
          <dd className='mt-1 break-all select-text text-slate-800 dark:text-foreground'>{appleId}</dd>
        </div>
        <div>
          <dt className='text-slate-500 dark:text-muted-foreground'>密码</dt>
          <dd className='mt-1 break-all whitespace-pre-wrap font-mono select-text text-slate-800 dark:text-foreground'>{showPassword ? password : '••••••••'}</dd>
        </div>
      </dl>
      <div className='mt-3 flex flex-wrap gap-2'>
        <Button variant='outline' size='sm' onClick={() => copyAccountValue(appleId, 'Apple ID')}>复制 Apple ID</Button>
        <Button variant='outline' size='sm' onClick={() => copyAccountValue(password, '密码')}>复制密码</Button>
        <Button variant='ghost' size='sm' aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? '隐藏密码' : '显示密码'}</Button>
      </div>
    </div>
  )
}

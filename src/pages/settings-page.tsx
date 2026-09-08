import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import { changePassword, resetSubscribeSecurity } from '@/lib/api/services/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function SettingsPage() {
  const { user, subscribe, refreshSubscription } = useAuth()
  const [password, setPassword] = useState({ old_password: '', new_password: '', new_password_2: '' })
  const [confirmReset, setConfirmReset] = useState(false)
  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { setPassword({ old_password: '', new_password: '', new_password_2: '' }); toast.success('密码已修改') },
    onError: () => toast.error('密码修改失败，请检查旧密码后重试'),
  })
  const resetMutation = useMutation({
    mutationFn: async () => {
      await resetSubscribeSecurity()
      // Clear the old URL before refetching, including when refetch fails.
      await refreshSubscription()
    },
    onSuccess: () => { setConfirmReset(false); toast.success('订阅已重置，请重新导入客户端') },
    onError: () => { setConfirmReset(false); toast.error('未能完成重置或获取新链接，请刷新页面确认订阅') },
  })
  return <div className='mx-auto w-full max-w-4xl space-y-8 px-4 lg:px-8'>
    <h1 className='text-xl font-semibold'>设置</h1>
    <section className='space-y-3 border-b pb-6'><h2 className='font-medium'>账户</h2><p className='break-all text-sm text-muted-foreground'>{user?.email ?? '账户信息暂不可用'}</p></section>
    <form className='max-w-sm space-y-4' onSubmit={event => {
      event.preventDefault()
      if (password.new_password !== password.new_password_2) { toast.error('两次新密码不一致'); return }
      passwordMutation.mutate(password)
    }}>
      <h2 className='font-medium'>修改密码</h2>
      {([{ key: 'old_password', label: '当前密码' }, { key: 'new_password', label: '新密码' }, { key: 'new_password_2', label: '确认新密码' }] as const).map(field => <div key={field.key} className='space-y-2'>
        <label htmlFor={field.key} className='text-sm'>{field.label}</label>
        <Input id={field.key} type='password' required minLength={field.key === 'old_password' ? undefined : 8} autoComplete={field.key === 'old_password' ? 'current-password' : 'new-password'} value={password[field.key]} onChange={event => setPassword(current => ({ ...current, [field.key]: event.target.value }))} />
      </div>)}
      <p className='text-xs text-muted-foreground'>新密码至少 8 位。</p>
      <Button type='submit' disabled={passwordMutation.isPending}>{passwordMutation.isPending ? '保存中…' : '保存密码'}</Button>
    </form>
    {subscribe?.subscribe_url && <section className='space-y-3 border-t pt-6'><h2 className='font-medium'>订阅安全</h2><p className='text-sm text-muted-foreground'>重置后旧订阅链接失效，所有客户端需重新导入。</p><Button variant='outline' onClick={() => setConfirmReset(true)}>重置订阅链接</Button></section>}
    <Dialog open={confirmReset} onOpenChange={open => { if (!resetMutation.isPending) setConfirmReset(open) }}><DialogContent><DialogHeader><DialogTitle>重置订阅链接？</DialogTitle><DialogDescription>订阅地址与连接凭据将变更，旧订阅失效。请在重置后重新导入所有客户端。</DialogDescription></DialogHeader><div className='flex gap-3'><Button variant='destructive' disabled={resetMutation.isPending} onClick={() => resetMutation.mutate()}>{resetMutation.isPending ? '重置中…' : '确认重置'}</Button><Button variant='outline' disabled={resetMutation.isPending} onClick={() => setConfirmReset(false)}>取消</Button></div></DialogContent></Dialog>
  </div>
}

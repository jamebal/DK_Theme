import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { copyText } from '@/lib/clipboard'

export function validSubscriptionUrl(value?: string) {
  if (!value) return null
  try {
    const url = new URL(value, window.location.origin)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

export async function copySubscription(url: string) {
  try { await copyText(url); toast.success('订阅链接已复制') }
  catch { toast.error('复制失败，请手动复制订阅链接') }
}

export function SubscriptionLink({ url }: { url?: string }) {
  const validUrl = validSubscriptionUrl(url)
  if (!validUrl) return <p className='text-sm text-muted-foreground'>暂无可用订阅链接。</p>
  return <div className='flex flex-col gap-3 sm:flex-row'>
    <Input aria-label='订阅链接' readOnly value={validUrl} onFocus={event => event.target.select()} className='min-w-0 flex-1 font-mono text-xs' />
    <Button onClick={() => void copySubscription(validUrl)}>复制订阅</Button>
  </div>
}

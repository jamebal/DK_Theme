import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import type { NodeMonitor } from '@/lib/api/services/komari'
import { getPingHistory, pingBuckets, type PingBucket } from '@/lib/api/services/ping-history'
import { cn } from '@/lib/utils'

type Metric = 'latency' | 'loss'
function color(value: number | null, metric: Metric) {
  if (value === null) return 'var(--muted-foreground)'
  const thresholds = metric === 'latency' ? [60, 100, 160, 200] : [1, 3, 5, 10]
  return ['#34c76f', '#84cc16', '#eab308', '#f97316', '#ef4444'][thresholds.filter(limit => value > limit).length]
}
function time(value: number) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function History({ buckets, metric, name }: { buckets: PingBucket[]; metric: Metric; name: string }) {
  const [active, setActive] = useState<number | null>(null)
  const bucket = active === null ? null : buckets[active]
  const detail = bucket ? `${time(bucket.start)} - ${time(bucket.end)} · ${bucket.total === 0 ? '无样本' : metric === 'latency' ? bucket.latency === null ? '超时' : `${Math.round(bucket.latency)} ms` : `${Number(bucket.loss!.toFixed(1))}% · ${bucket.lost}/${bucket.total}`}` : null
  return <div className='relative mt-2' onMouseLeave={() => setActive(null)}>
    {detail && <span role='status' className='pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-950 px-2 py-1 text-[10px] font-semibold text-white shadow-lg'>{detail}</span>}
    <div role='group' tabIndex={0} aria-label={`${name}${metric === 'latency' ? '延迟' : '丢包'}历史，左右方向键查看`} className='flex h-4 items-center gap-[3px] rounded-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring'
      onFocus={() => setActive(buckets.length - 1)} onBlur={() => setActive(null)}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return
        event.preventDefault()
        setActive(event.key === 'Escape' ? null : event.key === 'Home' ? 0 : event.key === 'End' ? buckets.length - 1 : Math.max(0, Math.min(buckets.length - 1, (active ?? buckets.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1))))
      }}>
      {buckets.map((item, index) => <span key={index} onMouseEnter={() => setActive(index)} onClick={() => setActive(index)} className='h-2.5 min-w-0 flex-1 rounded-[2px] transition-opacity' style={{ backgroundColor: item.total && item[metric] === null ? '#ef4444' : color(item[metric], metric), opacity: item.total === 0 ? 0.15 : active !== null && active !== index ? 0.45 : 0.95 }} />)}
    </div>
  </div>
}
export function LineQuality({ monitor }: { monitor: NodeMonitor }) {
  const [open, setOpen] = useState(false)
  const history = useQuery({ queryKey: ['komari-ping-history', monitor.uuid], queryFn: ({ signal }) => getPingHistory(monitor.uuid, signal), enabled: open && monitor.online === true,
    staleTime: 60000, refetchInterval: open ? 60000 : false, refetchIntervalInBackground: false, retry: 1 })
  const end = history.data?.end ?? monitor.checkedAt ?? 0
  const rows = useMemo(() => monitor.pings.map(ping => ({ ...ping, buckets: pingBuckets(history.data?.records ?? [], ping.id, end) })), [monitor.pings, history.data, end])
  return <div className='mt-auto border-t bg-muted/15 px-5 py-3'>
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className='group'>
      <summary className='flex cursor-pointer list-none items-center justify-between text-xs font-medium [&::-webkit-details-marker]:hidden'>线路质量 <span className='flex items-center gap-2 text-[10px] font-normal text-muted-foreground'>{rows.length} 个探测点<ChevronDown className='size-3.5 transition-transform group-open:rotate-180' /></span></summary>
      {open && <div className='mt-4 space-y-3' role='group' aria-label='线路延迟与丢包率'>
        {rows.map(ping => <div key={ping.id} className='grid min-w-0 grid-cols-2 gap-4' title={`${ping.name} · 延迟 ${ping.latency === null ? '未知' : `${Math.round(ping.latency)}ms`} · 丢包 ${ping.loss === null ? '未知' : `${ping.loss.toFixed(1)}%`}`}>
          {(['latency', 'loss'] as const).map(metric => <div key={metric} className='min-w-0'>
            <div className={cn('flex min-h-5 items-baseline gap-1', metric === 'loss' && 'justify-end')}>
              {metric === 'latency' && <span className='min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground'>{ping.name}</span>}
              <strong className='shrink-0 text-sm font-semibold tabular-nums' style={{ color: color(ping[metric], metric) }}>{ping[metric] === null ? '—' : metric === 'latency' ? Math.round(ping[metric]) : ping[metric].toFixed(1)}<small className='ml-1 text-[10px] font-normal text-muted-foreground'>{metric === 'latency' ? 'ms' : '%'}</small></strong>
            </div>
            <History buckets={ping.buckets} metric={metric} name={ping.name} />
          </div>)}
        </div>)}
        <p className='text-[10px] leading-relaxed text-muted-foreground'>{history.isPending ? '正在加载线路历史…' : history.isError ? '历史数据加载失败，可收起后重试；当前数值仍实时更新。' : '最近 1 小时 · 灰色表示无样本 · 悬停查看详情'}</p>
      </div>}
      <p className='mt-3 text-[10px] leading-relaxed text-muted-foreground'>延迟为主机到探测点的测量值，不代表你的客户端连接延迟。</p>
    </details>
  </div>
}

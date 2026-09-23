import { memo, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowDown, ArrowUp, Globe2, Radio, RefreshCw, Search } from 'lucide-react'
import { getNodeStatuses } from '@/lib/api/services/node-status'
import { createKomariIndex, matchNodeUuid, monitorForUuid, type NodeMonitor } from '@/lib/api/services/komari'
import { LineQuality } from '@/features/nodes/line-quality'
import { useKomari } from '@/features/nodes/use-komari'
import type { NodeStatus } from '@/lib/api/types'
import { appConfig } from '@/lib/config'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'online' | 'offline' | 'unknown'
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部节点' }, { value: 'online', label: '在线' },
  { value: 'offline', label: '离线' }, { value: 'unknown', label: '未知' },
]
function speed(value: number | null | undefined) {
  if (value == null) return '—'
  if (value < 1024) return `${Math.round(value)} B/s`
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB/s`
  return `${(value / 1024 ** 2).toFixed(1)} MB/s`
}
function Meter({ label, value }: { label: string; value: number | null | undefined }) {
  return <div className='space-y-2'>
    <div className='flex justify-between text-xs'><span className='text-muted-foreground'>{label}</span><span className='font-medium tabular-nums'>{value == null ? '—' : `${value.toFixed(1)}%`}</span></div>
    <div role='meter' aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value == null ? undefined : Math.min(100, value)} aria-valuetext={value == null ? '暂无数据' : `${value.toFixed(1)}%`} className='h-1.5 overflow-hidden rounded-full bg-muted/70'>
      <div className={cn('h-full rounded-full transition-all duration-500 motion-reduce:transition-none', (value ?? 0) >= 90 ? 'bg-rose-500' : (value ?? 0) >= 70 ? 'bg-amber-500' : 'bg-teal-500')} style={{ width: `${Math.min(100, value ?? 0)}%` }} />
    </div>
  </div>
}
const NodeCard = memo(function NodeCard({ node, monitor }: { node: NodeStatus; monitor: NodeMonitor | null }) {
  const online = monitor ? monitor.online : node.online
  const pings = monitor?.pings ?? []
  const validPings = pings.filter(ping => ping.latency !== null && ping.loss !== 100)
  const latency = monitor ? (validPings.length ? Math.round(validPings.reduce((sum, ping) => sum + ping.latency!, 0) / validPings.length) : null) : node.latency
  const tags = [...new Set([...(node.tags ?? []), ...(monitor?.tags ?? [])])]
  return <li className='flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md'>
    <div className='flex items-start gap-3 p-5 pb-4'>
      <div className='flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/30 text-2xl'>{monitor?.region || <Globe2 className='size-5 text-muted-foreground' />}</div>
      <div className='min-w-0 flex-1'><h2 className='break-words text-sm font-semibold leading-6'>{node.name}</h2><p className='mt-0.5 text-xs text-muted-foreground'>{[node.location, node.protocol?.toUpperCase(), node.rate != null ? `${node.rate}× 流量倍率` : null].filter(Boolean).join(' · ') || '订阅节点'}</p></div>
      <span className={cn('mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium', online === true ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : online === false ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400' : 'bg-muted text-muted-foreground')}><span className={cn('size-1.5 rounded-full', online === true ? 'bg-emerald-500' : online === false ? 'bg-rose-500' : 'bg-muted-foreground')} />{online === true ? '在线' : online === false ? '离线' : '未知'}</span>
    </div>
    {tags.length > 0 && <div className='flex flex-wrap gap-1.5 px-5 pb-4'>{tags.map(tag => <span key={tag} className='rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground'>{tag}</span>)}</div>}
    <div className='mx-5 grid grid-cols-3 gap-3 rounded-xl bg-muted/30 p-3.5'>
      <div><p className='mb-2 flex items-center gap-1 text-[11px] text-muted-foreground'><Activity className='size-3' />{monitor ? '探测均延迟' : '延迟'}</p><p className='text-sm font-semibold tabular-nums'>{latency == null ? '—' : <>{latency}<span className='ml-1 text-[10px] font-normal text-muted-foreground'>ms</span></>}</p></div>
      <div><p className='mb-2 flex items-center gap-1 text-[11px] text-muted-foreground'><ArrowUp className='size-3 text-teal-500' />上行速率</p><p className='text-sm font-semibold tabular-nums'>{speed(monitor?.upload)}</p></div>
      <div><p className='mb-2 flex items-center gap-1 text-[11px] text-muted-foreground'><ArrowDown className='size-3 text-sky-500' />下行速率</p><p className='text-sm font-semibold tabular-nums'>{speed(monitor?.download)}</p></div>
    </div>
    <div className='grid grid-cols-3 gap-4 p-5'><Meter label='CPU' value={monitor?.cpu} /><Meter label='内存' value={monitor?.memory} /><Meter label='磁盘' value={monitor?.disk} /></div>
    {monitor && pings.length > 0 && <LineQuality monitor={monitor} />}
  </li>
}, (previous, next) => previous.node === next.node && JSON.stringify(previous.monitor && { ...previous.monitor, checkedAt: null, uptime: null }) === JSON.stringify(next.monitor && { ...next.monitor, checkedAt: null, uptime: null }))

export function NodeStatusPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let timer: number | undefined
    const start = () => {
      window.clearInterval(timer)
      if (document.visibilityState !== 'hidden') timer = window.setInterval(() => setNow(Date.now()), 15000)
    }
    const visibilityChanged = () => { start(); if (document.visibilityState !== 'hidden') setNow(Date.now()) }
    start()
    document.addEventListener('visibilitychange', visibilityChanged)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibilityChanged) }
  }, [])
  const query = useQuery({ queryKey: ['node-status'], queryFn: getNodeStatuses, refetchInterval: appConfig.nodeStatus.refreshIntervalMs })
  const monitoring = useKomari()
  const metadata = monitoring.data?.nodes
  const associations = useMemo(() => {
    const index = createKomariIndex(metadata ?? {})
    return (query.data ?? []).map(node => ({ node, uuid: matchNodeUuid(node.name, index) }))
  }, [query.data, metadata])
  const unavailable = monitoring.isError || (!appConfig.enableMock && monitoring.dataUpdatedAt > 0 && now - monitoring.dataUpdatedAt > 120000)
  const rows = useMemo(() => associations.map(({ node, uuid }) => {
    const monitor = uuid && monitoring.data ? monitorForUuid(uuid, monitoring.data, now) : null
    // Cached measurements must not continue to look live after a failed refresh.
    if (monitor && unavailable) Object.assign(monitor, { online: null, stale: true, cpu: null, memory: null, disk: null, upload: null, download: null, uptime: null, pings: [] })
    return { node, monitor, state: (monitor ? monitor.online : node.online) === true ? 'online' : (monitor ? monitor.online : node.online) === false ? 'offline' : 'unknown' }
  }), [associations, monitoring.data, now, unavailable])
  const counts = { all: rows.length, online: rows.filter(row => row.state === 'online').length, offline: rows.filter(row => row.state === 'offline').length, unknown: rows.filter(row => row.state === 'unknown').length }
  const visible = rows.filter(({ node, monitor, state }) => (filter === 'all' || state === filter) && [node.name, node.location, node.protocol, ...(node.tags ?? []), ...(monitor?.tags ?? [])].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const refreshing = query.isFetching || monitoring.isFetching
  return <div className='mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 lg:px-8'>
    <header className='flex flex-wrap items-center justify-between gap-4'>
      <div><div className='mb-2 flex items-center gap-2 text-[10px] font-medium tracking-[0.2em] text-muted-foreground'><Radio className='size-3.5 text-teal-500' />NETWORK STATUS</div><h1 className='text-2xl font-semibold tracking-tight'>节点状态</h1><p className='mt-2 text-sm text-muted-foreground'>连接每一处，状态一目了然。</p></div>
      <div className='flex items-center gap-3'><span className='hidden text-xs text-muted-foreground sm:block'>{appConfig.enableMock ? '演示模式' : monitoring.connection === 'connected' ? '实时连接 · 每 1 秒更新' : monitoring.connection === 'paused' ? '监控已暂停' : '连接中 · 低频同步'}</span><Button size='sm' variant='outline' className='rounded-lg' disabled={refreshing} onClick={() => { void query.refetch(); if (!appConfig.enableMock) void monitoring.refetch() }}><RefreshCw className={cn('size-3.5', refreshing && 'animate-spin motion-reduce:animate-none')} />刷新状态</Button></div>
    </header>
    {unavailable && <p role='alert' className='rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-700 dark:text-amber-400'>Komari 监控暂时无法连接，已保留订阅节点。请稍后刷新状态。</p>}
    {monitoring.pingTasksError && <p role='alert' className='text-xs text-muted-foreground'>线路配置暂时加载失败，当前显示已有探测结果。</p>}
    {query.isError && <p role='alert' className='rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive'>节点列表{query.data ? '刷新' : '加载'}失败，请重试。{query.data ? '当前显示上次获取的列表。' : ''}</p>}
    <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
      <div className='flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1' role='group' aria-label='按节点状态筛选'>{filters.map(item => <button key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={cn('shrink-0 rounded-lg px-3 py-2 text-xs transition-colors', filter === item.value ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{item.label}<span className='ml-1.5 text-[10px] tabular-nums opacity-60'>{counts[item.value]}</span></button>)}</div>
      <div className='relative sm:w-64'><Search className='pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground' /><Input className='h-10 rounded-xl bg-card pl-9' aria-label='搜索节点' placeholder='搜索节点、地区、协议…' value={search} onChange={event => setSearch(event.target.value)} /></div>
    </div>
    {query.isPending ? <div role='status' aria-label='正在加载节点' className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>{Array.from({ length: 6 }, (_, index) => <div key={index} className='h-64 animate-pulse rounded-2xl border bg-muted/30 motion-reduce:animate-none' />)}</div> : visible.length ? <ul className='grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3'>{visible.map(({ node, monitor }) => <NodeCard key={`${node.protocol ?? ''}-${node.id}`} node={node} monitor={monitor} />)}</ul> : !query.isError && <div className='rounded-2xl border border-dashed py-16 text-center'><Search className='mx-auto mb-4 size-7 text-muted-foreground' /><p className='text-sm font-medium'>{rows.length ? '没有找到匹配的节点' : '暂无可用节点'}</p><p className='mt-2 text-xs text-muted-foreground'>{rows.length ? '试试其他关键词，或切换状态筛选。' : '订阅节点加载后，将在这里展示连接状态。'}</p>{(search || filter !== 'all') && <Button className='mt-4' size='sm' variant='outline' onClick={() => { setSearch(''); setFilter('all') }}>清除筛选</Button>}</div>}
    <footer className='flex flex-wrap items-center justify-between gap-2 text-[10px] leading-5 text-muted-foreground'><span>在线状态反映主机运行情况，实际连接质量请以客户端为准。</span><span>{!appConfig.enableMock && monitoring.isPending ? '正在同步 Komari…' : monitoring.dataUpdatedAt ? `最近同步 ${new Date(monitoring.dataUpdatedAt).toLocaleTimeString('zh-CN', { hour12: false })}` : '节点状态总览'}</span></footer>
  </div>
}

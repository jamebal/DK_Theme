import { Suspense, lazy } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { SubscriptionLink } from '@/components/subscription-link'
import { useAuth } from '@/features/auth/auth-context'
import { getTrafficLogs } from '@/lib/api/services/traffic'
import { formatBytes, formatDateTime } from '@/lib/format'
import { Activity, CalendarClock, Layers3, Link2 } from 'lucide-react'

const ChartAreaInteractive = lazy(() => import('@/components/chart-area-interactive').then((module) => ({ default: module.ChartAreaInteractive })))
const TrafficWeeklySummary = lazy(() => import('@/components/traffic-weekly-summary').then((module) => ({ default: module.TrafficWeeklySummary })))

function DashboardChartsSkeleton() {
  return (
    <div className='grid min-w-0 gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
      <Card className='min-w-0 overflow-hidden border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.92))] shadow-sm dark:border-border/70 dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(15,23,42,0.92))]'>
        <CardContent className='space-y-4 p-6'>
          <div className='h-6 w-36 rounded-full bg-slate-200/80 dark:bg-white/10' />
          <div className='grid gap-3 sm:grid-cols-2 2xl:grid-cols-3'>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className='h-28 rounded-2xl border border-slate-200/80 bg-white/70 dark:border-border/70 dark:bg-background/35' />
            ))}
          </div>
          <div className='h-[320px] rounded-3xl border border-slate-200/70 bg-white/70 dark:border-border/60 dark:bg-background/25' />
        </CardContent>
      </Card>

      <Card className='min-w-0 overflow-hidden'>
        <CardContent className='space-y-4 p-6'>
          <div className='h-6 w-32 rounded-full bg-slate-200/80 dark:bg-white/10' />
          <div className='h-[240px] rounded-2xl border border-slate-200/70 bg-white/70 dark:border-border/60 dark:bg-background/25' />
          <div className='h-4 w-40 rounded-full bg-slate-200/70 dark:bg-white/8' />
        </CardContent>
      </Card>
    </div>
  )
}

function formatDashboardUpdatedAt(date: Date) {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function DashboardPage() {
  const { user, subscribe } = useAuth()
  const trafficLogsQuery = useQuery({ queryKey: ['traffic-logs'], queryFn: getTrafficLogs })
  const trafficLogs = trafficLogsQuery.data ?? []

  const planName = subscribe?.plan ?? user?.plan ?? '--'
  const expiredAt = subscribe?.expired_at !== undefined ? subscribe.expired_at : user?.expired_at
  const totalTraffic = subscribe?.transfer_enable ?? user?.transfer_enable ?? 0
  const usedTraffic = (subscribe?.d ?? user?.d ?? 0) + (subscribe?.u ?? user?.u ?? 0)
  const remainingTraffic = Math.max(totalTraffic - usedTraffic, 0)
  const usageRate = totalTraffic > 0 ? Math.min(100, Math.round((usedTraffic / totalTraffic) * 100)) : 0
  const usageTone = usageRate >= 85 ? '需关注' : usageRate >= 60 ? '持续使用中' : '状态健康'
  const dashboardUpdatedAtLabel = trafficLogsQuery.dataUpdatedAt ? formatDashboardUpdatedAt(new Date(trafficLogsQuery.dataUpdatedAt)) : '--'

  return (
    <>
      <section className='space-y-5 px-4 lg:px-6' aria-label='账户概览'>
        <header>
          <h1 className='text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground'>欢迎回来</h1>
          <p className='mt-1 break-all text-sm text-slate-500 dark:text-muted-foreground'>{user?.email ?? '用户'}</p>
        </header>

        <Card className='gap-0 overflow-hidden border-slate-200/80 py-0 shadow-sm dark:border-border/70'>
          <CardContent className='p-0'>
            <div className='grid md:grid-cols-2'>
              <div className='flex min-w-0 flex-col bg-primary/[0.03] p-5 sm:p-6 lg:p-7'>
                <h2 className='flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-muted-foreground'>
                  <Layers3 className='size-4 text-primary' aria-hidden='true' />
                  当前订阅
                </h2>
                <div className='mt-5 break-words text-2xl font-semibold leading-snug tracking-tight text-slate-900 dark:text-foreground'>{planName}</div>
                <div className='mt-2 text-sm text-slate-500 dark:text-muted-foreground'>每周期 {formatBytes(totalTraffic)} 流量</div>

                <div className='mt-auto pt-6'>
                  <div className='flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-4 text-xs dark:border-border/70'>
                    <span className='flex items-center gap-1.5 text-slate-500 dark:text-muted-foreground'>
                      <CalendarClock className='size-3.5' aria-hidden='true' /> 到期时间
                    </span>
                    <span className='font-medium tabular-nums text-slate-700 dark:text-foreground'>{expiredAt === null ? '长期有效' : formatDateTime(expiredAt)}</span>
                  </div>
                </div>
              </div>

              <div className='min-w-0 border-t border-slate-200/80 p-5 sm:p-6 md:border-l md:border-t-0 lg:p-7 dark:border-border/70'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <h2 className='flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-muted-foreground'>
                    <Activity className='size-4 text-primary' aria-hidden='true' />
                    本周期流量进度
                  </h2>
                  <span className={`text-xs font-medium ${usageRate >= 85 ? 'text-rose-600 dark:text-rose-300' : usageRate >= 60 ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                    {usageTone}
                  </span>
                </div>

                <div className='mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                  <div className='flex items-baseline gap-2'>
                    <span className='text-[40px] font-semibold leading-tight tracking-tight tabular-nums text-slate-900 dark:text-foreground'>{usageRate}<span className='ml-0.5 text-xl'>%</span></span>
                    <span className='text-xs text-slate-500 dark:text-muted-foreground'>已使用</span>
                  </div>
                  <span className='text-sm text-slate-500 dark:text-muted-foreground'>剩余 <span className='font-medium tabular-nums text-slate-900 dark:text-foreground'>{formatBytes(remainingTraffic)}</span></span>
                </div>

                <div className='mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10' role='progressbar' aria-label='本周期流量使用率' aria-valuenow={usageRate} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className={`h-full rounded-full transition-all ${usageRate >= 85 ? 'bg-rose-500' : usageRate >= 60 ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${usageRate}%` }}
                  />
                </div>
                <div className='mt-2 text-xs tabular-nums text-slate-500 dark:text-muted-foreground'>已用 {formatBytes(usedTraffic)} / {formatBytes(totalTraffic)}</div>

                <div className='mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-4 text-xs dark:border-border/70'>
                  <span className='flex items-center gap-1.5 text-slate-500 dark:text-muted-foreground'>
                    <CalendarClock className='size-3.5' aria-hidden='true' /> 流量重置时间
                  </span>
                  <span className='font-medium text-slate-700 dark:text-foreground'>
                    {subscribe?.reset_day === null ? '不自动重置' : subscribe?.reset_day === undefined ? '暂无信息' : subscribe.reset_day === 0 ? '今日重置' : `${subscribe.reset_day} 天后重置`}
                  </span>
                </div>
              </div>
            </div>

            <div className='grid items-center gap-3 border-t border-slate-200/80 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6 sm:px-6 lg:px-7 dark:border-border/70'>
              <div className='flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-muted-foreground'>
                <Link2 className='size-4' aria-hidden='true' /> 订阅链接
              </div>
              <SubscriptionLink url={subscribe?.subscribe_url} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className='space-y-4 px-4 pb-2 pt-6 lg:px-6 lg:pt-7'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div className='space-y-2'>
            <Badge variant='outline' className='rounded-full border-slate-200/80 bg-white/80 px-2.5 py-1 text-slate-600 dark:border-border/70 dark:bg-background/35 dark:text-muted-foreground'>
              流量记录
            </Badge>
            <div>
              <h2 className='text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground'>使用趋势与摘要</h2>
              <p className='mt-1 text-sm text-slate-500 dark:text-muted-foreground'>查看近期上传、下载趋势与最近一周用量。</p>
            </div>
          </div>
        </div>

        {trafficLogsQuery.isError ? (
          <Card className='border-rose-200/80 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10'>
            <CardContent className='p-4 text-sm text-rose-700 dark:text-rose-200'>
              流量记录加载失败，暂时无法展示最近一周摘要与趋势图。
            </CardContent>
          </Card>
        ) : null}

        {trafficLogsQuery.isPending ? <DashboardChartsSkeleton /> : !trafficLogsQuery.isError && trafficLogs.length > 0 ? <Suspense fallback={<DashboardChartsSkeleton />}>
          <div className='grid min-w-0 gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
            <ChartAreaInteractive trafficLogs={trafficLogs} updatedAtLabel={dashboardUpdatedAtLabel} />
            <TrafficWeeklySummary trafficLogs={trafficLogs} />
          </div>
        </Suspense> : !trafficLogsQuery.isError ? <p className='text-sm text-muted-foreground'>暂无流量记录。</p> : null}
      </section>
    </>
  )
}

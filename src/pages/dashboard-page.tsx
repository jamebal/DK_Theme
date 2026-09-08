import { Suspense, lazy } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { SubscriptionLink } from '@/components/subscription-link'
import { useAuth } from '@/features/auth/auth-context'
import { getTrafficLogs } from '@/lib/api/services/traffic'
import { formatBytes, formatDateTime } from '@/lib/format'
import { Activity, CalendarClock, Gauge, Layers3, Sparkles, TrendingUp, Zap } from 'lucide-react'

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
  const remainingRate = totalTraffic > 0 ? Math.max(0, 100 - usageRate) : 0
  const usageDelta = usageRate >= 85 ? '接近上限' : usageRate >= 60 ? '建议留意使用增速' : '当前余量充足'

  return (
    <>
      <div className='px-4 lg:px-6'>
        <Card className='overflow-hidden border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,252,0.92))] shadow-sm dark:border-border/70 dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.96),rgba(15,23,42,0.92))]'>
          <CardContent className='grid gap-6 p-5 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch lg:p-6'>
            <div className='flex h-full flex-col space-y-5'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='outline' className='rounded-full border-primary/15 bg-primary/8 px-2.5 py-1 text-primary'>
                  <Sparkles className='size-3.5' />
                  用户中心
                </Badge>
                <Badge variant='outline' className='rounded-full px-2.5 py-1 text-xs'>
                  {usageTone}
                </Badge>
              </div>

              <div className='space-y-2'>
                <CardTitle className='break-all text-[30px] font-semibold tracking-tight text-slate-900 dark:text-foreground'>
                  欢迎回来，{user?.email ?? '用户'}
                </CardTitle>
                <CardDescription className='max-w-xl text-sm leading-6 text-slate-500 dark:text-muted-foreground'>
                  查看当前套餐、到期时间与流量使用情况。
                </CardDescription>
              </div>

              <div className='grid flex-1 content-end gap-2.5 sm:grid-cols-2'>
                <div className='rounded-2xl border border-slate-200/80 bg-white/75 px-3.5 py-4 shadow-sm dark:border-border/70 dark:bg-background/35'>
                  <div className='flex min-h-[92px] flex-col'>
                    <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground'>
                      <Layers3 className='size-3.5' /> 当前套餐
                    </div>
                    <div className='mt-2.5 text-base font-semibold text-slate-900 dark:text-foreground'>{planName}</div>
                    <div className='mt-auto pt-2 text-xs text-slate-500 dark:text-muted-foreground'>当前订阅周期</div>
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-200/80 bg-white/75 px-3.5 py-4 shadow-sm dark:border-border/70 dark:bg-background/35'>
                  <div className='flex min-h-[92px] flex-col'>
                    <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground'>
                      <CalendarClock className='size-3.5' /> 到期时间
                    </div>
                    <div className='mt-2.5 text-base font-semibold text-slate-900 dark:text-foreground'>{expiredAt === null ? '长期有效' : formatDateTime(expiredAt)}</div>
                    <div className='mt-auto pt-2 text-xs text-slate-500 dark:text-muted-foreground'>{expiredAt ? `剩余 ${Math.max(0, Math.ceil((expiredAt * 1000 - Date.now()) / 86400000))} 天` : '订阅有效期'}</div>
                  </div>
                </div>
              </div>
              <div className='space-y-3 pt-1'>
                <div className='text-sm font-medium'>订阅链接</div>
                <SubscriptionLink url={subscribe?.subscribe_url} />
              </div>
            </div>

            <div className='flex h-full flex-col rounded-3xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] p-4 shadow-sm dark:border-border/70 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(15,23,42,0.42))] lg:p-5'>
              <div className='flex flex-col items-start gap-3 sm:flex-row sm:justify-between'>
                <div>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-foreground'>
                    <Activity className='size-4 text-primary' />
                    本周期流量进度
                  </div>
                  <div className='mt-1 text-xs text-slate-500 dark:text-muted-foreground'>用量概览、剩余额度与当前状态</div>
                </div>
                <Badge
                  variant='outline'
                  className={`rounded-full px-2.5 py-1 text-xs ${usageRate >= 85 ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300' : usageRate >= 60 ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300' : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'}`}
                >
                  {usageTone}
                </Badge>
              </div>

              <div className='mt-4 rounded-[28px] border border-slate-200/80 bg-white/80 p-4 dark:border-border/70 dark:bg-background/40'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground'>
                      <Gauge className='size-3.5 text-primary' /> 使用率
                    </div>
                    <div className='mt-2 flex items-end gap-2'>
                      <div className='text-[38px] font-semibold tracking-tight text-slate-900 dark:text-foreground'>{usageRate}%</div>
                      <div className='pb-1 text-xs text-slate-500 dark:text-muted-foreground'>已用配额</div>
                    </div>
                  </div>

                  <div className='rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-right dark:border-border/70 dark:bg-background/40'>
                    <div className='text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground'>剩余比例</div>
                    <div className='mt-1 text-lg font-semibold text-slate-900 dark:text-foreground'>{remainingRate}%</div>
                  </div>
                </div>

                <div className='mt-4 h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10'>
                  <div
                    className={`h-full rounded-full transition-all ${usageRate >= 85 ? 'bg-rose-500' : usageRate >= 60 ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${usageRate}%` }}
                  />
                </div>

                <div className='mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-muted-foreground'>
                  <span>已用 {formatBytes(usedTraffic)}</span>
                  <span>总量 {formatBytes(totalTraffic)}</span>
                </div>
              </div>

              <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                <div className='rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-border/70 dark:bg-background/35'>
                  <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground'>
                    <Zap className='size-3.5 text-primary' /> 已用流量
                  </div>
                  <div className='mt-2 text-xl font-semibold text-slate-900 dark:text-foreground'>{formatBytes(usedTraffic)}</div>
                  <div className='mt-1 text-xs text-slate-500 dark:text-muted-foreground'>{usageDelta}</div>
                </div>

                <div className='rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-border/70 dark:bg-background/35'>
                  <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground'>
                    <TrendingUp className='size-3.5 text-emerald-500' /> 剩余流量
                  </div>
                  <div className='mt-2 text-xl font-semibold text-slate-900 dark:text-foreground'>{formatBytes(remainingTraffic)}</div>
                  <div className='mt-1 text-xs text-slate-500 dark:text-muted-foreground'>仍可继续使用的配额</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  IconChevronDown,
  IconCopy,
  IconDeviceDesktop,
  IconDownload,
  IconExternalLink,
  IconLink,
  IconQrcode,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { AppDownloadAccount } from '@/components/app-download-account'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/auth-context'
import { validSubscriptionUrl } from '@/components/subscription-link'
import { copyText } from '@/lib/clipboard'
import { appConfig } from '@/lib/config'

type DeviceType = 'desktop' | 'mobile'
type DesktopPlatform = 'windows' | 'mac-intel' | 'mac-apple-silicon'
type MobilePlatform = 'ios' | 'android'
type PlatformFilter = DesktopPlatform | MobilePlatform

type ClientDownloadOption = {
  label: string
  href: string
}

type ClientItem = {
  name: string
  platform: string
  icon?: typeof IconDeviceDesktop
  image?: string
  summary: string
  primary: string
  link: string
  downloads?: ClientDownloadOption[]
  badges?: string[]
  platformBadges?: Partial<Record<PlatformFilter, string[]>>
  supportsScheme?: boolean
  schemeLabel?: string
  schemeBuilder?: (url: string) => string
  importHint: string
  compatibilityNote?: string
  deviceTypes: DeviceType[]
  platforms: PlatformFilter[]
}

const desktopPlatformLabels: Record<DesktopPlatform, string> = {
  windows: 'Windows',
  'mac-intel': 'Mac (Intel)',
  'mac-apple-silicon': 'Mac (Apple Silicon)',
}

const mobilePlatformLabels: Record<MobilePlatform, string> = {
  ios: 'iOS',
  android: 'Android',
}

const v2rayNDownloads: ClientDownloadOption[] = [
  {
    label: 'Windows',
    href: appConfig.downloads.v2rayN.windows,
  },
  {
    label: 'Mac Intel 芯片',
    href: appConfig.downloads.v2rayN.macIntel,
  },
  {
    label: 'Mac M 芯片',
    href: appConfig.downloads.v2rayN.macAppleSilicon,
  },
]

const clashVergeRevDownloads: ClientDownloadOption[] = [
  {
    label: 'Windows',
    href: appConfig.downloads.clashVergeRev.windows,
  },
  {
    label: 'Mac Intel 芯片',
    href: appConfig.downloads.clashVergeRev.macIntel,
  },
  {
    label: 'Mac M 芯片',
    href: appConfig.downloads.clashVergeRev.macAppleSilicon,
  },
]

const badgeClassMap: Record<string, string> = {
  推荐: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  免费: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300',
  iOS: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
  'Mac (Apple Silicon)': 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
  Android: 'border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-300',
}

const clients: ClientItem[] = [
  {
    name: 'v2rayN',
    platform: 'Windows / macOS',
    image: 'https://pub-56954302827c4850ac0f10fdb853206b.r2.dev/original/landscape/20260410-a5535cd1.avif',
    summary: '支持 Windows 与 macOS，适合希望按设备架构分别下载的用户。',
    primary: '下载最新版本',
    link: 'https://github.com/2dust/v2rayN/releases/latest',
    downloads: v2rayNDownloads,
    badges: ['推荐'],
    platformBadges: { 'mac-apple-silicon': ['推荐', '免费'] },
    importHint: '下载链接始终前往 GitHub 最新发布页，请选择对应系统和芯片架构的安装包。',
    deviceTypes: ['desktop'],
    platforms: ['windows', 'mac-intel', 'mac-apple-silicon'],
  },
  {
    name: 'clash-verge-rev',
    platform: 'Windows / macOS',
    image: 'https://cloud.jmal.top/api/direct-file/gBsVKf2WFC3S92KW/clash-verge-rev.png',
    summary: '适合作为主力桌面客户端，支持配置切换与规则分流。',
    primary: '下载最新版本',
    link: 'https://github.com/clash-verge-rev/clash-verge-rev/releases/latest',
    downloads: clashVergeRevDownloads,
    platformBadges: { 'mac-apple-silicon': ['推荐', '免费'] },
    supportsScheme: true,
    schemeLabel: '快速导入配置',
    schemeBuilder: (url) => `clash://install-config?url=${encodeURIComponent(url)}&name=${encodeURIComponent(`${appConfig.appName}订阅`)}`,
    importHint: '支持一键导入 clash-verge-rev；下载链接前往 GitHub 最新发布页，请选择对应系统和芯片架构的安装包。',
    deviceTypes: ['desktop'],
    platforms: ['windows', 'mac-intel', 'mac-apple-silicon'],
  },
  {
    name: 'Shadowrocket',
    platform: 'iOS',
    image: 'https://pub-56954302827c4850ac0f10fdb853206b.r2.dev/original/landscape/20260410-21f67e37.webp',
    summary: '适合 iPhone 与 iPad 使用，支持订阅导入和分流规则。',
    primary: '前往下载',
    link: 'https://apps.apple.com/us/app/shadowrocket/id932747118',
    badges: ['推荐', 'iOS', 'Mac (Apple Silicon)'],
    platformBadges: { 'mac-apple-silicon': ['iOS', 'Mac (Apple Silicon)'] },
    supportsScheme: true,
    schemeBuilder: (url) => `shadowrocket://add/sub://${btoa(Array.from(new TextEncoder().encode(url), byte => String.fromCharCode(byte)).join(''))}`,
    importHint: '支持 Shadowrocket 一键导入，也可以通过二维码扫码添加。',
    compatibilityNote: 'Apple Silicon Mac 可直接运行对应 iOS 客户端。',
    deviceTypes: ['desktop', 'mobile'],
    platforms: ['ios', 'mac-apple-silicon'],
  },
  {
    name: 'Stash',
    platform: 'iOS',
    image: 'https://pub-56954302827c4850ac0f10fdb853206b.r2.dev/original/landscape/20260410-6a72b2b5.webp',
    summary: '适合偏好规则组与策略分流的 iPhone / iPad 用户，界面现代，配置能力强。',
    primary: '前往下载',
    link: 'https://apps.apple.com/us/app/stash-rule-based-proxy/id1596063349',
    badges: ['iOS', 'Mac (Apple Silicon)'],
    supportsScheme: true,
    schemeBuilder: (url) => `stash://install-config?url=${encodeURIComponent(url)}`,
    importHint: '支持 Stash 一键导入，也可以复制订阅后手动导入。',
    compatibilityNote: 'Apple Silicon Mac 可直接运行对应 iOS 客户端。',
    deviceTypes: ['desktop', 'mobile'],
    platforms: ['ios', 'mac-apple-silicon'],
  },
  {
    name: 'Quantumult X',
    platform: 'iOS',
    image: 'https://pub-56954302827c4850ac0f10fdb853206b.r2.dev/original/landscape/20260410-26167905.webp',
    summary: '适合需要策略分流、自定义规则和脚本能力的 iOS 用户。',
    primary: '前往下载',
    link: 'https://apps.apple.com/us/app/quantumult-x/id1443988620',
    badges: ['iOS', 'Mac (Apple Silicon)'],
    supportsScheme: true,
    schemeBuilder: (url) => `quantumult-x:///update-resource?remote-resource=${encodeURIComponent(url)}`,
    importHint: '支持 Quantumult X 一键导入，失败时可复制订阅后手动添加资源。',
    compatibilityNote: 'Apple Silicon Mac 可直接运行对应 iOS 客户端。',
    deviceTypes: ['desktop', 'mobile'],
    platforms: ['ios', 'mac-apple-silicon'],
  },
  {
    name: 'Surge',
    platform: 'iOS / macOS',
    image: 'https://pub-56954302827c4850ac0f10fdb853206b.r2.dev/original/landscape/20260410-88fbe0bc.webp',
    summary: '适合需要高级分流、脚本与策略控制的 Apple 用户。',
    primary: '前往下载',
    link: 'https://apps.apple.com/us/app/surge-5/id1442620678',
    badges: ['推荐', 'iOS', 'Mac (Apple Silicon)'],
    supportsScheme: true,
    schemeBuilder: (url) => `surge:///install-config?url=${encodeURIComponent(url)}`,
    importHint: '支持 Surge 一键导入，失败时可复制订阅后手动新建远程配置。',
    compatibilityNote: '仅在 Apple Silicon Mac 下归入桌面端筛选结果。',
    deviceTypes: ['desktop', 'mobile'],
    platforms: ['ios', 'mac-apple-silicon'],
  },
  {
    name: 'sing-box',
    platform: 'iOS',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/fb/bd/32/fbbd322d-ab4b-7acf-14fc-fbc5ac2ce966/Placeholder.mill/400x400bb-75.webp',
    summary: '基于 sing-box 的 iOS 客户端，适合使用 sing-box 配置的用户。',
    primary: '前往下载',
    link: 'https://apps.apple.com/us/app/sing-box-mt/id6785326793',
    badges: ['免费', 'iOS'],
    importHint: '复制订阅链接后，在客户端内添加远程配置，请使用 sing-box 格式的订阅。需要转换格式时，可使用上方的塔台工具。',
    deviceTypes: ['mobile'],
    platforms: ['ios'],
  },
  {
    name: 'Egern',
    platform: 'iOS',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/09/98/bc/0998bc1a-a8e5-0748-e866-9be64950bfc4/Placeholder.mill/400x400bb-75.webp',
    summary: '适合需要规则分流与网络配置管理的 iOS 用户。',
    primary: '前往下载',
    link: 'https://apps.apple.com/us/app/egern/id1616105820',
    badges: ['免费', 'iOS'],
    importHint: '复制订阅链接后，在客户端内手动添加，请使用 Egern 支持的订阅格式。需要转换格式时，可使用上方的塔台工具。',
    deviceTypes: ['mobile'],
    platforms: ['ios'],
  },
  {
    name: 'clash-mi',
    platform: 'iOS',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/17/62/0c/17620c85-db19-86f6-7c8a-9bb483413bcf/Placeholder.mill/400x400bb-75.webp',
    summary: '适合偏好 Clash 配置与规则分流的 iOS 用户。',
    primary: '前往下载',
    link: 'https://apps.apple.com/us/app/clash-mi/id6744321968',
    badges: ['免费', 'iOS'],
    importHint: '复制订阅链接后，在客户端内添加远程配置，请使用 Clash 格式的订阅。需要转换格式时，可使用上方的塔台工具。',
    deviceTypes: ['mobile'],
    platforms: ['ios'],
  },
  {
    name: 'NekoBox',
    platform: 'Android',
    image: 'https://pub-56954302827c4850ac0f10fdb853206b.r2.dev/landscape/webp/20260410-d92866f9.webp',
    summary: '适合 Android 设备，支持订阅导入与常见代理协议。',
    primary: '前往下载',
    link: 'https://github.com/MatsuriDayo/NekoBoxForAndroid/releases',
    badges: ['Android'],
    importHint: 'Android 端推荐复制订阅或使用二维码扫码导入。',
    deviceTypes: ['mobile'],
    platforms: ['android'],
  },
]

const iosClientOrder = ['Shadowrocket', 'Surge', 'sing-box', 'Egern', 'clash-mi', 'Quantumult X', 'Stash']
const macAppleSiliconClientOrder = ['Surge', 'clash-verge-rev', 'v2rayN', 'Shadowrocket', 'Quantumult X', 'Stash']

export function ClientsPage() {
  const { subscribe } = useAuth()
  const subscribeUrl = validSubscriptionUrl(subscribe?.subscribe_url)
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [activeClient, setActiveClient] = useState<string | null>(null)
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('ios')

  const platformOptions = useMemo(() => {
    if (deviceType === 'desktop') {
      return [
        { value: 'windows' as const, label: desktopPlatformLabels.windows },
        { value: 'mac-intel' as const, label: desktopPlatformLabels['mac-intel'] },
        { value: 'mac-apple-silicon' as const, label: desktopPlatformLabels['mac-apple-silicon'] },
      ]
    }

    return [
      { value: 'ios' as const, label: mobilePlatformLabels.ios },
      { value: 'android' as const, label: mobilePlatformLabels.android },
    ]
  }, [deviceType])

  const filteredClients = useMemo(
    () => {
      const filtered = clients.filter((client) => client.deviceTypes.includes(deviceType) && client.platforms.includes(platformFilter))
      const order = platformFilter === 'ios' ? iosClientOrder
        : platformFilter === 'mac-apple-silicon' ? macAppleSiliconClientOrder
        : null
      if (order) {
        const rank = (name: string) => {
          const index = order.indexOf(name)
          return index === -1 ? order.length : index
        }
        filtered.sort((a, b) => rank(a.name) - rank(b.name))
      }
      return filtered
    },
    [deviceType, platformFilter],
  )

  const currentFilterDescription = useMemo(() => {
    if (deviceType === 'desktop' && platformFilter === 'mac-apple-silicon') {
      return '显示 Apple Silicon 可用客户端。'
    }

    if (deviceType === 'desktop') {
      return `${desktopPlatformLabels[platformFilter as DesktopPlatform]} 客户端`
    }

    return `${mobilePlatformLabels[platformFilter as MobilePlatform]} 客户端`
  }, [deviceType, platformFilter])


  useEffect(() => {
    if (!qrOpen || !subscribeUrl) return
    let mounted = true
    setQrLoading(true)
    const isDark = document.documentElement.classList.contains('dark')
    QRCode.toDataURL(subscribeUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: isDark ? '#eef2ff' : '#111827',
        light: isDark ? '#0f172a' : '#ffffff',
      },
    })
      .then((url: string) => {
        if (!mounted) return
        setQrDataUrl(url)
      })
      .catch(() => {
        toast.error('订阅二维码生成失败，请稍后再试')
      })
      .finally(() => {
        if (mounted) setQrLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [qrOpen, subscribeUrl])

  async function copySubscribe() {
    if (!subscribeUrl) return
    try {
      await copyText(subscribeUrl)
      setCopied(true)
      toast.success('订阅链接已复制到剪贴板')
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('复制失败，请手动复制订阅链接')
      setCopied(false)
    }
  }

  function openQr(clientName?: string) {
    setActiveClient(clientName ?? null)
    setQrOpen(true)
  }

  function handleSchemeImport(client: ClientItem) {
    if (!client.schemeBuilder || !subscribeUrl) return
    const url = client.schemeBuilder(subscribeUrl)
    window.location.href = url
    toast.success(`已尝试唤起 ${client.name} 导入`)
  }

  if (!subscribeUrl) {
    return <div className='space-y-6'>
      <PageHeader badge='订阅中心' title='订阅中心' />
      <div className='px-4 lg:px-6'><Card><CardContent className='p-6 text-sm text-muted-foreground'>暂无可用订阅链接。</CardContent></Card></div>
    </div>
  }

  return (
    <>
      <div className='space-y-6'>
        <PageHeader
          badge='订阅中心'
          title='订阅中心'
          actions={
            <>
              <Button variant='outline' className='rounded-full bg-white/90 dark:bg-transparent' onClick={copySubscribe}>
                <IconCopy className='size-4' />
                {copied ? '已复制订阅' : '复制订阅'}
              </Button>
              <Button className='rounded-full' onClick={() => openQr()}>
                <IconQrcode className='size-4' />
                订阅二维码
              </Button>
            </>
          }
        />

        <div className='grid gap-6 px-4 lg:px-6'>
          <Card className='border-slate-200/90 bg-white/96 shadow-lg shadow-slate-200/60 dark:border-border/70 dark:bg-card dark:shadow-none'>
            <CardHeader>
              <CardTitle>订阅工具</CardTitle>
              <CardDescription>需要转换订阅格式时，可使用以下工具。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-5 rounded-2xl border border-slate-200/90 bg-slate-50/85 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between dark:border-border/70 dark:bg-background/35 dark:shadow-none'>
                <div className='min-w-0 space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h3 className='text-lg font-semibold text-slate-900 dark:text-foreground'>塔台</h3>
                    <Badge variant='outline' className='rounded-full border-primary/15 bg-primary/8 text-primary dark:bg-primary/12'>订阅转换</Badge>
                    <Badge variant='outline' className={`rounded-full ${badgeClassMap.iOS}`}>iOS</Badge>
                  </div>
                  <p className='text-sm text-slate-600 dark:text-muted-foreground'>将订阅转换为目标客户端支持的格式，再导入客户端使用。</p>
                  <p className='text-sm text-slate-500 dark:text-muted-foreground'>复制订阅链接，在塔台中选择目标格式完成转换，再将结果导入客户端。</p>
                  <AppDownloadAccount appName='塔台' />
                </div>
                <div className='flex shrink-0 flex-wrap gap-3'>
                  <Button className='min-h-10 w-full sm:w-auto' asChild>
                    <a href='https://apps.apple.com/us/app/%E5%A1%94%E5%8F%B0/id6797458927' target='_blank' rel='noreferrer'>
                      <IconDownload className='size-4' />
                      下载塔台
                    </a>
                  </Button>
                  <Button variant='outline' className='min-h-10 w-full bg-white/90 sm:w-auto dark:bg-transparent' onClick={copySubscribe}>
                    <IconCopy className='size-4' />
                    {copied ? '已复制订阅链接' : '复制订阅链接'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='border-slate-200/90 bg-white/96 shadow-lg shadow-slate-200/60 dark:border-border/70 dark:bg-card dark:shadow-none'>
            <CardHeader>
              <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                <div className='space-y-2'>
                  <div>
                    <CardTitle>客户端列表</CardTitle>
                    <CardDescription>{currentFilterDescription}</CardDescription>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Badge variant='outline' className='rounded-full border-slate-200/80 bg-white/80 dark:border-border/70 dark:bg-background/35'>{deviceType === 'desktop' ? '桌面端' : '移动端'}</Badge>
                    <Badge variant='outline' className='rounded-full border-slate-200/80 bg-white/80 dark:border-border/70 dark:bg-background/35'>
                      {deviceType === 'desktop'
                        ? desktopPlatformLabels[platformFilter as DesktopPlatform]
                        : mobilePlatformLabels[platformFilter as MobilePlatform]}
                    </Badge>
                    <Badge variant='outline' className='rounded-full border-primary/15 bg-primary/8 text-primary dark:bg-primary/12'>{filteredClients.length} 个客户端</Badge>
                  </div>
                </div>
                <div className='flex flex-col gap-3 md:flex-row xl:justify-end'>
                  <div className='grid min-w-0 gap-2 md:w-[160px]'>
                    <div className='text-sm font-medium text-slate-700 dark:text-foreground'>设备类型</div>
                    <Select value={deviceType} onValueChange={(value: DeviceType) => { setDeviceType(value); setPlatformFilter(value === 'mobile' ? 'ios' : 'windows') }}>
                      <SelectTrigger className='w-full rounded-2xl border-slate-200/80 bg-white/90 shadow-sm dark:border-border/70 dark:bg-background/35'>
                        <SelectValue placeholder='选择设备类型' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='desktop'>桌面端</SelectItem>
                        <SelectItem value='mobile'>移动端</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='grid min-w-0 gap-2 md:w-[200px]'>
                    <div className='text-sm font-medium text-slate-700 dark:text-foreground'>系统平台</div>
                    <Select value={platformFilter} onValueChange={(value: PlatformFilter) => setPlatformFilter(value)}>
                      <SelectTrigger className='w-full rounded-2xl border-slate-200/80 bg-white/90 shadow-sm dark:border-border/70 dark:bg-background/35'>
                        <SelectValue placeholder='选择系统平台' />
                      </SelectTrigger>
                      <SelectContent>
                        {platformOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className='grid gap-4 xl:grid-cols-2'>
              {filteredClients.length ? (
                filteredClients.map((client) => {
                  const Icon = client.icon ?? IconDeviceDesktop
                  return (
                    <div
                      key={client.name}
                      className='flex h-full flex-col rounded-2xl border border-slate-200/90 bg-slate-50/85 p-5 shadow-sm dark:border-border/70 dark:bg-background/35 dark:shadow-none'
                    >
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex items-start gap-4'>
                          <div className='flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-slate-700 shadow-sm dark:border-border/70 dark:bg-primary/12 dark:text-primary dark:shadow-none'>
                            {client.image ? (
                              <img
                                src={client.image}
                                alt={`${client.name} 图标`}
                                className={`h-full w-full ${client.name === 'clash-verge-rev' ? 'object-cover scale-110' : 'object-cover'}`}
                                loading='lazy'
                              />
                            ) : (
                              <Icon className='size-6' />
                            )}
                          </div>
                          <div>
                            <div className='flex flex-wrap items-center gap-2'>
                              <h3 className='text-lg font-semibold text-slate-900 dark:text-foreground'>{client.name}</h3>
                              {(client.platformBadges?.[platformFilter] ?? client.badges)?.map((badge) => (
                                <Badge
                                  key={badge}
                                  variant='outline'
                                  className={`rounded-full ${badgeClassMap[badge] ?? 'border-slate-200/80 bg-white/80 dark:border-border/70 dark:bg-background/35'}`}
                                >
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                            <p className='mt-1 text-sm text-slate-500 dark:text-muted-foreground'>{client.platform}</p>
                          </div>
                        </div>
                      </div>
                      <p className='mt-4 text-sm text-slate-600 dark:text-muted-foreground'>{client.summary}</p>
                      <div className='mt-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-border/70 dark:bg-background/40 dark:text-muted-foreground'>
                        {client.importHint}
                      </div>
                      {client.compatibilityNote ? (
                        <div className='mt-3 rounded-2xl border border-violet-200/80 bg-violet-50/80 px-4 py-3 text-sm text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300'>
                          {client.compatibilityNote}
                        </div>
                      ) : null}
                      <div className='mt-auto pt-5'>
                        <AppDownloadAccount appName={client.name} />
                        <div className='mt-3 flex flex-wrap gap-3'>
                          {client.downloads?.length ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button className='min-h-10 w-full justify-center sm:w-auto sm:min-w-[148px]'>
                                  <IconDownload className='size-4' />
                                  {client.primary}
                                  <IconChevronDown className='size-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='start' className='w-52'>
                                {client.downloads.map((download) => (
                                  <DropdownMenuItem key={download.label} asChild>
                                    <a href={download.href} target='_blank' rel='noreferrer'>
                                      {download.label}
                                    </a>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button className='min-h-10 w-full justify-center sm:w-auto sm:min-w-[148px]' asChild>
                              <a href={client.link} target='_blank' rel='noreferrer'>
                                <IconDownload className='size-4' />
                                {client.primary}
                              </a>
                            </Button>
                          )}
                          {client.supportsScheme ? (
                            <Button variant='outline' className='min-h-10 w-full justify-center bg-white/90 sm:w-auto sm:min-w-[124px] dark:bg-transparent' onClick={() => handleSchemeImport(client)}>
                              <IconExternalLink className='size-4' />
                              {client.schemeLabel ?? '一键导入'}
                            </Button>
                          ) : null}
                          <Button variant='outline' className='min-h-10 w-full justify-center bg-white/90 sm:w-auto sm:min-w-[124px] dark:bg-transparent' onClick={copySubscribe}>
                            <IconLink className='size-4' />
                            复制订阅
                          </Button>
                          <Button variant='outline' className='min-h-10 w-full justify-center bg-white/90 sm:w-auto sm:min-w-[124px] dark:bg-transparent' onClick={() => openQr(client.name)}>
                            <IconQrcode className='size-4' />
                            扫码导入
                          </Button>

                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className='xl:col-span-2 rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/90 p-8 text-center text-sm text-slate-500 dark:border-border/70 dark:bg-background/35 dark:text-muted-foreground'>
                  当前没有可用客户端。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className='border-slate-200/90 bg-white/96 shadow-2xl shadow-slate-200/70 dark:border-border dark:bg-card dark:shadow-black/30'>
          <DialogHeader>
            <DialogTitle>{activeClient ? `${activeClient} 订阅二维码` : '订阅二维码'}</DialogTitle>
            <DialogDescription>
              使用客户端内的扫码导入功能扫描二维码即可添加订阅。若扫码失败，也可以直接复制订阅链接。
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='mx-auto flex min-h-80 items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-4 shadow-inner dark:border-border/70 dark:bg-slate-950 dark:shadow-none'>
              {qrLoading ? (
                <div className='text-sm text-slate-500 dark:text-muted-foreground'>二维码生成中…</div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt='订阅二维码'
                  className='h-72 w-72 rounded-xl border border-slate-200/70 bg-white p-2 dark:border-border dark:bg-slate-950'
                />
              ) : (
                <div className='text-sm text-slate-500 dark:text-muted-foreground'>暂时无法生成二维码</div>
              )}
            </div>
            <div className='rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-border/70 dark:bg-background/35'>
              <div className='text-sm text-slate-500 dark:text-muted-foreground'>当前订阅链接</div>
              <code className='mt-2 block break-all text-xs text-slate-800 dark:text-primary'>{subscribeUrl}</code>
            </div>
            <div className='flex flex-wrap gap-3'>
              <Button onClick={copySubscribe}>
                <IconCopy className='size-4' />
                复制订阅链接
              </Button>
              <Button variant='outline' className='bg-white/90 dark:bg-transparent' onClick={() => setQrOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

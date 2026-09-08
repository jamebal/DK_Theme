import { appConfig } from '@/lib/config'
import type { NodeStatus } from '@/lib/api/types'

type RecordValue = Record<string, unknown>
export type KomariData = { nodes: RecordValue; statuses: RecordValue }
export type NodeMonitor = {
  uuid: string
  region: string | null
  tags: string[]
  online: boolean | null
  stale: boolean
  checkedAt: number | null
  cpu: number | null
  memory: number | null
  disk: number | null
  upload: number | null
  download: number | null
  uptime: number | null
  pings: { id: string; name: string; latency: number | null; loss: number | null }[]
}

function record(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
}
function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
function percent(used: unknown, total: unknown) {
  const numerator = number(used)
  const denominator = number(total)
  return numerator !== null && denominator !== null && denominator > 0 ? Math.min(100, numerator / denominator * 100) : null
}
export async function komariRpc(method: string, signal?: AbortSignal) {
  // Keep subscription credentials out of the public monitoring service.
  const response = await fetch(appConfig.nodeStatus.komariApiUrl, {
    method: 'POST', credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params: {} }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`Komari HTTP ${response.status}`)
  const body = await response.json()
  if (body.error || !body.result || typeof body.result !== 'object' || Array.isArray(body.result)) {
    throw new Error('Komari 返回了无效的状态数据')
  }
  return body.result as RecordValue
}
export async function getKomariData(signal?: AbortSignal): Promise<KomariData> {
  const [nodes, statuses] = await Promise.all([
    komariRpc('common:getNodes', signal), komariRpc('common:getNodesLatestStatus', signal),
  ])
  return { nodes, statuses }
}

export function matchNodeMonitor(node: NodeStatus, data: KomariData | undefined, now = Date.now()): NodeMonitor | null {
  if (!data) return null
  const uuid = matchNodeUuid(node.name, createKomariIndex(data.nodes))
  return uuid ? monitorForUuid(uuid, data, now) : null
}

export function createKomariIndex(nodes: KomariData['nodes']) {
  return Object.entries(nodes).map(([uuid, value]) => ({ uuid, value: record(value) }))
    .filter(({ value }) => value.hidden !== true && text(value.public_remark))
    .map(({ uuid, value }) => ({ uuid, remark: text(value.public_remark)! }))
    .sort((a, b) => b.remark.length - a.remark.length)
}

export function matchNodeUuid(name: string, index: ReturnType<typeof createKomariIndex>) {
  const matches = index.filter(item => name.includes(item.remark))
  if (!matches[0] || (matches[1] && matches[0].remark.length === matches[1].remark.length)) return null
  return matches[0].uuid
}

export function monitorForUuid(uuid: string, data: KomariData, now = Date.now()): NodeMonitor {
  const match = { uuid, value: record(data.nodes[uuid]) }
  const status = record(data.statuses[match.uuid])
  const timestamp = typeof status.time === 'string' ? Date.parse(status.time) : NaN
  const checkedAt = Number.isFinite(timestamp) ? timestamp : null
  const stale = status.online !== false && (checkedAt === null || now - checkedAt > 120000 || checkedAt - now > 60000)
  const live = !stale && status.online === true
  return {
    uuid: match.uuid, region: text(match.value.region),
    tags: (text(match.value.tags) ?? '').split(';').map(tag => tag.trim()).filter(Boolean),
    online: stale ? null : typeof status.online === 'boolean' ? status.online : null,
    stale, checkedAt,
    cpu: live ? number(status.cpu) : null,
    memory: live ? percent(status.ram, status.ram_total ?? match.value.mem_total) : null,
    disk: live ? percent(status.disk, status.disk_total ?? match.value.disk_total) : null,
    upload: live ? number(status.net_out) : null, download: live ? number(status.net_in) : null,
    uptime: live ? number(status.uptime) : null,
    pings: live ? Object.entries(record(status.ping)).map(([id, value]) => {
      const ping = record(value)
      return { id, name: text(ping.name) ?? `线路 ${id}`, latency: number(ping.latest), loss: number(ping.loss) }
    }) : [],
  }
}

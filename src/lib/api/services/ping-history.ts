import { komariRpc } from './komari'

export type PingSample = { task_id: number; time: string; value: number; client: string }
export type PingBucket = { start: number; end: number; latency: number | null; loss: number | null; lost: number; total: number }

export async function getPingHistory(uuid: string, signal?: AbortSignal) {
  const result = await komariRpc('common:getRecords', signal, { uuid, type: 'ping', hours: 1, maxCount: 10000 })
  if (!Array.isArray(result.records)) throw new Error('线路历史数据格式无效')
  return { end: Date.now(), records: result.records.filter((sample): sample is PingSample =>
    sample !== null && typeof sample === 'object' && sample.client === uuid &&
    Number.isFinite(sample.task_id) && typeof sample.time === 'string' && Number.isFinite(Date.parse(sample.time)) &&
    typeof sample.value === 'number' && Number.isFinite(sample.value)) }
}

// Empty time windows remain unknown; failed probes count as loss, never zero latency.
export function pingBuckets(records: PingSample[], taskId: string, end: number, count = 18): PingBucket[] {
  const start = end - 3600000
  const width = 3600000 / count
  const buckets = Array.from({ length: count }, (_, index) => ({ start: start + index * width, end: start + (index + 1) * width, latency: null, loss: null, lost: 0, total: 0 } as PingBucket))
  const sums = Array<number>(count).fill(0)
  for (const sample of records) {
    if (String(sample.task_id) !== taskId) continue
    const time = Date.parse(sample.time)
    if (!Number.isFinite(time) || time < start || time > end || !Number.isFinite(sample.value)) continue
    const index = Math.min(count - 1, Math.floor((time - start) / width))
    const bucket = buckets[index]
    bucket.total++
    if (sample.value < 0) bucket.lost++
    else sums[index] += sample.value
  }
  return buckets.map((bucket, index) => ({ ...bucket,
    latency: bucket.total > bucket.lost ? sums[index] / (bucket.total - bucket.lost) : null,
    loss: bucket.total ? bucket.lost / bucket.total * 100 : null,
  }))
}

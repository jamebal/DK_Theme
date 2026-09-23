import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
const source = (await readFile(new URL('../src/lib/api/services/ping-history.ts', import.meta.url), 'utf8')).replace("import { komariRpc } from './komari'", 'const komariRpc = (...args) => globalThis.mockHistoryRpc(...args)')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } })
const { pingBuckets, getPingHistory } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const end = Date.parse('2026-09-09T08:00:00Z')
const sample = (value, offset = 0, task_id = 1) => ({ task_id, client: 'a', value, time: new Date(end - 3600000 + offset).toISOString() })
test('time buckets preserve zero latency, exclude failures from latency, and compute actual loss', () => {
  const buckets = pingBuckets([sample(0), sample(40, 60000), sample(-1, 120000), sample(999, 0, 2), sample(999, -1), sample(999, 3600001)], '1', end)
  assert.equal(buckets.length, 18)
  assert.equal(buckets[0].latency, 20)
  assert.equal(buckets[0].total, 3)
  assert.equal(buckets[0].lost, 1)
  assert.ok(Math.abs(buckets[0].loss - 100 / 3) < 1e-10)
  assert.equal(buckets[1].latency, null)
  assert.equal(buckets[1].loss, null)
  assert.equal(buckets[17].end, end)
})
test('all failures show 100% loss, exact endpoint goes in last bucket', () => {
  const buckets = pingBuckets([sample(-1), sample(12, 3600000)], '1', end)
  assert.equal(buckets[0].loss, 100)
  assert.equal(buckets[0].latency, null)
  assert.equal(buckets[17].latency, 12)
})
test('history is scoped to the requested node and rejects malformed responses', async () => {
  globalThis.mockHistoryRpc = async (method, signal, params) => {
    assert.equal(method, 'common:getRecords')
    assert.deepEqual(params, { uuid: 'a', type: 'ping', hours: 1, maxCount: 10000 })
    return { records: [sample(20), { ...sample(20), client: 'b' }, null, { ...sample(20), time: 'invalid' }] }
  }
  try {
    assert.deepEqual((await getPingHistory('a')).records, [sample(20)])
    globalThis.mockHistoryRpc = async () => ({})
    await assert.rejects(getPingHistory('a'), /格式无效/)
  } finally { delete globalThis.mockHistoryRpc }
})

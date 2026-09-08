import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

// Exercise the production normalizer without a browser or extra test dependencies.
const source = (await readFile(new URL('../src/lib/api/services/komari.ts', import.meta.url), 'utf8'))
  .replace("import { appConfig } from '@/lib/config'", "const appConfig = { nodeStatus: { komariApiUrl: '/api/komari/rpc2' } }")
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } })
const { matchNodeMonitor, getKomariData } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const now = Date.parse('2026-09-08T04:00:00Z')
const node = { id: 1, name: '专线 美国-1 | 1x', online: null }
const status = { time: new Date(now).toISOString(), online: true, cpu: 0, ram: 512, ram_total: 1024, disk: 25, disk_total: 100, net_in: 0, net_out: 1024, uptime: 3600, ping: { a: { name: '广州电信', latest: 0, loss: 1.5 }, b: { name: '超时线路', latest: -1, loss: 100 } } }
const data = { nodes: { a: { public_remark: '美国-1', region: '🇺🇸', tags: '1Gbps;CN2GIA;' } }, statuses: { a: status } }

test('matches subscription names and preserves zero values and Komari units', () => {
  const result = matchNodeMonitor(node, data, now)
  assert.equal(result.uuid, 'a')
  assert.equal(result.online, true)
  assert.equal(result.cpu, 0)
  assert.equal(result.memory, 50)
  assert.equal(result.disk, 25)
  assert.equal(result.download, 0)
  assert.equal(result.upload, 1024)
  assert.deepEqual(result.tags, ['1Gbps', 'CN2GIA'])
  assert.equal(result.pings[0].loss, 1.5)
  assert.equal(result.pings[0].latency, 0)
  assert.equal(result.pings[1].latency, null)
  assert.equal(matchNodeMonitor({ ...node, id: 2, name: '美国-1 HY2' }, data, now).uuid, 'a')
})
test('longest remark wins; ambiguous, empty, hidden, and unrelated nodes do not match', () => {
  assert.equal(matchNodeMonitor({ ...node, name: '美国-10 HY2' }, { ...data, nodes: { ...data.nodes, b: { public_remark: '美国-10' } } }, now).uuid, 'b')
  for (const nodes of [{ a: { public_remark: '' } }, { a: { public_remark: '美国-1', hidden: true } }, { a: { public_remark: '香港-1' } }, { ...data.nodes, b: data.nodes.a }]) {
    assert.equal(matchNodeMonitor(node, { ...data, nodes }, now), null)
  }
})
test('stale or missing reports never appear online or expose old live metrics', () => {
  for (const report of [{ ...status, time: new Date(now - 120001).toISOString() }, { ...status, time: 'bad-date' }, {}]) {
    const result = matchNodeMonitor(node, { ...data, statuses: { a: report } }, now)
    assert.equal(result.online, null)
    assert.equal(result.cpu, null)
    assert.equal(result.upload, null)
    assert.deepEqual(result.pings, [])
  }
})
test('explicit offline status survives an old last heartbeat and hides measurements', () => {
  const result = matchNodeMonitor(node, { ...data, statuses: { a: { ...status, online: false, time: new Date(now - 86400000).toISOString() } } }, now)
  assert.equal(result.online, false)
  assert.equal(result.cpu, null)
  assert.deepEqual(result.pings, [])
})
test('malformed metrics and zero capacities stay unknown', () => {
  const result = matchNodeMonitor(node, { ...data, statuses: { a: { ...status, cpu: 'bad', ram_total: 0, disk: -2 } } }, now)
  assert.equal(result.cpu, null)
  assert.equal(result.memory, null)
  assert.equal(result.disk, null)
})
test('RPC requests omit credentials, join both methods, and reject RPC errors', async () => {
  const original = globalThis.fetch
  const methods = []
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/komari/rpc2')
      assert.equal(options.credentials, 'omit')
      assert.equal(options.headers.Authorization, undefined)
      const { method } = JSON.parse(options.body)
      methods.push(method)
      return Response.json({ result: method === 'common:getNodes' ? data.nodes : data.statuses })
    }
    assert.deepEqual(await getKomariData(), data)
    assert.deepEqual(methods.sort(), ['common:getNodes', 'common:getNodesLatestStatus'])
    globalThis.fetch = async () => Response.json({ error: { code: -32601 } })
    await assert.rejects(getKomariData(), /无效/)
    globalThis.fetch = async () => new Response('', { status: 403 })
    await assert.rejects(getKomariData(), /403/)
  } finally { globalThis.fetch = original }
})

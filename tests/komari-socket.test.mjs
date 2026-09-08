import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/api/services/komari-socket.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } })
const { KomariSocket } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

function environment() {
  const names = ['WebSocket', 'document', 'window', 'navigator', 'setTimeout', 'clearTimeout']
  const originals = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  const timers = new Map()
  let id = 0
  class Socket {
    static instances = []
    sent = []
    closed = false
    constructor(url) { this.url = url; Socket.instances.push(this) }
    send(body) { this.sent.push(JSON.parse(body)) }
    close() { this.closed = true }
    open() { this.onopen?.() }
    reply(body) { this.onmessage?.({ data: JSON.stringify(body) }) }
  }
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const window = new EventTarget()
  const values = { WebSocket: Socket, document, window, navigator: { onLine: true }, setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id }, clearTimeout: id => timers.delete(id) }
  for (const [name, value] of Object.entries(values)) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  return {
    Socket, document, timers,
    runTimer() { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn(); return timer.ms },
    restore() { for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name] } },
  }
}

test('consumers share one socket; RPC responses match IDs; last release cleans all resources', async () => {
  const env = environment()
  try {
    const client = new KomariSocket(() => 'wss://example.test/api/rpc2')
    const releaseA = client.retain(), releaseB = client.retain()
    assert.equal(env.Socket.instances.length, 1)
    const ws = env.Socket.instances[0]
    ws.open()
    const promise = client.call('common:getNodesLatestStatus')
    assert.deepEqual(ws.sent[0], { jsonrpc: '2.0', id: 1, method: 'common:getNodesLatestStatus', params: {} })
    ws.reply({ id: 999, result: {} })
    ws.reply({ id: 1, result: { a: { online: true } } })
    assert.deepEqual(await promise, { a: { online: true } })
    releaseA()
    assert.equal(ws.closed, false)
    const pending = client.call('common:getNodesLatestStatus')
    const rejected = assert.rejects(pending, /disconnected/)
    releaseB()
    await rejected
    releaseB()
    assert.equal(client.getSnapshot(), 'paused')
    assert.equal(ws.closed, true)
    assert.equal(env.timers.size, 0)
  } finally { env.restore() }
})
test('hidden pages close the connection and resume with one new socket', () => {
  const env = environment()
  try {
    const client = new KomariSocket(() => '/rpc2')
    const release = client.retain()
    env.Socket.instances[0].open()
    env.document.visibilityState = 'hidden'
    env.document.dispatchEvent(new Event('visibilitychange'))
    assert.equal(env.Socket.instances[0].closed, true)
    assert.equal(client.getSnapshot(), 'paused')
    assert.equal(env.timers.size, 0)
    env.document.visibilityState = 'visible'
    env.document.dispatchEvent(new Event('visibilitychange'))
    assert.equal(env.Socket.instances.length, 2)
    release()
    env.document.dispatchEvent(new Event('visibilitychange'))
    assert.equal(env.Socket.instances.length, 2)
  } finally { env.restore() }
})
test('silent connections time out; reconnect delay grows and is capped', async () => {
  const env = environment()
  try {
    const client = new KomariSocket(() => '/rpc2')
    const release = client.retain()
    for (let attempt = 0; attempt < 8; attempt++) {
      assert.equal(env.runTimer(), 10000)
      assert.equal(client.getSnapshot(), 'fallback')
      const delay = env.runTimer()
      const minimum = Math.min(30000, 1000 * 2 ** attempt)
      assert.ok(delay >= minimum && delay < minimum + 500)
    }
    const ws = env.Socket.instances.at(-1)
    ws.open()
    const pending = client.call('common:getNodesLatestStatus')
    const rejected = assert.rejects(pending, /disconnected/)
    env.runTimer()
    await rejected
    assert.equal(ws.closed, true)
    release()
    assert.equal(env.timers.size, 0)
  } finally { env.restore() }
})
test('aborted RPC cleans its timeout and ignores late replies', async () => {
  const env = environment()
  try {
    const client = new KomariSocket(() => '/rpc2')
    const release = client.retain()
    const ws = env.Socket.instances[0]
    ws.open()
    const abort = new AbortController()
    const pending = client.call('common:getNodesLatestStatus', abort.signal)
    const rejected = assert.rejects(pending)
    abort.abort()
    await rejected
    ws.reply({ id: 1, result: {} })
    assert.equal(env.timers.size, 0)
    assert.equal(client.getSnapshot(), 'connected')
    release()
  } finally { env.restore() }
})

/** One shared RPC socket; React Query deduplicates refresh requests across consumers. */
export class KomariSocket {
  private socket: WebSocket | null = null
  private users = 0
  private sequence = 0
  private attempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private connectTimer: ReturnType<typeof setTimeout> | undefined
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; cleanup: () => void }>()
  private listeners = new Set<() => void>()
  private state: 'connecting' | 'connected' | 'fallback' | 'paused' = 'paused'

  private url: () => string
  constructor(url: () => string) { this.url = url }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private setState(state: typeof this.state) {
    if (state === this.state) return
    this.state = state
    this.listeners.forEach(listener => listener())
  }
  private visible = () => document.visibilityState !== 'hidden' && navigator.onLine !== false
  private resume = () => {
    if (!this.visible()) {
      this.disconnect()
      this.setState('paused')
    } else if (this.users && !this.socket) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
      this.connect()
    }
  }
  retain() {
    if (++this.users === 1) {
      document.addEventListener('visibilitychange', this.resume)
      window.addEventListener('online', this.resume)
      window.addEventListener('offline', this.resume)
      this.resume()
    }
    let released = false
    return () => {
      if (released) return
      released = true
      if (--this.users === 0) {
        document.removeEventListener('visibilitychange', this.resume)
        window.removeEventListener('online', this.resume)
        window.removeEventListener('offline', this.resume)
        this.disconnect()
        this.attempts = 0
        this.setState('paused')
      }
    }
  }
  private disconnect() {
    clearTimeout(this.reconnectTimer)
    clearTimeout(this.connectTimer)
    this.reconnectTimer = this.connectTimer = undefined
    const socket = this.socket
    this.socket = null
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null
      socket.close()
    }
    for (const request of this.pending.values()) {
      request.cleanup()
      request.reject(new Error('Komari WebSocket disconnected'))
    }
    this.pending.clear()
  }
  private fail = () => {
    this.disconnect()
    if (!this.users || !this.visible()) { this.setState('paused'); return }
    this.setState('fallback')
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempts++, 5)) + Math.random() * 500
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = undefined; this.connect() }, delay)
  }
  private connect() {
    if (this.socket || !this.users || !this.visible()) return
    this.setState('connecting')
    try {
      const socket = new WebSocket(this.url())
      this.socket = socket
      this.connectTimer = setTimeout(this.fail, 10000)
      socket.onopen = () => {
        clearTimeout(this.connectTimer)
        this.setState('connected')
      }
      socket.onclose = socket.onerror = this.fail
      socket.onmessage = event => {
        try {
          const body = JSON.parse(String(event.data))
          const request = this.pending.get(body?.id)
          if (!request) return
          this.pending.delete(body.id)
          request.cleanup()
          if (body.error || !body.result || typeof body.result !== 'object' || Array.isArray(body.result)) {
            request.reject(new Error('Komari RPC error'))
            this.fail()
          } else {
            this.attempts = 0
            request.resolve(body.result)
          }
        } catch { this.fail() }
      }
    } catch { this.fail() }
  }
  async call(method: string, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw signal.reason
    const socket = this.socket
    if (!socket || this.state !== 'connected') throw new Error('Komari WebSocket unavailable')
    const id = ++this.sequence
    return new Promise((resolve, reject) => {
      const abort = () => {
        this.pending.delete(id)
        cleanup()
        reject(signal?.reason ?? new Error('Aborted'))
      }
      const timeout = setTimeout(this.fail, 10000)
      const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
      this.pending.set(id, { resolve, reject, cleanup })
      signal?.addEventListener('abort', abort, { once: true })
      try { socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params: {} })) }
      catch { this.fail() }
    })
  }
}

export type AppDownloadCredentials = { appleId: string; password: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parseAppAccounts(payload: unknown): Record<string, AppDownloadCredentials> {
  if (!isRecord(payload)) return {}
  // Accept both the authenticated API envelope and the original account map.
  const accounts = Object.hasOwn(payload, 'data') ? payload.data : payload
  if (!isRecord(accounts)) return {}
  return Object.fromEntries(Object.entries(accounts).flatMap(([name, value]) => {
    if (!isRecord(value)) return []
    const { appleId, password } = value
    if (typeof appleId !== 'string' || !appleId.trim() || typeof password !== 'string' || !password.trim()) return []
    return [[name, { appleId, password }]]
  }))
}

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'Moss',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/',
  enableMock: String(import.meta.env.VITE_ENABLE_MOCK ?? 'false') === 'true',
  nodeStatus: {
    komariWsUrl: import.meta.env.VITE_KOMARI_WS_URL || '',
    komariApiUrl: import.meta.env.VITE_KOMARI_API_URL || '/api/komari/rpc2',
    apiPath: import.meta.env.VITE_NODE_STATUS_API_PATH || '/api/v1/user/server/fetch',
    refreshIntervalMs: Number(import.meta.env.VITE_NODE_STATUS_REFRESH_INTERVAL_MS || 60000),
  },
  downloads: {
    v2rayN: {
      windows:
        import.meta.env.VITE_DOWNLOAD_V2RAYN_WINDOWS ||
        'https://github.com/2dust/v2rayN/releases/latest',
      macIntel:
        import.meta.env.VITE_DOWNLOAD_V2RAYN_MAC_INTEL ||
        'https://github.com/2dust/v2rayN/releases/latest',
      macAppleSilicon:
        import.meta.env.VITE_DOWNLOAD_V2RAYN_MAC_ARM ||
        'https://github.com/2dust/v2rayN/releases/latest',
    },
    clashVergeRev: {
      windows:
        import.meta.env.VITE_DOWNLOAD_CLASH_WINDOWS ||
        'https://github.com/clash-verge-rev/clash-verge-rev/releases/latest',
      macIntel:
        import.meta.env.VITE_DOWNLOAD_CLASH_MAC_INTEL ||
        'https://github.com/clash-verge-rev/clash-verge-rev/releases/latest',
      macAppleSilicon:
        import.meta.env.VITE_DOWNLOAD_CLASH_MAC_ARM ||
        'https://github.com/clash-verge-rev/clash-verge-rev/releases/latest',
    },
  },
}

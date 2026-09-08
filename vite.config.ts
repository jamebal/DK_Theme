import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'KOMARI_')
  const komariHost = env.KOMARI_HOST?.trim()
  const komariOrigin = komariHost ? new URL(komariHost).origin : undefined

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: komariOrigin ? {
        '/api/komari/rpc2': {
          target: komariOrigin,
          changeOrigin: true,
          ws: true,
          rewrite: () => '/api/rpc2',
          configure: (proxy) => {
            proxy.on('proxyReqWs', (request) => {
              request.setHeader('origin', komariOrigin)
              request.removeHeader('cookie')
              request.removeHeader('authorization')
            })
            proxy.on('proxyReq', (request) => {
              request.removeHeader('origin')
              request.removeHeader('cookie')
              request.removeHeader('authorization')
            })
          },
        },
      } : undefined,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})

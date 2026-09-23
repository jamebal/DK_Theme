import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { appConfig } from '@/lib/config'
import { komariRpc, type KomariData } from '@/lib/api/services/komari'
import { KomariSocket } from '@/lib/api/services/komari-socket'

const socket = new KomariSocket(() => {
  const url = new URL(appConfig.nodeStatus.komariWsUrl || appConfig.nodeStatus.komariApiUrl, window.location.href)
  if (url.protocol === 'https:') url.protocol = 'wss:'
  if (url.protocol === 'http:') url.protocol = 'ws:'
  return url.href
})

export function useKomari() {
  const connection = useSyncExternalStore(socket.subscribe, socket.getSnapshot)
  const queryClient = useQueryClient()
  useEffect(() => {
    if (appConfig.enableMock) return
    const cancel = () => {
      if (socket.getSnapshot() === 'paused') {
        void queryClient.cancelQueries({ queryKey: ['komari-nodes'] })
        void queryClient.cancelQueries({ queryKey: ['komari-live-status'] })
        void queryClient.cancelQueries({ queryKey: ['komari-ping-tasks'] })
        void queryClient.cancelQueries({ queryKey: ['komari-ping-history'] })
      }
    }
    const unsubscribe = socket.subscribe(cancel)
    const release = socket.retain()
    return () => { release(); unsubscribe() }
  }, [queryClient])
  const nodes = useQuery({
    queryKey: ['komari-nodes'], queryFn: ({ signal }) => komariRpc('common:getNodes', signal),
    enabled: !appConfig.enableMock && connection !== 'paused', staleTime: 300000,
    refetchInterval: 300000, retry: 1,
  })
  const pingTasks = useQuery({
    queryKey: ['komari-ping-tasks'], queryFn: ({ signal }) => komariRpc('public:getPublicPingTasks', signal),
    enabled: !appConfig.enableMock && connection !== 'paused', staleTime: 300000,
    refetchInterval: 300000, retry: 1,
  })
  const statuses = useQuery({
    queryKey: ['komari-live-status'],
    queryFn: async ({ signal }) => {
      if (socket.getSnapshot() === 'connected') {
        try {
          const result = await socket.call('common:getNodesLatestStatus', signal)
          if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid Komari status')
          return result as KomariData['statuses']
        } catch {
          if (signal.aborted) throw signal.reason
        }
      }
      return komariRpc('common:getNodesLatestStatus', signal)
    },
    enabled: !appConfig.enableMock && connection !== 'paused',
    refetchInterval: connection === 'connected' ? 1000 : 30000,
    refetchIntervalInBackground: false, retry: 1,
  })
  const data = useMemo(() => nodes.data && statuses.data ? { nodes: nodes.data, statuses: statuses.data, pingTasks: pingTasks.data } : undefined, [nodes.data, statuses.data, pingTasks.data])
  return {
    data, connection, pingTasksError: pingTasks.isError, isError: nodes.isError || statuses.isError,
    isPending: nodes.isPending || statuses.isPending,
    isFetching: nodes.isFetching || statuses.isFetching || pingTasks.isFetching,
    dataUpdatedAt: statuses.dataUpdatedAt,
    refetch: () => Promise.all([nodes.refetch(), statuses.refetch(), pingTasks.refetch(), queryClient.invalidateQueries({ queryKey: ['komari-ping-history'] })]),
  }
}

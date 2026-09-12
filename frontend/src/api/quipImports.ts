import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { QuipImport } from '@/types'

const RUNNING_STATUSES: QuipImport['status'][] = [ 'pending', 'running' ]

export function useStartQuipImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { token: string; domain: string }) =>
      api.post('/api/v1/quip_imports', data).then((r) => r.data as QuipImport),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quip_imports'] }),
  })
}

// Polls while the import is still pending/running, stops once it settles —
// there's no ActionCable/WebSocket push for this, and polling every 1.5s
// for a bulk, occasional, one-off operation isn't worth adding one for.
export function useQuipImport(id: number | null) {
  return useQuery<QuipImport>({
    queryKey: [ 'quip_imports', id ],
    queryFn: () => api.get(`/api/v1/quip_imports/${id}`).then((r) => r.data),
    enabled: id != null,
    refetchInterval: (query) => (query.state.data && RUNNING_STATUSES.includes(query.state.data.status) ? 1500 : false),
  })
}

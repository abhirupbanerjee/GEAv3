/**
 * Custom Hook: useDashboardStats
 *
 * Fetches dashboard statistics for ticket management
 * Uses SWR for caching and revalidation
 */

import useSWR from 'swr'
import type { ApiResponse, DashboardStats } from '@/types/tickets'

const fetcher = async (url: string): Promise<ApiResponse<DashboardStats>> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Failed to fetch dashboard stats')
  }
  return res.json()
}

export function useDashboardStats(entityId?: string | null) {
  const queryParams = new URLSearchParams()
  if (entityId) {
    queryParams.set('entity_id', entityId)
  }

  const url = `/api/admin/tickets/dashboard-stats${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<DashboardStats>>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 10000
    }
  )

  return {
    stats: data?.data ?? null,
    isLoading,
    isError: !!error,
    error: error?.message,
    mutate
  }
}

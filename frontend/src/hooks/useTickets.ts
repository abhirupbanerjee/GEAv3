/**
 * Custom Hook: useTickets
 *
 * Fetches paginated list of tickets with filtering and sorting
 * Uses SWR for caching and revalidation
 */

import useSWR from 'swr'
import type {
  ApiResponse,
  TicketListResponse,
  TicketFilters,
  TicketSort
} from '@/types/tickets'

interface UseTicketsParams {
  filters?: TicketFilters
  sort?: TicketSort
  page?: number
  limit?: number
}

const fetcher = async (url: string): Promise<ApiResponse<TicketListResponse>> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Failed to fetch tickets')
  }
  return res.json()
}

export function useTickets(params: UseTicketsParams = {}) {
  const { filters = {}, sort = { by: 'created_at', order: 'desc' }, page = 1, limit = 20 } = params

  // Build query string
  const queryParams = new URLSearchParams()

  if (filters.entity_id) queryParams.set('entity_id', filters.entity_id)
  if (filters.service_id) queryParams.set('service_id', filters.service_id)
  if (filters.status) queryParams.set('status', filters.status)
  if (filters.priority) queryParams.set('priority', filters.priority)
  if (filters.search) queryParams.set('search', filters.search)

  queryParams.set('sort_by', sort.by)
  queryParams.set('sort_order', sort.order)
  queryParams.set('page', page.toString())
  queryParams.set('limit', limit.toString())

  const url = `/api/admin/tickets/list?${queryParams.toString()}`

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<TicketListResponse>>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000, // Reduced from 5000 to 1000ms
      revalidateIfStale: true,
      revalidateOnMount: true
    }
  )

  return {
    tickets: data?.data?.tickets ?? [],
    pagination: data?.data?.pagination,
    appliedFilters: data?.data?.filters,
    appliedSort: data?.data?.sort,
    isLoading,
    isError: !!error,
    error: error?.message,
    mutate // Expose mutate for manual revalidation
  }
}

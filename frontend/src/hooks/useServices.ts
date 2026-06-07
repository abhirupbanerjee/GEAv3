/**
 * Custom Hook: useServices
 *
 * Fetches paginated list of services with filtering and sorting
 * Uses SWR for caching and revalidation
 */

import useSWR from 'swr'
import type {
  ApiResponse,
  ServiceListResponse,
  ServiceFilters,
  ServiceSort
} from '@/types/managedata'

interface UseServicesParams {
  filters?: ServiceFilters
  sort?: ServiceSort
  page?: number
  limit?: number
}

const fetcher = async (url: string): Promise<ApiResponse<ServiceListResponse>> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Failed to fetch services')
  }
  return res.json()
}

export function useServices(params: UseServicesParams = {}) {
  const {
    filters = {},
    sort = { by: 'service_name', order: 'asc' },
    page = 1,
    limit = 20
  } = params

  // Build query string
  const queryParams = new URLSearchParams()

  if (filters.search) queryParams.set('search', filters.search)
  if (filters.service_category) queryParams.set('service_category', filters.service_category)
  if (filters.entity_id) queryParams.set('entity_id', filters.entity_id)
  if (filters.is_active) queryParams.set('is_active', filters.is_active)

  queryParams.set('sort_by', sort.by)
  queryParams.set('sort_order', sort.order)
  queryParams.set('page', page.toString())
  queryParams.set('limit', limit.toString())

  const url = `/api/managedata/services/list?${queryParams.toString()}`

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<ServiceListResponse>>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
      revalidateIfStale: true,
      revalidateOnMount: true
    }
  )

  return {
    services: data?.data?.services ?? [],
    pagination: data?.data?.pagination,
    appliedFilters: data?.data?.filters,
    appliedSort: data?.data?.sort,
    isLoading,
    isError: !!error,
    error: error?.message,
    mutate // Expose mutate for manual revalidation after CRUD operations
  }
}

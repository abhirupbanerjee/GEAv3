/**
 * Custom Hook: useEntities
 *
 * Fetches paginated list of entities with filtering and sorting
 * Uses SWR for caching and revalidation
 */

import useSWR from 'swr'
import type {
  ApiResponse,
  EntityListResponse,
  UseEntitiesParams
} from '@/types/managedata'

const fetcher = async (url: string): Promise<ApiResponse<EntityListResponse>> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Failed to fetch entities')
  }
  return res.json()
}

export function useEntities(params: UseEntitiesParams = {}) {
  const {
    filters = {},
    sort = { by: 'entity_type', order: 'asc' },
    page = 1,
    limit = 20
  } = params

  // Build query string
  const queryParams = new URLSearchParams()

  if (filters.search) queryParams.set('search', filters.search)
  if (filters.entity_type) queryParams.set('entity_type', filters.entity_type)
  if (filters.is_active) queryParams.set('is_active', filters.is_active)

  queryParams.set('sort_by', sort.by)
  queryParams.set('sort_order', sort.order)
  queryParams.set('page', page.toString())
  queryParams.set('limit', limit.toString())

  const url = `/api/managedata/entities/list?${queryParams.toString()}`

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<EntityListResponse>>(
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
    entities: data?.data?.entities ?? [],
    pagination: data?.data?.pagination,
    appliedFilters: data?.data?.filters,
    appliedSort: data?.data?.sort,
    isLoading,
    isError: !!error,
    error: error?.message,
    mutate // Expose mutate for manual revalidation after CRUD operations
  }
}

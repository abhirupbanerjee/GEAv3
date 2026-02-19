/**
 * Custom Hook: useQRCodes
 *
 * Fetches paginated list of QR codes with filtering and sorting
 * Uses SWR for caching and revalidation
 */

import useSWR from 'swr'
import type {
  ApiResponse,
  QRCodeListResponse,
  QRCodeFilters,
  QRCodeSort
} from '@/types/managedata'

interface UseQRCodesParams {
  filters?: QRCodeFilters
  sort?: QRCodeSort
  page?: number
  limit?: number
}

const fetcher = async (url: string): Promise<ApiResponse<QRCodeListResponse>> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Failed to fetch QR codes')
  }
  return res.json()
}

export function useQRCodes(params: UseQRCodesParams = {}) {
  const {
    filters = {},
    sort = { by: 'created_at', order: 'desc' },
    page = 1,
    limit = 20
  } = params

  // Build query string
  const queryParams = new URLSearchParams()

  if (filters.search) queryParams.set('search', filters.search)
  if (filters.is_active) queryParams.set('is_active', filters.is_active)

  queryParams.set('sort_by', sort.by)
  queryParams.set('sort_order', sort.order)
  queryParams.set('page', page.toString())
  queryParams.set('limit', limit.toString())

  const url = `/api/managedata/qrcodes/list?${queryParams.toString()}`

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<QRCodeListResponse>>(
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
    qrcodes: data?.data?.qrcodes ?? [],
    pagination: data?.data?.pagination,
    appliedFilters: data?.data?.filters,
    appliedSort: data?.data?.sort,
    isLoading,
    isError: !!error,
    error: error?.message,
    mutate // Expose mutate for manual revalidation after CRUD operations
  }
}

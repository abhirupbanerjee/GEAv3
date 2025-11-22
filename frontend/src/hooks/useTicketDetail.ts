/**
 * Custom Hook: useTicketDetail
 *
 * Fetches complete ticket details including attachments and activities
 * Uses SWR for caching and revalidation
 */

import useSWR from 'swr'
import type { ApiResponse, TicketDetailResponse } from '@/types/tickets'

const fetcher = async (url: string): Promise<ApiResponse<TicketDetailResponse>> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Failed to fetch ticket details')
  }
  return res.json()
}

export function useTicketDetail(ticketId: number | null) {
  const url = ticketId ? `/api/admin/tickets/${ticketId}/details` : null

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<TicketDetailResponse>>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 3000
    }
  )

  return {
    ticket: data?.data?.ticket ?? null,
    attachments: data?.data?.attachments ?? [],
    activities: data?.data?.activities ?? [],
    isLoading,
    isError: !!error,
    error: error?.message,
    mutate
  }
}

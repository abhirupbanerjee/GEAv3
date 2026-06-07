/**
 * Custom Hook: useTicketUpdate
 *
 * Handles ticket update mutations (status, priority, notes)
 * Provides loading state and error handling
 */

import { useState } from 'react'
import type {
  ApiResponse,
  TicketUpdatePayload,
  TicketUpdateResponse
} from '@/types/tickets'

interface UseTicketUpdateReturn {
  updateTicket: (ticketId: number, payload: TicketUpdatePayload) => Promise<TicketUpdateResponse>
  isUpdating: boolean
  error: string | null
  resetError: () => void
}

export function useTicketUpdate(): UseTicketUpdateReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTicket = async (
    ticketId: number,
    payload: TicketUpdatePayload
  ): Promise<TicketUpdateResponse> => {
    setIsUpdating(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data: ApiResponse<TicketUpdateResponse> = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update ticket')
      }

      if (!data.data) {
        throw new Error('No data returned from update')
      }

      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  const resetError = () => setError(null)

  return {
    updateTicket,
    isUpdating,
    error,
    resetError
  }
}

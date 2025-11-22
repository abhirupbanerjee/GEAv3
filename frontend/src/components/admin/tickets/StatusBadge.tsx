/**
 * StatusBadge Component
 *
 * Displays a colored badge for ticket status
 * Color-coded based on status type
 */

import React from 'react'
import type { TicketStatus } from '@/types/tickets'

interface StatusBadgeProps {
  status: TicketStatus
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  // Default color mapping if database color is not available
  const getDefaultColor = (statusCode: string) => {
    const colorMap: Record<string, string> = {
      '1': 'bg-blue-100 text-blue-800 border-blue-200', // Open
      '2': 'bg-yellow-100 text-yellow-800 border-yellow-200', // In Progress
      '3': 'bg-green-100 text-green-800 border-green-200', // Resolved
      '4': 'bg-gray-100 text-gray-800 border-gray-200' // Closed
    }
    return colorMap[statusCode] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const badgeClass = status.color
    ? `${sizeClasses[size]} inline-flex items-center font-medium rounded-full border`
    : `${sizeClasses[size]} ${getDefaultColor(status.code)} inline-flex items-center font-medium rounded-full border`

  const badgeStyle = status.color
    ? {
        backgroundColor: `${status.color}20`,
        color: status.color,
        borderColor: `${status.color}40`
      }
    : undefined

  return (
    <span className={badgeClass} style={badgeStyle}>
      {status.name}
    </span>
  )
}

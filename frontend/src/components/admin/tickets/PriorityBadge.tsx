/**
 * PriorityBadge Component
 *
 * Displays a colored badge for ticket priority
 * Color-coded based on priority level
 */

import React from 'react'
import type { TicketPriority } from '@/types/tickets'

interface PriorityBadgeProps {
  priority: TicketPriority
  size?: 'sm' | 'md' | 'lg'
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  // Default color mapping if database color is not available
  const getDefaultColor = (priorityCode: string) => {
    const colorMap: Record<string, string> = {
      URGENT: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return colorMap[priorityCode.toUpperCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const badgeClass = priority.color
    ? `${sizeClasses[size]} inline-flex items-center font-medium rounded-full border`
    : `${sizeClasses[size]} ${getDefaultColor(priority.code)} inline-flex items-center font-medium rounded-full border`

  const badgeStyle = priority.color
    ? {
        backgroundColor: `${priority.color}20`,
        color: priority.color,
        borderColor: `${priority.color}40`
      }
    : undefined

  return (
    <span className={badgeClass} style={badgeStyle}>
      {priority.name}
    </span>
  )
}

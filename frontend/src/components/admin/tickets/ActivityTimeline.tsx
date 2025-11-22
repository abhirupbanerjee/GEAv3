/**
 * ActivityTimeline Component
 *
 * Displays chronological activity log for a ticket
 */

'use client'

import React from 'react'
import type { TicketActivity } from '@/types/tickets'

interface ActivityTimelineProps {
  activities: TicketActivity[]
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'created':
        return '🎫'
      case 'status_change':
        return '🔄'
      case 'priority_change':
        return '⚡'
      case 'internal_note':
        return '📝'
      case 'comment':
        return '💬'
      case 'assigned':
        return '👤'
      case 'attachment':
        return '📎'
      default:
        return '•'
    }
  }

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'created':
        return 'bg-blue-100 border-blue-300'
      case 'status_change':
        return 'bg-green-100 border-green-300'
      case 'priority_change':
        return 'bg-orange-100 border-orange-300'
      case 'internal_note':
        return 'bg-purple-100 border-purple-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activity recorded
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.activity_id} className="flex gap-3">
          {/* Timeline Line */}
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${getActivityColor(
                activity.activity_type
              )}`}
            >
              <span className="text-sm">{getActivityIcon(activity.activity_type)}</span>
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
            )}
          </div>

          {/* Activity Content */}
          <div className="flex-1 pb-6">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">
                  {activity.description}
                </p>
                <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                  {formatDateTime(activity.created_at)}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                by {activity.performed_by || 'System'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

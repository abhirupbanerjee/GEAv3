/**
 * DashboardStats Component
 *
 * Displays key metrics and statistics for the ticket management dashboard
 */

'use client'

import React from 'react'
import type { DashboardStats as DashboardStatsType } from '@/types/tickets'

interface DashboardStatsProps {
  stats: DashboardStatsType | null
  isLoading: boolean
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Tickets */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Tickets</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total_tickets}</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>

        {/* Today's Tickets */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="text-sm font-medium text-gray-600 mb-1">Today</div>
          <div className="text-3xl font-bold text-gray-900">{stats.metrics.today_tickets}</div>
          <div className="text-xs text-gray-500 mt-1">New tickets</div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="text-sm font-medium text-gray-600 mb-1">Overdue</div>
          <div className="text-3xl font-bold text-gray-900">{stats.metrics.overdue_tickets}</div>
          <div className="text-xs text-gray-500 mt-1">Past SLA target</div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(stats.status_breakdown).map(([code, statusData]) => (
            <div key={code} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{statusData.count}</div>
              <div className="text-sm text-gray-600 mt-1">{statusData.name}</div>
              {statusData.color && (
                <div
                  className="mt-2 mx-auto h-2 w-12 rounded-full"
                  style={{ backgroundColor: statusData.color }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.priority_breakdown).map(([code, priorityData]) => (
            <div key={code} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{priorityData.count}</div>
              <div className="text-sm text-gray-600 mt-1 capitalize">{priorityData.name}</div>
              {priorityData.color && (
                <div
                  className="mt-2 mx-auto h-2 w-12 rounded-full"
                  style={{ backgroundColor: priorityData.color }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

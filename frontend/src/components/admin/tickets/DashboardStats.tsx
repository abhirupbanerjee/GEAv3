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

      {/* Status and Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Status Distribution</h3>
          <div className="flex flex-wrap justify-around gap-6">
            {Object.entries(stats.status_breakdown).map(([code, statusData]) => (
              <div key={code} className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md mb-2"
                  style={{ backgroundColor: statusData.color || '#6B7280' }}
                >
                  {statusData.count}
                </div>
                <div className="text-sm text-gray-700 font-medium text-center">{statusData.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Priority Distribution</h3>
          <div className="flex flex-wrap justify-around gap-6">
            {Object.entries(stats.priority_breakdown).map(([code, priorityData]) => (
              <div key={code} className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md mb-2"
                  style={{ backgroundColor: priorityData.color || '#6B7280' }}
                >
                  {priorityData.count}
                </div>
                <div className="text-sm text-gray-700 font-medium text-center capitalize">{priorityData.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

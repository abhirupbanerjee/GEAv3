'use client'

import { useState, useEffect } from 'react'
import OverviewCards from '@/components/analytics/OverviewCards'
import FilterBar from '@/components/analytics/FilterBar'
import ChartsSection from '@/components/analytics/ChartsSection'
import FeedbackTable from '@/components/analytics/FeedbackTable'
import ExportButton from '@/components/analytics/ExportButton'

interface StatsData {
  overall: {
    total_submissions: string
    avg_satisfaction: string
    avg_ease: string
    avg_clarity: string
    avg_timeliness: string
    avg_trust: string
    grievance_count: string
    first_submission: string
    last_submission: string
  }
  by_channel: Array<{
    channel: string
    count: string
    avg_satisfaction: string
  }>
  by_recipient: Array<{
    recipient_group: string
    count: string
    avg_satisfaction: string
  }>
  rating_distribution: Array<{
    rating: number
    count: string
    percentage: string
  }>
  top_services: Array<{
    service_id: string
    service_name: string
    entity_name: string
    submission_count: string
    avg_satisfaction: string
  }> | null
  trend: Array<{
    date: string
    submissions: string
    avg_satisfaction: string
  }> | null
  recent_grievances: Array<{
    feedback_id: number
    service_name: string
    entity_name: string
    satisfaction_rating: number
    comment_text: string
    submitted_at: string
  }>
}

interface Filters {
  service_id: string
  entity_id: string
  start_date: string
  end_date: string
  channel: string
}

export default function AnalyticsPage() {
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    service_id: '',
    entity_id: '',
    start_date: '',
    end_date: '',
    channel: ''
  })
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Fetch stats data
  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query string
      const params = new URLSearchParams()
      if (filters.service_id) params.append('service_id', filters.service_id)
      if (filters.entity_id) params.append('entity_id', filters.entity_id)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.channel) params.append('channel', filters.channel)

      const response = await fetch(`/api/feedback/stats?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      setStatsData(data)
    } catch (err) {
      console.error('Stats fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchStats()
  }, [])

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, filters])

  // Handle filter changes
  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters)
  }

  // Apply filters
  const applyFilters = () => {
    fetchStats()
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({
      service_id: '',
      entity_id: '',
      start_date: '',
      end_date: '',
      channel: ''
    })
    // Fetch will be triggered by useEffect on filters change
    setTimeout(fetchStats, 100)
  }

  if (loading && !statsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error && !statsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📊 Feedback Analytics
              </h1>
              <p className="text-gray-600">
                Monitor and analyze citizen feedback across all government services
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Auto-refresh (30s)
                </span>
              </label>

              {/* Manual refresh button */}
              <button
                onClick={fetchStats}
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>

              {/* Export button */}
              {statsData && (
                <ExportButton statsData={statsData} filters={filters} />
              )}
            </div>
          </div>
        </div>

        {/* Loading overlay during refresh */}
        {loading && statsData && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800 text-sm">Refreshing data...</span>
          </div>
        )}

        {/* Overview Cards */}
        {statsData && (
          <div className="mb-8">
            <OverviewCards data={statsData.overall} />
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-8">
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        </div>

        {/* No Data Message */}
        {statsData && parseInt(statsData.overall.total_submissions) === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Feedback Yet</h3>
            <p className="text-gray-600 mb-4">
              No feedback submissions found for the selected filters.
            </p>
            <button
              onClick={resetFilters}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Charts Section */}
        {statsData && parseInt(statsData.overall.total_submissions) > 0 && (
          <div className="mb-8">
            <ChartsSection data={statsData} />
          </div>
        )}

        {/* Feedback Table */}
        {statsData && parseInt(statsData.overall.total_submissions) > 0 && (
          <div className="mb-8">
            <FeedbackTable 
              topServices={statsData.top_services}
              grievances={statsData.recent_grievances}
            />
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>
            Last updated: {statsData?.overall.last_submission 
              ? new Date(statsData.overall.last_submission).toLocaleString() 
              : 'N/A'}
          </p>
          {statsData?.overall.first_submission && (
            <p className="mt-1">
              Data since: {new Date(statsData.overall.first_submission).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
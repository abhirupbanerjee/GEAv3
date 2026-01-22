/**
 * @pageContext
 * @title Analytics
 * @purpose Comprehensive analytics and reporting dashboard displaying portal metrics, feedback trends, service request statistics, ticket performance, and service leaderboards
 * @audience staff
 * @features
 *   - Feedback analytics: Total submissions, average satisfaction ratings, grievance counts, service trust scores
 *   - Service request statistics: Total requests, status breakdown, completion rates, recent activity
 *   - Ticket metrics: Total tickets, overdue count, SLA compliance, average resolution time
 *   - Service performance leaderboard: Top 5 and bottom 5 performing services
 *   - Entity filter for admin users (multi-select dropdown)
 *   - Refresh button to reload latest data
 *   - Rating distribution charts and trend analysis
 * @steps
 *   - Review the summary cards at the top for quick KPIs
 *   - Admin users can filter by one or more entities using the entity filter
 *   - Scroll through sections: Citizen Feedback, Service Requests, Support Tickets, Service Leaderboard
 *   - Check the leaderboard to identify top-performing and attention-needed services
 *   - Use the Refresh button to get latest data
 * @tips
 *   - MDA staff see data for their entity only (auto-filtered)
 *   - DTA administrators can filter by multiple entities or view all
 *   - Color coding: Green (good performance), Yellow (average), Red (needs attention)
 *   - Leaderboard shows services needing attention based on grievance rates
 *   - SLA compliance percentage shows on-time ticket resolution rate
 * @relatedPages
 *   - /admin/service-requests: Detailed service request management
 *   - /admin/service-requests/analytics: In-depth service request analytics
 *   - /admin/tickets: Ticket management dashboard
 *   - /admin/home: Return to admin home
 * @permissions
 *   - staff: View analytics for their assigned entity only
 *   - admin: View analytics across all entities with filtering capability
 * @troubleshooting
 *   - Issue: Data not loading | Solution: Check network connection and try refresh button
 *   - Issue: Can't see other entities | Solution: Staff users only see their entity - this is by design
 *   - Issue: Leaderboard shows no data | Solution: Ensure services have received feedback - new systems may have limited data
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import ServiceLeaderboard from '@/components/analytics/ServiceLeaderboard'

interface FeedbackOverall {
  total_submissions: string
  avg_satisfaction: string
  avg_ease: string
  avg_clarity: string
  avg_timeliness: string
  avg_trust: string
  grievance_count: string
}

interface TopService {
  service_id: string
  service_name: string
  entity_name: string
  submission_count: number
  avg_satisfaction: string
}

interface FeedbackStats {
  overall: FeedbackOverall
  top_services: TopService[] | null
}

interface ServiceRequestStats {
  submitted: number
  in_progress: number
  under_review: number
  completed: number
  rejected: number
  total: number
  last_7_days: number
  last_30_days: number
}

interface TicketStats {
  total_tickets: number
  status_breakdown: Record<string, { name: string; count: number; color: string }>
  priority_breakdown: Record<string, { name: string; count: number; color: string }>
  metrics: {
    overdue_tickets: number
    avg_resolution_time: string | null
    sla_compliance: string
    today_tickets: number
    week_tickets: number
  }
}

interface ServiceLeaderboardData {
  overall: {
    top_5: Array<{
      service_id: string
      service_name: string
      entity_name: string
      entity_id: string
      feedback_count: number
      avg_satisfaction: string
      grievance_count: number
      ticket_count: number
      resolved_count: number
      resolution_rate: string
      grievance_rate: string
      overall_score: string
      avg_ease: string
      avg_clarity: string
      avg_timeliness: string
      avg_trust: string
    }>
    bottom_5: Array<{
      service_id: string
      service_name: string
      entity_name: string
      entity_id: string
      feedback_count: number
      avg_satisfaction: string
      grievance_count: number
      ticket_count: number
      resolved_count: number
      resolution_rate: string
      grievance_rate: string
      overall_score: string
      avg_ease: string
      avg_clarity: string
      avg_timeliness: string
      avg_trust: string
    }>
  }
  weights: {
    satisfaction: number
    ticket_resolution: number
    grievance: number
  }
  by_satisfaction: Array<any>
  by_requests: Array<any>
  needs_attention: Array<any>
  dimension_rankings: {
    ease_of_access: { top: DimensionService | null; bottom: DimensionService | null }
    clear_info: { top: DimensionService | null; bottom: DimensionService | null }
    timeliness: { top: DimensionService | null; bottom: DimensionService | null }
    service_trust: { top: DimensionService | null; bottom: DimensionService | null }
    satisfaction: { top: DimensionService | null; bottom: DimensionService | null }
  }
  total_services: number
}

interface DimensionService {
  service_id: string
  service_name: string
  entity_name: string
  entity_id: string
  feedback_count: number
  avg_ease: string
  avg_clarity: string
  avg_timeliness: string
  avg_trust: string
  avg_satisfaction: string
  grievance_count: number
  ticket_count: number
  resolved_count: number
  resolution_rate: string
  grievance_rate: string
  overall_score: string
}

interface Entity {
  unique_entity_id: string
  entity_name: string
  is_active?: boolean
}

// Service details for modal (same structure as ServiceLeaderboard component)
interface ServiceDetails {
  service_id: string
  service_name: string
  entity_name: string
  avg_ease: number
  avg_clarity: number
  avg_timeliness: number
  avg_trust: number
  avg_satisfaction: number
  feedback_count: number
  ticket_count: number
  resolved_count: number
  grievance_count: number
  resolution_rate: number
  grievance_rate: number
  overall_score: number
  score_components: {
    satisfaction_points: number
    resolution_points: number
    grievance_points: number
  }
  weights: {
    satisfaction: number
    ticket_resolution: number
    grievance: number
  }
  recent_comments: Array<{
    feedback_id: string
    comment_text: string
    satisfaction_rating: number
    created_at: string
    grievance_flag: boolean
  }>
}

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null)
  const [serviceRequestStats, setServiceRequestStats] = useState<ServiceRequestStats | null>(null)
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<ServiceLeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Entity filter state (for admin users only)
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([])
  const [showEntityDropdown, setShowEntityDropdown] = useState(false)
  const [entitySearchTerm, setEntitySearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Service details modal state
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)

  const isStaff = session?.user?.roleType === 'staff'
  const isAdmin = session?.user?.roleType === 'admin'
  const isDTA = session?.user?.entityId === 'AGY-005'

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEntityDropdown(false)
      }
    }

    if (showEntityDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEntityDropdown])

  // Load entities for admin users
  useEffect(() => {
    if (isAdmin) {
      const loadEntities = async () => {
        try {
          const response = await fetch('/api/managedata/entities')
          if (response.ok) {
            const data = await response.json()
            setEntities(data.filter((e: Entity) => e.is_active !== false))
          }
        } catch (error) {
          console.error('Error loading entities:', error)
        }
      }
      loadEntities()
    }
  }, [isAdmin])

  // Initialize with admin's entity when session and entities load (matches backend default)
  useEffect(() => {
    if (isAdmin && session?.user?.entityId && entities.length > 0) {
      // Only set if not already initialized
      if (selectedEntityIds.length === 0) {
        setSelectedEntityIds([session.user.entityId])
      }
    }
  }, [isAdmin, session?.user?.entityId, entities.length, selectedEntityIds.length])

  // Fetch all analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params for entity filter (admin only)
      // When all entities are selected, don't apply filter (show all data)
      const entityParam = isAdmin && selectedEntityIds.length > 0 && selectedEntityIds.length < entities.length
        ? `?entity_id=${selectedEntityIds.join(',')}`
        : ''

      // Fetch feedback stats
      const feedbackResponse = await fetch(`/api/feedback/stats${entityParam}`)
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json()
        setFeedbackStats({
          overall: feedbackData.overall,
          top_services: feedbackData.top_services
        })
      }

      // Fetch service requests stats
      const serviceRequestsResponse = await fetch(`/api/admin/service-requests/stats${entityParam}`)
      if (serviceRequestsResponse.ok) {
        const serviceRequestsData = await serviceRequestsResponse.json()
        setServiceRequestStats(serviceRequestsData.data.stats)
      }

      // Fetch tickets stats
      const ticketsResponse = await fetch(`/api/admin/tickets/dashboard-stats${entityParam}`)
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json()
        setTicketStats(ticketsData.data)
      }

      // Fetch service leaderboard (both admin and staff)
      // For staff, the API automatically filters by their entity
      const leaderboardResponse = await fetch(`/api/admin/service-leaderboard${entityParam}`)
      if (leaderboardResponse.ok) {
        const leaderboardResponseData = await leaderboardResponse.json()
        setLeaderboardData(leaderboardResponseData)
      }

    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, selectedEntityIds])

  // Fetch service details when a service is selected for modal
  useEffect(() => {
    if (selectedServiceId) {
      setLoadingDetails(true)
      setShowAllComments(false)
      fetch(`/api/admin/service-leaderboard/${selectedServiceId}`)
        .then(res => res.json())
        .then(data => {
          setServiceDetails(data)
          setLoadingDetails(false)
        })
        .catch(err => {
          console.error('Error fetching service details:', err)
          setLoadingDetails(false)
        })
    } else {
      setServiceDetails(null)
    }
  }, [selectedServiceId])

  const closeModal = () => {
    setSelectedServiceId(null)
    setServiceDetails(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Entity filter handlers
  const toggleEntity = (entityId: string) => {
    setSelectedEntityIds(prev =>
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    )
  }

  const toggleAllEntities = () => {
    if (selectedEntityIds.length === entities.length) {
      setSelectedEntityIds([])
    } else {
      setSelectedEntityIds(entities.map(e => e.unique_entity_id))
    }
  }

  const clearEntities = () => {
    setSelectedEntityIds([])
  }

  const filteredEntities = entities.filter(e =>
    e.entity_name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
    e.unique_entity_id.toLowerCase().includes(entitySearchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📊 Analytics
              </h1>
              <p className="text-gray-600">
                {isStaff
                  ? 'Overview of feedback, service requests, and tickets for your organization'
                  : 'Comprehensive overview of feedback, service requests, and tickets across all entities'
                }
              </p>
            </div>

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Entity Filter (Admin Only) */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🔍 Filter by Entity</h2>
              {selectedEntityIds.length > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                  {selectedEntityIds.length} selected
                </span>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowEntityDropdown(!showEntityDropdown)}
                className="w-full md:w-96 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">
                  {selectedEntityIds.length === 0
                    ? 'All Entities'
                    : selectedEntityIds.length === entities.length
                    ? 'All Entities Selected'
                    : `${selectedEntityIds.length} entit${selectedEntityIds.length > 1 ? 'ies' : 'y'} selected`}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {showEntityDropdown && (
                <div className="absolute z-50 w-full md:w-96 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
                  {/* Search box */}
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search entities..."
                      value={entitySearchTerm}
                      onChange={(e) => setEntitySearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Actions */}
                  <div className="p-2 border-b border-gray-200 flex gap-2">
                    <button
                      onClick={toggleAllEntities}
                      className="flex-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
                    >
                      {selectedEntityIds.length === entities.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={clearEntities}
                      className="flex-1 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 rounded"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Options list */}
                  <div className="overflow-y-auto max-h-64">
                    {filteredEntities.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No entities found</div>
                    ) : (
                      filteredEntities.map((entity) => (
                        <label
                          key={entity.unique_entity_id}
                          className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEntityIds.includes(entity.unique_entity_id)}
                            onChange={() => toggleEntity(entity.unique_entity_id)}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {entity.entity_name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {entity.unique_entity_id}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active filters display - show max 3 chips + count */}
            {selectedEntityIds.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {selectedEntityIds.slice(0, 3).map((entityId) => {
                  const entity = entities.find(e => e.unique_entity_id === entityId)
                  return entity ? (
                    <span
                      key={entityId}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {entity.entity_name}
                      <button
                        onClick={() => toggleEntity(entityId)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ) : null
                })}
                {selectedEntityIds.length > 3 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                    + {selectedEntityIds.length - 3} more selected
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feedback Analytics Section */}
        {feedbackStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Citizen Feedback</h2>

            {/* Row 1: Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                    <p className="text-3xl font-bold text-gray-900">{feedbackStats.overall.total_submissions || 0}</p>
                  </div>
                  <div className="text-4xl">📝</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Grievances</p>
                    <p className="text-3xl font-bold text-red-600">{feedbackStats.overall.grievance_count || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Require attention</p>
                  </div>
                  <div className="text-4xl">🚩</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Top Service Rated</p>
                    <p className="text-lg font-bold text-blue-600 truncate">
                      {feedbackStats.top_services && feedbackStats.top_services.length > 0
                        ? feedbackStats.top_services[0].service_name
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {feedbackStats.top_services && feedbackStats.top_services.length > 0
                        ? `${feedbackStats.top_services[0].submission_count} feedback submissions`
                        : 'No feedback yet'}
                    </p>
                  </div>
                  <div className="text-4xl">🏆</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Overall Average Rating</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {feedbackStats.overall.avg_satisfaction
                        ? (parseFloat(feedbackStats.overall.avg_satisfaction) * 2).toFixed(1)
                        : '0'}/10
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Service rating</p>
                  </div>
                  <div className="text-4xl">⭐</div>
                </div>
              </div>
            </div>

            {/* Row 2: Average Ratings Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Ratings Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{feedbackStats.overall.avg_ease || '0'}/5</p>
                  <p className="text-sm text-gray-600">Ease of Access</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{feedbackStats.overall.avg_clarity || '0'}/5</p>
                  <p className="text-sm text-gray-600">Clear Information</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{feedbackStats.overall.avg_timeliness || '0'}/5</p>
                  <p className="text-sm text-gray-600">Timely Delivery</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{feedbackStats.overall.avg_trust || '0'}/5</p>
                  <p className="text-sm text-gray-600">Service Trust</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{feedbackStats.overall.avg_satisfaction || '0'}/5</p>
                  <p className="text-sm text-gray-600">Satisfaction</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Service Requests Analytics Section - DTA Only */}
        {isDTA && serviceRequestStats && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Service Requests</h2>
              <p className="text-sm text-gray-600">Service requests received by the Digital Transformation Agency</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                    <p className="text-3xl font-bold text-gray-900">{serviceRequestStats.total}</p>
                    <p className="text-xs text-gray-500 mt-1">All time</p>
                  </div>
                  <div className="text-4xl">📋</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Last 7 Days</p>
                    <p className="text-3xl font-bold text-blue-600">{serviceRequestStats.last_7_days}</p>
                    <p className="text-xs text-gray-500 mt-1">Recent activity</p>
                  </div>
                  <div className="text-4xl">📅</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{serviceRequestStats.completed}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {serviceRequestStats.total > 0
                        ? `${((serviceRequestStats.completed / serviceRequestStats.total) * 100).toFixed(1)}% success rate`
                        : 'No data'
                      }
                    </p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">In Progress</p>
                    <p className="text-3xl font-bold text-orange-600">{serviceRequestStats.in_progress}</p>
                    <p className="text-xs text-gray-500 mt-1">Being processed</p>
                  </div>
                  <div className="text-4xl">⏳</div>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Status Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{serviceRequestStats.submitted}</p>
                  <p className="text-sm text-gray-600">Submitted</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{serviceRequestStats.in_progress}</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{serviceRequestStats.under_review}</p>
                  <p className="text-sm text-gray-600">Under Review</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{serviceRequestStats.completed}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{serviceRequestStats.rejected}</p>
                  <p className="text-sm text-gray-600">Rejected</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Analytics Section */}
        {ticketStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Support Tickets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Tickets</p>
                    <p className="text-3xl font-bold text-gray-900">{ticketStats.total_tickets}</p>
                    <p className="text-xs text-gray-500 mt-1">All time</p>
                  </div>
                  <div className="text-4xl">🎫</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Resolution</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {ticketStats.metrics.avg_resolution_time || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Hours</p>
                  </div>
                  <div className="text-4xl">🕒</div>
                </div>
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Priority Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(ticketStats.priority_breakdown).map(([key, priority]) => (
                  <div key={key} className="text-center p-4 rounded-lg" style={{ backgroundColor: `${priority.color}20` }}>
                    <p className="text-2xl font-bold" style={{ color: priority.color }}>{priority.count}</p>
                    <p className="text-sm text-gray-600">{priority.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Ticket Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{ticketStats.metrics.today_tickets}</p>
                  <p className="text-sm text-gray-600">Tickets Today</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{ticketStats.metrics.week_tickets}</p>
                  <p className="text-sm text-gray-600">This Week</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Service Leaderboard Section */}
        {leaderboardData && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Performance Leaderboard</h2>
              <p className="text-gray-600">
                {isStaff
                  ? 'Top and bottom performing services for your organization based on customer satisfaction, completion rates, and feedback'
                  : 'Top and bottom performing services based on customer satisfaction, completion rates, and feedback'
                }
              </p>
            </div>

            {/* Top 5 and Bottom 5 Services */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ServiceLeaderboard
                services={leaderboardData.overall.top_5}
                title="Top 5 Performing Services"
                type="top"
                weights={leaderboardData.weights}
              />
              <ServiceLeaderboard
                services={leaderboardData.overall.bottom_5}
                title="Bottom 5 Performing Services"
                type="bottom"
                weights={leaderboardData.weights}
              />
            </div>

            {/* Dimension Rankings Section */}
            {leaderboardData.dimension_rankings && (
              <div className="mt-8">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Rating Dimensions - Top & Bottom Performers</h3>
                  <p className="text-sm text-gray-600">Best and worst performing services for each rating dimension (min. 2 feedback required)</p>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'ease_of_access', label: 'Ease of Access', ratingKey: 'avg_ease' },
                    { key: 'clear_info', label: 'Clear Information', ratingKey: 'avg_clarity' },
                    { key: 'timeliness', label: 'Timeliness', ratingKey: 'avg_timeliness' },
                    { key: 'service_trust', label: 'Service Trust', ratingKey: 'avg_trust' },
                    { key: 'satisfaction', label: 'Overall Satisfaction', ratingKey: 'avg_satisfaction' },
                  ].map((dimension) => {
                    const data = leaderboardData.dimension_rankings[dimension.key as keyof typeof leaderboardData.dimension_rankings]
                    return (
                      <div key={dimension.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">{dimension.label}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Top Performer */}
                          {data.top ? (
                            <div
                              onClick={() => setSelectedServiceId(data.top!.service_id)}
                              className="border-l-4 border-green-500 bg-green-50 rounded-r-lg p-3 cursor-pointer hover:bg-green-100 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-green-700 uppercase">Top</span>
                                <span className="text-lg font-bold text-green-700">
                                  {parseFloat(data.top[dimension.ratingKey as keyof DimensionService] as string).toFixed(1)}/5
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 truncate">{data.top.service_name}</p>
                              <p className="text-xs text-gray-600 truncate">{data.top.entity_name}</p>
                              <p className="text-xs text-gray-500 mt-1">{data.top.feedback_count} reviews</p>
                            </div>
                          ) : (
                            <div className="border-l-4 border-gray-300 bg-gray-50 rounded-r-lg p-3">
                              <span className="text-xs font-semibold text-gray-500 uppercase">Top</span>
                              <p className="text-sm text-gray-400 italic mt-1">No qualifying services</p>
                            </div>
                          )}
                          {/* Bottom Performer */}
                          {data.bottom ? (
                            <div
                              onClick={() => setSelectedServiceId(data.bottom!.service_id)}
                              className="border-l-4 border-red-500 bg-red-50 rounded-r-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-red-700 uppercase">Bottom</span>
                                <span className="text-lg font-bold text-red-700">
                                  {parseFloat(data.bottom[dimension.ratingKey as keyof DimensionService] as string).toFixed(1)}/5
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 truncate">{data.bottom.service_name}</p>
                              <p className="text-xs text-gray-600 truncate">{data.bottom.entity_name}</p>
                              <p className="text-xs text-gray-500 mt-1">{data.bottom.feedback_count} reviews</p>
                            </div>
                          ) : (
                            <div className="border-l-4 border-gray-300 bg-gray-50 rounded-r-lg p-3">
                              <span className="text-xs font-semibold text-gray-500 uppercase">Bottom</span>
                              <p className="text-sm text-gray-400 italic mt-1">No qualifying services</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stats Summary */}
            {leaderboardData.total_services > 0 && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📈 Showing performance data for <strong>{leaderboardData.total_services}</strong> services with feedback data
                </p>
              </div>
            )}
          </div>
        )}

        {/* No Data Message */}
        {!feedbackStats && !serviceRequestStats && !ticketStats && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Analytics Data Available</h3>
            <p className="text-gray-600 mb-4">
              There is no data available to display at this time.
            </p>
          </div>
        )}

      </div>

      {/* Service Details Modal */}
      {selectedServiceId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {serviceDetails?.service_name || 'Loading...'}
                </h2>
                {serviceDetails && (
                  <p className="text-sm text-gray-600">{serviceDetails.entity_name}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading service details...</span>
                </div>
              ) : serviceDetails ? (
                <div className="space-y-6">
                  {/* Rating Dimensions */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Rating Dimensions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Ease of Access', value: serviceDetails.avg_ease, color: 'blue' },
                        { label: 'Clear Info', value: serviceDetails.avg_clarity, color: 'purple' },
                        { label: 'Timeliness', value: serviceDetails.avg_timeliness, color: 'orange' },
                        { label: 'Service Trust', value: serviceDetails.avg_trust, color: 'teal' },
                        { label: 'Satisfaction', value: serviceDetails.avg_satisfaction, color: 'yellow' },
                      ].map((dim) => (
                        <div key={dim.label} className={`bg-${dim.color}-50 rounded-lg p-3`}>
                          <p className="text-xs text-gray-600 mb-1">{dim.label}</p>
                          <p className={`text-xl font-bold text-${dim.color}-600`}>
                            {dim.value.toFixed(1)}<span className="text-sm font-normal text-gray-500">/5</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metrics Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Metrics Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{serviceDetails.feedback_count}</p>
                        <p className="text-sm text-gray-600">Feedback Received</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{serviceDetails.ticket_count}</p>
                        <p className="text-sm text-gray-600">Tickets Received</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{serviceDetails.resolved_count}</p>
                        <p className="text-sm text-gray-600">Tickets Closed</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{serviceDetails.grievance_count}</p>
                        <p className="text-sm text-gray-600">Grievances</p>
                      </div>
                    </div>
                  </div>

                  {/* Score Calculation */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Score Calculation</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {/* Satisfaction Component */}
                      <div className="border-b border-gray-200 pb-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">
                            Satisfaction ({serviceDetails.weights.satisfaction}% weight)
                          </span>
                          <span className="font-semibold text-yellow-600">
                            +{serviceDetails.score_components.satisfaction_points.toFixed(2)} pts
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-mono">
                          Formula: (satisfaction ÷ 5) × weight
                        </p>
                        <p className="text-sm text-gray-600 font-mono">
                          Calculation: ({serviceDetails.avg_satisfaction.toFixed(2)} ÷ 5) × {serviceDetails.weights.satisfaction / 10} = {serviceDetails.score_components.satisfaction_points.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Average rating: {serviceDetails.avg_satisfaction.toFixed(2)}/5 stars
                        </p>
                        <p className="text-xs text-gray-400">
                          Based on {serviceDetails.feedback_count} feedback submission{serviceDetails.feedback_count !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Resolution Component */}
                      <div className="border-b border-gray-200 pb-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">
                            Ticket Resolution ({serviceDetails.weights.ticket_resolution}% weight)
                          </span>
                          <span className="font-semibold text-green-600">
                            +{serviceDetails.score_components.resolution_points.toFixed(2)} pts
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-mono">
                          Formula: (resolution_rate ÷ 100) × weight
                        </p>
                        <p className="text-sm text-gray-600 font-mono">
                          Calculation: ({serviceDetails.resolution_rate.toFixed(0)} ÷ 100) × {serviceDetails.weights.ticket_resolution / 10} = {serviceDetails.score_components.resolution_points.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Resolution rate: {serviceDetails.resolution_rate.toFixed(0)}% ({serviceDetails.resolved_count} of {serviceDetails.ticket_count} tickets closed)
                        </p>
                        <p className="text-xs text-gray-400">
                          Measures support ticket resolution efficiency
                        </p>
                      </div>

                      {/* Grievance Component */}
                      <div className="border-b border-gray-200 pb-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">
                            Grievance Penalty ({serviceDetails.weights.grievance}% weight)
                          </span>
                          <span className="font-semibold text-blue-600">
                            +{serviceDetails.score_components.grievance_points.toFixed(2)} pts
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-mono">
                          Formula: (1 - grievance_rate) × weight
                        </p>
                        <p className="text-sm text-gray-600 font-mono">
                          Calculation: (1 - {(serviceDetails.grievance_rate / 100).toFixed(2)}) × {serviceDetails.weights.grievance / 10} = {serviceDetails.score_components.grievance_points.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Grievance rate: {serviceDetails.grievance_rate.toFixed(0)}% ({serviceDetails.grievance_count} of {serviceDetails.feedback_count} flagged as grievances)
                        </p>
                        <p className="text-xs text-gray-400">
                          Lower grievance rate = higher score (rewards positive feedback)
                        </p>
                      </div>

                      {/* Total Score */}
                      <div className="flex justify-between items-center pt-1">
                        <span className="font-semibold text-gray-900">Total Score</span>
                        <span className="text-xl font-bold text-gray-900">
                          {serviceDetails.overall_score.toFixed(2)} / 10
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Comments */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Recent Feedback Comments
                      {serviceDetails.recent_comments.length > 0 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({serviceDetails.recent_comments.length} comments)
                        </span>
                      )}
                    </h3>
                    {serviceDetails.recent_comments.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No comments available</p>
                    ) : (
                      <div className="space-y-3">
                        {serviceDetails.recent_comments
                          .slice(0, showAllComments ? 20 : 5)
                          .map((comment) => (
                            <div
                              key={comment.feedback_id}
                              className={`border-l-4 ${comment.grievance_flag ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'} rounded-r-lg p-3`}
                            >
                              <p className="text-sm text-gray-700">{comment.comment_text}</p>
                              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                <span>{new Date(comment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{comment.satisfaction_rating}/5</span>
                                  {comment.grievance_flag && (
                                    <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs">Grievance</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        {serviceDetails.recent_comments.length > 5 && (
                          <button
                            onClick={() => setShowAllComments(!showAllComments)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {showAllComments ? 'Show less' : `Show ${serviceDetails.recent_comments.length - 5} more comments`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load service details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

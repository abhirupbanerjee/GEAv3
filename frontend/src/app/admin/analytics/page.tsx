'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface FeedbackStats {
  total_submissions: string
  avg_satisfaction: string
  avg_ease: string
  avg_clarity: string
  avg_timeliness: string
  avg_trust: string
  grievance_count: string
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

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null)
  const [serviceRequestStats, setServiceRequestStats] = useState<ServiceRequestStats | null>(null)
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isStaff = session?.user?.roleType === 'staff'

  // Fetch all analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch feedback stats
      const feedbackResponse = await fetch('/api/feedback/stats')
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json()
        setFeedbackStats(feedbackData.overall)
      }

      // Fetch service requests stats
      const serviceRequestsResponse = await fetch('/api/admin/service-requests/stats')
      if (serviceRequestsResponse.ok) {
        const serviceRequestsData = await serviceRequestsResponse.json()
        setServiceRequestStats(serviceRequestsData.data.stats)
      }

      // Fetch tickets stats
      const ticketsResponse = await fetch('/api/admin/tickets/dashboard-stats')
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json()
        setTicketStats(ticketsData.data)
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
  }, [session])

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📊 Analytics Dashboard
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

        {/* Feedback Analytics Section */}
        {feedbackStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Citizen Feedback</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                    <p className="text-3xl font-bold text-gray-900">{feedbackStats.total_submissions || 0}</p>
                  </div>
                  <div className="text-4xl">📝</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Satisfaction</p>
                    <p className="text-3xl font-bold text-yellow-600">{feedbackStats.avg_satisfaction || '0'}/5</p>
                    <div className="flex mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(parseFloat(feedbackStats.avg_satisfaction || '0'))
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <div className="text-4xl">⭐</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Grievances</p>
                    <p className="text-3xl font-bold text-red-600">{feedbackStats.grievance_count || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Require attention</p>
                  </div>
                  <div className="text-4xl">🚩</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Service Trust</p>
                    <p className="text-3xl font-bold text-green-600">{feedbackStats.avg_trust || '0'}/5</p>
                    <p className="text-xs text-gray-500 mt-1">Reliability rating</p>
                  </div>
                  <div className="text-4xl">🤝</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Service Requests Analytics Section */}
        {serviceRequestStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Requests</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
                    <p className="text-sm text-gray-600 mb-1">Overdue</p>
                    <p className="text-3xl font-bold text-red-600">{ticketStats.metrics.overdue_tickets}</p>
                    <p className="text-xs text-gray-500 mt-1">Past SLA target</p>
                  </div>
                  <div className="text-4xl">⚠️</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">SLA Compliance</p>
                    <p className="text-3xl font-bold text-green-600">{ticketStats.metrics.sla_compliance}</p>
                    <p className="text-xs text-gray-500 mt-1">On-time resolution</p>
                  </div>
                  <div className="text-4xl">⏱️</div>
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
    </div>
  )
}

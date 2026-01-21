'use client'

import { useState, useEffect } from 'react'

interface ServiceData {
  service_id: string
  service_name: string
  entity_name: string
  feedback_count: number
  avg_satisfaction: string | number
  grievance_count: number
  ticket_count?: number
  resolved_count?: number
  resolution_rate?: string | number
  grievance_rate?: string | number
  overall_score: string | number
  // Legacy fields for backward compatibility
  request_count?: number
  completed_count?: number
  completion_rate?: string | number
}

interface Weights {
  satisfaction: number
  ticket_resolution: number
  grievance: number
}

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
  weights: Weights
  recent_comments: Array<{
    feedback_id: string
    comment_text: string
    satisfaction_rating: number
    created_at: string
    grievance_flag: boolean
  }>
}

interface ServiceLeaderboardProps {
  services: ServiceData[]
  title: string
  type: 'top' | 'bottom'
  weights?: Weights
}

export default function ServiceLeaderboard({ services, title, type, weights }: ServiceLeaderboardProps) {
  const isTop = type === 'top'
  const [showScoreInfo, setShowScoreInfo] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)

  // Fetch service details when a service is selected
  useEffect(() => {
    if (selectedServiceId) {
      setLoadingDetails(true)
      setShowAllComments(false)
      fetch(`/api/admin/service-leaderboard/${selectedServiceId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setServiceDetails(data)
          }
        })
        .catch(err => console.error('Error fetching service details:', err))
        .finally(() => setLoadingDetails(false))
    } else {
      setServiceDetails(null)
    }
  }, [selectedServiceId])

  // Default weights
  const displayWeights = weights || { satisfaction: 40, ticket_resolution: 25, grievance: 35 }

  if (!services || services.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      </div>
    )
  }

  const closeModal = () => {
    setSelectedServiceId(null)
    setServiceDetails(null)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`text-2xl ${isTop ? 'text-green-600' : 'text-red-600'}`}>
              {isTop ? '🏆' : '⚠️'}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>

          {/* Score Info Button */}
          <button
            onClick={() => setShowScoreInfo(!showScoreInfo)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="How is the score calculated?"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Score Calculation Info */}
        {showScoreInfo && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <h4 className="font-semibold text-blue-900 mb-2">Overall Score Calculation (0-10 scale)</h4>
            <div className="text-blue-800 space-y-1">
              <p><strong>1. Customer Satisfaction ({displayWeights.satisfaction}%):</strong> (Rating/5) × {displayWeights.satisfaction / 10} (max {displayWeights.satisfaction / 10} points)</p>
              <p><strong>2. Ticket Resolution ({displayWeights.ticket_resolution}%):</strong> (Resolution%/100) × {displayWeights.ticket_resolution / 10} (max {displayWeights.ticket_resolution / 10} points)</p>
              <p><strong>3. Grievance Penalty ({displayWeights.grievance}%):</strong> (1 - grievance rate) × {displayWeights.grievance / 10} (max {displayWeights.grievance / 10} points)</p>
              <p className="mt-2 pt-2 border-t border-blue-300">
                <strong>Example:</strong> A service with 4.5/5 satisfaction, 80% resolution, and 10% grievances scores:<br/>
                (4.5/5 × {displayWeights.satisfaction / 10}) + (0.8 × {displayWeights.ticket_resolution / 10}) + (0.9 × {displayWeights.grievance / 10}) = <strong>{((4.5/5 * displayWeights.satisfaction / 10) + (0.8 * displayWeights.ticket_resolution / 10) + (0.9 * displayWeights.grievance / 10)).toFixed(2)}</strong>
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {services.map((service, index) => {
            const rank = index + 1
            const satisfactionScore = parseFloat(service.avg_satisfaction?.toString() || '0')
            const resolutionRate = parseFloat((service.resolution_rate ?? service.completion_rate)?.toString() || '0')
            const overallScore = parseFloat(service.overall_score?.toString() || '0')
            const ticketCount = service.ticket_count ?? service.request_count ?? 0
            const resolvedCount = service.resolved_count ?? service.completed_count ?? 0

            return (
              <div
                key={service.service_id}
                onClick={() => setSelectedServiceId(service.service_id)}
                className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
                  isTop
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : 'border-red-200 bg-red-50 hover:bg-red-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        isTop
                          ? rank === 1
                            ? 'bg-yellow-400 text-yellow-900'
                            : rank === 2
                            ? 'bg-gray-300 text-gray-800'
                            : rank === 3
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {rank}
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-gray-900 truncate">
                      {service.service_name}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">{service.entity_name}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {service.service_id}</p>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      {/* Overall Score */}
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">Overall Score</p>
                        <p className="text-lg font-bold text-gray-900">{overallScore.toFixed(1)}</p>
                      </div>

                      {/* Satisfaction */}
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">Satisfaction</p>
                        <div className="flex items-center gap-1">
                          <p className="text-lg font-bold text-yellow-600">
                            {satisfactionScore.toFixed(1)}
                          </p>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= Math.round(satisfactionScore)
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
                      </div>

                      {/* Feedback Count */}
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">Feedback</p>
                        <p className="text-lg font-bold text-blue-600">{service.feedback_count}</p>
                        {service.grievance_count > 0 && (
                          <p className="text-xs text-red-600 font-medium">
                            {service.grievance_count} grievances
                          </p>
                        )}
                      </div>

                      {/* Resolution Rate */}
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">Resolution</p>
                        <p className="text-lg font-bold text-green-600">
                          {resolutionRate.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {resolvedCount}/{ticketCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Click indicator */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Service Details Modal */}
      {selectedServiceId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {loadingDetails ? 'Loading...' : serviceDetails?.service_name || 'Service Details'}
                </h2>
                {serviceDetails && (
                  <p className="text-sm text-gray-600">{serviceDetails.entity_name}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : serviceDetails ? (
                <div className="space-y-6">
                  {/* Section 1: Ratings Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Rating Dimensions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Ease of Access', value: serviceDetails.avg_ease, color: 'blue' },
                        { label: 'Clear Info', value: serviceDetails.avg_clarity, color: 'purple' },
                        { label: 'Timeliness', value: serviceDetails.avg_timeliness, color: 'orange' },
                        { label: 'Service Trust', value: serviceDetails.avg_trust, color: 'green' },
                        { label: 'Satisfaction', value: serviceDetails.avg_satisfaction, color: 'yellow' },
                      ].map(rating => (
                        <div key={rating.label} className={`bg-${rating.color}-50 rounded-lg p-3`}>
                          <p className="text-xs text-gray-600 mb-1">{rating.label}</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-xl font-bold text-${rating.color}-600`}>
                              {rating.value?.toFixed(1) || '0.0'}
                            </p>
                            <span className="text-xs text-gray-500">/5</span>
                          </div>
                          <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`bg-${rating.color}-500 h-1.5 rounded-full`}
                              style={{ width: `${((rating.value || 0) / 5) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Metrics Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Metrics Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{serviceDetails.feedback_count}</p>
                        <p className="text-sm text-gray-600">Feedback Received</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{serviceDetails.ticket_count}</p>
                        <p className="text-sm text-gray-600">Tickets Received</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{serviceDetails.resolved_count}</p>
                        <p className="text-sm text-gray-600">Tickets Closed</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{serviceDetails.grievance_count}</p>
                        <p className="text-sm text-gray-600">Grievances</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Score Calculation */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Score Calculation</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Satisfaction: ({serviceDetails.avg_satisfaction.toFixed(2)}/5) × {serviceDetails.weights.satisfaction / 10}
                          </span>
                          <span className="font-semibold text-yellow-600">
                            +{serviceDetails.score_components.satisfaction_points.toFixed(2)} pts
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Resolution: ({serviceDetails.resolution_rate.toFixed(1)}%/100) × {serviceDetails.weights.ticket_resolution / 10}
                          </span>
                          <span className="font-semibold text-green-600">
                            +{serviceDetails.score_components.resolution_points.toFixed(2)} pts
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Grievance: (1 - {(serviceDetails.grievance_rate / 100).toFixed(2)}) × {serviceDetails.weights.grievance / 10}
                          </span>
                          <span className="font-semibold text-blue-600">
                            +{serviceDetails.score_components.grievance_points.toFixed(2)} pts
                          </span>
                        </div>
                        <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between items-center">
                          <span className="font-semibold text-gray-900">Total Score</span>
                          <span className="text-xl font-bold text-gray-900">
                            {serviceDetails.overall_score.toFixed(2)} / 10
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Recent Comments */}
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
                        {(showAllComments
                          ? serviceDetails.recent_comments
                          : serviceDetails.recent_comments.slice(0, 5)
                        ).map((comment) => (
                          <div
                            key={comment.feedback_id}
                            className={`p-3 rounded-lg border ${
                              comment.grievance_flag
                                ? 'bg-red-50 border-red-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-gray-700 flex-1">{comment.comment_text}</p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-sm font-medium text-yellow-600">
                                  {comment.satisfaction_rating}/5
                                </span>
                                {comment.grievance_flag && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                    Grievance
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(comment.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        ))}
                        {serviceDetails.recent_comments.length > 5 && (
                          <button
                            onClick={() => setShowAllComments(!showAllComments)}
                            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {showAllComments
                              ? 'Show less'
                              : `Show ${serviceDetails.recent_comments.length - 5} more comments`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Failed to load service details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

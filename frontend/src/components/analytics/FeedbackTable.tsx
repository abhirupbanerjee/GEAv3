'use client'

import { useState } from 'react'

interface FeedbackTableProps {
  topServices: Array<{
    service_id: string
    service_name: string
    entity_name: string
    submission_count: string
    avg_satisfaction: string
  }> | null
  grievances: Array<{
    feedback_id: number
    service_name: string
    entity_name: string
    satisfaction_rating: number
    comment_text: string
    submitted_at: string
  }>
}

export default function FeedbackTable({ topServices, grievances }: FeedbackTableProps) {
  const [expandedComment, setExpandedComment] = useState<number | null>(null)

  const getStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  const getRatingColor = (rating: number | string) => {
    const r = typeof rating === 'string' ? parseFloat(rating) : rating
    if (r >= 4.5) return 'text-green-600'
    if (r >= 3.5) return 'text-blue-600'
    if (r >= 2.5) return 'text-yellow-600'
    if (r >= 1.5) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      
      {/* Top Services Table */}
      {topServices && topServices.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              🏆 Service Performance Rankings
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Top services by submission volume and satisfaction
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Rating
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stars
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topServices.map((service, index) => {
                  const rating = parseFloat(service.avg_satisfaction)
                  return (
                    <tr key={service.service_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index < 3 ? (
                            <span className="text-2xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-semibold">
                              #{index + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {service.service_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {service.entity_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {service.submission_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${getRatingColor(rating)}`}>
                          {rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-yellow-400">
                          {getStars(Math.round(rating))}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grievances Table */}
      {grievances.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-red-200">
          <div className="p-6 border-b border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚩</span>
              <div>
                <h3 className="text-xl font-bold text-red-900">
                  Recent Grievances ({grievances.length})
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Formal complaints requiring immediate attention
                </p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-red-900 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Comment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grievances.map((grievance) => {
                  const isExpanded = expandedComment === grievance.feedback_id
                  const comment = grievance.comment_text || 'No comment provided'
                  const truncatedComment = comment.length > 100 
                    ? comment.substring(0, 100) + '...' 
                    : comment

                  return (
                    <tr key={grievance.feedback_id} className="hover:bg-red-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                          #{grievance.feedback_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {grievance.service_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {grievance.entity_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-bold ${getRatingColor(grievance.satisfaction_rating)}`}>
                            {grievance.satisfaction_rating}
                          </span>
                          <span className="text-yellow-400 text-xs">
                            {getStars(grievance.satisfaction_rating)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {isExpanded ? comment : truncatedComment}
                          {comment.length > 100 && (
                            <button
                              onClick={() => setExpandedComment(isExpanded ? null : grievance.feedback_id)}
                              className="ml-2 text-blue-600 hover:text-blue-700 font-semibold"
                            >
                              {isExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(grievance.submitted_at).toLocaleDateString()}
                          <div className="text-xs text-gray-400">
                            {new Date(grievance.submitted_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Grievances Message */}
      {grievances.length === 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-bold text-green-900 mb-2">
            No Active Grievances
          </h3>
          <p className="text-green-700">
            All feedback submissions are positive. Great job!
          </p>
        </div>
      )}
    </div>
  )
}
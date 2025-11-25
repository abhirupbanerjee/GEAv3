'use client'

interface ServiceLeaderboardProps {
  services: Array<{
    service_id: string
    service_name: string
    entity_name: string
    feedback_count: number
    avg_satisfaction: string | number
    grievance_count: number
    request_count: number
    completed_count: number
    completion_rate: string | number
    overall_score: string | number
  }>
  title: string
  type: 'top' | 'bottom'
}

export default function ServiceLeaderboard({ services, title, type }: ServiceLeaderboardProps) {
  const isTop = type === 'top'

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className={`text-2xl ${isTop ? 'text-green-600' : 'text-red-600'}`}>
          {isTop ? '🏆' : '⚠️'}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => {
          const rank = index + 1
          const satisfactionScore = parseFloat(service.avg_satisfaction?.toString() || '0')
          const completionRate = parseFloat(service.completion_rate?.toString() || '0')
          const overallScore = parseFloat(service.overall_score?.toString() || '0')

          return (
            <div
              key={service.service_id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
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

                    {/* Completion Rate */}
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-600 mb-1">Completion</p>
                      <p className="text-lg font-bold text-green-600">
                        {completionRate.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {service.completed_count}/{service.request_count}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface PopularService {
  service_id: string
  service_name: string
  service_description: string
  service_category: string
  entity_name: string
  entity_id: string
  life_events: string[]
  feedback_count: number
  avg_satisfaction: number
  grievance_count: number
}

interface PopularServicesProps {
  onServiceSelect: (service: any) => void
}

export default function PopularServices({ onServiceSelect }: PopularServicesProps) {
  const [services, setServices] = useState<PopularService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchPopularServices()
  }, [])

  const fetchPopularServices = async () => {
    try {
      setLoading(true)
      setError(false)
      const response = await fetch('/api/feedback/popular-services')

      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Error fetching popular services:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // Loading State
  if (loading) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Popular Services</h3>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 ml-2"></div>
        </div>

        {/* Skeleton Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-4 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6 mb-3"></div>
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="mx-auto h-10 w-10 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-red-700">Unable to load popular services. Please try again later.</p>
      </div>
    )
  }

  // Empty State
  if (services.length === 0) {
    return null // Don't show section if no popular services
  }

  // Helper function to format category labels
  const formatCategoryLabel = (category: string): string => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Helper function to get star rating display
  const getStarRating = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, index) => (
          <svg
            key={index}
            className={`w-4 h-4 ${
              index < fullStars
                ? 'text-yellow-400 fill-current'
                : index === fullStars && hasHalfStar
                ? 'text-yellow-400 fill-current opacity-50'
                : 'text-gray-300'
            }`}
            fill={index < fullStars ? 'currentColor' : 'none'}
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
        <span className="text-sm text-gray-600 ml-1">({rating.toFixed(1)})</span>
      </div>
    )
  }

  return (
    <div className="mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Popular Services</h3>
        <span className="text-sm text-gray-500">(Based on recent feedback)</span>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service) => (
          <div
            key={service.service_id}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 p-4 flex flex-col"
          >
            {/* Service Name with Popular Badge */}
            <div className="flex items-start gap-2 mb-1">
              <h4 className="text-md font-semibold text-gray-900 line-clamp-2 flex-1">
                {service.service_name}
              </h4>
              <span className="flex-shrink-0 text-yellow-500" title="Popular Service">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
            </div>

            {/* Entity Name */}
            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {service.entity_name}
            </p>

            {/* Description (truncated) */}
            <p className="text-xs text-gray-700 mb-3 line-clamp-2 flex-grow">
              {service.service_description || 'No description available'}
            </p>

            {/* Rating and Feedback Count */}
            <div className="mb-3 space-y-1">
              {service.avg_satisfaction && getStarRating(service.avg_satisfaction)}
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                {service.feedback_count} {service.feedback_count === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            {/* Category Badge */}
            {service.service_category && (
              <div className="mb-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {formatCategoryLabel(service.service_category)}
                </span>
              </div>
            )}

            {/* Give Feedback Button */}
            <button
              onClick={() => onServiceSelect(service)}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Give Feedback
            </button>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        These services have received the most feedback in the last 90 days
      </p>
    </div>
  )
}

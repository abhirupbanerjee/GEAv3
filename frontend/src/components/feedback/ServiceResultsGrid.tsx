'use client'

import ServiceCard from './ServiceCard'

interface ServiceResultsGridProps {
  services: any[]
  loading: boolean
  onServiceSelect: (service: any) => void
  hasActiveFilters: boolean
  popularServiceIds?: Set<string>
}

export default function ServiceResultsGrid({
  services,
  loading,
  onServiceSelect,
  hasActiveFilters,
  popularServiceIds
}: ServiceResultsGridProps) {
  // Loading State
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Loading services...
          </h3>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>

        {/* Skeleton Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty State - No filters applied
  if (!hasActiveFilters) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Browse Services by Filter
        </h3>
        <p className="text-gray-600">
          Select filters above to browse available government services
        </p>
      </div>
    )
  }

  // Empty State - No results found with filters
  if (services.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-yellow-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No services found
        </h3>
        <p className="text-gray-600 mb-4">
          No services match your current filters. Try adjusting your selection.
        </p>
        <p className="text-sm text-gray-500">
          Or use the search box above to find services by name
        </p>
      </div>
    )
  }

  // Results Grid
  return (
    <div>
      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {services.length} {services.length === 1 ? 'service' : 'services'} found
        </h3>
        <span className="text-sm text-gray-600">
          Click a card to give feedback
        </span>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <ServiceCard
            key={service.service_id}
            service={service}
            onSelect={onServiceSelect}
            isPopular={popularServiceIds?.has(service.service_id) || false}
          />
        ))}
      </div>

      {/* Pagination hint (for future) */}
      {services.length >= 50 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Showing first 50 results. Refine your filters to see more specific services.
          </p>
        </div>
      )}
    </div>
  )
}

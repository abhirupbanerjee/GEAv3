'use client'

interface ServiceCardProps {
  service: {
    service_id: string
    service_name: string
    service_description: string
    entity_name: string
    entity_id: string
    service_category: string
    life_events: string[]
  }
  onSelect: (service: any) => void
}

export default function ServiceCard({ service, onSelect }: ServiceCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 p-6 flex flex-col h-full">
      {/* Service Name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {service.service_name}
      </h3>

      {/* Entity Name */}
      <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        {service.entity_name}
      </p>

      {/* Description (truncated to 2 lines) */}
      <p className="text-sm text-gray-700 mb-4 line-clamp-2 flex-grow">
        {service.service_description || 'No description available'}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Category Badge */}
        {service.service_category && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            {formatCategoryLabel(service.service_category)}
          </span>
        )}

        {/* Life Event Badges (show first 2) */}
        {service.life_events && service.life_events.length > 0 && (
          <>
            {service.life_events.slice(0, 2).map((event, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded"
              >
                {formatLifeEventLabel(event)}
              </span>
            ))}
            {service.life_events.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                +{service.life_events.length - 2} more
              </span>
            )}
          </>
        )}
      </div>

      {/* Give Feedback Button */}
      <button
        onClick={() => onSelect(service)}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        Give Feedback
      </button>
    </div>
  )
}

// Helper function to format category labels (convert snake_case to Title Case)
function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper function to format life event labels (convert snake_case to Title Case)
function formatLifeEventLabel(event: string): string {
  return event
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

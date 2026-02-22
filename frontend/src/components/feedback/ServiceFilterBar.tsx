'use client'

import { useState, useEffect } from 'react'

interface FilterOption {
  value: string
  label: string
  description?: string
  category?: string
  service_count?: number
}

interface ServiceFilterBarProps {
  filters: {
    entity_id: string | null
    life_event: string | null
    category: string | null
  }
  onFilterChange: (filters: any) => void
}

export default function ServiceFilterBar({ filters, onFilterChange }: ServiceFilterBarProps) {
  const [loading, setLoading] = useState(true)
  const [entities, setEntities] = useState<FilterOption[]>([])
  const [lifeEvents, setLifeEvents] = useState<FilterOption[]>([])
  const [categories, setCategories] = useState<FilterOption[]>([])

  // State for entity-specific filtered options
  const [filteredLifeEvents, setFilteredLifeEvents] = useState<FilterOption[]>([])
  const [filteredCategories, setFilteredCategories] = useState<FilterOption[]>([])
  const [isLoadingDependentFilters, setIsLoadingDependentFilters] = useState(false)

  // Fetch filter options from API on mount
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  // Fetch filtered metadata when any filter changes (cascading filters)
  useEffect(() => {
    if (filters.entity_id || filters.life_event || filters.category) {
      fetchFilteredMetadata(filters)
    } else {
      // Reset to all options when all filters cleared
      setFilteredLifeEvents(lifeEvents)
      setFilteredCategories(categories)
    }
  }, [filters.entity_id, filters.life_event, filters.category, lifeEvents, categories])

  const fetchFilterOptions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/public/services')

      if (response.ok) {
        const data = await response.json()
        const entities = data.metadata.entities || []
        const allLifeEvents = data.metadata.life_events || []
        const allCategories = data.metadata.categories || []

        setEntities(entities)
        setLifeEvents(allLifeEvents)
        setCategories(allCategories)

        // Initialize filtered lists to all options
        setFilteredLifeEvents(allLifeEvents)
        setFilteredCategories(allCategories)
      } else {
        console.error('Failed to fetch filter options')
      }
    } catch (error) {
      console.error('Error fetching filter options:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFilteredMetadata = async (currentFilters: typeof filters) => {
    setIsLoadingDependentFilters(true)
    try {
      // Build query string with all active filters
      const params = new URLSearchParams()
      if (currentFilters.entity_id) params.append('entity_id', currentFilters.entity_id)
      if (currentFilters.life_event) params.append('life_event', currentFilters.life_event)
      if (currentFilters.category) params.append('category', currentFilters.category)

      const response = await fetch(`/api/public/services/metadata?${params.toString()}`)

      if (response.ok) {
        const data = await response.json()
        const filteredLifeEventsList = data.filters.life_events || []
        const filteredCategoriesList = data.filters.categories || []

        setFilteredLifeEvents(filteredLifeEventsList)
        setFilteredCategories(filteredCategoriesList)

        // Auto-clear incompatible selections
        const filtersToUpdate: Partial<typeof filters> = {}
        if (currentFilters.life_event && !filteredLifeEventsList.find((le: FilterOption) => le.value === currentFilters.life_event)) {
          filtersToUpdate.life_event = null
        }
        if (currentFilters.category && !filteredCategoriesList.find((c: FilterOption) => c.value === currentFilters.category)) {
          filtersToUpdate.category = null
        }

        // Only update if there are incompatible selections to clear
        if (Object.keys(filtersToUpdate).length > 0) {
          onFilterChange({
            ...currentFilters,
            ...filtersToUpdate
          })
        }
      } else {
        console.error('Failed to fetch filtered metadata')
        // Fallback to all options on error
        setFilteredLifeEvents(lifeEvents)
        setFilteredCategories(categories)
      }
    } catch (error) {
      console.error('Error fetching filtered metadata:', error)
      // Fallback to all options on error
      setFilteredLifeEvents(lifeEvents)
      setFilteredCategories(categories)
    } finally {
      setIsLoadingDependentFilters(false)
    }
  }

  const handleFilterChange = (filterName: string, value: string) => {
    onFilterChange({
      ...filters,
      [filterName]: value || null
    })
  }

  const hasActiveFilters = () => {
    return filters.entity_id || filters.life_event || filters.category
  }

  const clearAllFilters = () => {
    onFilterChange({
      entity_id: null,
      life_event: null,
      category: null
    })
  }

  // Get label for selected filter values
  const getEntityLabel = () => entities.find(e => e.value === filters.entity_id)?.label
  const getLifeEventLabel = () => lifeEvents.find(e => e.value === filters.life_event)?.label
  const getCategoryLabel = () => categories.find(c => c.value === filters.category)?.label

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-5 h-5 text-gray-600"
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
        <h3 className="text-md font-semibold text-gray-900">Filter Services</h3>
      </div>

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entity Filter */}
        <div>
          <label htmlFor="entity-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Government Entity
          </label>
          <select
            id="entity-filter"
            value={filters.entity_id || ''}
            onChange={(e) => handleFilterChange('entity_id', e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Entities</option>
            {loading ? (
              <option disabled>Loading...</option>
            ) : (
              entities.map((entity) => (
                <option key={entity.value} value={entity.value}>
                  {entity.label}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Life Event Filter */}
        <div>
          <label htmlFor="lifeevent-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Life Event
            {isLoadingDependentFilters && (
              <span className="ml-2 text-xs text-gray-500">(Updating...)</span>
            )}
          </label>
          <select
            id="lifeevent-filter"
            value={filters.life_event || ''}
            onChange={(e) => handleFilterChange('life_event', e.target.value)}
            disabled={loading || isLoadingDependentFilters}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Life Events</option>
            {loading ? (
              <option disabled>Loading...</option>
            ) : (
              (filters.entity_id ? filteredLifeEvents : lifeEvents).map((event) => (
                <option key={event.value} value={event.value}>
                  {event.label}
                  {filters.entity_id && event.service_count ? ` (${event.service_count})` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Service Category
            {isLoadingDependentFilters && (
              <span className="ml-2 text-xs text-gray-500">(Updating...)</span>
            )}
          </label>
          <select
            id="category-filter"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            disabled={loading || isLoadingDependentFilters}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Categories</option>
            {loading ? (
              <option disabled>Loading...</option>
            ) : (
              (filters.entity_id ? filteredCategories : categories).map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                  {filters.entity_id && category.service_count ? ` (${category.service_count})` : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Active Filters Display and Clear Button */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-sm font-medium text-gray-700">Active filters:</span>

          {filters.entity_id && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              {getEntityLabel()}
            </span>
          )}

          {filters.life_event && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {getLifeEventLabel()}
            </span>
          )}

          {filters.category && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              {getCategoryLabel()}
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All
          </button>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        Select one or more filters to browse services, or use the search box below to find by name
      </p>
    </div>
  )
}

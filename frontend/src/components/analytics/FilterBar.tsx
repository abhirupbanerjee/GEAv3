'use client'

import { useState, useEffect } from 'react'

interface Filters {
  service_id: string
  entity_id: string
  start_date: string
  end_date: string
  channel: string
}

interface FilterBarProps {
  filters: Filters
  onFilterChange: (filters: Filters) => void
  onApply: () => void
  onReset: () => void
}

interface Service {
  service_id: string
  service_name: string
}

interface Entity {
  entity_id: string
  entity_name: string
}

export default function FilterBar({ filters, onFilterChange, onApply, onReset }: FilterBarProps) {
  const [services, setServices] = useState<Service[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Load services for dropdown
  useEffect(() => {
    const loadServices = async () => {
      setLoadingServices(true)
      try {
        // Search for all services
        const response = await fetch('/api/feedback/search?q=service')
        if (response.ok) {
          const data = await response.json()
          setServices(data.results || [])
          
          // Extract unique entities
          const uniqueEntities = Array.from(
            new Map(
              data.results.map((s: any) => [s.entity_id, { entity_id: s.entity_id, entity_name: s.entity_name }])
            ).values()
          ) as Entity[]
          setEntities(uniqueEntities)
        }
      } catch (error) {
        console.error('Error loading services:', error)
      } finally {
        setLoadingServices(false)
      }
    }
    loadServices()
  }, [])

  const handleInputChange = (field: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [field]: value })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">🔍 Filters</h2>
          {hasActiveFilters && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
              Active
            </span>
          )}
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden text-blue-600 hover:text-blue-700 font-semibold"
        >
          {showFilters ? 'Hide' : 'Show'} Filters
        </button>
      </div>

      {/* Filter Controls */}
      <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          
          {/* Service Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service
            </label>
            <select
              value={filters.service_id}
              onChange={(e) => handleInputChange('service_id', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingServices}
            >
              <option value="">All Services</option>
              {services.map((service) => (
                <option key={service.service_id} value={service.service_id}>
                  {service.service_name}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity/Department
            </label>
            <select
              value={filters.entity_id}
              onChange={(e) => handleInputChange('entity_id', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingServices}
            >
              <option value="">All Entities</option>
              {entities.map((entity) => (
                <option key={entity.entity_id} value={entity.entity_id}>
                  {entity.entity_name}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel
            </label>
            <select
              value={filters.channel}
              onChange={(e) => handleInputChange('channel', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Channels</option>
              <option value="ea_portal">EA Portal</option>
              <option value="qr_code">QR Code</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onApply}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Apply Filters
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          )}

          {loadingServices && (
            <span className="text-sm text-gray-500">Loading options...</span>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {filters.service_id && (
                <span className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-200">
                  Service: {services.find(s => s.service_id === filters.service_id)?.service_name || filters.service_id}
                </span>
              )}
              {filters.entity_id && (
                <span className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-200">
                  Entity: {entities.find(e => e.entity_id === filters.entity_id)?.entity_name || filters.entity_id}
                </span>
              )}
              {filters.channel && (
                <span className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-200">
                  Channel: {filters.channel}
                </span>
              )}
              {filters.start_date && (
                <span className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-200">
                  From: {new Date(filters.start_date).toLocaleDateString()}
                </span>
              )}
              {filters.end_date && (
                <span className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-200">
                  To: {new Date(filters.end_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
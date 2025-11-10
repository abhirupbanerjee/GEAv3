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
  entity_id: string
  entity_name?: string
  is_active?: boolean
}

interface Entity {
  unique_entity_id: string
  entity_name: string
  is_active?: boolean
}

export default function FilterBar({ filters, onFilterChange, onApply, onReset }: FilterBarProps) {
  const [services, setServices] = useState<Service[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  // Multi-select state
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showEntityDropdown, setShowEntityDropdown] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')
  const [entitySearchTerm, setEntitySearchTerm] = useState('')

  // Load ALL services and entities from proper endpoints
  useEffect(() => {
    const loadData = async () => {
      setLoadingServices(true)
      setLoadingEntities(true)
      
      try {
        const [servicesRes, entitiesRes] = await Promise.all([
          fetch('/api/managedata/services'),
          fetch('/api/managedata/entities')
        ])
        
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json()
          // Filter only active services
          setServices(servicesData.filter((s: Service) => s.is_active !== false))
        }
        
        if (entitiesRes.ok) {
          const entitiesData = await entitiesRes.json()
          // Filter only active entities
          setEntities(entitiesData.filter((e: Entity) => e.is_active !== false))
        }
      } catch (error) {
        console.error('Error loading filter data:', error)
      } finally {
        setLoadingServices(false)
        setLoadingEntities(false)
      }
    }
    loadData()
  }, [])

  // Initialize selected items from filters
  useEffect(() => {
    if (filters.service_id) {
      setSelectedServices(filters.service_id.split(',').filter(Boolean))
    } else {
      setSelectedServices([])
    }
    
    if (filters.entity_id) {
      setSelectedEntities(filters.entity_id.split(',').filter(Boolean))
    } else {
      setSelectedEntities([])
    }
  }, [filters.service_id, filters.entity_id])

  const handleInputChange = (field: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [field]: value })
  }

  // Service multi-select handlers
  const toggleService = (serviceId: string) => {
    const newSelected = selectedServices.includes(serviceId)
      ? selectedServices.filter(id => id !== serviceId)
      : [...selectedServices, serviceId]
    
    setSelectedServices(newSelected)
    onFilterChange({ ...filters, service_id: newSelected.join(',') })
  }

  const toggleAllServices = () => {
    if (selectedServices.length === services.length) {
      setSelectedServices([])
      onFilterChange({ ...filters, service_id: '' })
    } else {
      const allIds = services.map(s => s.service_id)
      setSelectedServices(allIds)
      onFilterChange({ ...filters, service_id: allIds.join(',') })
    }
  }

  const clearServices = () => {
    setSelectedServices([])
    onFilterChange({ ...filters, service_id: '' })
  }

  // Entity multi-select handlers
  const toggleEntity = (entityId: string) => {
    const newSelected = selectedEntities.includes(entityId)
      ? selectedEntities.filter(id => id !== entityId)
      : [...selectedEntities, entityId]
    
    setSelectedEntities(newSelected)
    onFilterChange({ ...filters, entity_id: newSelected.join(',') })
  }

  const toggleAllEntities = () => {
    if (selectedEntities.length === entities.length) {
      setSelectedEntities([])
      onFilterChange({ ...filters, entity_id: '' })
    } else {
      const allIds = entities.map(e => e.unique_entity_id)
      setSelectedEntities(allIds)
      onFilterChange({ ...filters, entity_id: allIds.join(',') })
    }
  }

  const clearEntities = () => {
    setSelectedEntities([])
    onFilterChange({ ...filters, entity_id: '' })
  }

  // Filter services and entities by search term
  const filteredServices = services.filter(s => 
    s.service_name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
    s.service_id.toLowerCase().includes(serviceSearchTerm.toLowerCase())
  )

  const filteredEntities = entities.filter(e => 
    e.entity_name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
    e.unique_entity_id.toLowerCase().includes(entitySearchTerm.toLowerCase())
  )

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
          
          {/* Service Filter - Multi-Select */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service {selectedServices.length > 0 && `(${selectedServices.length})`}
            </label>
            <div className="relative">
              <button
                onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                disabled={loadingServices}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">
                  {selectedServices.length === 0 
                    ? 'All Services' 
                    : selectedServices.length === services.length 
                    ? 'All Services Selected'
                    : `${selectedServices.length} selected`}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {showServiceDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
                  {/* Search box */}
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={serviceSearchTerm}
                      onChange={(e) => setServiceSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Actions */}
                  <div className="p-2 border-b border-gray-200 flex gap-2">
                    <button
                      onClick={toggleAllServices}
                      className="flex-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
                    >
                      {selectedServices.length === services.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={clearServices}
                      className="flex-1 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 rounded"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Options list */}
                  <div className="overflow-y-auto max-h-64">
                    {loadingServices ? (
                      <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                    ) : filteredServices.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No services found</div>
                    ) : (
                      filteredServices.map((service) => (
                        <label
                          key={service.service_id}
                          className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service.service_id)}
                            onChange={() => toggleService(service.service_id)}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {service.service_name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {service.entity_name} • {service.service_id}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Entity Filter - Multi-Select */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity/Department {selectedEntities.length > 0 && `(${selectedEntities.length})`}
            </label>
            <div className="relative">
              <button
                onClick={() => setShowEntityDropdown(!showEntityDropdown)}
                disabled={loadingEntities}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">
                  {selectedEntities.length === 0 
                    ? 'All Entities' 
                    : selectedEntities.length === entities.length 
                    ? 'All Entities Selected'
                    : `${selectedEntities.length} selected`}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {showEntityDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
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
                      {selectedEntities.length === entities.length ? 'Deselect All' : 'Select All'}
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
                    {loadingEntities ? (
                      <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                    ) : filteredEntities.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No entities found</div>
                    ) : (
                      filteredEntities.map((entity) => (
                        <label
                          key={entity.unique_entity_id}
                          className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEntities.includes(entity.unique_entity_id)}
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

          {/* Start Date Filter */}
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

          {/* End Date Filter */}
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
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {selectedServices.length > 0 && (
                <span className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-200">
                  {selectedServices.length === services.length 
                    ? 'All Services' 
                    : `${selectedServices.length} Service${selectedServices.length > 1 ? 's' : ''}`}
                </span>
              )}
              {selectedEntities.length > 0 && (
                <span className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-200">
                  {selectedEntities.length === entities.length 
                    ? 'All Entities' 
                    : `${selectedEntities.length} Entit${selectedEntities.length > 1 ? 'ies' : 'y'}`}
                </span>
              )}
              {filters.channel && (
                <span className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-200">
                  Channel: {filters.channel === 'ea_portal' ? 'EA Portal' : 'QR Code'}
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
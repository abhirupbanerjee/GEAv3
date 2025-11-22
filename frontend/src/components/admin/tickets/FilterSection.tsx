/**
 * FilterSection Component
 *
 * Provides filter controls for the ticket management dashboard
 * Includes dropdowns for entity, service, status, priority, and search
 */

'use client'

import React, { useState, useEffect } from 'react'
import type { TicketFilters } from '@/types/tickets'

interface FilterSectionProps {
  onFilterChange: (filters: TicketFilters) => void
  currentFilters: TicketFilters
}

interface DropdownOption {
  value: string
  label: string
}

export function FilterSection({ onFilterChange, currentFilters }: FilterSectionProps) {
  const [entities, setEntities] = useState<DropdownOption[]>([])
  const [services, setServices] = useState<DropdownOption[]>([])
  const [statuses, setStatuses] = useState<DropdownOption[]>([])
  const [priorities, setPriorities] = useState<DropdownOption[]>([])
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '')

  // Fetch dropdown options on mount
  useEffect(() => {
    fetchEntities()
    fetchServices()
    fetchStatuses()
    fetchPriorities()
  }, [])

  const fetchEntities = async () => {
    try {
      const res = await fetch('/api/managedata/entities')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setEntities(
          data.data.map((e: any) => ({
            value: e.unique_entity_id,
            label: e.entity_name
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch entities:', error)
    }
  }

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/managedata/services')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setServices(
          data.data.map((s: any) => ({
            value: s.service_id,
            label: s.service_name
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }

  const fetchStatuses = () => {
    // Static statuses based on schema
    setStatuses([
      { value: '1', label: 'Open' },
      { value: '2', label: 'In Progress' },
      { value: '3', label: 'Resolved' },
      { value: '4', label: 'Closed' }
    ])
  }

  const fetchPriorities = () => {
    // Static priorities based on schema
    setPriorities([
      { value: 'URGENT', label: 'Urgent' },
      { value: 'HIGH', label: 'High' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'LOW', label: 'Low' }
    ])
  }

  const handleFilterChange = (key: keyof TicketFilters, value: string | null) => {
    const newFilters = {
      ...currentFilters,
      [key]: value || null
    }
    onFilterChange(newFilters)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleFilterChange('search', searchTerm || null)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    onFilterChange({
      entity_id: null,
      service_id: null,
      status: null,
      priority: null,
      search: null
    })
  }

  const hasActiveFilters =
    currentFilters.entity_id ||
    currentFilters.service_id ||
    currentFilters.status ||
    currentFilters.priority ||
    currentFilters.search

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {/* Entity Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity
          </label>
          <select
            value={currentFilters.entity_id || ''}
            onChange={(e) => handleFilterChange('entity_id', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Entities</option>
            {entities.map((entity) => (
              <option key={entity.value} value={entity.value}>
                {entity.label}
              </option>
            ))}
          </select>
        </div>

        {/* Service Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service
          </label>
          <select
            value={currentFilters.service_id || ''}
            onChange={(e) => handleFilterChange('service_id', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Services</option>
            {services.map((service) => (
              <option key={service.value} value={service.value}>
                {service.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={currentFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={currentFilters.priority || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            {priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Ticket #, subject..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}

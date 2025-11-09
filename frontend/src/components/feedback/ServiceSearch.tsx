'use client'

import { useState, useEffect, useRef } from 'react'

interface Service {
  service_id: string
  service_name: string
  service_description: string
  entity_name: string
  entity_id?: string
  relevance?: number
}

interface ServiceSearchProps {
  selectedService: Service | null
  onServiceSelect: (service: Service | null) => void
}

export default function ServiceSearch({ selectedService, onServiceSelect }: ServiceSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Service[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search services with debounce
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch()
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 300)

    return () => clearTimeout(delaySearch)
  }, [searchQuery])

  const performSearch = async () => {
    setIsSearching(true)
    setSearchError(null)

    try {
      const response = await fetch(`/api/feedback/search?q=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setSearchResults(data.results || [])
      setShowDropdown(true)

    } catch (error) {
      console.error('Search error:', error)
      setSearchError('Unable to search services. Please try again.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectService = (service: Service) => {
    onServiceSelect(service)
    setSearchQuery(service.service_name)
    setShowDropdown(false)
  }

  const handleClearSelection = () => {
    onServiceSelect(null)
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) setShowDropdown(true)
          }}
          placeholder="Search for a government service (e.g., passport, business registration, birth certificate)..."
          disabled={!!selectedService}
          className={`w-full p-4 pr-12 border-2 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            selectedService 
              ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
              : 'border-gray-300'
          }`}
        />
        
        {/* Search Icon or Loading Spinner */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Search Error */}
      {searchError && (
        <div className="mt-2 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {searchError}
        </div>
      )}

      {/* Selected Service Display */}
      {selectedService && (
        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="font-bold text-blue-900">{selectedService.service_name}</h3>
              </div>
              <p className="text-sm text-blue-700 mt-1">{selectedService.service_description}</p>
              <p className="text-xs text-blue-600 mt-2">
                <span className="font-semibold">Provided by:</span> {selectedService.entity_name}
              </p>
            </div>
            <button
              onClick={handleClearSelection}
              className="ml-4 text-blue-600 hover:text-blue-800 flex-shrink-0"
              title="Change service"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showDropdown && searchResults.length > 0 && !selectedService && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <div className="p-2 text-sm text-gray-600 border-b">
            Found {searchResults.length} service{searchResults.length !== 1 ? 's' : ''}
          </div>
          {searchResults.map((service) => (
            <button
              key={service.service_id}
              onClick={() => handleSelectService(service)}
              className="w-full text-left p-4 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-semibold text-gray-900">{service.service_name}</div>
              <div className="text-sm text-gray-600 mt-1">{service.service_description}</div>
              <div className="text-xs text-gray-500 mt-2 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {service.entity_name}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showDropdown && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold">No services found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        </div>
      )}

      {/* Search Help Text */}
      {!selectedService && searchQuery.length < 2 && (
        <p className="mt-2 text-sm text-gray-500">
          Type at least 2 characters to search for services
        </p>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'

interface ServiceSearchProps {
  onSearchChange?: (query: string) => void
}

export default function ServiceSearch({ onSearchChange }: ServiceSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Notify parent of search query changes (with debounce)
  useEffect(() => {
    const debounce = setTimeout(() => {
      onSearchChange?.(searchQuery)
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, onSearchChange])

  return (
    <div>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a government service (e.g., passport, business registration, birth certificate)..."
          className="w-full p-4 pr-12 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Search Icon */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Help Text */}
      <p className="mt-2 text-sm text-gray-500">
        Type at least 2 characters to search for services
      </p>
    </div>
  )
}

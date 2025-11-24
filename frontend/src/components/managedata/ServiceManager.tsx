'use client'

import { useState, useEffect } from 'react'

interface Service {
  service_id: string
  service_name: string
  entity_id: string
  entity_name?: string
  service_category: string
  service_description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Entity {
  unique_entity_id: string
  entity_name: string
  is_active: boolean
}

type SortField = 'service_id' | 'service_name' | 'entity_name' | 'service_category'
type SortDirection = 'asc' | 'desc' | null

export default function ServiceManager() {
  const [services, setServices] = useState<Service[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('active')

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Auto-ID state
  const [suggestedId, setSuggestedId] = useState<string>('')
  const [useAutoId, setUseAutoId] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    service_id: '',
    service_name: '',
    entity_id: '',
    service_category: 'General',
    service_description: '',
    is_active: true
  })

  // Categories (EXACT from original)
  const categories = [
    'Immigration', 'Tax & Revenue', 'Customs', 'Civil Registry', 
    'Property', 'Health', 'Tourism', 'Utilities', 'Digital', 'General'
  ]

  // Load services and entities
  const loadData = async () => {
    setLoading(true)
    try {
      const [servicesRes, entitiesRes] = await Promise.all([
        fetch('/api/managedata/services'),
        fetch('/api/managedata/entities')
      ])
      
      // CORRECTED: Direct array response (not wrapped)
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        setServices(servicesData)
      }
      
      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json()
        setEntities(entitiesData.filter((e: Entity) => e.is_active))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Fetch suggested ID when category AND entity are selected
  useEffect(() => {
    if (formData.service_category && formData.entity_id && !editingService) {
      fetchSuggestedId()
    }
  }, [formData.service_category, formData.entity_id, editingService])

  const fetchSuggestedId = async () => {
    try {
      const response = await fetch(
        `/api/managedata/services/next-id?category=${encodeURIComponent(formData.service_category)}&entityId=${encodeURIComponent(formData.entity_id)}`
      )
      const data = await response.json()
      
      if (data.success) {
        setSuggestedId(data.suggestedId)
        if (useAutoId) {
          setFormData(prev => ({ ...prev, service_id: data.suggestedId }))
        }
      }
    } catch (err) {
      console.error('Error fetching suggested ID:', err)
    }
  }

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // CORRECTED: Path params, not query params
      const url = editingService
        ? `/api/managedata/services/${editingService.service_id}`
        : '/api/managedata/services'
      
      const method = editingService ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await loadData()
        resetForm()
        alert(editingService ? 'Service updated!' : 'Service created!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving service:', error)
      alert('Failed to save service')
    }
  }

  // CORRECTED: Toggle active using PUT (not DELETE)
  const handleToggleActive = async (service: Service) => {
    if (!confirm(`${service.is_active ? 'Deactivate' : 'Activate'} ${service.service_name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/managedata/services/${service.service_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...service,
          is_active: !service.is_active
        })
      })

      if (response.ok) {
        await loadData()
        alert(`Service ${service.is_active ? 'deactivated' : 'activated'}!`)
      }
    } catch (error) {
      console.error('Error toggling service:', error)
      alert('Failed to update service')
    }
  }

  // Edit service
  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      service_id: service.service_id,
      service_name: service.service_name,
      entity_id: service.entity_id,
      service_category: service.service_category,
      service_description: service.service_description,
      is_active: service.is_active
    })
    setUseAutoId(false)
    setShowForm(true)
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      service_id: '',
      service_name: '',
      entity_id: '',
      service_category: 'General',
      service_description: '',
      is_active: true
    })
    setEditingService(null)
    setShowForm(false)
    setUseAutoId(true)
    setSuggestedId('')
  }

  const handleUseSuggestedId = () => {
    setFormData(prev => ({ ...prev, service_id: suggestedId }))
    setUseAutoId(true)
  }

  // Filter and sort services
  const filteredServices = services
    .filter(service => {
      const matchesSearch = service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           service.service_id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = filterCategory === 'all' || service.service_category === filterCategory
      const matchesEntity = filterEntity === 'all' || service.entity_id === filterEntity
      const matchesActive = filterActive === 'all' || 
                           (filterActive === 'active' && service.is_active) ||
                           (filterActive === 'inactive' && !service.is_active)
      return matchesSearch && matchesCategory && matchesEntity && matchesActive
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0
      
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''
      
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? comparison : -comparison
    })

  return (
    <div>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          {/* Search */}
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Entity Filter */}
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Entities</option>
            {entities.map(entity => (
              <option key={entity.unique_entity_id} value={entity.unique_entity_id}>
                {entity.entity_name}
              </option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Status</option>
          </select>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap"
        >
          {showForm ? '✕ Cancel' : '+ Add Service'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingService ? '✏️ Edit Service' : '➕ Add New Service'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Entity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity/Department *
                </label>
                <select
                  required
                  value={formData.entity_id}
                  onChange={(e) => setFormData({...formData, entity_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingService}
                >
                  <option value="">Select Entity</option>
                  {entities.map(entity => (
                    <option key={entity.unique_entity_id} value={entity.unique_entity_id}>
                      {entity.entity_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.service_category}
                  onChange={(e) => setFormData({...formData, service_category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingService}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Service ID with Auto-suggestion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service ID *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={!!editingService}
                    value={formData.service_id}
                    onChange={(e) => {
                      setFormData({...formData, service_id: e.target.value.toUpperCase()})
                      setUseAutoId(false)
                    }}
                    placeholder="e.g., SVC-XXX-001"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {!editingService && suggestedId && !useAutoId && (
                    <button
                      type="button"
                      onClick={handleUseSuggestedId}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg whitespace-nowrap"
                    >
                      Use {suggestedId}
                    </button>
                  )}
                </div>
                {!editingService && suggestedId && (
                  <p className="mt-1 text-sm text-gray-500">
                    💡 Suggested: <strong>{suggestedId}</strong>
                  </p>
                )}
              </div>

              {/* Service Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_name}
                  onChange={(e) => setFormData({...formData, service_name: e.target.value})}
                  placeholder="e.g., Passport Application"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.service_description}
                onChange={(e) => setFormData({...formData, service_description: e.target.value})}
                placeholder="Brief description of the service..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="service_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="service_active" className="text-sm font-medium text-gray-700">
                Active (available for feedback)
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
              >
                {editingService ? 'Update Service' : 'Create Service'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">
            Services ({filteredServices.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No services found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    onClick={() => handleSort('service_id')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    ID {getSortIcon('service_id')}
                  </th>
                  <th 
                    onClick={() => handleSort('service_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Service Name {getSortIcon('service_name')}
                  </th>
                  <th
                    onClick={() => handleSort('entity_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Service Entity {getSortIcon('entity_name')}
                  </th>
                  <th 
                    onClick={() => handleSort('service_category')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Category {getSortIcon('service_category')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.service_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {service.service_id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div>
                        {service.service_name}
                        <div className="text-xs text-gray-500 mt-1">
                          {service.service_description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {service.entity_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                        {service.service_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        service.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(service)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(service)}
                          className={`px-3 py-1 text-xs rounded ${
                            service.is_active
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {service.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
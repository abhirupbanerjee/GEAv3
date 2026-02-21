'use client'

import { useState, useEffect } from 'react'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { EditFormModal } from '@/components/common/EditFormModal'
import { useServices } from '@/hooks/useServices'
import type { Service, ServiceFilters, ServiceSort } from '@/types/managedata'

interface Entity {
  unique_entity_id: string
  entity_name: string
  is_active: boolean
}

interface ServiceAttachment {
  service_attachment_id: number
  service_id: string
  filename: string
  file_extension: string
  is_mandatory: boolean
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export default function ServiceManager() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Pagination state
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<ServiceFilters>({
    search: '',
    service_category: 'all',
    entity_id: 'all',
    is_active: 'active'
  })
  const [sort, setSort] = useState<ServiceSort>({
    by: 'service_name',
    order: 'asc'
  })

  // Use pagination hook
  const { services, pagination, isLoading, mutate } = useServices({
    filters,
    sort,
    page,
    limit: 20
  })

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

  // Attachment management state
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [selectedServiceForAttachments, setSelectedServiceForAttachments] = useState<Service | null>(null)
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [showAttachmentForm, setShowAttachmentForm] = useState(false)
  const [editingAttachment, setEditingAttachment] = useState<ServiceAttachment | null>(null)
  const [attachmentFormData, setAttachmentFormData] = useState({
    filename: '',
    file_extension: 'pdf,zip',
    is_mandatory: false,
    description: '',
    sort_order: 0
  })

  // Categories (EXACT from original)
  const categories = [
    'Immigration', 'Tax & Revenue', 'Customs', 'Civil Registry',
    'Property', 'Health', 'Tourism', 'Utilities', 'Digital', 'General'
  ]

  // Load entities for dropdown (keep separate from paginated services)
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const response = await fetch('/api/managedata/entities')
        if (response.ok) {
          const data = await response.json()
          setEntities(data.filter((e: Entity) => e.is_active))
        }
      } catch (error) {
        console.error('Error loading entities:', error)
      }
    }
    loadEntities()
  }, [])

  // Fetch suggested ID when category changes
  useEffect(() => {
    if (formData.service_category && !editingService) {
      fetchSuggestedId()
    }
  }, [formData.service_category, editingService])

  const fetchSuggestedId = async () => {
    try {
      const response = await fetch(
        `/api/managedata/services/next-id?category=${encodeURIComponent(formData.service_category)}`
      )
      const data = await response.json()

      if (data.suggested_id) {
        setSuggestedId(data.suggested_id)
        if (useAutoId) {
          setFormData(prev => ({ ...prev, service_id: data.suggested_id }))
        }
      }
    } catch (err) {
      console.error('Error fetching suggested ID:', err)
    }
  }

  // Sorting handler
  const handleSort = (field: ServiceSort['by']) => {
    if (sort.by === field) {
      // Toggle order if clicking same column
      setSort(prev => ({ ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' }))
    } else {
      // New column, default to ascending
      setSort({ by: field, order: 'asc' })
    }
    setPage(1) // Reset to page 1 on sort change
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
        await mutate()
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
  const handleToggleActive = (service: Service) => {
    setSelectedService(service)
    setShowDeactivateModal(true)
  }

  const confirmToggleActive = async () => {
    if (!selectedService) return

    try {
      const response = await fetch(`/api/managedata/services/${selectedService.service_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedService,
          is_active: !selectedService.is_active
        })
      })

      if (response.ok) {
        await mutate()
        alert(`Service ${selectedService.is_active ? 'deactivated' : 'activated'}!`)
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
    setShowEditModal(true)
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
    setShowEditModal(false)
    setUseAutoId(true)
    setSuggestedId('')
  }

  const handleUseSuggestedId = () => {
    setFormData(prev => ({ ...prev, service_id: suggestedId }))
    setUseAutoId(true)
  }

  // Attachment management functions
  const openAttachmentModal = async (service: Service) => {
    setSelectedServiceForAttachments(service)
    setShowAttachmentModal(true)
    await loadAttachments(service.service_id)
  }

  const closeAttachmentModal = () => {
    setShowAttachmentModal(false)
    setSelectedServiceForAttachments(null)
    setAttachments([])
    setShowAttachmentForm(false)
    setEditingAttachment(null)
    resetAttachmentForm()
  }

  const loadAttachments = async (serviceId: string) => {
    setLoadingAttachments(true)
    try {
      const response = await fetch(`/api/managedata/services/${serviceId}/attachments`)
      if (response.ok) {
        const data = await response.json()
        setAttachments(data.data || [])
      }
    } catch (error) {
      console.error('Error loading attachments:', error)
    } finally {
      setLoadingAttachments(false)
    }
  }

  const resetAttachmentForm = () => {
    setAttachmentFormData({
      filename: '',
      file_extension: 'pdf,zip',
      is_mandatory: false,
      description: '',
      sort_order: attachments.length
    })
    setEditingAttachment(null)
    setShowAttachmentForm(false)
  }

  const handleAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedServiceForAttachments) return

    try {
      const url = editingAttachment
        ? `/api/managedata/services/${selectedServiceForAttachments.service_id}/attachments/${editingAttachment.service_attachment_id}`
        : `/api/managedata/services/${selectedServiceForAttachments.service_id}/attachments`

      const method = editingAttachment ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachmentFormData)
      })

      if (response.ok) {
        await loadAttachments(selectedServiceForAttachments.service_id)
        resetAttachmentForm()
        alert(editingAttachment ? 'Document requirement updated!' : 'Document requirement added!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving attachment:', error)
      alert('Failed to save document requirement')
    }
  }

  const handleEditAttachment = (attachment: ServiceAttachment) => {
    setEditingAttachment(attachment)
    setAttachmentFormData({
      filename: attachment.filename,
      file_extension: attachment.file_extension,
      is_mandatory: attachment.is_mandatory,
      description: attachment.description || '',
      sort_order: attachment.sort_order
    })
    setShowAttachmentForm(true)
  }

  const handleDeleteAttachment = async (attachment: ServiceAttachment) => {
    if (!selectedServiceForAttachments) return
    if (!confirm(`Delete "${attachment.filename}" requirement?`)) return

    try {
      const response = await fetch(
        `/api/managedata/services/${selectedServiceForAttachments.service_id}/attachments/${attachment.service_attachment_id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        await loadAttachments(selectedServiceForAttachments.service_id)
        alert('Document requirement deleted!')
      } else {
        alert('Failed to delete document requirement')
      }
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Failed to delete document requirement')
    }
  }

  return (
    <div>
      {/* Action Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap flex-1">
          {/* Search */}
          <input
            type="text"
            placeholder="Search services..."
            value={filters.search || ''}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, search: e.target.value }))
              setPage(1)
            }}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          {/* Filters Group */}
          <div className="flex gap-3 sm:gap-2 items-center flex-wrap">
            {/* Category Filter */}
            <select
              value={filters.service_category || 'all'}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, service_category: e.target.value }))
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Entity Filter */}
            <select
              value={filters.entity_id || 'all'}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, entity_id: e.target.value }))
                setPage(1)
              }}
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
              value={filters.is_active || 'active'}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, is_active: e.target.value as 'active' | 'inactive' | 'all' }))
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="all">All Status</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingService(null)
            setFormData({
              service_id: '',
              service_name: '',
              entity_id: '',
              service_category: 'General',
              service_description: '',
              is_active: true
            })
            setUseAutoId(true)
            setShowEditModal(true)
          }}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap w-full sm:w-auto"
        >
          + Add Service
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
                  {!editingService && suggestedId && (
                    <span className="ml-2 text-xs text-blue-600">
                      💡 Suggested: {suggestedId}
                    </span>
                  )}
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
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg whitespace-nowrap"
                    >
                      Use {suggestedId}
                    </button>
                  )}
                </div>
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
            Services {pagination && `(${pagination.total_count})`}
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No services found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      onClick={() => handleSort('service_id')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      ID ↑
                    </th>
                    <th
                      onClick={() => handleSort('service_name')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      Service Name ↑
                    </th>
                    <th
                      onClick={() => handleSort('entity_name')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      Service Entity ↑
                    </th>
                    <th
                      onClick={() => handleSort('service_category')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      Category ↑
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {services.map((service) => (
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
                          onClick={() => openAttachmentModal(service)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                        >
                          Docs
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

            {/* Pagination Controls */}
            {pagination && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                {/* Mobile View - Previous/Next only */}
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!pagination.has_prev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.has_next}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>

                {/* Desktop View - Full pagination */}
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total_count)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total_count}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {/* Previous Button */}
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={!pagination.has_prev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        ‹
                      </button>

                      {/* Page Numbers (show up to 5) */}
                      {[...Array(Math.min(pagination.total_pages, 5))].map((_, i) => {
                        const pageNum = i + 1
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pagination.page === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}

                      {/* Next Button */}
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={!pagination.has_next}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        ›
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Attachment Management Modal */}
      {showAttachmentModal && selectedServiceForAttachments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[101] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Document Requirements</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedServiceForAttachments.service_name} ({selectedServiceForAttachments.service_id})
                </p>
              </div>
              <button
                onClick={closeAttachmentModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Add/Edit Attachment Form */}
              {showAttachmentForm ? (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingAttachment ? 'Edit Document Requirement' : 'Add New Document Requirement'}
                  </h4>
                  <form onSubmit={handleAttachmentSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Document Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={attachmentFormData.filename}
                          onChange={(e) => setAttachmentFormData({...attachmentFormData, filename: e.target.value})}
                          placeholder="e.g., Passport Copy"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Allowed File Types *
                        </label>
                        <input
                          type="text"
                          required
                          value={attachmentFormData.file_extension}
                          onChange={(e) => setAttachmentFormData({...attachmentFormData, file_extension: e.target.value})}
                          placeholder="e.g., pdf,zip,docx"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Comma-separated extensions without dots</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description / Instructions
                      </label>
                      <textarea
                        value={attachmentFormData.description}
                        onChange={(e) => setAttachmentFormData({...attachmentFormData, description: e.target.value})}
                        placeholder="pdf and zip allowed. Use zip for multiple files and different formats."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_mandatory"
                          checked={attachmentFormData.is_mandatory}
                          onChange={(e) => setAttachmentFormData({...attachmentFormData, is_mandatory: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="is_mandatory" className="text-sm font-medium text-gray-700">
                          Required Document
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Sort Order:</label>
                        <input
                          type="number"
                          value={attachmentFormData.sort_order}
                          onChange={(e) => setAttachmentFormData({...attachmentFormData, sort_order: parseInt(e.target.value) || 0})}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                      >
                        {editingAttachment ? 'Update' : 'Add Document'}
                      </button>
                      <button
                        type="button"
                        onClick={resetAttachmentForm}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAttachmentFormData({
                      filename: '',
                      file_extension: 'pdf,zip',
                      is_mandatory: false,
                      description: 'pdf and zip allowed. Use zip for multiple files and different formats.',
                      sort_order: attachments.length
                    })
                    setShowAttachmentForm(true)
                  }}
                  className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2"
                >
                  + Add Document Requirement
                </button>
              )}

              {/* Attachments List */}
              {loadingAttachments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading...</p>
                </div>
              ) : attachments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No document requirements defined for this service.</p>
                  <p className="text-sm mt-1">Add document requirements to specify what files users need to upload.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachments.map((attachment, index) => (
                    <div
                      key={attachment.service_attachment_id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        attachment.is_active ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono">#{index + 1}</span>
                          <span className="font-medium text-gray-900">{attachment.filename}</span>
                          {attachment.is_mandatory && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                              Required
                            </span>
                          )}
                          {!attachment.is_active && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {attachment.file_extension}
                          </span>
                          {attachment.description && (
                            <span className="ml-2">{attachment.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditAttachment(attachment)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(attachment)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeAttachmentModal}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirmation Modal */}
      {selectedService && (
        <ConfirmModal
          isOpen={showDeactivateModal}
          onClose={() => {
            setShowDeactivateModal(false)
            setSelectedService(null)
          }}
          onConfirm={confirmToggleActive}
          title={`${selectedService.is_active ? 'Deactivate' : 'Activate'} Service?`}
          message={`Are you sure you want to ${selectedService.is_active ? 'deactivate' : 'activate'} "${selectedService.service_name}"?`}
          confirmText={selectedService.is_active ? 'Deactivate' : 'Activate'}
          confirmVariant={selectedService.is_active ? 'danger' : 'primary'}
          icon="warning"
          helperText={selectedService.is_active ? 'To reactivate this service later, click the Activate button.' : undefined}
        />
      )}

      {/* Add/Edit Service Modal */}
      <EditFormModal
        isOpen={showEditModal}
        onClose={() => {
          resetForm()
        }}
        onSubmit={handleSubmit}
        title={editingService ? '✏️ Edit Service' : '➕ Add New Service'}
        isEditing={!!editingService}
      >
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
              {!editingService && suggestedId && (
                <span className="ml-2 text-xs text-blue-600">
                  💡 Suggested: {suggestedId}
                </span>
              )}
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
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg whitespace-nowrap h-10"
                >
                  Use {suggestedId}
                </button>
              )}
            </div>
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
            id="service_active_modal"
            checked={formData.is_active}
            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="service_active_modal" className="text-sm font-medium text-gray-700">
            Active (available for feedback)
          </label>
        </div>
      </EditFormModal>
    </div>
  )
}
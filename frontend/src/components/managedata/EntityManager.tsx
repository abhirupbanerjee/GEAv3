'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { FiChevronDown, FiLock } from 'react-icons/fi'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { EditFormModal } from '@/components/common/EditFormModal'
import { useEntities } from '@/hooks/useEntities'
import type { Entity, EntityFilters, EntitySort } from '@/types/managedata'

export default function EntityManager() {
  // Session and role check
  const { data: session } = useSession()
  const isAdmin = session?.user?.roleType === 'admin'
  const canModifyEntities = isAdmin // Staff users have read-only access

  // Pagination state
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<EntityFilters>({
    search: '',
    entity_type: 'all',
    is_active: 'active'
  })
  const [sort, setSort] = useState<EntitySort>({
    by: 'entity_type',
    order: 'asc'
  })

  // Fetch entities with pagination
  const { entities, pagination, isLoading, mutate } = useEntities({
    filters,
    sort,
    page,
    limit: 20
  })

  // UI state
  const [showForm, setShowForm] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Auto-ID state
  const [suggestedId, setSuggestedId] = useState<string>('')
  const [useAutoId, setUseAutoId] = useState(true)
  const [loadingId, setLoadingId] = useState(false)

  const [formData, setFormData] = useState({
    unique_entity_id: '',
    entity_name: '',
    entity_type: 'ministry',
    parent_entity_id: '',
    is_active: true
  })

  // Removed loadEntities - now using useEntities hook

  // Fetch suggested ID when type changes
  const fetchSuggestedId = async (type: string) => {
    if (!type || editingEntity) return
    
    setLoadingId(true)
    try {
      const response = await fetch(`/api/managedata/entities/next-id?type=${type}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestedId(data.suggested_id)
        if (useAutoId) {
          setFormData(prev => ({ ...prev, unique_entity_id: data.suggested_id }))
        }
      }
    } catch (error) {
      console.error('Error fetching suggested ID:', error)
    } finally {
      setLoadingId(false)
    }
  }

  useEffect(() => {
    if (!editingEntity && formData.entity_type) {
      fetchSuggestedId(formData.entity_type)
    }
  }, [formData.entity_type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingEntity
        ? `/api/managedata/entities/${editingEntity.unique_entity_id}`
        : '/api/managedata/entities'
      
      const method = editingEntity ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await mutate()
        resetForm()
        alert(editingEntity ? 'Entity updated!' : 'Entity created!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving entity:', error)
      alert('Failed to save entity')
    }
  }

  const handleToggleActive = (entity: Entity) => {
    setSelectedEntity(entity)
    setShowDeactivateModal(true)
  }

  const confirmToggleActive = async () => {
    if (!selectedEntity) return

    try {
      const response = await fetch(`/api/managedata/entities/${selectedEntity.unique_entity_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedEntity, is_active: !selectedEntity.is_active })
      })

      if (response.ok) {
        await mutate()
        alert(`Entity ${selectedEntity.is_active ? 'deactivated' : 'activated'}!`)
      }
    } catch (error) {
      console.error('Error toggling entity:', error)
      alert('Failed to update entity')
    }
  }

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity)
    setFormData({
      unique_entity_id: entity.unique_entity_id,
      entity_name: entity.entity_name,
      entity_type: entity.entity_type,
      parent_entity_id: entity.parent_entity_id || '',
      is_active: entity.is_active
    })
    setUseAutoId(false)
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      unique_entity_id: '',
      entity_name: '',
      entity_type: 'ministry',
      parent_entity_id: '',
      is_active: true
    })
    setEditingEntity(null)
    setShowForm(false)
    setShowEditModal(false)
    setUseAutoId(true)
    setSuggestedId('')
  }

  // Sorting function - now triggers server-side sort
  const handleSort = (field: EntitySort['by']) => {
    if (sort.by === field) {
      // Toggle order if clicking same column
      setSort(prev => ({ ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' }))
    } else {
      // New column, default to ascending
      setSort({ by: field, order: 'asc' })
    }
    setPage(1) // Reset to page 1 on sort change
  }

  // Removed client-side filtering/sorting - now done server-side via useEntities hook

  return (
    <div>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            placeholder="Search entities..."
            value={filters.search || ''}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, search: e.target.value }))
              setPage(1)
            }}
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filters.entity_type || 'all'}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, entity_type: e.target.value }))
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="ministry">Ministries</option>
            <option value="department">Departments</option>
            <option value="agency">Agencies</option>
            <option value="statutory_body">Statutory Bodies</option>
          </select>

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

        {canModifyEntities && (
          <button
            onClick={() => {
              setEditingEntity(null)
              setFormData({
                unique_entity_id: '',
                entity_name: '',
                entity_type: 'ministry',
                parent_entity_id: '',
                is_active: true
              })
              setUseAutoId(true)
              setShowEditModal(true)
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2"
          >
            + Add Entity
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingEntity ? '✏️ Edit Entity' : '➕ Add New Entity'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Entity Type - Show first to trigger ID suggestion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Type *
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.entity_type}
                    onChange={(e) => setFormData({...formData, entity_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600"
                    disabled={!!editingEntity}
                  >
                    <option value="ministry">Ministry</option>
                    <option value="department">Department</option>
                    <option value="agency">Agency</option>
                    <option value="statutory_body">Statutory Body</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Entity ID with Auto-suggestion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity ID *
                  {!editingEntity && suggestedId && (
                    <span className="ml-2 text-xs text-blue-600">
                      💡 Suggested: {suggestedId}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={!!editingEntity || (useAutoId && loadingId)}
                    value={formData.unique_entity_id}
                    onChange={(e) => {
                      setFormData({...formData, unique_entity_id: e.target.value})
                      setUseAutoId(false)
                    }}
                    placeholder={loadingId ? "Generating..." : "e.g., MIN-006"}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {!editingEntity && suggestedId && !useAutoId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, unique_entity_id: suggestedId }))
                        setUseAutoId(true)
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg whitespace-nowrap h-10"
                    >
                      Use {suggestedId}
                    </button>
                  )}
                </div>
              </div>

              {/* Entity Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.entity_name}
                  onChange={(e) => setFormData({...formData, entity_name: e.target.value})}
                  placeholder="e.g., Ministry of Agriculture"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Parent Entity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Entity (Optional)
                </label>
                <select
                  value={formData.parent_entity_id}
                  onChange={(e) => setFormData({...formData, parent_entity_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None (Top Level)</option>
                  {entities
                    .filter(e => e.is_active && e.unique_entity_id !== formData.unique_entity_id)
                    .map(entity => (
                      <option key={entity.unique_entity_id} value={entity.unique_entity_id}>
                        {entity.entity_name} ({entity.entity_type})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active (visible in system)
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
              >
                {editingEntity ? 'Update Entity' : 'Create Entity'}
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

      {/* Entity List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">
            Entities ({pagination ? pagination.total_count : 0})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading entities...</p>
          </div>
        ) : entities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No entities found</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('unique_entity_id')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    ID ↑
                  </th>
                  <th
                    onClick={() => handleSort('entity_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Name ↑
                  </th>
                  <th
                    onClick={() => handleSort('entity_type')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Type ↑
                  </th>
                  <th
                    onClick={() => handleSort('parent_entity_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Parent ↑
                  </th>
                  <th
                    onClick={() => handleSort('is_active')}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Status ↑
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entities.map((entity) => (
                  <tr key={entity.unique_entity_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {entity.unique_entity_id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {entity.entity_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {entity.entity_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entity.parent_entity_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        entity.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entity.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canModifyEntities ? (
                          <>
                            <button
                              onClick={() => handleEdit(entity)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(entity)}
                              className={`px-3 py-1 text-xs rounded ${
                                entity.is_active
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {entity.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Read-only</span>
                        )}
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

      {/* Deactivate/Activate Confirmation Modal */}
      {selectedEntity && (
        <ConfirmModal
          isOpen={showDeactivateModal}
          onClose={() => {
            setShowDeactivateModal(false)
            setSelectedEntity(null)
          }}
          onConfirm={confirmToggleActive}
          title={`${selectedEntity.is_active ? 'Deactivate' : 'Activate'} Entity?`}
          message={`Are you sure you want to ${selectedEntity.is_active ? 'deactivate' : 'activate'} "${selectedEntity.entity_name}"?`}
          confirmText={selectedEntity.is_active ? 'Deactivate' : 'Activate'}
          confirmVariant={selectedEntity.is_active ? 'danger' : 'primary'}
          icon="warning"
          helperText={selectedEntity.is_active ? 'To reactivate this entity later, click the Activate button.' : undefined}
        />
      )}

      {/* Add/Edit Entity Modal */}
      <EditFormModal
        isOpen={showEditModal}
        onClose={() => {
          resetForm()
        }}
        onSubmit={handleSubmit}
        title={editingEntity ? '✏️ Edit Entity' : '➕ Add New Entity'}
        isEditing={!!editingEntity}
      >
        <div className="grid md:grid-cols-2 gap-4">
          {/* Entity Type - Show first to trigger ID suggestion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type *
            </label>
            <div className="relative">
              <select
                required
                value={formData.entity_type}
                onChange={(e) => setFormData({...formData, entity_type: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600"
                disabled={!!editingEntity}
              >
                <option value="ministry">Ministry</option>
                <option value="department">Department</option>
                <option value="agency">Agency</option>
                <option value="statutory_body">Statutory Body</option>
              </select>
              {!!editingEntity ? (
                <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              ) : (
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Entity ID with Auto-suggestion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity ID *
              {!editingEntity && suggestedId && (
                <span className="ml-2 text-xs text-blue-600">
                  💡 Suggested: {suggestedId}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  disabled={!!editingEntity || (useAutoId && loadingId)}
                  value={formData.unique_entity_id}
                  onChange={(e) => {
                    setFormData({...formData, unique_entity_id: e.target.value})
                    setUseAutoId(false)
                  }}
                  placeholder={loadingId ? "Generating..." : "e.g., MIN-006"}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                {!!editingEntity && (
                  <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                )}
              </div>
              {!editingEntity && suggestedId && !useAutoId && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, unique_entity_id: suggestedId }))
                    setUseAutoId(true)
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg whitespace-nowrap"
                >
                  Use {suggestedId}
                </button>
              )}
            </div>
          </div>

          {/* Entity Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Name *
            </label>
            <input
              type="text"
              required
              value={formData.entity_name}
              onChange={(e) => setFormData({...formData, entity_name: e.target.value})}
              placeholder="e.g., Ministry of Agriculture"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Parent Entity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Entity (Optional)
            </label>
            <select
              value={formData.parent_entity_id}
              onChange={(e) => setFormData({...formData, parent_entity_id: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None (Top Level)</option>
              {entities
                .filter(e => e.is_active && e.unique_entity_id !== formData.unique_entity_id)
                .map(entity => (
                  <option key={entity.unique_entity_id} value={entity.unique_entity_id}>
                    {entity.entity_name} ({entity.entity_type})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active_modal"
            checked={formData.is_active}
            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_active_modal" className="text-sm font-medium text-gray-700">
            Active (visible in system)
          </label>
        </div>
      </EditFormModal>
    </div>
  )
}
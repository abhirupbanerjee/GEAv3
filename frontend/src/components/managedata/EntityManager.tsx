'use client'

import { useState, useEffect } from 'react'

interface Entity {
  unique_entity_id: string
  entity_name: string
  entity_type: string
  parent_entity_id: string | null
  parent_entity_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type SortField = 'unique_entity_id' | 'entity_name' | 'entity_type' | 'parent_entity_name' | 'is_active'
type SortDirection = 'asc' | 'desc' | null

export default function EntityManager() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('active')
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('entity_type')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  const loadEntities = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/managedata/entities')
      if (response.ok) {
        const data = await response.json()
        setEntities(data)
      }
    } catch (error) {
      console.error('Error loading entities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntities()
  }, [])

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
        await loadEntities()
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

  const handleToggleActive = async (entity: Entity) => {
    if (!confirm(`${entity.is_active ? 'Deactivate' : 'Activate'} ${entity.entity_name}?`)) return

    try {
      const response = await fetch(`/api/managedata/entities/${entity.unique_entity_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entity, is_active: !entity.is_active })
      })

      if (response.ok) {
        await loadEntities()
        alert(`Entity ${entity.is_active ? 'deactivated' : 'activated'}!`)
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
    setShowForm(true)
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
    setUseAutoId(true)
    setSuggestedId('')
  }

  // Sorting function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null (default)
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortField('entity_type') // Reset to default
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    if (sortDirection === 'asc') return '↑'
    if (sortDirection === 'desc') return '↓'
    return '↕️'
  }

  // Filter and sort entities
  const filteredAndSortedEntities = entities
    .filter(entity => {
      const matchesSearch = entity.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entity.unique_entity_id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || entity.entity_type === filterType
      const matchesActive = filterActive === 'all' || 
                           (filterActive === 'active' && entity.is_active) ||
                           (filterActive === 'inactive' && !entity.is_active)
      return matchesSearch && matchesType && matchesActive
    })
    .sort((a, b) => {
      if (!sortDirection) return 0

      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''

      // Handle boolean for is_active
      if (sortField === 'is_active') {
        aVal = a.is_active ? '1' : '0'
        bVal = b.is_active ? '1' : '0'
      }

      const comparison = String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? comparison : -comparison
    })

  return (
    <div>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="ministry">Ministries</option>
            <option value="department">Departments</option>
            <option value="agency">Agencies</option>
            <option value="statutory_body">Statutory Bodies</option>
          </select>

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
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2"
        >
          {showForm ? '✕ Cancel' : '+ Add Entity'}
        </button>
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
                <select
                  required
                  value={formData.entity_type}
                  onChange={(e) => setFormData({...formData, entity_type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingEntity}
                >
                  <option value="ministry">Ministry</option>
                  <option value="department">Department</option>
                  <option value="agency">Agency</option>
                  <option value="statutory_body">Statutory Body</option>
                </select>
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
            Entities ({filteredAndSortedEntities.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading entities...</p>
          </div>
        ) : filteredAndSortedEntities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No entities found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    onClick={() => handleSort('unique_entity_id')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    ID {getSortIcon('unique_entity_id')}
                  </th>
                  <th 
                    onClick={() => handleSort('entity_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Name {getSortIcon('entity_name')}
                  </th>
                  <th 
                    onClick={() => handleSort('entity_type')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Type {getSortIcon('entity_type')}
                  </th>
                  <th 
                    onClick={() => handleSort('parent_entity_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Parent {getSortIcon('parent_entity_name')}
                  </th>
                  <th 
                    onClick={() => handleSort('is_active')}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Status {getSortIcon('is_active')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedEntities.map((entity) => (
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
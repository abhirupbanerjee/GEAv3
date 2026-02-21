'use client'

import { useState, useEffect } from 'react'
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiStar } from 'react-icons/fi'

interface LifeEvent {
  id: number
  value: string
  label: string
  description: string
  category: string
  icon?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const EVENT_CATEGORIES = [
  { value: 'family', label: 'Family' },
  { value: 'education', label: 'Education' },
  { value: 'employment', label: 'Employment & Business' },
  { value: 'housing', label: 'Housing & Property' },
  { value: 'transport', label: 'Transport' },
  { value: 'crisis', label: 'Crisis & Support' },
  { value: 'health', label: 'Health' },
  { value: 'immigration', label: 'Immigration & Travel' }
]

export default function LifeEventManager() {
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    description: '',
    category: 'family',
    icon: '',
    sort_order: 0,
    is_active: true
  })

  // Load life events
  useEffect(() => {
    loadLifeEvents()
  }, [])

  const loadLifeEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/managedata/lifeevents')
      if (response.ok) {
        const data = await response.json()
        setLifeEvents(data)
      } else {
        console.error('Failed to load life events')
      }
    } catch (error) {
      console.error('Error loading life events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingId
        ? `/api/managedata/lifeevents/${editingId}`
        : '/api/managedata/lifeevents'

      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await loadLifeEvents()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save life event')
      }
    } catch (error) {
      console.error('Error saving life event:', error)
      alert('Failed to save life event')
    }
  }

  const handleEdit = (event: LifeEvent) => {
    setEditingId(event.id)
    setFormData({
      value: event.value,
      label: event.label,
      description: event.description,
      category: event.category,
      icon: event.icon || '',
      sort_order: event.sort_order,
      is_active: event.is_active
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this life event? This may affect existing services.')) {
      return
    }

    try {
      const response = await fetch(`/api/managedata/lifeevents/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadLifeEvents()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete life event')
      }
    } catch (error) {
      console.error('Error deleting life event:', error)
      alert('Failed to delete life event')
    }
  }

  const resetForm = () => {
    setFormData({
      value: '',
      label: '',
      description: '',
      category: 'family',
      icon: '',
      sort_order: 0,
      is_active: true
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const filteredLifeEvents = lifeEvents.filter(event => {
    const matchesSearch =
      event.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === 'all' || event.category === filterCategory

    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading life events...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiStar className="text-amber-500" />
            Life Events
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage life event tags for citizen-centric service discovery
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <FiPlus /> Add Life Event
        </button>
      </div>

      {/* Search and Filter */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="Search life events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Categories</option>
            {EVENT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-amber-50 border border-amber-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Life Event' : 'Add New Life Event'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Value (Database Key) *
              </label>
              <input
                type="text"
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., having_a_baby"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                disabled={!!editingId}
              />
              <p className="text-xs text-gray-500 mt-1">Use snake_case, no spaces</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label (Display Name) *
              </label>
              <input
                type="text"
                required
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Having a Baby"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of services related to this life event..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon (Emoji)
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🍼"
                maxLength={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="lifeevent_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
            />
            <label htmlFor="lifeevent_active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <FiSave /> {editingId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Life Events Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Life Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLifeEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || filterCategory !== 'all'
                      ? 'No life events found matching your criteria'
                      : 'No life events yet. Add one above.'}
                  </td>
                </tr>
              ) : (
                filteredLifeEvents
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {event.icon && <span className="text-lg">{event.icon}</span>}
                          <span className="text-sm font-medium text-gray-900">{event.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{event.value}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {event.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {EVENT_CATEGORIES.find(c => c.value === event.category)?.label || event.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            event.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {event.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(event)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-500">{lifeEvents.length}</div>
            <div className="text-sm text-gray-600">Total Life Events</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {lifeEvents.filter(e => e.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {lifeEvents.filter(e => !e.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {filteredLifeEvents.length}
            </div>
            <div className="text-sm text-gray-600">Shown</div>
          </div>
        </div>
      </div>
    </div>
  )
}

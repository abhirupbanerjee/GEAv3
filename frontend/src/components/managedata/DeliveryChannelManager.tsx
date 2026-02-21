'use client'

import { useState, useEffect } from 'react'
import { FiEdit2, FiTrash2, FiPlus, FiTruck, FiLock } from 'react-icons/fi'
import { EditFormModal } from '@/components/common/EditFormModal'

interface DeliveryChannel {
  id: number
  value: string
  label: string
  description?: string
  icon?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function DeliveryChannelManager() {
  const [channels, setChannels] = useState<DeliveryChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [suggestedValue, setSuggestedValue] = useState('')
  const [useAutoValue, setUseAutoValue] = useState(true)
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    description: '',
    icon: '',
    sort_order: 0,
    is_active: true
  })

  useEffect(() => {
    loadChannels()
  }, [])

  // Auto-generate value from label
  const generateValueFromLabel = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  // Update suggested value when label changes (only when adding new)
  useEffect(() => {
    if (!editingId && formData.label && useAutoValue) {
      const suggested = generateValueFromLabel(formData.label)
      setSuggestedValue(suggested)
      setFormData(prev => ({ ...prev, value: suggested }))
    }
  }, [formData.label, editingId, useAutoValue])

  const loadChannels = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/managedata/deliverychannels')
      if (response.ok) {
        const data = await response.json()
        setChannels(data)
      } else {
        console.error('Failed to load delivery channels')
      }
    } catch (error) {
      console.error('Error loading delivery channels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingId
        ? `/api/managedata/deliverychannels/${editingId}`
        : '/api/managedata/deliverychannels'

      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await loadChannels()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save delivery channel')
      }
    } catch (error) {
      console.error('Error saving delivery channel:', error)
      alert('Failed to save delivery channel')
    }
  }

  const handleEdit = (channel: DeliveryChannel) => {
    setEditingId(channel.id)
    setFormData({
      value: channel.value,
      label: channel.label,
      description: channel.description || '',
      icon: channel.icon || '',
      sort_order: channel.sort_order,
      is_active: channel.is_active
    })
    setUseAutoValue(false)
    setShowEditModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this delivery channel?')) {
      return
    }

    try {
      const response = await fetch(`/api/managedata/deliverychannels/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadChannels()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete delivery channel')
      }
    } catch (error) {
      console.error('Error deleting delivery channel:', error)
      alert('Failed to delete delivery channel')
    }
  }

  const resetForm = () => {
    setFormData({
      value: '',
      label: '',
      description: '',
      icon: '',
      sort_order: 0,
      is_active: true
    })
    setEditingId(null)
    setShowEditModal(false)
    setSuggestedValue('')
    setUseAutoValue(true)
  }

  const filteredChannels = channels.filter(ch =>
    ch.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ch.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ch.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading delivery channels...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiTruck className="text-indigo-600" />
            Delivery Channels
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage channels through which services are delivered (office, web, mobile, etc.)
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowEditModal(true)
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <FiPlus /> Add Channel
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search delivery channels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Add/Edit Modal */}
      <EditFormModal
        isOpen={showEditModal}
        onClose={() => resetForm()}
        onSubmit={handleSubmit}
        title={editingId ? 'Edit Delivery Channel' : 'Add New Delivery Channel'}
        isEditing={!!editingId}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label (Display Name) *
            </label>
            <input
              type="text"
              required
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g., Web Portal"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value (Database Key) *
              {!editingId && suggestedValue && (
                <span className="ml-2 text-xs text-blue-600">
                  💡 Suggested: {suggestedValue}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={formData.value}
                  onChange={(e) => {
                    setFormData({ ...formData, value: e.target.value })
                    setUseAutoValue(false)
                  }}
                  placeholder="e.g., web_portal"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600"
                  disabled={!!editingId}
                />
                {!!editingId && (
                  <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                )}
              </div>
              {!editingId && suggestedValue && !useAutoValue && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, value: suggestedValue }))
                    setUseAutoValue(true)
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg whitespace-nowrap"
                >
                  Use {suggestedValue}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Use snake_case, no spaces</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description..."
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon (Emoji)
            </label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="🌐"
              maxLength={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-7">
            <input
              type="checkbox"
              id="channel_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="channel_active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>
        </div>
      </EditFormModal>

      {/* Channels Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
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
              {filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'No channels found matching your search' : 'No delivery channels yet. Add one above.'}
                  </td>
                </tr>
              ) : (
                filteredChannels
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((channel) => (
                    <tr key={channel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {channel.icon && <span className="text-lg">{channel.icon}</span>}
                          <span className="text-sm font-medium text-gray-900">{channel.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{channel.value}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {channel.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            channel.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {channel.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(channel)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(channel.id)}
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
            <div className="text-2xl font-bold text-indigo-600">{channels.length}</div>
            <div className="text-sm text-gray-600">Total Channels</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {channels.filter(c => c.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {channels.filter(c => !c.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {filteredChannels.length}
            </div>
            <div className="text-sm text-gray-600">Shown</div>
          </div>
        </div>
      </div>
    </div>
  )
}

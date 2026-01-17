/**
 * @pageContext
 * @title AI Bots
 * @purpose Manage and configure AI chatbot integrations, monitor their status, and control bot deployment settings
 * @audience admin
 * @features
 *   - List of AI bots integrated with the portal
 *   - Bot status indicators (active, planned, inactive)
 *   - Bot URLs and descriptions
 *   - Add, edit, and delete bots
 *   - Configuration options for each bot
 * @tips
 *   - This page tracks AI assistants integrated with GEA Portal
 *   - Use the Add Bot button to register new AI assistants
 *   - Edit bot details including URL, status, and deployment info
 * @relatedPages
 *   - /admin/home: Return to admin dashboard
 * @permissions
 *   - admin: Full access to view, add, edit, and delete AI bots
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Bot {
  id: string
  name: string
  url: string
  description: string
  status: 'active' | 'planned' | 'inactive'
  deployment: string
  audience: string
  modality: string
  category: string
}

type ModalMode = 'view' | 'edit' | 'add' | null

export default function AIInventoryPage() {
  const { data: session, status } = useSession()
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)

  // Block non-admin access
  if (status !== 'loading' && session?.user?.roleType !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">
            Only administrators can access AI bot management.
          </p>
          <a href="/admin/staff/home" className="text-blue-600 hover:underline">
            ← Return to Staff Home
          </a>
        </div>
      </div>
    )
  }
  const [error, setError] = useState('')
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'planned'>('all')
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [formData, setFormData] = useState<Partial<Bot>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadBots = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ai-bots')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()

      if (!data.success || !Array.isArray(data.bots)) {
        throw new Error('Invalid data format from API')
      }

      setBots(data.bots)
      setError('')
    } catch (err) {
      console.error('Failed to load bots:', err)
      // Fallback to static config if API fails
      try {
        const fallbackResponse = await fetch('/config/bots-config.json')
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          if (fallbackData.bots && Array.isArray(fallbackData.bots)) {
            setBots(fallbackData.bots)
            setError('Using cached data. Database connection may be unavailable.')
            return
          }
        }
      } catch {
        // Ignore fallback errors
      }
      setError(err instanceof Error ? err.message : 'Failed to load AI bots')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBots()
  }, [])

  const filteredBots = bots.filter((bot) => {
    if (filter === 'all') return true
    return bot.status === filter
  })

  const statusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      planned: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    const icons = {
      active: '●',
      planned: '○',
      inactive: '○',
    }
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.inactive}`}>
        <span className={`mr-1.5 ${status === 'active' ? 'text-green-500' : status === 'planned' ? 'text-yellow-500' : 'text-gray-400'}`}>
          {icons[status as keyof typeof icons] || icons.inactive}
        </span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const openViewModal = (bot: Bot) => {
    setSelectedBot(bot)
    setModalMode('view')
  }

  const openEditModal = (bot: Bot) => {
    setSelectedBot(bot)
    setFormData({ ...bot })
    setModalMode('edit')
    setSaveError('')
  }

  const openAddModal = () => {
    setSelectedBot(null)
    setFormData({
      id: '',
      name: '',
      url: '',
      description: '',
      status: 'planned',
      deployment: 'TBD',
      audience: '',
      modality: 'text',
      category: '',
    })
    setModalMode('add')
    setSaveError('')
  }

  const closeModal = () => {
    setSelectedBot(null)
    setModalMode(null)
    setFormData({})
    setSaveError('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaveError('')

      if (modalMode === 'add') {
        // Validate required fields
        if (!formData.id || !formData.name) {
          setSaveError('Bot ID and Name are required')
          return
        }

        const response = await fetch('/api/admin/ai-bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to add bot')
        }

        setSuccessMessage('Bot added successfully!')
      } else if (modalMode === 'edit' && selectedBot) {
        const response = await fetch(`/api/admin/ai-bots/${selectedBot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update bot')
        }

        setSuccessMessage('Bot updated successfully!')
      }

      closeModal()
      await loadBots()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (bot: Bot) => {
    if (!confirm(`Are you sure you want to delete "${bot.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/ai-bots/${bot.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete bot')
      }

      setSuccessMessage('Bot deleted successfully!')
      await loadBots()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete bot')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && bots.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-red-800 font-semibold mb-2">Failed to Load AI Bots</h3>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <details className="text-sm">
                <summary className="text-red-600 cursor-pointer hover:text-red-800">Troubleshooting</summary>
                <ul className="mt-2 ml-4 list-disc text-red-600 space-y-1">
                  <li>Check that the database migration has been run</li>
                  <li>Verify database connection is available</li>
                  <li>Check browser console for detailed errors</li>
                </ul>
              </details>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Bots</h1>
          <p className="text-gray-600">Configure and monitor AI assistant integrations</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Bot
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {/* Warning Message */}
      {error && bots.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-yellow-800">{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Active Bots</h3>
            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {bots.filter((b) => b.status === 'active').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Planned Bots</h3>
            <span className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            {bots.filter((b) => b.status === 'planned').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Bots</h3>
            <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{bots.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by status:</span>
          <div className="flex space-x-2">
            {(['all', 'active', 'planned'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({bots.filter(b => status === 'all' || b.status === status).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bots Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bot Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Audience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deployment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBots.map((bot) => (
                <tr key={bot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{bot.name}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">{bot.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{bot.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {statusBadge(bot.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{bot.audience}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{bot.deployment}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-3">
                      {bot.status === 'active' && bot.url && (
                        <>
                          <button
                            onClick={() => openViewModal(bot)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </button>
                          <span className="text-gray-300">|</span>
                          <a
                            href={bot.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Open
                          </a>
                          <span className="text-gray-300">|</span>
                        </>
                      )}
                      {bot.status === 'planned' && (
                        <span className="text-gray-400 italic mr-3">Not deployed</span>
                      )}
                      <button
                        onClick={() => openEditModal(bot)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleDelete(bot)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Bot Modal */}
      {modalMode === 'view' && selectedBot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedBot.name}</h3>
                <p className="text-sm text-gray-600">{selectedBot.description}</p>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href={selectedBot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Open in New Tab
                </a>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Iframe */}
            <div className="flex-1 p-4">
              <iframe
                src={selectedBot.url}
                className="w-full h-full border border-gray-200 rounded-lg"
                title={selectedBot.name}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Bot Modal */}
      {(modalMode === 'edit' || modalMode === 'add') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'add' ? 'Add New Bot' : 'Edit Bot'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bot ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="id"
                    value={formData.id || ''}
                    onChange={handleInputChange}
                    disabled={modalMode === 'edit'}
                    placeholder="e.g., my-new-bot"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      modalMode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  {modalMode === 'add' && (
                    <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bot Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., My New Bot"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  name="url"
                  value={formData.url || ''}
                  onChange={handleInputChange}
                  placeholder="https://example.vercel.app/"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe what this bot does..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status || 'planned'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="planned">Planned</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deployment
                  </label>
                  <input
                    type="text"
                    name="deployment"
                    value={formData.deployment || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Vercel, AWS, TBD"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Audience
                  </label>
                  <input
                    type="text"
                    name="audience"
                    value={formData.audience || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Public, Government Staff"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modality
                  </label>
                  <select
                    name="modality"
                    value={formData.modality || 'text'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="text-audio">Text & Audio</option>
                    <option value="text-image">Text & Image</option>
                    <option value="multimodal">Multimodal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., General Support, Feedback Collection"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {modalMode === 'add' ? 'Add Bot' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * @pageContext
 * @title AI Bots
 * @purpose Manage and configure AI chatbot integrations, monitor their status, and control bot deployment settings
 * @audience admin
 * @features
 *   - List of AI bots integrated with the portal
 *   - Bot status indicators (active, planned)
 *   - Bot URLs and descriptions
 *   - Configuration options for each bot
 * @tips
 *   - This page tracks AI assistants integrated with GEA Portal
 *   - Currently used for inventory tracking and monitoring
 * @relatedPages
 *   - /admin/home: Return to admin dashboard
 * @permissions
 *   - admin: Full access to view and configure AI bots
 *   - staff: Read-only access
 */

'use client'

import { useState, useEffect } from 'react'

interface Bot {
  id: string
  name: string
  url: string
  description: string
  status: 'active' | 'planned'
  deployment: string
  audience: string
  modality: string
  category: string
}

export default function AIInventoryPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'planned'>('all')

  useEffect(() => {
    async function loadBots() {
      try {
        // ✅ FIXED: Correct path - files in /public are served from root /
        const response = await fetch('/config/bots-config.json')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        
        // Validate data structure
        if (!data.bots || !Array.isArray(data.bots)) {
          throw new Error('Invalid data format: expected {bots: []}')
        }
        
        setBots(data.bots)
        setError('') // Clear any previous errors
      } catch (err) {
        console.error('Failed to load bots config:', err)
        setError(err instanceof Error ? err.message : 'Failed to load AI bots configuration')
      } finally {
        setLoading(false)
      }
    }

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
    }
    const icons = {
      active: '🟢',
      planned: '🟡',
    }
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        <span className="mr-1">{icons[status as keyof typeof icons]}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
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

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-red-800 font-semibold mb-2">Failed to Load AI Bots Configuration</h3>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <details className="text-sm">
                <summary className="text-red-600 cursor-pointer hover:text-red-800">Troubleshooting</summary>
                <ul className="mt-2 ml-4 list-disc text-red-600 space-y-1">
                  <li>Check that `/public/config/bots-config.json` exists</li>
                  <li>Verify the JSON file has valid syntax</li>
                  <li>Ensure the file is included in the Docker build</li>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Bots</h1>
        <p className="text-gray-600">Configure and monitor AI assistant integrations</p>
      </div>

      {/* Summary Cards - Dashboard View */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Active Bots</h3>
            <span className="text-2xl">🟢</span>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {bots.filter((b) => b.status === 'active').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Planned Bots</h3>
            <span className="text-2xl">🟡</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            {bots.filter((b) => b.status === 'planned').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Bots</h3>
            <span className="text-2xl">🤖</span>
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
                      <div className="text-sm text-gray-500">{bot.description}</div>
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
                    <div className="flex space-x-2">
                      {bot.status === 'active' && bot.url && (
                        <>
                          <button
                            onClick={() => setSelectedBot(bot)}
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
                            Open ↗
                          </a>
                        </>
                      )}
                      {bot.status === 'planned' && (
                        <span className="text-gray-400 italic">Not yet deployed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bot Viewer Modal */}
      {selectedBot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
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
                  Open in New Tab ↗
                </a>
                <button
                  onClick={() => setSelectedBot(null)}
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
    </div>
  )
}
/**
 * @pageContext
 * @title Master Data
 * @purpose Centralized management interface for entities, services, and QR codes that form the foundation of the feedback system
 * @audience admin
 * @features
 *   - Three-tab interface for Entities, Services, and QR Codes
 *   - Entity management: Create, edit, deactivate government entities (Ministries, Departments, Agencies)
 *   - Service management: Add, edit, and organize government services by entity
 *   - QR Code management: Generate QR codes for physical locations to enable location-based feedback
 *   - Search and filter capabilities within each tab
 *   - Hierarchical entity structure support
 *   - Auto-suggest IDs for new entities and services
 * @steps
 *   - Select the tab for the data type you want to manage (Entities, Services, or QR Codes)
 *   - Use search boxes to find specific records
 *   - Click "Add" buttons to create new records
 *   - Click edit icons to modify existing records
 *   - Toggle active/inactive status as needed
 *   - For QR codes: Associate with service and location, then download the generated QR code image
 * @tips
 *   - Entities must be created before adding services - services belong to entities
 *   - Use clear, descriptive names for entities and services
 *   - QR codes link to /feedback page with pre-filled service information
 *   - Deactivating entities or services hides them from public dropdowns but preserves historical data
 *   - Entity IDs follow format: MIN-XXX, DEP-XXX, AGY-XXX
 * @relatedPages
 *   - /admin/analytics: View analytics for entities and services
 *   - /feedback: See how citizens use services in feedback form
 *   - /admin/home: Return to admin dashboard
 * @permissions
 *   - admin: Full access to create, edit, and manage all master data
 *   - staff: Read-only access (cannot modify master data)
 * @troubleshooting
 *   - Issue: Can't add service | Solution: Ensure the parent entity exists and is active
 *   - Issue: QR code not working | Solution: Verify the service is active and the QR code URL is correctly formatted
 *   - Issue: Can't delete entity | Solution: Deactivate instead of delete to preserve historical feedback data
 */

'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import EntityManager from '@/components/managedata/EntityManager'
import ServiceManager from '@/components/managedata/ServiceManager'
import QRCodeManager from '@/components/managedata/QRCodeManager'
import { useChatContext } from '@/hooks/useChatContext'

type Tab = 'entities' | 'services' | 'qrcodes'
const VALID_TABS: Tab[] = ['entities', 'services', 'qrcodes']

// Download helper for JSON export
function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
function ManageDataPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('entities')
  const [isExporting, setIsExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const { switchTab } = useChatContext()

  // Read tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Export entities for bot
  const exportEntities = useCallback(async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/managedata/entities?all=true')
      if (!res.ok) throw new Error('Failed to fetch entities')
      const entities = await res.json()

      const exportData = entities.map((e: any) => ({
        id: e.unique_entity_id,
        name: e.entity_name,
        type: e.entity_type,
        parent_id: e.parent_entity_id || null,
        is_active: e.is_active
      }))

      downloadJSON(exportData, `gea-entities-${new Date().toISOString().split('T')[0]}.json`)
    } catch (error) {
      console.error('Export entities error:', error)
      alert('Failed to export entities')
    } finally {
      setIsExporting(false)
      setShowExportMenu(false)
    }
  }, [])

  // Export services for bot
  const exportServices = useCallback(async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/managedata/services')
      if (!res.ok) throw new Error('Failed to fetch services')
      const services = await res.json()

      const exportData = services.map((s: any) => ({
        id: s.service_id,
        name: s.service_name,
        entity_id: s.entity_id,
        category: s.service_category || null,
        is_active: s.is_active
      }))

      downloadJSON(exportData, `gea-services-${new Date().toISOString().split('T')[0]}.json`)
    } catch (error) {
      console.error('Export services error:', error)
      alert('Failed to export services')
    } finally {
      setIsExporting(false)
      setShowExportMenu(false)
    }
  }, [])

  // Export both as a combined bundle
  const exportAll = useCallback(async () => {
    setIsExporting(true)
    try {
      const [entitiesRes, servicesRes] = await Promise.all([
        fetch('/api/managedata/entities?all=true'),
        fetch('/api/managedata/services')
      ])

      if (!entitiesRes.ok || !servicesRes.ok) throw new Error('Failed to fetch data')

      const entities = await entitiesRes.json()
      const services = await servicesRes.json()

      const exportData = {
        exported_at: new Date().toISOString(),
        entities: entities.map((e: any) => ({
          id: e.unique_entity_id,
          name: e.entity_name,
          type: e.entity_type,
          parent_id: e.parent_entity_id || null,
          is_active: e.is_active
        })),
        services: services.map((s: any) => ({
          id: s.service_id,
          name: s.service_name,
          entity_id: s.entity_id,
          category: s.service_category || null,
          is_active: s.is_active
        }))
      }

      downloadJSON(exportData, `gea-master-data-${new Date().toISOString().split('T')[0]}.json`)
    } catch (error) {
      console.error('Export all error:', error)
      alert('Failed to export master data')
    } finally {
      setIsExporting(false)
      setShowExportMenu(false)
    }
  }, [])

  const tabs = [
    { id: 'entities' as Tab, label: 'Entities', icon: '🏛️', count: 'Ministries, Depts, Agencies' },
    { id: 'services' as Tab, label: 'Services', icon: '📋', count: 'Government Services' },
    { id: 'qrcodes' as Tab, label: 'QR Codes', icon: '📱', count: 'Physical Locations' }
  ]

  // Initialize tab context on mount
  useEffect(() => {
    switchTab('managedata', activeTab, tabs.map(t => t.id))
  }, [])

  // Handle tab changes
  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId)
    switchTab('managedata', tabId, tabs.map(t => t.id))
    router.push(`/admin/managedata?tab=${tabId}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Master Data
            </h1>
            <p className="text-gray-600">
              Manage entities, services, and QR codes for the feedback system
            </p>
          </div>

          {/* Export Dropdown for Bot Integration */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isExporting ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span>Export</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                  Export master data
                </div>
                <button
                  onClick={exportEntities}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>Entities (JSON)</span>
                </button>
                <button
                  onClick={exportServices}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>Services (JSON)</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={exportAll}
                  className="w-full px-4 py-2 text-left text-sm text-indigo-600 font-medium hover:bg-indigo-50 flex items-center gap-2"
                >
                  <span>Export All (Combined)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex-1 py-4 px-6 text-center font-semibold transition-all
                    ${activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{tab.icon}</span>
                    <div className="text-left">
                      <div className="font-bold">{tab.label}</div>
                      <div className="text-xs text-gray-500">{tab.count}</div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'entities' && <EntityManager />}
            {activeTab === 'services' && <ServiceManager />}
            {activeTab === 'qrcodes' && <QRCodeManager />}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            💡 Quick Guide
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong className="text-blue-900">Entities:</strong>
              <p className="text-blue-800 mt-1">
                Create organizational hierarchy (Ministries → Departments → Agencies)
              </p>
            </div>
            <div>
              <strong className="text-blue-900">Services:</strong>
              <p className="text-blue-800 mt-1">
                Add government services that citizens can provide feedback on
              </p>
            </div>
            <div>
              <strong className="text-blue-900">QR Codes:</strong>
              <p className="text-blue-800 mt-1">
                Generate QR codes for physical locations (offices, kiosks)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function ManageDataPageFallback() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="flex space-x-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main export wrapped in Suspense for useSearchParams
export default function ManageDataPage() {
  return (
    <Suspense fallback={<ManageDataPageFallback />}>
      <ManageDataPageContent />
    </Suspense>
  )
}
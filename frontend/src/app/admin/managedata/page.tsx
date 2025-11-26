/**
 * @pageContext
 * @title Master Data Management
 * @purpose Centralized management of entities, services, and QR codes that form the foundation of the feedback system
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

import { useState, useEffect } from 'react'
import EntityManager from '@/components/managedata/EntityManager'
import ServiceManager from '@/components/managedata/ServiceManager'
import QRCodeManager from '@/components/managedata/QRCodeManager'
import { useChatContext } from '@/hooks/useChatContext'

type Tab = 'entities' | 'services' | 'qrcodes'

export default function ManageDataPage() {
  const [activeTab, setActiveTab] = useState<Tab>('entities')
  const { switchTab } = useChatContext()

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
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🗄️ Master Data Management
          </h1>
          <p className="text-gray-600">
            Manage entities, services, and QR codes for the feedback system
          </p>
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
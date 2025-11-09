'use client'

import { useState, useEffect } from 'react'

interface QRCode {
  qr_code_id: string
  service_id: string
  service_name?: string
  entity_id: string
  entity_name?: string
  location_name: string
  location_address: string
  location_type: string
  generated_url: string
  scan_count: number
  is_active: boolean
  notes: string
  created_at: string
}

interface Service {
  service_id: string
  service_name: string
  entity_id: string
  is_active: boolean
}

type SortField = 'qr_code_id' | 'location_name' | 'location_type' | 'service_name'
type SortDirection = 'asc' | 'desc' | null

export default function QRCodeManager() {
  const [qrcodes, setQRCodes] = useState<QRCode[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQR, setEditingQR] = useState<QRCode | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Auto-ID state
  const [suggestedId, setSuggestedId] = useState<string>('')
  const [useAutoId, setUseAutoId] = useState(true)

  const [formData, setFormData] = useState({
    qr_code_id: '',
    service_id: '',
    location_name: '',
    location_address: '',
    location_type: 'office',
    notes: '',
    is_active: true
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [qrRes, servicesRes] = await Promise.all([
        fetch('/api/managedata/qrcodes'),
        fetch('/api/managedata/services')
      ])
      
      // CORRECTED: Direct array response (not wrapped)
      if (qrRes.ok) {
        const data = await qrRes.json()
        setQRCodes(data)
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json()
        setServices(data.filter((s: Service) => s.is_active))
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

  // Fetch suggested ID when location type changes
  useEffect(() => {
    if (formData.location_type && !editingQR) {
      fetchSuggestedId()
    }
  }, [formData.location_type, editingQR])

  const fetchSuggestedId = async () => {
    try {
      const response = await fetch(
        `/api/managedata/qrcodes/next-id?locationType=${encodeURIComponent(formData.location_type)}`
      )
      const data = await response.json()
      
      if (data.success) {
        setSuggestedId(data.suggestedId)
        if (useAutoId) {
          setFormData(prev => ({ ...prev, qr_code_id: data.suggestedId }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const service = services.find(s => s.service_id === formData.service_id)
    if (!service) return

    const payload = {
      ...formData,
      entity_id: service.entity_id,
      generated_url: `https://gea.abhirup.app/feedback/qr?c=${formData.qr_code_id}`
    }

    try {
      // CORRECTED: Path params, not query params
      const url = editingQR
        ? `/api/managedata/qrcodes/${editingQR.qr_code_id}`
        : '/api/managedata/qrcodes'
      
      const response = await fetch(url, {
        method: editingQR ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await loadData()
        resetForm()
        alert(editingQR ? 'QR Code updated!' : 'QR Code created!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving QR code:', error)
      alert('Failed to save QR code')
    }
  }

  // CORRECTED: Toggle active using PUT (not DELETE)
  const handleToggleActive = async (qrcode: QRCode) => {
    if (!confirm(`${qrcode.is_active ? 'Deactivate' : 'Activate'} QR Code ${qrcode.qr_code_id}?`)) return

    try {
      const response = await fetch(`/api/managedata/qrcodes/${qrcode.qr_code_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...qrcode, is_active: !qrcode.is_active })
      })

      if (response.ok) {
        await loadData()
        alert(`QR Code ${qrcode.is_active ? 'deactivated' : 'activated'}!`)
      }
    } catch (error) {
      console.error('Error toggling QR code:', error)
      alert('Failed to update QR code')
    }
  }

  const handleEdit = (qrcode: QRCode) => {
    setEditingQR(qrcode)
    setFormData({
      qr_code_id: qrcode.qr_code_id,
      service_id: qrcode.service_id,
      location_name: qrcode.location_name,
      location_address: qrcode.location_address,
      location_type: qrcode.location_type,
      notes: qrcode.notes || '',
      is_active: qrcode.is_active
    })
    setUseAutoId(false)
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      qr_code_id: '',
      service_id: '',
      location_name: '',
      location_address: '',
      location_type: 'office',
      notes: '',
      is_active: true
    })
    setEditingQR(null)
    setShowForm(false)
    setUseAutoId(true)
    setSuggestedId('')
  }

  const handleUseSuggestedId = () => {
    setFormData(prev => ({ ...prev, qr_code_id: suggestedId }))
    setUseAutoId(true)
  }

  // Filter and sort QR codes
  const filteredQRCodes = qrcodes
    .filter(qr =>
      qr.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qr.qr_code_id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0
      
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''
      
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? comparison : -comparison
    })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <input
          type="text"
          placeholder="Search QR codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
        >
          {showForm ? '✕ Cancel' : '+ Add QR Code'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingQR ? '✏️ Edit QR Code' : '➕ Add New QR Code'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service *</label>
                <select
                  required
                  value={formData.service_id}
                  onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingQR}
                >
                  <option value="">Select Service</option>
                  {services.map(service => (
                    <option key={service.service_id} value={service.service_id}>
                      {service.service_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Type *</label>
                <select
                  required
                  value={formData.location_type}
                  onChange={(e) => setFormData({...formData, location_type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingQR}
                >
                  <option value="office">Office</option>
                  <option value="kiosk">Kiosk</option>
                  <option value="service_center">Service Center</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* QR Code ID with Auto-suggestion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">QR Code ID *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={!!editingQR}
                    value={formData.qr_code_id}
                    onChange={(e) => {
                      setFormData({...formData, qr_code_id: e.target.value.toUpperCase()})
                      setUseAutoId(false)
                    }}
                    placeholder="e.g., QR-IMM-001"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {!editingQR && suggestedId && !useAutoId && (
                    <button
                      type="button"
                      onClick={handleUseSuggestedId}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg whitespace-nowrap"
                    >
                      Use {suggestedId}
                    </button>
                  )}
                </div>
                {!editingQR && suggestedId && (
                  <p className="mt-1 text-sm text-gray-500">
                    💡 Suggested: <strong>{suggestedId}</strong>
                  </p>
                )}
              </div>

              {/* Location Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
                <input
                  type="text"
                  required
                  value={formData.location_name}
                  onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                  placeholder="e.g., Immigration Office - St. Georges"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Location Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Address *</label>
              <textarea
                required
                value={formData.location_address}
                onChange={(e) => setFormData({...formData, location_address: e.target.value})}
                placeholder="Full address..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Optional notes..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="qr_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="qr_active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg">
                {editingQR ? 'Update QR Code' : 'Create QR Code'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">QR Codes ({filteredQRCodes.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading QR codes...</p>
          </div>
        ) : filteredQRCodes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No QR codes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    onClick={() => handleSort('qr_code_id')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    ID {getSortIcon('qr_code_id')}
                  </th>
                  <th 
                    onClick={() => handleSort('location_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Location {getSortIcon('location_name')}
                  </th>
                  <th 
                    onClick={() => handleSort('service_name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Service {getSortIcon('service_name')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Scans</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQRCodes.map((qr) => (
                  <tr key={qr.qr_code_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{qr.qr_code_id}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{qr.location_name}</div>
                      <div className="text-xs text-gray-500">{qr.location_address}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{qr.service_name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {qr.scan_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        qr.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {qr.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(qr)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(qr)}
                          className={`px-3 py-1 text-xs rounded ${
                            qr.is_active ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {qr.is_active ? 'Deactivate' : 'Activate'}
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
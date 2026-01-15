'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { generateQRFeedbackUrl } from '@/config/env-client'

interface QRCodeData {
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

interface Entity {
  unique_entity_id: string
  entity_name: string
  entity_type: string
  is_active: boolean
}

interface Service {
  service_id: string
  service_name: string
  entity_id: string
  is_active: boolean
}

type SortField = 'qr_code_id' | 'location_name' | 'location_type' | 'service_name'
type SortDirection = 'asc' | 'desc' | null

const LOCATION_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'kiosk', label: 'Kiosk' },
  { value: 'service_center', label: 'Service Center' },
  { value: 'web_portal', label: 'Web Portal' },
  { value: 'mobile_app', label: 'Mobile App' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' }
]

export default function QRCodeManager() {
  const [qrcodes, setQRCodes] = useState<QRCodeData[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQR, setEditingQR] = useState<QRCodeData | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successQRCode, setSuccessQRCode] = useState<QRCodeData | null>(null)
  const [qrCodeImage, setQrCodeImage] = useState<string>('')

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
      const [qrRes, servicesRes, entitiesRes] = await Promise.all([
        fetch('/api/managedata/qrcodes'),
        fetch('/api/managedata/services'),
        fetch('/api/managedata/entities')
      ])
      
      if (qrRes.ok) {
        const data = await qrRes.json()
        setQRCodes(data)
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json()
        setServices(data.filter((s: Service) => s.is_active))
      }
      if (entitiesRes.ok) {
        const data = await entitiesRes.json()
        setEntities(data.filter((e: Entity) => e.is_active))
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

  // Fetch suggested ID when service is selected
  useEffect(() => {
    if (formData.service_id && !editingQR) {
      fetchSuggestedId()
    }
  }, [formData.service_id, editingQR])

  const fetchSuggestedId = async () => {
    try {
      const response = await fetch(
        `/api/managedata/qrcodes/next-id?serviceId=${encodeURIComponent(formData.service_id)}`
      )
      const data = await response.json()

      if (data.suggested_id) {
        setSuggestedId(data.suggested_id)
        if (useAutoId) {
          setFormData(prev => ({ ...prev, qr_code_id: data.suggested_id }))
        }
      }
    } catch (err) {
      console.error('Error fetching suggested ID:', err)
    }
  }

  // Generate QR code image
  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeImage(qrDataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  // Download QR code as PNG - REDESIGNED LAYOUT v2
  const downloadQRCode = (qr: QRCodeData) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 800
    canvas.height = 1200

    // Grenada flag colors
    const GRENADA_GREEN = '#007a5e'
    const GRENADA_YELLOW = '#fcd116'
    const GRENADA_RED = '#ce1126'

    // White background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw Grenada flag using official SVG
    const svgData = `<svg width="600" height="360" viewBox="0 0 500 300" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg"><path fill="#ce1126" d="M0 0h500v300H0z"/><path fill="#007a5e" d="M42 42h416v216H42z"/><path d="M42 42h416L42 258h416z" fill="#fcd116"/><circle r="36" cy="150" cx="250" fill="#ce1126"/><path d="M67.944 150.113c4.262 8.515 12.757 17.893 20.313 21.321.367-8.513-2.341-19.515-6.224-28.33z" fill="#ce1126"/><path d="M60.284 121.487c6.35 13.695-17.533 45.856 21.453 53.976-4.736-6.643-7.33-17.752-6.04-26.456 8.095 3.448 16.212 11.464 19.402 18.972 13.444-37.484-26.456-33.922-34.815-46.492z" fill="#fcd116"/><use xlink:href="#a" fill="#fcd116"/><use xlink:href="#a" x="100" fill="#fcd116"/><use xlink:href="#a" x="200" fill="#fcd116"/><use xlink:href="#a" x="200" y="-258" fill="#fcd116"/><use xlink:href="#a" x="100" y="-258" fill="#fcd116"/><use xlink:href="#a" y="-258" fill="#fcd116"/><path d="m250 117-19.397 59.697 50.782-36.895h-62.769l50.782 36.895z" fill="#fcd116"/><defs><path id="a" d="m150 259.5-11.462 35.276 30.007-21.802h-37.091l30.007 21.802z"/></defs></svg>`

    const img = new Image()
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      // === HEADER SECTION (horizontal layout) ===
      const headerY = 30

      // Flag on left (smaller: 80x48px)
      const flagWidth = 80
      const flagHeight = 48
      ctx.drawImage(img, 40, headerY, flagWidth, flagHeight)
      URL.revokeObjectURL(url)

      // Title next to flag
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 22px Arial'
      ctx.textAlign = 'left'
      ctx.fillText('Government of Grenada', 135, headerY + 22)

      ctx.font = '14px Arial'
      ctx.fillStyle = '#666666'
      ctx.fillText('Citizen Feedback Initiative', 135, headerY + 42)

      // QR Code ID and date on right
      ctx.textAlign = 'right'
      ctx.font = 'bold 14px Arial'
      ctx.fillStyle = '#333333'
      ctx.fillText(qr.qr_code_id, 760, headerY + 22)

      const date = new Date(qr.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      ctx.font = '12px Arial'
      ctx.fillStyle = '#888888'
      ctx.fillText(date, 760, headerY + 42)

      // Horizontal divider with Grenada colors
      const dividerY = headerY + 65
      ctx.fillStyle = GRENADA_GREEN
      ctx.fillRect(40, dividerY, 240, 3)
      ctx.fillStyle = GRENADA_YELLOW
      ctx.fillRect(280, dividerY, 240, 3)
      ctx.fillStyle = GRENADA_RED
      ctx.fillRect(520, dividerY, 240, 3)

      // Generate QR code in temporary canvas (larger: 480px)
      const tempCanvas = document.createElement('canvas')
      QRCode.toCanvas(tempCanvas, qr.generated_url, {
        width: 480,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      }, (error) => {
        if (error) {
          console.error('QR generation error:', error)
          return
        }

        // === QR CODE SECTION ===
        const qrY = dividerY + 40
        const qrSize = 480
        const qrPadding = 25

        // Light background for QR code with subtle border
        ctx.fillStyle = '#FAFAFA'
        ctx.fillRect(
          (canvas.width - qrSize) / 2 - qrPadding,
          qrY - qrPadding,
          qrSize + (qrPadding * 2),
          qrSize + (qrPadding * 2)
        )

        // Subtle border around QR area
        ctx.strokeStyle = '#E0E0E0'
        ctx.lineWidth = 1
        ctx.strokeRect(
          (canvas.width - qrSize) / 2 - qrPadding,
          qrY - qrPadding,
          qrSize + (qrPadding * 2),
          qrSize + (qrPadding * 2)
        )

        // Draw QR code
        ctx.drawImage(tempCanvas, (canvas.width - qrSize) / 2, qrY)

        // "Scan Me" prompt below QR with phone icon
        ctx.textAlign = 'center'
        ctx.font = '16px Arial'
        ctx.fillStyle = '#666666'
        ctx.fillText('📱 Scan with your phone camera', canvas.width / 2, qrY + qrSize + qrPadding + 25)

        // === METADATA SECTION (compact card style) ===
        const metadataY = qrY + qrSize + qrPadding + 70
        const cardPadding = 20
        const cardWidth = 720
        const cardX = (canvas.width - cardWidth) / 2

        // Card background
        ctx.fillStyle = '#F5F5F5'
        ctx.fillRect(cardX, metadataY, cardWidth, 130)

        // Left border accent
        ctx.fillStyle = GRENADA_GREEN
        ctx.fillRect(cardX, metadataY, 4, 130)

        // Helper function to truncate long text
        const truncateText = (text: string, maxWidth: number, font: string) => {
          ctx.font = font
          if (ctx.measureText(text).width <= maxWidth) return text

          let truncated = text
          while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1)
          }
          return truncated + '...'
        }

        // Two-column metadata layout
        const col1X = cardX + cardPadding + 10
        const col2X = cardX + cardWidth / 2 + 20
        const labelWidth = 280
        const lineHeight = 28

        // Column 1: Entity & Service
        ctx.textAlign = 'left'
        ctx.font = 'bold 13px Arial'
        ctx.fillStyle = '#888888'
        ctx.fillText('ENTITY', col1X, metadataY + 30)
        ctx.font = '15px Arial'
        ctx.fillStyle = '#333333'
        const entityText = truncateText(qr.entity_name || '', labelWidth, '15px Arial')
        ctx.fillText(entityText, col1X, metadataY + 30 + lineHeight)

        ctx.font = 'bold 13px Arial'
        ctx.fillStyle = '#888888'
        ctx.fillText('SERVICE', col1X, metadataY + 30 + lineHeight * 2 + 10)
        ctx.font = '15px Arial'
        ctx.fillStyle = '#333333'
        const serviceText = truncateText(qr.service_name || '', labelWidth, '15px Arial')
        ctx.fillText(serviceText, col1X, metadataY + 30 + lineHeight * 3 + 10)

        // Column 2: Location
        ctx.font = 'bold 13px Arial'
        ctx.fillStyle = '#888888'
        ctx.fillText('LOCATION', col2X, metadataY + 30)
        ctx.font = '15px Arial'
        ctx.fillStyle = '#333333'
        const locationText = truncateText(qr.location_name || '', labelWidth, '15px Arial')
        ctx.fillText(locationText, col2X, metadataY + 30 + lineHeight)

        ctx.font = '12px Arial'
        ctx.fillStyle = '#666666'
        const addressText = truncateText(qr.location_address || '', labelWidth, '12px Arial')
        ctx.fillText(addressText, col2X, metadataY + 30 + lineHeight + 20)

        // === INSTRUCTIONS SECTION (horizontal steps) ===
        const instructionsY = metadataY + 165
        const isPhysical = ['office', 'kiosk', 'service_center'].includes(qr.location_type)

        // Steps container
        const stepWidth = 220
        const stepStartX = 50

        // Draw 3 horizontal steps with icons
        const steps = isPhysical ? [
          { icon: '📷', title: 'Scan', desc: 'Point camera at code' },
          { icon: '⭐', title: 'Rate', desc: 'Share your experience' },
          { icon: '✓', title: 'Done', desc: 'Help us improve' }
        ] : [
          { icon: '👆', title: 'Scan/Click', desc: 'Access feedback form' },
          { icon: '⭐', title: 'Rate', desc: 'Rate your experience' },
          { icon: '✓', title: 'Done', desc: 'Submit feedback' }
        ]

        steps.forEach((step, i) => {
          const stepX = stepStartX + (i * stepWidth) + (i * 25)

          // Step circle background
          ctx.beginPath()
          ctx.arc(stepX + 25, instructionsY + 25, 24, 0, Math.PI * 2)
          ctx.fillStyle = GRENADA_GREEN
          ctx.fill()

          // Step icon (emoji)
          ctx.font = '22px Arial'
          ctx.fillStyle = '#FFFFFF'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(step.icon, stepX + 25, instructionsY + 26)
          ctx.textBaseline = 'alphabetic' // Reset

          // Step title
          ctx.font = 'bold 16px Arial'
          ctx.fillStyle = '#333333'
          ctx.textAlign = 'left'
          ctx.fillText(step.title, stepX + 58, instructionsY + 20)

          // Step description
          ctx.font = '13px Arial'
          ctx.fillStyle = '#666666'
          ctx.fillText(step.desc, stepX + 58, instructionsY + 40)

          // Arrow between steps (except last)
          if (i < steps.length - 1) {
            ctx.font = '24px Arial'
            ctx.fillStyle = '#CCCCCC'
            ctx.textAlign = 'center'
            ctx.fillText('→', stepX + stepWidth + 12, instructionsY + 28)
          }
        })

        // === FOOTER SECTION ===
        const footerY = instructionsY + 85

        // Grievance notice with icon
        ctx.textAlign = 'center'
        ctx.font = '14px Arial'
        ctx.fillStyle = GRENADA_GREEN
        ctx.fillText('⚡ Grievances are sent directly to our support team for action', canvas.width / 2, footerY)

        // Thank you message
        ctx.font = '13px Arial'
        ctx.fillStyle = '#888888'
        ctx.fillText('Thank you for helping us serve you better!', canvas.width / 2, footerY + 35)

        // Copyright
        ctx.font = '11px Arial'
        ctx.fillStyle = '#AAAAAA'
        ctx.fillText('© Government of Grenada • Citizen Feedback Initiative', canvas.width / 2, footerY + 60)

        // Download
        const link = document.createElement('a')
        link.download = `QR-${qr.qr_code_id}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      })
    }

    img.onerror = () => {
      console.error('Failed to load Grenada flag SVG')
      URL.revokeObjectURL(url)
    }

    img.src = url
  }


  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
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

  // Submit handler with success modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const service = services.find(s => s.service_id === formData.service_id)
    if (!service) return

    const payload = {
      ...formData,
      entity_id: service.entity_id,
      generated_url: generateQRFeedbackUrl(formData.qr_code_id)
    }

    try {
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
        
        // Get entity from entities array
        const entity = entities.find(e => e.unique_entity_id === service.entity_id)
        
        const updatedQRCode = {
          ...payload,
          service_name: service.service_name,
          entity_name: entity?.entity_name || '',
          scan_count: editingQR?.scan_count || 0,
          created_at: editingQR?.created_at || new Date().toISOString()
        } as QRCodeData

        // Show success modal with download option
        setSuccessQRCode(updatedQRCode)
        await generateQRCode(updatedQRCode.generated_url)
        setShowSuccessModal(true)
        
        resetForm()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving QR code:', error)
      alert('Failed to save QR code')
    }
  }

  const handleToggleActive = async (qrcode: QRCodeData) => {
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

  const handleEdit = (qrcode: QRCodeData) => {
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
      {/* Header and Search */}
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

      {/* Form */}
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
                  {LOCATION_TYPES.map(lt => (
                    <option key={lt.value} value={lt.value}>{lt.label}</option>
                  ))}
                </select>
              </div>

              {/* QR Code ID with Auto-suggestion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code ID *
                  {!editingQR && suggestedId && (
                    <span className="ml-2 text-xs text-blue-600">
                      💡 Suggested: {suggestedId}
                    </span>
                  )}
                </label>
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
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg whitespace-nowrap"
                    >
                      Use {suggestedId}
                    </button>
                  )}
                </div>
              </div>

              {/* Location Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
                <input
                  type="text"
                  required
                  value={formData.location_name}
                  onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                  placeholder="e.g., Immigration Office - St. George's"
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

      {/* QR Code Table */}
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
                        qr.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {qr.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(qr)}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(qr)}
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            qr.is_active 
                              ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
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

      {/* Success Modal with Download Option */}
      {showSuccessModal && successQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8">
            {/* Fixed Header */}
            <div className="sticky top-0 bg-white rounded-t-lg border-b border-gray-200 p-6 z-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {editingQR ? '✅ QR Code Updated!' : '🎉 QR Code Created Successfully!'}
                </h3>
                <p className="text-gray-600">
                  Your QR code is ready to use. Download it now or access it later from the table.
                </p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
              {/* QR Code Display */}
              <div className="flex justify-center bg-gray-50 p-6 rounded-lg">
                {qrCodeImage && (
                  <img 
                    src={qrCodeImage} 
                    alt="QR Code" 
                    className="w-64 h-64 object-contain"
                  />
                )}
              </div>

              {/* QR Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">QR Code ID:</span>
                  <span className="text-sm font-mono text-gray-900">{successQRCode.qr_code_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Service:</span>
                  <span className="text-sm text-gray-900">{successQRCode.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Location:</span>
                  <span className="text-sm text-gray-900">{successQRCode.location_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Entity:</span>
                  <span className="text-sm text-gray-900">{successQRCode.entity_name}</span>
                </div>
              </div>

              {/* Usage Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-2">📋 Usage Guidelines</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Where to Display:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Service counters and reception desks</li>
                    <li>Waiting areas and lobbies</li>
                    <li>Exit points and checkout windows</li>
                  </ul>
                  <p className="mt-2"><strong>How to Display:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Mount at eye level (5 feet / 1.5 meters)</li>
                    <li>Laminate for durability and protection</li>
                    <li>Ensure good lighting for camera scanning</li>
                    <li>Keep clear of obstructions</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fixed Footer with Action Buttons */}
            <div className="sticky bottom-0 bg-white rounded-b-lg border-t border-gray-200 p-6">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    downloadQRCode(successQRCode)
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PNG
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    setSuccessQRCode(null)
                    setQrCodeImage('')
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
                >
                  Close
                </button>
              </div>
              <p className="text-center text-sm text-gray-500 mt-3">
                💡 Tip: You can download this QR code again anytime from the QR Codes table
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
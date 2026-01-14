/**
 * @pageContext
 * @title Settings
 * @purpose Manage admin-configurable application settings, integrations, and business rules
 * @audience admin
 * @features
 *   - Tabbed interface with 5 categories: System, Authentication, Integrations, Business Rules, Content
 *   - Real-time validation and save functionality
 *   - Sensitive value masking with show/hide toggle
 *   - Test email functionality for SendGrid configuration
 *   - Image upload for branding (logo, favicon)
 *   - Leadership contacts management with drag-and-drop reordering
 * @tips
 *   - Changes marked with "Requires restart" need application restart to take effect
 *   - Use the Test Email button to verify SendGrid configuration
 *   - Drag contacts to reorder them on the About page
 * @relatedPages
 *   - /admin/home: Return to admin dashboard
 *   - /about: See leadership contacts display
 * @permissions
 *   - admin: Full access to view and modify all settings
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { FiSettings, FiSave, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiLock, FiUnlock, FiMail, FiUsers, FiLink, FiSliders, FiFileText, FiExternalLink, FiX, FiUpload, FiTrash2, FiEdit2 } from 'react-icons/fi'

// Types
interface SystemSetting {
  setting_id: number
  setting_key: string
  setting_value: string | null
  setting_type: string
  category: string
  subcategory: string | null
  display_name: string
  description: string | null
  is_sensitive: boolean
  is_runtime: boolean
  default_value: string | null
  min_value: number | null
  max_value: number | null
  options: Record<string, unknown> | null
  sort_order: number
}

interface LeadershipContact {
  contact_id: number
  name: string
  title: string
  email: string | null
  image_path: string | null
  sort_order: number
  is_active: boolean
}

// Category configuration
const CATEGORIES = [
  { key: 'SYSTEM', label: 'System', icon: FiSettings, description: 'General settings, branding, and contact info' },
  { key: 'AUTHENTICATION', label: 'Authentication', icon: FiLock, description: 'OAuth providers and login settings' },
  { key: 'INTEGRATIONS', label: 'Integrations', icon: FiLink, description: 'Email, chatbot, and captcha configuration' },
  { key: 'BUSINESS_RULES', label: 'Business Rules', icon: FiSliders, description: 'Rate limits, thresholds, and file upload' },
  { key: 'CONTENT', label: 'Content', icon: FiFileText, description: 'Footer links and leadership contacts' },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<Record<string, SystemSetting[]>>({})
  const [contacts, setContacts] = useState<LeadershipContact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState('SYSTEM')
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)
  // Contact modal state
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<LeadershipContact | null>(null)
  const [contactForm, setContactForm] = useState({ name: '', title: '', email: '', image_path: '' })
  const [savingContact, setSavingContact] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  // Branding mode state (url vs upload)
  const [brandingMode, setBrandingMode] = useState<Record<string, 'url' | 'upload'>>({})
  const [uploadingBranding, setUploadingBranding] = useState<string | null>(null)

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Load leadership contacts
  const loadContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/contacts')
      if (!response.ok) throw new Error('Failed to fetch contacts')
      const data = await response.json()
      if (data.success) {
        setContacts(data.contacts)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadContacts()
  }, [loadSettings, loadContacts])

  // Handle setting value change
  const handleSettingChange = (key: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }))
  }

  // Get current value (pending or saved)
  const getCurrentValue = (setting: SystemSetting): string => {
    if (pendingChanges[setting.setting_key] !== undefined) {
      return pendingChanges[setting.setting_key]
    }
    return setting.setting_value || ''
  }

  // Save pending changes
  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setMessage({ type: 'error', text: 'No changes to save' })
      return
    }

    try {
      setSaving(true)
      const settingsToUpdate = Object.entries(pendingChanges).map(([key, value]) => ({
        key,
        value
      }))

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: settingsToUpdate,
          changeReason: 'Updated via admin settings page'
        })
      })

      const data = await response.json()

      if (data.success) {
        setPendingChanges({})
        setMessage({
          type: 'success',
          text: data.requiresRestart
            ? 'Settings saved. Some changes require application restart.'
            : 'Settings saved successfully'
        })
        loadSettings()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  // Test email configuration
  const testEmailConfig = async () => {
    try {
      setTestingEmail(true)
      const response = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email })
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' })
      }
    } catch (error) {
      console.error('Error testing email:', error)
      setMessage({ type: 'error', text: 'Failed to send test email' })
    } finally {
      setTestingEmail(false)
    }
  }

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // Open contact modal for add/edit
  const openContactModal = (contact: LeadershipContact | null) => {
    setEditingContact(contact)
    setContactForm(contact ? {
      name: contact.name,
      title: contact.title,
      email: contact.email || '',
      image_path: contact.image_path || ''
    } : { name: '', title: '', email: '', image_path: '' })
    setContactModalOpen(true)
  }

  // Upload photo for contact
  const uploadContactPhoto = async (file: File): Promise<string | null> => {
    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'contacts')

      const response = await fetch('/api/admin/settings/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        return data.file.path
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload photo' })
        return null
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      setMessage({ type: 'error', text: 'Failed to upload photo' })
      return null
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Upload branding image
  const uploadBrandingImage = async (settingKey: string, file: File) => {
    try {
      setUploadingBranding(settingKey)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'branding')

      const response = await fetch('/api/admin/settings/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        handleSettingChange(settingKey, data.file.path)
        setMessage({ type: 'success', text: 'Image uploaded successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload image' })
      }
    } catch (error) {
      console.error('Error uploading branding:', error)
      setMessage({ type: 'error', text: 'Failed to upload image' })
    } finally {
      setUploadingBranding(null)
    }
  }

  // Save contact (add or update)
  const saveContact = async () => {
    if (!contactForm.name || !contactForm.title) {
      setMessage({ type: 'error', text: 'Name and title are required' })
      return
    }

    try {
      setSavingContact(true)
      const url = editingContact
        ? `/api/admin/contacts/${editingContact.contact_id}`
        : '/api/admin/contacts'
      const method = editingContact ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: editingContact ? 'Contact updated' : 'Contact added' })
        setContactModalOpen(false)
        loadContacts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save contact' })
      }
    } catch (error) {
      console.error('Error saving contact:', error)
      setMessage({ type: 'error', text: 'Failed to save contact' })
    } finally {
      setSavingContact(false)
    }
  }

  // Delete contact
  const deleteContact = async () => {
    if (!editingContact) return

    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      setSavingContact(true)
      const response = await fetch(`/api/admin/contacts/${editingContact.contact_id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Contact deleted' })
        setContactModalOpen(false)
        loadContacts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete contact' })
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      setMessage({ type: 'error', text: 'Failed to delete contact' })
    } finally {
      setSavingContact(false)
    }
  }

  // Handle photo file selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a JPG, PNG, GIF, or WebP image' })
      return
    }

    // Validate file size (2MB max for photos)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Photo must be less than 2MB' })
      return
    }

    const path = await uploadContactPhoto(file)
    if (path) {
      setContactForm(prev => ({ ...prev, image_path: path }))
    }
  }

  // Render setting input based on type
  const renderSettingInput = (setting: SystemSetting) => {
    const value = getCurrentValue(setting)
    const isChanged = pendingChanges[setting.setting_key] !== undefined
    const showSecret = showSecrets[setting.setting_key]

    switch (setting.setting_type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true' || value === '1'}
              onChange={(e) => handleSettingChange(setting.setting_key, e.target.checked ? 'true' : 'false')}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">{setting.display_name}</span>
          </label>
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            min={setting.min_value ?? undefined}
            max={setting.max_value ?? undefined}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
          />
        )

      case 'secret':
        return (
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={value}
              onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
              placeholder={setting.is_sensitive ? '********' : ''}
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowSecrets(prev => ({ ...prev, [setting.setting_key]: !showSecret }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showSecret ? <FiUnlock className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
            </button>
          </div>
        )

      case 'url':
      case 'email':
        return (
          <input
            type={setting.setting_type === 'email' ? 'email' : 'url'}
            value={value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            placeholder={setting.default_value || ''}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
          />
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            placeholder={setting.default_value || ''}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
          />
        )
    }
  }

  // Render branding input with URL/Upload toggle
  const renderBrandingInput = (setting: SystemSetting) => {
    const value = getCurrentValue(setting)
    const isChanged = pendingChanges[setting.setting_key] !== undefined
    const mode = brandingMode[setting.setting_key] || 'url'
    const isUploading = uploadingBranding === setting.setting_key
    const isFavicon = setting.setting_key.includes('FAVICON')

    const requirements = isFavicon
      ? 'ICO or PNG format, 16x16 to 48x48 pixels recommended'
      : 'PNG, JPG, or SVG format, max 200px height recommended'

    const acceptTypes = isFavicon
      ? '.ico,.png'
      : '.png,.jpg,.jpeg,.svg'

    return (
      <div className="space-y-3">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBrandingMode(prev => ({ ...prev, [setting.setting_key]: 'url' }))}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              mode === 'url'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setBrandingMode(prev => ({ ...prev, [setting.setting_key]: 'upload' }))}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              mode === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upload
          </button>
        </div>

        {/* Input based on mode */}
        {mode === 'url' ? (
          <input
            type="url"
            value={value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            placeholder="https://example.com/image.png"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
          />
        ) : (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
              {isUploading ? (
                <FiRefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FiUpload className="w-4 h-4" />
              )}
              {isUploading ? 'Uploading...' : 'Choose File'}
              <input
                type="file"
                accept={acceptTypes}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadBrandingImage(setting.setting_key, file)
                }}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            {value && (
              <span className="text-sm text-gray-500 truncate max-w-[200px]">
                {value.split('/').pop()}
              </span>
            )}
          </div>
        )}

        {/* Preview */}
        {value && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Preview:</p>
            <img
              src={value}
              alt="Preview"
              className={`border border-gray-200 rounded ${isFavicon ? 'w-8 h-8' : 'h-12'}`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Requirements guidance */}
        <p className="text-xs text-gray-400">{requirements}</p>
      </div>
    )
  }

  // Group settings by subcategory (filters out Captcha for INTEGRATIONS)
  const groupBySubcategory = (settingsList: SystemSetting[], category: string) => {
    // Filter out Captcha subcategory from INTEGRATIONS
    const filteredSettings = category === 'INTEGRATIONS'
      ? settingsList.filter(s => s.subcategory !== 'Captcha')
      : settingsList

    return filteredSettings.reduce((acc, setting) => {
      const sub = setting.subcategory || 'General'
      if (!acc[sub]) acc[sub] = []
      acc[sub].push(setting)
      return acc
    }, {} as Record<string, SystemSetting[]>)
  }

  // Check if setting is a branding setting (favicon or logo, not alt text)
  const isBrandingSetting = (setting: SystemSetting) => {
    return (setting.setting_key.includes('FAVICON') || setting.setting_key.includes('LOGO'))
      && !setting.setting_key.includes('ALT')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <FiRefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-gray-600">Loading settings...</span>
        </div>
      </div>
    )
  }

  const currentCategorySettings = settings[activeCategory] || []
  const groupedSettings = groupBySubcategory(currentCategorySettings, activeCategory)
  const hasPendingChanges = Object.keys(pendingChanges).length > 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiSettings className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Manage application configuration and integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPendingChanges && (
            <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
              {Object.keys(pendingChanges).length} unsaved changes
            </span>
          )}
          <button
            onClick={saveChanges}
            disabled={!hasPendingChanges || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              hasPendingChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <FiRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FiSave className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <FiCheckCircle className="w-5 h-5" /> : <FiAlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Category Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4 overflow-x-auto">
          {CATEGORIES.map((category) => {
            const Icon = category.icon
            const isActive = activeCategory === category.key
            const categoryHasChanges = Object.keys(pendingChanges).some(key =>
              (settings[category.key] || []).some(s => s.setting_key === key)
            )

            return (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.label}
                {categoryHasChanges && (
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Category Description */}
      <div className="mb-6">
        <p className="text-gray-600">
          {CATEGORIES.find(c => c.key === activeCategory)?.description}
        </p>
      </div>

      {/* Settings Content */}
      <div className="space-y-6">
        {Object.entries(groupedSettings).map(([subcategory, settingsList]) => (
          <div key={subcategory} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{subcategory}</h3>
            </div>
            <div className="p-4 space-y-4">
              {settingsList.map((setting) => (
                <div key={setting.setting_key} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="block font-medium text-gray-900">
                      {setting.display_name}
                      {setting.is_sensitive && (
                        <FiLock className="inline w-3 h-3 ml-1 text-gray-400" />
                      )}
                      {!setting.is_runtime && (
                        <span className="ml-2 text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded">
                          Requires restart
                        </span>
                      )}
                    </label>
                    {setting.description && (
                      <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                    )}
                  </div>
                  <div className="lg:col-span-2">
                    {isBrandingSetting(setting)
                      ? renderBrandingInput(setting)
                      : renderSettingInput(setting)
                    }
                    {setting.setting_type === 'number' && setting.min_value !== null && setting.max_value !== null && (
                      <p className="text-xs text-gray-400 mt-1">
                        Range: {setting.min_value} - {setting.max_value}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Test Email Button for Email subcategory */}
              {subcategory === 'Email' && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={testEmailConfig}
                    disabled={testingEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {testingEmail ? (
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <FiMail className="w-4 h-4" />
                    )}
                    Send Test Email
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Sends a test email to {session?.user?.email || 'your email'} to verify SendGrid configuration
                  </p>
                </div>
              )}

              {/* Open Chatbot Button for Chatbot subcategory */}
              {subcategory === 'Chatbot' && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const chatbotSetting = settingsList.find(s => s.setting_key === 'CHATBOT_URL')
                      const url = chatbotSetting ? getCurrentValue(chatbotSetting) : ''
                      if (url) {
                        window.open(url, '_blank')
                      } else {
                        setMessage({ type: 'error', text: 'No chatbot URL configured' })
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <FiExternalLink className="w-4 h-4" />
                    Open Chatbot
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Opens the chatbot URL in a new tab to test the configuration
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Leadership Contacts Section (Content category only) */}
        {activeCategory === 'CONTENT' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FiUsers className="w-4 h-4" />
                Leadership Contacts
              </h3>
              <button
                onClick={() => openContactModal(null)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Contact
              </button>
            </div>
            <div className="p-4">
              {contacts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No leadership contacts configured. Click &quot;Add Contact&quot; to create one.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contacts.map((contact) => (
                    <div
                      key={contact.contact_id}
                      onClick={() => openContactModal(contact)}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        {contact.image_path ? (
                          <img
                            src={contact.image_path}
                            alt={contact.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-lg">
                              {contact.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{contact.name}</h4>
                          <p className="text-sm text-gray-500 truncate">{contact.title}</p>
                          {contact.email && (
                            <p className="text-xs text-blue-600 truncate">{contact.email}</p>
                          )}
                        </div>
                        <FiEdit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-4">
                These contacts are displayed on the About page. Click on a contact to edit.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {currentCategorySettings.length === 0 && activeCategory !== 'CONTENT' && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FiSettings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-600 font-medium">No settings in this category</h3>
            <p className="text-gray-500 text-sm mt-1">
              Settings for this category will appear here once configured in the database.
            </p>
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h2>
              <button
                onClick={() => setContactModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                <div className="flex items-center gap-4">
                  {contactForm.image_path ? (
                    <img
                      src={contactForm.image_path}
                      alt="Contact photo"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
                      <span className="text-blue-600 font-bold text-xl">
                        {contactForm.name ? contactForm.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                      {uploadingPhoto ? (
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FiUpload className="w-4 h-4" />
                      )}
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                    </label>
                    {contactForm.image_path && (
                      <button
                        type="button"
                        onClick={() => setContactForm(prev => ({ ...prev, image_path: '' }))}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, or WebP. Max 2MB.</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Title/Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title/Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactForm.title}
                  onChange={(e) => setContactForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Chief Executive Officer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g., john@example.gov"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div>
                {editingContact && (
                  <button
                    type="button"
                    onClick={deleteContact}
                    disabled={savingContact}
                    className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveContact}
                  disabled={savingContact || !contactForm.name || !contactForm.title}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {savingContact ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiSave className="w-4 h-4" />
                  )}
                  {editingContact ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

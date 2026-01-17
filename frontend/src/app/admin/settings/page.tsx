/**
 * @pageContext
 * @title Settings
 * @purpose Manage admin-configurable application settings, integrations, and business rules
 * @audience admin
 * @features
 *   - Tabbed interface with 7 categories: System, Authentication, Integrations, Business Rules, Performance, Content, Service Providers
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

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FiSettings, FiSave, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiLock, FiUnlock, FiMail, FiUsers, FiLink, FiSliders, FiFileText, FiExternalLink, FiX, FiUpload, FiTrash2, FiEdit2, FiServer, FiZap, FiDatabase, FiDownload, FiPlay, FiClock, FiHardDrive, FiAlertTriangle } from 'react-icons/fi'

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

interface ServiceProviderEntity {
  unique_entity_id: string
  entity_name: string
  entity_type: string
  is_service_provider: boolean
}

interface BackupFile {
  filename: string
  created_at: string
  size: number
  size_formatted: string
  type: 'manual' | 'scheduled' | 'pre_restore' | 'unknown'
}

// Category configuration
const CATEGORIES = [
  { key: 'SYSTEM', label: 'System', icon: FiSettings, description: 'General settings, branding, and contact info' },
  { key: 'AUTHENTICATION', label: 'Authentication', icon: FiLock, description: 'OAuth providers and login settings' },
  { key: 'INTEGRATIONS', label: 'Integrations', icon: FiLink, description: 'Email, chatbot, and captcha configuration' },
  { key: 'BUSINESS_RULES', label: 'Business Rules', icon: FiSliders, description: 'Rate limits, thresholds, and file upload' },
  { key: 'PERFORMANCE', label: 'Performance', icon: FiZap, description: 'Caching, connection pooling, and optimization settings' },
  { key: 'CONTENT', label: 'Content', icon: FiFileText, description: 'Footer links and leadership contacts' },
  { key: 'USER_MANAGEMENT', label: 'Admin Management', icon: FiUsers, description: 'Configure which entities can have admin users' },
  { key: 'SERVICE_PROVIDERS', label: 'Service Providers', icon: FiServer, description: 'Configure entities that can receive service requests' },
  { key: 'DATABASE', label: 'Backups', icon: FiDatabase, description: 'Backup and restore database, manage scheduled backups' },
]

// Inner component that uses useSearchParams - must be wrapped in Suspense
function SettingsPageContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()

  // Block non-admin access
  if (status !== 'loading' && session?.user?.roleType !== 'admin') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">
            Only administrators can access system settings.
          </p>
          <a href="/admin/staff/home" className="text-blue-600 hover:underline">
            ← Return to Staff Home
          </a>
        </div>
      </div>
    )
  }
  const router = useRouter()
  const [settings, setSettings] = useState<Record<string, SystemSetting[]>>({})
  const [contacts, setContacts] = useState<LeadershipContact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState('SYSTEM')

  // Read tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      const validTabs = CATEGORIES.map(c => c.key)
      if (validTabs.includes(tabParam)) {
        setActiveCategory(tabParam)
      }
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleCategoryChange = (categoryKey: string) => {
    setActiveCategory(categoryKey)
    router.push(`/admin/settings?tab=${categoryKey}`, { scroll: false })
  }
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
  // Service provider state
  const [serviceProviders, setServiceProviders] = useState<ServiceProviderEntity[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null)

  // Admin allowed entities state
  const [allEntities, setAllEntities] = useState<ServiceProviderEntity[]>([])
  const [adminAllowedEntities, setAdminAllowedEntities] = useState<string[]>([])
  const [loadingAdminEntities, setLoadingAdminEntities] = useState(false)
  const [savingAdminEntities, setSavingAdminEntities] = useState(false)

  // Database backup state
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null)
  const [downloadingBackup, setDownloadingBackup] = useState<string | null>(null)
  const [backupDirInfo, setBackupDirInfo] = useState<{ backup_dir: string; total_size: string; total_count: number } | null>(null)
  // Restore modal state
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null)
  const [restoreConfirmText, setRestoreConfirmText] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string; tables?: number; safety_backup?: string } | null>(null)

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (message?.type === 'error') {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

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

  // Load service providers
  const loadServiceProviders = useCallback(async () => {
    try {
      setLoadingProviders(true)
      const response = await fetch('/api/admin/service-providers')
      if (!response.ok) throw new Error('Failed to fetch service providers')
      const data = await response.json()
      if (data.success) {
        setServiceProviders(data.entities)
      }
    } catch (error) {
      console.error('Error loading service providers:', error)
    } finally {
      setLoadingProviders(false)
    }
  }, [])

  // Toggle service provider status
  const toggleServiceProvider = async (entityId: string, currentStatus: boolean) => {
    try {
      setTogglingProvider(entityId)
      const response = await fetch('/api/admin/service-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: entityId,
          is_service_provider: !currentStatus,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        // Update local state
        setServiceProviders(prev =>
          prev.map(e =>
            e.unique_entity_id === entityId
              ? { ...e, is_service_provider: !currentStatus }
              : e
          )
        )
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update' })
      }
    } catch (error) {
      console.error('Error toggling service provider:', error)
      setMessage({ type: 'error', text: 'Failed to update service provider status' })
    } finally {
      setTogglingProvider(null)
    }
  }

  // Load admin allowed entities setting and all entities
  const loadAdminAllowedEntities = useCallback(async () => {
    try {
      setLoadingAdminEntities(true)
      // Fetch all entities and the setting in parallel
      const [entitiesRes, settingRes] = await Promise.all([
        fetch('/api/admin/service-providers'),
        fetch('/api/admin/settings/ADMIN_ALLOWED_ENTITIES')
      ])

      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json()
        if (entitiesData.success) {
          setAllEntities(entitiesData.entities)
        }
      }

      if (settingRes.ok) {
        const settingData = await settingRes.json()
        if (settingData.success && settingData.setting?.setting_value) {
          const value = settingData.setting.setting_value
          const parsed = typeof value === 'string' ? JSON.parse(value) : value
          setAdminAllowedEntities(Array.isArray(parsed) ? parsed : [])
        }
      }
    } catch (error) {
      console.error('Error loading admin allowed entities:', error)
    } finally {
      setLoadingAdminEntities(false)
    }
  }, [])

  // Toggle admin allowed entity
  const toggleAdminAllowedEntity = (entityId: string) => {
    setAdminAllowedEntities(prev =>
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    )
  }

  // Save admin allowed entities
  const saveAdminAllowedEntities = async () => {
    try {
      setSavingAdminEntities(true)
      const response = await fetch('/api/admin/settings/ADMIN_ALLOWED_ENTITIES', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: JSON.stringify(adminAllowedEntities),
          reason: 'Updated admin allowed entities via settings page'
        })
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Admin allowed entities updated successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update setting' })
      }
    } catch (error) {
      console.error('Error saving admin allowed entities:', error)
      setMessage({ type: 'error', text: 'Failed to save admin allowed entities' })
    } finally {
      setSavingAdminEntities(false)
    }
  }

  // Load database backups
  const loadBackups = useCallback(async () => {
    try {
      setLoadingBackups(true)
      const response = await fetch('/api/admin/backups')
      if (!response.ok) throw new Error('Failed to fetch backups')
      const data = await response.json()
      if (data.success) {
        setBackups(data.backups)
        setBackupDirInfo({
          backup_dir: data.backup_dir,
          total_size: data.total_size,
          total_count: data.total_count,
        })
      }
    } catch (error) {
      console.error('Error loading backups:', error)
    } finally {
      setLoadingBackups(false)
    }
  }, [])

  // Create a new backup
  const createBackup = async () => {
    try {
      setCreatingBackup(true)
      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Backup created: ${data.backup.filename} (${data.backup.size_formatted})` })
        loadBackups()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create backup' })
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      setMessage({ type: 'error', text: 'Failed to create backup' })
    } finally {
      setCreatingBackup(false)
    }
  }

  // Download a backup
  const downloadBackup = async (filename: string) => {
    try {
      setDownloadingBackup(filename)
      const response = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}/download`)
      if (!response.ok) throw new Error('Failed to download backup')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: `Downloaded ${filename}` })
    } catch (error) {
      console.error('Error downloading backup:', error)
      setMessage({ type: 'error', text: 'Failed to download backup' })
    } finally {
      setDownloadingBackup(null)
    }
  }

  // Delete a backup
  const deleteBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}? This cannot be undone.`)) return

    try {
      setDeletingBackup(filename)
      const response = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Deleted ${filename}` })
        loadBackups()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete backup' })
      }
    } catch (error) {
      console.error('Error deleting backup:', error)
      setMessage({ type: 'error', text: 'Failed to delete backup' })
    } finally {
      setDeletingBackup(null)
    }
  }

  // Open restore modal
  const openRestoreModal = (backup: BackupFile) => {
    setSelectedBackup(backup)
    setRestoreConfirmText('')
    setRestoreResult(null)
    setRestoreModalOpen(true)
  }

  // Execute restore
  const executeRestore = async () => {
    if (!selectedBackup || restoreConfirmText !== 'RESTORE DATABASE') return

    try {
      setIsRestoring(true)
      setRestoreResult(null)
      const response = await fetch(`/api/admin/backups/${encodeURIComponent(selectedBackup.filename)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          confirmation_text: 'RESTORE DATABASE',
        }),
      })
      const data = await response.json()

      if (data.success) {
        setRestoreResult({
          success: true,
          message: data.message,
          tables: data.tables_restored,
          safety_backup: data.safety_backup,
        })
        setMessage({ type: 'success', text: `Database restored successfully. ${data.tables_restored} tables restored.` })
        loadBackups()
      } else {
        setRestoreResult({
          success: false,
          message: data.error || 'Restore failed',
          safety_backup: data.safety_backup,
        })
        setMessage({ type: 'error', text: data.error || 'Failed to restore backup' })
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      setRestoreResult({
        success: false,
        message: 'Network error during restore',
      })
      setMessage({ type: 'error', text: 'Failed to restore backup' })
    } finally {
      setIsRestoring(false)
    }
  }

  // Restart backup scheduler (call after saving schedule settings)
  const restartScheduler = async () => {
    try {
      const response = await fetch('/api/admin/backups/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Backup scheduler restarted' })
      }
    } catch (error) {
      console.error('Error restarting scheduler:', error)
    }
  }

  useEffect(() => {
    loadSettings()
    loadContacts()
    loadServiceProviders()
  }, [loadSettings, loadContacts, loadServiceProviders])

  // Load backups when Database tab is selected
  useEffect(() => {
    if (activeCategory === 'DATABASE') {
      loadBackups()
    }
  }, [activeCategory, loadBackups])

  // Load admin allowed entities when User Management tab is selected
  useEffect(() => {
    if (activeCategory === 'USER_MANAGEMENT') {
      loadAdminAllowedEntities()
    }
  }, [activeCategory, loadAdminAllowedEntities])

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

  // Validate branding image before upload
  const validateBrandingImage = (settingKey: string, file: File): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const isFavicon = settingKey.includes('FAVICON')
      const maxSize = 5 * 1024 * 1024 // 5MB

      // Check file size
      if (file.size > maxSize) {
        resolve({ valid: false, error: 'File must be less than 5MB' })
        return
      }

      // Check file type
      if (isFavicon) {
        const faviconTypes = ['image/x-icon', 'image/png', 'image/vnd.microsoft.icon']
        if (!faviconTypes.includes(file.type) && !file.name.endsWith('.ico')) {
          resolve({ valid: false, error: 'Favicon must be ICO or PNG format' })
          return
        }
      } else {
        const logoTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
        if (!logoTypes.includes(file.type)) {
          resolve({ valid: false, error: 'Logo must be PNG, JPG, or SVG format' })
          return
        }
      }

      // For SVG files, skip dimension check
      if (file.type === 'image/svg+xml') {
        resolve({ valid: true })
        return
      }

      // Check dimensions using Image API
      const img = new window.Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)

        if (isFavicon) {
          // Favicon should be square and between 16-256px (we'll be flexible but warn)
          if (img.width !== img.height) {
            resolve({ valid: false, error: `Favicon should be square. Current: ${img.width}x${img.height}px` })
            return
          }
          if (img.width < 16 || img.width > 256) {
            resolve({ valid: false, error: `Favicon should be 16-256px. Current: ${img.width}px` })
            return
          }
        } else {
          // Logo should have max 200px height (warn if larger)
          if (img.height > 200) {
            resolve({ valid: false, error: `Logo height should be max 200px. Current: ${img.height}px` })
            return
          }
        }

        resolve({ valid: true })
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        resolve({ valid: false, error: 'Failed to read image dimensions' })
      }

      img.src = objectUrl
    })
  }

  // Upload branding image
  const uploadBrandingImage = async (settingKey: string, file: File) => {
    try {
      setUploadingBranding(settingKey)

      // Validate before upload
      const validation = await validateBrandingImage(settingKey, file)
      if (!validation.valid) {
        setMessage({ type: 'error', text: validation.error || 'Invalid image' })
        setUploadingBranding(null)
        return
      }

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

    // Special handling for BACKUP_SCHEDULE_TIME - time picker with guidance
    if (setting.setting_key === 'BACKUP_SCHEDULE_TIME') {
      return (
        <div className="space-y-2">
          <input
            type="time"
            value={value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
          />
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-center gap-2">
            <FiClock className="w-3 h-3" />
            Recommended: Schedule backups during non-business hours (02:00-05:00)
          </p>
        </div>
      )
    }

    // Special handling for BACKUP_SCHEDULE_DAY - context-aware radio buttons
    if (setting.setting_key === 'BACKUP_SCHEDULE_DAY') {
      const scheduleTypeSetting = currentCategorySettings.find(s => s.setting_key === 'BACKUP_SCHEDULE_TYPE')
      const scheduleType = scheduleTypeSetting ? getCurrentValue(scheduleTypeSetting) : 'daily'

      if (scheduleType === 'daily') {
        return <p className="text-sm text-gray-500 italic">Not applicable for daily backups</p>
      }

      if (scheduleType === 'weekly') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return (
          <div className="flex flex-wrap gap-2">
            {days.map((day, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  value === String(idx)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="backup_day"
                  value={idx}
                  checked={value === String(idx)}
                  onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                  className="sr-only"
                />
                <span className="text-sm">{day}</span>
              </label>
            ))}
          </div>
        )
      }

      if (scheduleType === 'monthly') {
        return (
          <select
            value={value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
          >
            {Array.from({length: 28}, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>Day {day}</option>
            ))}
          </select>
        )
      }

      return <p className="text-sm text-gray-500 italic">Select a schedule type first</p>
    }

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

      case 'select': {
        const selectOptions = (setting.options?.values as Array<{value: string; label: string}>) || []
        return (
          <select
            value={value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
          >
            {selectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )
      }

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
                  // Reset input so same file can be re-selected
                  e.target.value = ''
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
              src={value.startsWith('/uploads/') ? value.replace('/uploads/', '/api/uploads/') : value}
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
        <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <FiCheckCircle className="w-5 h-5 flex-shrink-0" /> : <FiAlertCircle className="w-5 h-5 flex-shrink-0" />}
            {message.text}
          </div>
          <button
            onClick={() => setMessage(null)}
            className="ml-4 p-1 hover:bg-black/10 rounded transition-colors"
            aria-label="Dismiss message"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Description - shows which section is active */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <p className="text-gray-600">
          {CATEGORIES.find(c => c.key === activeCategory)?.description}
        </p>
        {Object.keys(pendingChanges).length > 0 && (
          <p className="text-yellow-600 text-sm mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            You have unsaved changes
          </p>
        )}
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
                    {setting.subcategory === 'Configuration' ? (
                      <input
                        type="text"
                        value={getCurrentValue(setting)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                    ) : isBrandingSetting(setting)
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

        {/* User Management - Admin Allowed Entities Section */}
        {activeCategory === 'USER_MANAGEMENT' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FiUsers className="w-4 h-4" />
                  Entities Allowed to Have Admin Users
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Select which entities can have admin users assigned to them. Admin users from these entities will have full system access.
                </p>
              </div>
              <button
                onClick={saveAdminAllowedEntities}
                disabled={savingAdminEntities}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {savingAdminEntities ? (
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FiSave className="w-4 h-4" />
                )}
                {savingAdminEntities ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="p-4">
              {loadingAdminEntities ? (
                <div className="flex items-center justify-center py-8">
                  <FiRefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading entities...</span>
                </div>
              ) : allEntities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No entities found. Run the database migration first.
                </p>
              ) : (
                <div className="space-y-2">
                  {allEntities.map((entity) => (
                    <div
                      key={entity.unique_entity_id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        adminAllowedEntities.includes(entity.unique_entity_id)
                          ? 'border-purple-200 bg-purple-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{entity.entity_name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {entity.unique_entity_id}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {entity.entity_type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleAdminAllowedEntity(entity.unique_entity_id)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                          adminAllowedEntities.includes(entity.unique_entity_id) ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            adminAllowedEntities.includes(entity.unique_entity_id) ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Note: DTA (AGY-005) is the default. Admin users have full system-wide access regardless of their assigned entity.
              </p>
            </div>
          </div>
        )}

        {/* Service Providers Section */}
        {activeCategory === 'SERVICE_PROVIDERS' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FiServer className="w-4 h-4" />
                Service Provider Entities
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Entities enabled as service providers can receive service requests from other entities.
              </p>
            </div>
            <div className="p-4">
              {loadingProviders ? (
                <div className="flex items-center justify-center py-8">
                  <FiRefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading entities...</span>
                </div>
              ) : serviceProviders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No entities found. Run the database migration first.
                </p>
              ) : (
                <div className="space-y-2">
                  {serviceProviders.map((entity) => (
                    <div
                      key={entity.unique_entity_id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        entity.is_service_provider
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{entity.entity_name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {entity.unique_entity_id}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {entity.entity_type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleServiceProvider(entity.unique_entity_id, entity.is_service_provider)}
                        disabled={togglingProvider === entity.unique_entity_id}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          entity.is_service_provider ? 'bg-blue-600' : 'bg-gray-200'
                        } ${togglingProvider === entity.unique_entity_id ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            entity.is_service_provider ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Note: DTA (AGY-005) is the default service provider. Enable additional entities to allow them to receive service requests.
              </p>
            </div>
          </div>
        )}

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

        {/* Database Backup Section */}
        {activeCategory === 'DATABASE' && (
          <>
            {/* Manual Backup Section */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FiHardDrive className="w-4 h-4" />
                  Database Backups
                </h3>
                <button
                  onClick={createBackup}
                  disabled={creatingBackup}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                >
                  {creatingBackup ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiDatabase className="w-4 h-4" />
                  )}
                  {creatingBackup ? 'Creating...' : 'Create Backup'}
                </button>
              </div>

              <div className="p-4">
                {loadingBackups ? (
                  <div className="flex items-center justify-center py-8">
                    <FiRefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading backups...</span>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8">
                    <FiDatabase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No backups found</p>
                    <p className="text-sm text-gray-400 mt-1">Click &quot;Create Backup&quot; to create your first backup</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {backups.map((backup) => (
                      <div
                        key={backup.filename}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{backup.filename}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              backup.type === 'scheduled' ? 'bg-green-100 text-green-700' :
                              backup.type === 'pre_restore' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {backup.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FiClock className="w-3 h-3" />
                              {new Date(backup.created_at).toLocaleString()}
                            </span>
                            <span>{backup.size_formatted}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => downloadBackup(backup.filename)}
                            disabled={downloadingBackup === backup.filename}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            {downloadingBackup === backup.filename ? (
                              <FiRefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiDownload className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openRestoreModal(backup)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <FiPlay className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteBackup(backup.filename)}
                            disabled={deletingBackup === backup.filename}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            {deletingBackup === backup.filename ? (
                              <FiRefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiTrash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Warning notice */}
              <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-100">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>Warning:</strong> Restoring a backup will overwrite ALL current data. A safety backup is automatically created before restore.</span>
                </p>
              </div>
            </div>

            {/* Backup Directory Info */}
            {backupDirInfo && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FiHardDrive className="w-4 h-4" />
                  Backup Directory (Read-Only)
                </h4>
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Location</dt>
                    <dd className="font-mono text-gray-900 mt-1">{backupDirInfo.backup_dir}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Total Backups</dt>
                    <dd className="text-gray-900 mt-1">{backupDirInfo.total_count} files</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Total Size</dt>
                    <dd className="text-gray-900 mt-1">{backupDirInfo.total_size}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Schedule Settings Info */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  Scheduled Backups
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure automatic backups in the settings below. After changing schedule settings, click &quot;Save Changes&quot; then restart the scheduler.
                </p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-3">
                  Schedule settings (BACKUP_SCHEDULE_*) and retention settings (BACKUP_RETENTION_*) are managed in the DATABASE category of system_settings.
                </p>
                <button
                  onClick={restartScheduler}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Restart Scheduler
                </button>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {currentCategorySettings.length === 0 && activeCategory !== 'CONTENT' && activeCategory !== 'SERVICE_PROVIDERS' && activeCategory !== 'USER_MANAGEMENT' && activeCategory !== 'DATABASE' && (
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

      {/* Restore Modal */}
      {restoreModalOpen && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                <FiAlertTriangle className="w-5 h-5" />
                Confirm Database Restore
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {isRestoring ? (
                <div className="text-center py-8">
                  <FiRefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                  <p className="mt-4 font-medium text-gray-900">Restoring database...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a few minutes. Please do not close this window.</p>
                </div>
              ) : restoreResult ? (
                <div className="text-center py-4">
                  {restoreResult.success ? (
                    <>
                      <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                      <p className="mt-4 font-medium text-green-700">Restore Successful!</p>
                      <p className="text-sm text-gray-600 mt-2">{restoreResult.message}</p>
                      {restoreResult.tables && (
                        <p className="text-sm text-gray-500 mt-1">{restoreResult.tables} tables restored</p>
                      )}
                    </>
                  ) : (
                    <>
                      <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                      <p className="mt-4 font-medium text-red-700">Restore Failed</p>
                      <p className="text-sm text-gray-600 mt-2">{restoreResult.message}</p>
                    </>
                  )}
                  {restoreResult.safety_backup && (
                    <p className="text-xs text-gray-400 mt-3">
                      Safety backup: {restoreResult.safety_backup}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-gray-700 mb-4">
                    You are about to restore the database from:
                  </p>
                  <div className="bg-gray-100 rounded-lg p-3 mb-4">
                    <p className="font-mono text-sm text-gray-800 break-all">{selectedBackup.filename}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(selectedBackup.created_at).toLocaleString()} | {selectedBackup.size_formatted}
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-800 text-sm font-medium">This action will:</p>
                    <ul className="list-disc list-inside text-red-700 text-sm mt-1 space-y-1">
                      <li>Create a safety backup of current data</li>
                      <li>DROP the current database</li>
                      <li>Restore all data from the selected backup</li>
                      <li>All current data will be lost</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600">RESTORE DATABASE</code> to confirm:
                    </label>
                    <input
                      type="text"
                      value={restoreConfirmText}
                      onChange={(e) => setRestoreConfirmText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="RESTORE DATABASE"
                      autoComplete="off"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRestoreModalOpen(false)
                  setRestoreResult(null)
                  setRestoreConfirmText('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {restoreResult ? 'Close' : 'Cancel'}
              </button>
              {!restoreResult && (
                <button
                  onClick={executeRestore}
                  disabled={isRestoring || restoreConfirmText !== 'RESTORE DATABASE'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  {isRestoring ? 'Restoring...' : 'Restore Database'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Loading fallback for Suspense
function SettingsPageFallback() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="flex space-x-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
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
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  )
}

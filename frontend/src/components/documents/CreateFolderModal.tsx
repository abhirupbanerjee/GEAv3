'use client'

/**
 * GEA Portal - Create Folder Modal
 *
 * Simple modal for creating a new folder.
 */

import { useState, useEffect } from 'react'
import { validateFolderName } from '@/lib/file-validation'

// ============================================================================
// TYPES
// ============================================================================

interface CreateFolderModalProps {
  isOpen: boolean
  parentFolderName: string | null
  onClose: () => void
  onSave: (name: string) => Promise<void>
}

// ============================================================================
// CREATE FOLDER MODAL
// ============================================================================

export default function CreateFolderModal({
  isOpen,
  parentFolderName,
  onClose,
  onSave,
}: CreateFolderModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('')
      setError('')
    }
  }, [isOpen])

  // Handle save
  const handleSave = async () => {
    const validation = validateFolderName(name)
    if (!validation.valid) {
      setError(validation.error || 'Invalid folder name')
      return
    }

    setError('')
    setSaving(true)

    try {
      await onSave(name.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">New Folder</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Parent folder info */}
            {parentFolderName && (
              <div className="text-sm text-gray-500">
                Creating subfolder in: <span className="font-medium">{parentFolderName}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Folder name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter folder name"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                Letters, numbers, spaces, and hyphens only
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

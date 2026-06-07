'use client'

/**
 * GEA Portal - Bulk Move Modal
 *
 * Modal for moving multiple documents to a folder.
 */

import { useState, useEffect, useMemo } from 'react'
import { FolderNode } from '@/types/documents'

// ============================================================================
// TYPES
// ============================================================================

interface BulkMoveModalProps {
  isOpen: boolean
  documentCount: number
  folders: FolderNode[]
  onClose: () => void
  onSave: (folderId: number | null) => Promise<void>
}

// ============================================================================
// BULK MOVE MODAL
// ============================================================================

export default function BulkMoveModal({
  isOpen,
  documentCount,
  folders,
  onClose,
  onSave,
}: BulkMoveModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null | 'unfiled'>('unfiled')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId('unfiled')
      setError('')
    }
  }, [isOpen])

  // Flatten folders for dropdown
  const flattenFolders = (nodes: FolderNode[], prefix = ''): { id: number; label: string }[] => {
    const result: { id: number; label: string }[] = []
    for (const node of nodes) {
      const label = prefix ? `${prefix} / ${node.name}` : node.name
      result.push({ id: node.id, label })
      if (node.children.length > 0) {
        result.push(...flattenFolders(node.children, label))
      }
    }
    return result
  }

  const flatFolders = useMemo(() => flattenFolders(folders), [folders])

  // Handle save
  const handleSave = async () => {
    setError('')
    setSaving(true)

    try {
      const folderId = selectedFolderId === 'unfiled' ? null : selectedFolderId
      await onSave(folderId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move documents')
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
            <h2 className="text-lg font-semibold text-gray-900">Move Documents</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Info */}
            <div className="text-sm text-gray-600">
              Move <span className="font-medium">{documentCount}</span> document(s) to:
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Folder select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Folder
              </label>
              <select
                value={selectedFolderId === null ? 'unfiled' : selectedFolderId.toString()}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'unfiled') {
                    setSelectedFolderId('unfiled')
                  } else {
                    setSelectedFolderId(parseInt(val, 10))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="unfiled">📁 Unfiled</option>
                {flatFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.label}
                  </option>
                ))}
              </select>
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
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {saving ? 'Moving...' : 'Move'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

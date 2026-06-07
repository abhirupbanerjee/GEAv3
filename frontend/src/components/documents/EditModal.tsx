'use client'

/**
 * GEA Portal - Document Edit Modal
 *
 * Edit document metadata: title, description, folder, tags, visibility.
 */

import { useState, useEffect } from 'react'
import { Document, FolderNode } from '@/types/documents'

// ============================================================================
// TYPES
// ============================================================================

interface EditModalProps {
  isOpen: boolean
  document: Document | null
  folders: FolderNode[]
  onClose: () => void
  onSave: (data: {
    title: string
    description: string
    folder_id: number | null
    tags: string[]
    visibility: 'all_staff' | 'admin_only'
  }) => Promise<void>
}

// ============================================================================
// EDIT MODAL
// ============================================================================

export default function EditModal({
  isOpen,
  document,
  folders,
  onClose,
  onSave,
}: EditModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [visibility, setVisibility] = useState<'all_staff' | 'admin_only'>('all_staff')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Initialize form when document changes
  useEffect(() => {
    if (document) {
      setTitle(document.title)
      setDescription(document.description || '')
      setSelectedFolderId(document.folder_id)
      setTags(document.tags || [])
      setVisibility(document.visibility)
      setError('')
    }
  }, [document])

  // Add tag
  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && tags.length < 10 && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  // Handle save
  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setError('')
    setSaving(true)

    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        folder_id: selectedFolderId,
        tags,
        visibility,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

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

  const flatFolders = flattenFolders(folders)

  if (!isOpen || !document) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Document</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* File info (read-only) */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">File:</span> {document.file_name}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Document title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description..."
              />
            </div>

            {/* Folder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
              <select
                value={selectedFolderId || ''}
                onChange={(e) => setSelectedFolderId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Unfiled</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add tag..."
                />
                <button
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 10}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={visibility === 'all_staff'}
                    onChange={() => setVisibility('all_staff')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">All Staff</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={visibility === 'admin_only'}
                    onChange={() => setVisibility('admin_only')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Admin Only</span>
                </label>
              </div>
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
              disabled={saving || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

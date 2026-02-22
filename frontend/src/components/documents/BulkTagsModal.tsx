'use client'

/**
 * GEA Portal - Bulk Tags Modal
 *
 * Modal for adding tags to multiple documents at once.
 */

import { useState } from 'react'
import { validateTags } from '@/lib/file-validation'
import { MAX_TAGS, MAX_TAG_LENGTH } from '@/types/documents'

// ============================================================================
// TYPES
// ============================================================================

interface BulkTagsModalProps {
  isOpen: boolean
  documentCount: number
  onClose: () => void
  onSave: (tags: string[]) => Promise<void>
}

// ============================================================================
// BULK TAGS MODAL
// ============================================================================

export default function BulkTagsModal({
  isOpen,
  documentCount,
  onClose,
  onSave,
}: BulkTagsModalProps) {
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset state when modal opens/closes
  const handleClose = () => {
    setTags([])
    setTagInput('')
    setError('')
    onClose()
  }

  // Add tag
  const addTag = () => {
    const trimmedTag = tagInput.trim()
    if (!trimmedTag) return

    if (trimmedTag.length > MAX_TAG_LENGTH) {
      setError(`Tag must be ${MAX_TAG_LENGTH} characters or less`)
      return
    }

    if (tags.length >= MAX_TAGS) {
      setError(`Maximum ${MAX_TAGS} tags allowed`)
      return
    }

    if (tags.includes(trimmedTag)) {
      setError('Tag already added')
      return
    }

    setTags([...tags, trimmedTag])
    setTagInput('')
    setError('')
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  // Handle key press (Enter to add tag)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // Handle save
  const handleSave = async () => {
    if (tags.length === 0) {
      setError('Please add at least one tag')
      return
    }

    const validation = validateTags(tags)
    if (!validation.valid) {
      setError(validation.error || 'Invalid tags')
      return
    }

    setError('')
    setSaving(true)

    try {
      await onSave(tags)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tags')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Add Tags</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Info */}
            <p className="text-sm text-gray-600">
              Add tags to {documentCount} selected document{documentCount > 1 ? 's' : ''}.
              Tags will be added to existing tags.
            </p>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Tag input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter a tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Press Enter to add. Max {MAX_TAG_LENGTH} characters per tag.
              </p>
            </div>

            {/* Tag list */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || tags.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {saving ? 'Saving...' : `Add Tags to ${documentCount} Document${documentCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

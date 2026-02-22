'use client'

/**
 * GEA Portal - Edit Folder Modal
 *
 * Modal for editing an existing folder:
 * - Rename folder
 * - Move folder to a different parent location
 */

import { useState, useEffect, useMemo } from 'react'
import { FolderNode } from '@/types/documents'
import { validateFolderName } from '@/lib/file-validation'

// ============================================================================
// TYPES
// ============================================================================

interface EditFolderModalProps {
  isOpen: boolean
  folder: FolderNode | null
  folders: FolderNode[]
  onClose: () => void
  onSave: (folderId: number, newName: string, newParentId: number | null | undefined) => Promise<void>
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all folder IDs that are descendants of the given folder
 * (including the folder itself)
 */
function getDescendantIds(folder: FolderNode): number[] {
  const ids: number[] = [folder.id]
  for (const child of folder.children) {
    ids.push(...getDescendantIds(child))
  }
  return ids
}

/**
 * Flatten folder tree for dropdown, excluding a folder and its descendants
 */
function flattenFoldersForMove(
  nodes: FolderNode[],
  excludeIds: number[],
  prefix = ''
): { id: number | null; label: string; path: string; level: number; disabled: boolean }[] {
  const result: { id: number | null; label: string; path: string; level: number; disabled: boolean }[] = []

  for (const node of nodes) {
    const isExcluded = excludeIds.includes(node.id)
    const label = prefix ? `${prefix} / ${node.name}` : node.name

    result.push({
      id: node.id,
      label,
      path: node.folder_path,
      level: node.level,
      disabled: isExcluded,
    })

    if (node.children.length > 0) {
      result.push(...flattenFoldersForMove(node.children, excludeIds, label))
    }
  }

  return result
}

// ============================================================================
// EDIT FOLDER MODAL
// ============================================================================

export default function EditFolderModal({
  isOpen,
  folder,
  folders,
  onClose,
  onSave,
}: EditFolderModalProps) {
  const [name, setName] = useState('')
  const [selectedParentId, setSelectedParentId] = useState<number | null | 'root' | 'unchanged'>('unchanged')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Get IDs to exclude from parent selection (the folder itself and all its descendants)
  const excludedIds = useMemo(() => {
    if (!folder) return []
    return getDescendantIds(folder)
  }, [folder])

  // Build parent folder options
  const parentOptions = useMemo(() => {
    const options = flattenFoldersForMove(folders, excludedIds)
    return options
  }, [folders, excludedIds])

  // Calculate the new path preview
  const newPathPreview = useMemo(() => {
    if (!folder) return ''

    const newFolderName = name.trim() || folder.name

    if (selectedParentId === 'unchanged') {
      // Calculate path with just the name change
      if (folder.parent_id === null) {
        return newFolderName
      } else {
        const parentOption = parentOptions.find(o => o.id === folder.parent_id)
        if (parentOption) {
          return `${parentOption.path}/${newFolderName}`
        }
        // Fallback: derive from current path
        const pathParts = folder.folder_path.split('/')
        pathParts[pathParts.length - 1] = newFolderName
        return pathParts.join('/')
      }
    } else if (selectedParentId === 'root') {
      return newFolderName
    } else {
      const parentOption = parentOptions.find(o => o.id === selectedParentId)
      if (parentOption) {
        return `${parentOption.path}/${newFolderName}`
      }
      return newFolderName
    }
  }, [folder, name, selectedParentId, parentOptions])

  // Calculate new level
  const newLevel = useMemo(() => {
    if (selectedParentId === 'unchanged' || !folder) {
      return folder?.level || 1
    } else if (selectedParentId === 'root') {
      return 1
    } else {
      const parentOption = parentOptions.find(o => o.id === selectedParentId)
      return (parentOption?.level || 0) + 1
    }
  }, [selectedParentId, folder, parentOptions])

  // Check if move would exceed max depth
  const wouldExceedMaxDepth = useMemo(() => {
    if (!folder || selectedParentId === 'unchanged') return false

    // Find the deepest child level relative to current folder
    const findMaxChildDepth = (node: FolderNode, currentDepth: number): number => {
      let maxDepth = currentDepth
      for (const child of node.children) {
        maxDepth = Math.max(maxDepth, findMaxChildDepth(child, currentDepth + 1))
      }
      return maxDepth
    }

    const childDepth = findMaxChildDepth(folder, 0)
    const newMaxLevel = newLevel + childDepth

    return newMaxLevel > 3
  }, [folder, selectedParentId, newLevel])

  // Reset state when modal opens/closes or folder changes
  useEffect(() => {
    if (isOpen && folder) {
      setName(folder.name)
      setSelectedParentId('unchanged')
      setError('')
    }
  }, [isOpen, folder])

  // Handle save
  const handleSave = async () => {
    if (!folder) return

    // Validate name
    const validation = validateFolderName(name)
    if (!validation.valid) {
      setError(validation.error || 'Invalid folder name')
      return
    }

    // Check max depth
    if (wouldExceedMaxDepth) {
      setError('Moving to this location would exceed the maximum folder depth of 3 levels')
      return
    }

    // Check if anything changed
    const nameChanged = name.trim() !== folder.name
    const parentChanged = selectedParentId !== 'unchanged'

    if (!nameChanged && !parentChanged) {
      onClose()
      return
    }

    setError('')
    setSaving(true)

    try {
      // Determine new parent_id to send
      let newParentId: number | null | undefined = undefined
      if (parentChanged) {
        newParentId = selectedParentId === 'root' ? null : (selectedParentId as number)
      }

      await onSave(folder.id, name.trim(), newParentId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !folder) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Folder</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Current path info */}
            <div className="text-sm text-gray-500">
              Current path: <span className="font-medium text-gray-700">{folder.folder_path}</span>
            </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter folder name"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                Letters, numbers, spaces, and hyphens only
              </p>
            </div>

            {/* Move to parent folder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Move to Location
              </label>
              <select
                value={selectedParentId === null ? 'root' : selectedParentId.toString()}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'unchanged') {
                    setSelectedParentId('unchanged')
                  } else if (val === 'root') {
                    setSelectedParentId('root')
                  } else {
                    setSelectedParentId(parseInt(val, 10))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="unchanged">— Keep current location —</option>
                <option value="root">📁 Root (top level)</option>
                {parentOptions.map((option) => (
                  <option
                    key={option.id}
                    value={option.id?.toString()}
                    disabled={option.disabled}
                  >
                    {'  '.repeat(option.level)} 📁 {option.label}
                    {option.disabled ? ' (current folder)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select a new parent folder to move this folder and all its contents
              </p>
            </div>

            {/* New path preview */}
            {(name.trim() !== folder.name || selectedParentId !== 'unchanged') && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">New path:</span> {newPathPreview}
                </p>
                {wouldExceedMaxDepth && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ This move would exceed the maximum depth of 3 levels
                  </p>
                )}
              </div>
            )}
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
              disabled={saving || !name.trim() || wouldExceedMaxDepth}
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

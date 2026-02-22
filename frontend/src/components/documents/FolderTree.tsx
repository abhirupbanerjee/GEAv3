'use client'

/**
 * GEA Portal - Folder Tree Component
 *
 * Displays a collapsible folder hierarchy for the Documents module.
 * Features:
 * - 3-level recursive tree structure
 * - Expand/collapse folders
 * - Select folder to filter documents
 * - Admin-only: Create new folder button
 */

import { useState } from 'react'
import { FolderNode } from '@/types/documents'

// ============================================================================
// ICONS
// ============================================================================

const FolderIcon = ({ isOpen }: { isOpen?: boolean }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {isOpen ? (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
      />
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    )}
  </svg>
)

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const AllDocumentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
)

const UnfiledIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

// ============================================================================
// TYPES
// ============================================================================

interface FolderTreeProps {
  folders: FolderNode[]
  selectedFolderId: number | 'all' | 'unfiled' | null
  onSelectFolder: (folderId: number | 'all' | 'unfiled' | null) => void
  onCreateFolder?: (parentId: number | null) => void
  isAdmin: boolean
}

interface FolderNodeItemProps {
  node: FolderNode
  selectedFolderId: number | 'all' | 'unfiled' | null
  expandedIds: Set<number>
  onSelectFolder: (folderId: number | 'all' | 'unfiled' | null) => void
  onToggleExpand: (folderId: number) => void
  onCreateFolder?: (parentId: number | null) => void
  isAdmin: boolean
  level: number
}

// ============================================================================
// FOLDER NODE ITEM
// ============================================================================

function FolderNodeItem({
  node,
  selectedFolderId,
  expandedIds,
  onSelectFolder,
  onToggleExpand,
  onCreateFolder,
  isAdmin,
  level,
}: FolderNodeItemProps) {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedFolderId === node.id
  const hasChildren = node.children && node.children.length > 0
  const canAddSubfolder = isAdmin && level < 3

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-100 text-blue-700'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            <ChevronIcon isOpen={isExpanded} />
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Folder icon and name */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => onSelectFolder(node.id)}
        >
          <FolderIcon isOpen={isExpanded && hasChildren} />
          <span className="truncate text-sm font-medium">{node.name}</span>
        </div>

        {/* Add subfolder button (admin only, up to level 3) */}
        {canAddSubfolder && onCreateFolder && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCreateFolder(node.id)
            }}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity"
            title="Add subfolder"
          >
            <PlusIcon />
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderNodeItem
              key={child.id}
              node={child}
              selectedFolderId={selectedFolderId}
              expandedIds={expandedIds}
              onSelectFolder={onSelectFolder}
              onToggleExpand={onToggleExpand}
              onCreateFolder={onCreateFolder}
              isAdmin={isAdmin}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// FOLDER TREE
// ============================================================================

export default function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  isAdmin,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const handleToggleExpand = (folderId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Folders</h3>
      </div>

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {/* All Documents */}
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
            selectedFolderId === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          onClick={() => onSelectFolder('all')}
        >
          <AllDocumentsIcon />
          <span className="text-sm font-medium">All Documents</span>
        </div>

        {/* Folder tree */}
        <div className="mt-2">
          {folders.map((folder) => (
            <FolderNodeItem
              key={folder.id}
              node={folder}
              selectedFolderId={selectedFolderId}
              expandedIds={expandedIds}
              onSelectFolder={onSelectFolder}
              onToggleExpand={handleToggleExpand}
              onCreateFolder={onCreateFolder}
              isAdmin={isAdmin}
              level={0}
            />
          ))}
        </div>

        {/* Unfiled */}
        <div
          className={`flex items-center gap-2 py-1.5 px-2 mt-2 rounded-md cursor-pointer transition-colors ${
            selectedFolderId === 'unfiled'
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          onClick={() => onSelectFolder('unfiled')}
        >
          <UnfiledIcon />
          <span className="text-sm font-medium text-gray-500">Unfiled</span>
        </div>
      </div>

      {/* Add root folder button (admin only) */}
      {isAdmin && onCreateFolder && (
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={() => onCreateFolder(null)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <PlusIcon />
            <span>New Folder</span>
          </button>
        </div>
      )}
    </div>
  )
}

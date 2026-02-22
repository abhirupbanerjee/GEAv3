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
import { useDroppable } from '@dnd-kit/core'
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

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
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

const TrashFolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
)

// ============================================================================
// DROPPABLE WRAPPER
// ============================================================================

interface DroppableFolderProps {
  id: string
  folderId: number | 'unfiled' | 'all' | 'trash'
  children: React.ReactNode
  disabled?: boolean
}

function DroppableFolder({ id, folderId, children, disabled = false }: DroppableFolderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'folder', folderId },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors rounded-md ${
        isOver && !disabled ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      }`}
    >
      {children}
    </div>
  )
}

// ============================================================================
// TYPES
// ============================================================================

interface FolderTreeProps {
  folders: FolderNode[]
  selectedFolderId: number | 'all' | 'unfiled' | 'trash' | null
  onSelectFolder: (folderId: number | 'all' | 'unfiled' | 'trash' | null) => void
  onCreateFolder?: (parentId: number | null) => void
  onRenameFolder?: (folder: FolderNode) => void
  onDeleteFolder?: (folder: FolderNode) => void
  isAdmin: boolean
  trashCount?: number
}

interface FolderNodeItemProps {
  node: FolderNode
  selectedFolderId: number | 'all' | 'unfiled' | 'trash' | null
  expandedIds: Set<number>
  onSelectFolder: (folderId: number | 'all' | 'unfiled' | 'trash' | null) => void
  onToggleExpand: (folderId: number) => void
  onCreateFolder?: (parentId: number | null) => void
  onRenameFolder?: (folder: FolderNode) => void
  onDeleteFolder?: (folder: FolderNode) => void
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
  onRenameFolder,
  onDeleteFolder,
  isAdmin,
  level,
}: FolderNodeItemProps) {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedFolderId === node.id
  const hasChildren = node.children && node.children.length > 0
  const canAddSubfolder = isAdmin && level < 3

  return (
    <DroppableFolder id={`folder-${node.id}`} folderId={node.id}>
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

        {/* Action buttons (admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Add subfolder button (up to level 3) */}
            {canAddSubfolder && onCreateFolder && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateFolder(node.id)
                }}
                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                title="Add subfolder"
              >
                <PlusIcon />
              </button>
            )}

            {/* Rename button */}
            {onRenameFolder && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRenameFolder(node)
                }}
                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                title="Rename folder"
              >
                <EditIcon />
              </button>
            )}

            {/* Delete button */}
            {onDeleteFolder && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteFolder(node)
                }}
                className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600"
                title="Delete folder"
              >
                <TrashIcon />
              </button>
            )}
          </div>
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
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              isAdmin={isAdmin}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </DroppableFolder>
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
  onRenameFolder,
  onDeleteFolder,
  isAdmin,
  trashCount = 0,
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
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              isAdmin={isAdmin}
              level={0}
            />
          ))}
        </div>

        {/* Unfiled */}
        <DroppableFolder id="folder-unfiled" folderId="unfiled">
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
        </DroppableFolder>

        {/* Trash */}
        {isAdmin && (
          <div
            className={`flex items-center gap-2 py-1.5 px-2 mt-2 rounded-md cursor-pointer transition-colors ${
              selectedFolderId === 'trash'
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onSelectFolder('trash')}
          >
            <TrashFolderIcon />
            <span className="text-sm font-medium text-gray-500">Trash</span>
            {trashCount > 0 && (
              <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {trashCount}
              </span>
            )}
          </div>
        )}

        {/* Add root folder button (admin only) */}
        {isAdmin && onCreateFolder && (
          <div className="mt-4 pt-2 border-t border-gray-100">
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
    </div>
  )
}

'use client'

/**
 * GEA Portal - Document List Component
 *
 * Displays a list of documents with filtering, sorting, and actions.
 * Features:
 * - Search by title
 * - Sort by date, name, size
 * - Tag filtering
 * - Download, edit, delete actions
 * - Pagination
 */

import { useState } from 'react'
import { Document, DocumentSortBy } from '@/types/documents'
import { formatFileSize } from '@/lib/file-validation'

// ============================================================================
// ICONS
// ============================================================================

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
)

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
)

const RestoreIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
    />
  </svg>
)

const FileIcon = ({ extension }: { extension: string }) => {
  const colorMap: Record<string, string> = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
    xls: 'text-green-500',
    xlsx: 'text-green-500',
    txt: 'text-gray-500',
    md: 'text-gray-500',
  }

  const color = colorMap[extension.toLowerCase()] || 'text-gray-500'

  return (
    <svg className={`w-8 h-8 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

// ============================================================================
// TYPES
// ============================================================================

interface DocumentListProps {
  documents: Document[]
  total: number
  page: number
  limit: number
  sortBy: DocumentSortBy
  searchQuery: string
  isLoading: boolean
  isAdmin: boolean
  isTrashView?: boolean
  onSearch: (query: string) => void
  onSort: (sortBy: DocumentSortBy) => void
  onPageChange: (page: number) => void
  onDownload: (document: Document) => void
  onEdit: (document: Document) => void
  onDelete: (document: Document) => void
  onRestore?: (document: Document) => void
  onPermanentDelete?: (document: Document) => void
}

// ============================================================================
// DOCUMENT LIST
// ============================================================================

export default function DocumentList({
  documents,
  total,
  page,
  limit,
  sortBy,
  searchQuery,
  isLoading,
  isAdmin,
  isTrashView = false,
  onSearch,
  onSort,
  onPageChange,
  onDownload,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
}: DocumentListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [permanentDeleteConfirmId, setPermanentDeleteConfirmId] = useState<number | null>(null)

  const totalPages = Math.ceil(total / limit)

  // Format relative date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  // Handle delete confirmation
  const handleDeleteClick = (doc: Document) => {
    setDeleteConfirmId(doc.id)
    // Auto-cancel after 5 seconds
    setTimeout(() => setDeleteConfirmId(null), 5000)
  }

  const handleConfirmDelete = (doc: Document) => {
    setDeleteConfirmId(null)
    onDelete(doc)
  }

  // Handle permanent delete confirmation
  const handlePermanentDeleteClick = (doc: Document) => {
    setPermanentDeleteConfirmId(doc.id)
    // Auto-cancel after 5 seconds
    setTimeout(() => setPermanentDeleteConfirmId(null), 5000)
  }

  const handleConfirmPermanentDelete = (doc: Document) => {
    setPermanentDeleteConfirmId(null)
    if (onPermanentDelete) {
      onPermanentDelete(doc)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters row */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 bg-white">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => onSort(e.target.value as DocumentSortBy)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A-Z</option>
          <option value="size">Largest first</option>
        </select>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d={isTrashView
                  ? "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"}
              />
            </svg>
            <p className="text-lg font-medium">
              {isTrashView ? 'Trash is empty' : 'No documents found'}
            </p>
            <p className="text-sm">
              {isTrashView
                ? 'Deleted documents will appear here'
                : 'Upload a document to get started'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Folder
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isTrashView ? 'Deleted' : 'Date'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  {/* Document name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileIcon extension={doc.file_extension} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {doc.title}
                          </span>
                          {doc.visibility === 'admin_only' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{doc.file_name}</span>
                      </div>
                    </div>
                  </td>

                  {/* Folder */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {doc.folder_path
                        ? doc.folder_path.split('/').join(' / ')
                        : 'Unfiled'}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{doc.tags.length - 3}</span>
                      )}
                    </div>
                  </td>

                  {/* Size */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{formatFileSize(doc.file_size)}</span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {isTrashView && doc.deleted_at
                        ? formatDate(doc.deleted_at)
                        : formatDate(doc.created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isTrashView ? (
                        /* Trash view actions: Restore and Permanent Delete */
                        <>
                          {/* Restore */}
                          {onRestore && (
                            <button
                              onClick={() => onRestore(doc)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Restore"
                            >
                              <RestoreIcon />
                            </button>
                          )}

                          {/* Permanent Delete */}
                          {onPermanentDelete && (
                            <>
                              {permanentDeleteConfirmId === doc.id ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-red-600 font-medium">Permanent?</span>
                                  <button
                                    onClick={() => handleConfirmPermanentDelete(doc)}
                                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setPermanentDeleteConfirmId(null)}
                                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePermanentDeleteClick(doc)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete permanently"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        /* Normal view actions: Download, Edit, Delete */
                        <>
                          {/* Download */}
                          <button
                            onClick={() => onDownload(doc)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Download"
                          >
                            <DownloadIcon />
                          </button>

                          {/* Edit (admin only) */}
                          {isAdmin && (
                            <button
                              onClick={() => onEdit(doc)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Edit"
                            >
                              <EditIcon />
                            </button>
                          )}

                          {/* Delete (admin only) */}
                          {isAdmin && (
                            <>
                              {deleteConfirmId === doc.id ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-gray-500">Delete?</span>
                                  <button
                                    onClick={() => handleConfirmDelete(doc)}
                                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDeleteClick(doc)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
          <div className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-sm border rounded ${
                    pageNum === page
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
